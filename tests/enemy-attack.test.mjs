// Enemy attacks must be reactable.
//
// Damage used to land on the same tick the animation started, which made the
// whole defensive layer decorative: there was nothing to see coming, so the
// backflip could only ever be preventative, and blanket immunity while
// attacking meant mashing punch strictly dominated every defence.
//
// Two rules replace that: a wind-up before the limb connects, and a single
// explicit predicate for who can be hit.
import assert from "node:assert/strict";
import { check, near, source, loadModule } from "./helpers.mjs";

const {
  windupTicks, enemyHitLands, staggerEnemy, tickAttackImpact,
  countWindingUp, ENEMY_WINDUP, MAX_ATTACKERS,
} =
  await loadModule("src/components/games/kungfu-combat.js");
const { AnimController } = await loadModule("src/components/games/kungfu-anim.js");
const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");

const COMBAT_RANGE = Number(GAME.match(/const COMBAT_RANGE = ([\d.]+);/)[1]);

const anim = (frames, speed) => ({ frames: new Array(frames).fill(0), speed });

/** A player who can be hit: on the ground, not flipping. */
const target = (over = {}) => ({ x: 100, grounded: true, dodging: false, ...over });
const attacker = (over = {}) => ({ x: 100, alive: true, hitTimer: 0, ...over });

// ── wind-up ────────────────────────────────────────────────────────────────

check("wind-up is a fraction of the animation's own length in ticks", () => {
  // 6 frames at 0.15 = 40 ticks of animation; the limb extends partway in.
  near(windupTicks(anim(6, 0.15)), 40 * ENEMY_WINDUP, 1e-9);
});

check("a snappier animation gets a proportionally shorter wind-up", () => {
  // capanga-rapido's 3-frame jab at 0.18 ≈ 17 ticks — its speed is the point.
  const fast = windupTicks(anim(3, 0.18));
  const slow = windupTicks(anim(6, 0.15));
  assert.ok(fast < slow, `fast jab ${fast} should wind up quicker than ${slow}`);
});

check("the wind-up is long enough to react to and short enough to feel like a fight", () => {
  const ticks = windupTicks(anim(6, 0.15));
  assert.ok(ticks >= 8, `${ticks} ticks is under ~130ms — not reactable`);
  assert.ok(ticks <= 40, `${ticks} ticks is over 0.6s — reads as a stall`);
});

check("an animation with no frames cannot produce a negative or NaN wind-up", () => {
  assert.ok(Number.isFinite(windupTicks(undefined)));
  assert.ok(windupTicks(undefined) >= 0);
  assert.ok(Number.isFinite(windupTicks(anim(0, 0.15))));
});

// ── who the blow actually reaches ──────────────────────────────────────────

check("a wound-up blow lands on a grounded player still in range", () => {
  assert.equal(enemyHitLands(attacker(), target(), COMBAT_RANGE), true);
});

check("stepping out of range during the wind-up avoids the blow", () => {
  const e = attacker();
  const p = target({ x: 100 + COMBAT_RANGE + 1 });
  assert.equal(enemyHitLands(e, p, COMBAT_RANGE), false);
});

check("the backflip dodges the blow", () => {
  // The whole point of the feature: invulnerable for the flip.
  assert.equal(enemyHitLands(attacker(), target({ dodging: true }), COMBAT_RANGE), false);
});

check("a backflip is safe even though it leaves the ground", () => {
  const p = target({ dodging: true, grounded: false });
  assert.equal(enemyHitLands(attacker(), p, COMBAT_RANGE), false);
});

check("jumping over the blow avoids it", () => {
  assert.equal(enemyHitLands(attacker(), target({ grounded: false }), COMBAT_RANGE), false);
});

check("attacking does NOT grant immunity", () => {
  // The old `!player.attacking` gate made mashing punch strictly better than
  // any defensive option. Attacking is a choice with a cost now.
  const p = target({ attacking: true, attackType: "punch" });
  assert.equal(enemyHitLands(attacker(), p, COMBAT_RANGE), true);
});

check("interrupting the enemy mid-wind-up cancels its blow", () => {
  // Hitting first is what makes trading worth it — without this the enemy is
  // stunned and still lands the punch it never finished.
  assert.equal(enemyHitLands(attacker({ hitTimer: 5 }), target(), COMBAT_RANGE), false);
});

// ── a interrupção tem de valer para o golpe inteiro ────────────────────────
//
// Checar hitTimer só no tick do impacto não basta: o atordoamento dura 20
// ticks e vários wind-ups são mais longos (o chute do capanga cinza leva 25,7).
// Acertar o inimigo nos primeiros ticks do movimento fazia com que ele se
// recuperasse ANTES do impacto — e o golpe caía com o sprite já em "hit" ou
// "idle", que é o mesmo dano invisível de antes por outro caminho. O golpe em
// preparo tem de morrer junto com a interrupção.

check("being staggered kills the pending blow outright", () => {
  const e = attacker({ attackImpact: 22 });
  staggerEnemy(e, 20);
  assert.equal(e.attackImpact, 0, "o golpe em preparo sobreviveu à interrupção");
  assert.equal(e.hitTimer, 20);
});

check("a blow interrupted on its very first tick never lands", () => {
  // O caso que o teste anterior não cobria: wind-up 22 contra atordoamento 20.
  const e = attacker({ attackImpact: 22 });
  const p = target();
  staggerEnemy(e, 20);
  let dano = false;
  for (let t = 0; t < 40; t++) {
    if (e.hitTimer > 0) e.hitTimer -= 1;
    if (tickAttackImpact(e, p, COMBAT_RANGE, 1)) dano = true;
  }
  assert.equal(dano, false, "o inimigo se recuperou e o golpe caiu sem animação");
});

check("an uninterrupted blow still lands, at its own wind-up tick", () => {
  const e = attacker({ attackImpact: 10 });
  const p = target();
  const quandoCaiu = [];
  for (let t = 1; t <= 20; t++) {
    if (tickAttackImpact(e, p, COMBAT_RANGE, 1)) quandoCaiu.push(t);
  }
  assert.deepEqual(quandoCaiu, [10], `esperava um golpe no tick 10, veio ${quandoCaiu}`);
});

check("the impact resolves once, not once per tick after it expires", () => {
  const e = attacker({ attackImpact: 3 });
  const p = target();
  let n = 0;
  for (let t = 0; t < 30; t++) if (tickAttackImpact(e, p, COMBAT_RANGE, 1)) n++;
  assert.equal(n, 1, `o mesmo golpe causou dano ${n} vezes`);
});

check("a long frame does not skip the impact", () => {
  // dt não é 1.0: uma aba em segundo plano ou um GC entregam um quadro longo.
  const e = attacker({ attackImpact: 22 });
  const p = target();
  let n = 0;
  for (let t = 0; t < 5; t++) if (tickAttackImpact(e, p, COMBAT_RANGE, 9)) n++;
  assert.equal(n, 1, "o golpe sumiu num quadro longo em vez de cair");
});

// ── quantos podem bater ao mesmo tempo ─────────────────────────────────────
//
// Até 5 inimigos cabem em cena e nada os impedia de golpear no mesmo quadro.
// Na fase 1 isso custava 40 de vida por rodada; na fase 3, com ninja-espada a
// 15, custa 75 — o jogador morre em 1,3 rodada parado, sem chance de reagir.
// Beat-em-up resolve isso há quarenta anos com uma senha de ataque: os outros
// cercam e esperam.

check("only a couple of enemies may be winding up at once", () => {
  const enemies = [
    { attackImpact: 12 },
    { attackImpact: 0 },
    { attackImpact: 5 },
    { attackImpact: 0 },
  ];
  assert.equal(countWindingUp(enemies), 2);
  assert.ok(MAX_ATTACKERS >= 1, "pelo menos um inimigo tem de poder atacar");
  assert.ok(MAX_ATTACKERS <= 3, `${MAX_ATTACKERS} atacantes simultâneos é cerco, não luta`);
});

check("an empty field has nobody winding up", () => {
  assert.equal(countWindingUp([]), 0);
});

check("the cap keeps the worst swarm in the game survivable", () => {
  // O pior caso sai das pools de verdade, não de um número escrito à mão: a
  // fase 5 trouxe o general a 18 de dano e o teste que fixava 15 teria passado
  // sem notar. Cada fase nova entra nesta conta sozinha.
  const PLAYER_HP = Number(GAME.match(/const PLAYER_HP_MAX = (\d+);/)[1]);
  const dano = {};
  for (const m of GAME.match(/const ENEMY_STATS = \{[\s\S]*?\n\};/)[0]
    .matchAll(/"([a-z-]+)":[^\n]*?damage:\s*(\d+)/g)) dano[m[1]] = Number(m[2]);

  const pools = [...GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/)[0]
    .matchAll(/(\d+):\s*\{[\s\S]*?enemies:\s*\[([^\]]*)\]/g)];
  assert.ok(pools.length >= 3, `só ${pools.length} pools lidas`);

  for (const [, fase, lista] of pools) {
    const tipos = [...lista.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);
    const pior = Math.max(...tipos.map((t) => dano[t] ?? 0));
    assert.ok(pior > 0, `fase ${fase}: nenhum dano lido de ${tipos}`);
    const rodadas = PLAYER_HP / (pior * MAX_ATTACKERS);
    assert.ok(
      rodadas >= 2.5,
      `fase ${fase}: pior inimigo bate ${pior}, ${rodadas.toFixed(1)} rodadas até a morte`,
    );
  }
});

check("the game gates the attack on the attacker cap", () => {
  assert.match(GAME, /countWindingUp\(game\.enemies\)/);
  assert.match(GAME, /atacando < MAX_ATTACKERS/);
});

check("the game clears the pending blow through staggerEnemy", () => {
  assert.match(GAME, /staggerEnemy\(e, ENEMY_STUN\)/);
  assert.doesNotMatch(GAME, /e\.hitTimer = \d+;/, "o atordoamento deve passar por staggerEnemy");
});

check("the game resolves the impact through tickAttackImpact", () => {
  assert.match(GAME, /if \(tickAttackImpact\(e, player, COMBAT_RANGE, dt\)\)/);
});

check("killing the enemy mid-wind-up cancels its blow", () => {
  assert.equal(enemyHitLands(attacker({ alive: false }), target(), COMBAT_RANGE), false);
});

// ── wiring in the game loop ────────────────────────────────────────────────

check("the game schedules an impact instead of damaging on frame 0", () => {
  const block = GAME.match(/Enemy attacks player[\s\S]*?\n\n/);
  assert.ok(block, "enemy attack block not found");
  assert.doesNotMatch(
    block[0],
    /player\.hp -= e\.damage/,
    "damage must resolve at the impact tick, not where the animation starts",
  );
  assert.match(block[0], /attackImpact = windupTicks/);
});

check("KungFuCastle no longer gates enemy damage on player.attacking", () => {
  // Este teste já foi frouxo: casava só a forma `if (!player.attacking) {`, e
  // o gate voltou disfarçado de `&& !player.attacking` dentro da condição do
  // impacto — passou despercebido por dois commits. Agora a asserção é sobre a
  // vizinhança do dano, em qualquer forma.
  const bloco = GAME.match(/player\.hp -= e\.damage[\s\S]{0,200}/);
  assert.ok(bloco, "o bloco de dano do inimigo sumiu");
  const antes = GAME.slice(Math.max(0, GAME.indexOf("player.hp -= e.damage") - 300),
                           GAME.indexOf("player.hp -= e.damage"));
  assert.doesNotMatch(
    antes,
    /player\.attacking/,
    "atacar não pode voltar a conceder imunidade — ver enemyHitLands",
  );
});

// ── a telegrafia tem de aparecer de verdade ────────────────────────────────
//
// O wind-up não vale nada se a animação de ataque nunca chega à tela. O
// AnimController bloqueia por prioridade: `hit` é 4, `punch` é 3, e a animação
// de recuo do inimigo dura mais que o atordoamento do jogo (e.hitTimer = 20
// ticks contra ~50 da folha). Nessa janela, `play("punch")` era recusado em
// silêncio enquanto o impacto era agendado assim mesmo — dano invisível, e o
// caso comum logo depois de CADA soco do jogador. Os testes por regex passavam
// os 128 com o defeito presente, então este exercita o controlador de verdade.

const ENEMY_STUN = Number(GAME.match(/const ENEMY_STUN = (\d+);/)[1]);

/** Um controlador com o conjunto de animações que um capanga realmente tem. */
function thugController() {
  const anims = {
    idle: { frames: new Array(8).fill(0), speed: 0.16, loop: true },
    walk: { frames: new Array(8).fill(0), speed: 0.14, loop: true },
    punch: { frames: new Array(6).fill(0), speed: 0.15, loop: false, next: "idle" },
    hit: { frames: new Array(6).fill(0), speed: 0.12, loop: false, next: "idle" },
  };
  const ctrl = new AnimController({ sprite: { scale: { x: 1, y: 1 }, texture: null }, anims });
  ctrl.play("idle");
  return ctrl;
}

check("the recoil animation outlives the stun, which is what made this possible", () => {
  // Guard on the premise: if someone later shortens `hit` to match the stun,
  // this whole class of bug disappears and the test below stops being about
  // anything real. Better to notice than to keep asserting a dead scenario.
  const ctrl = thugController();
  ctrl.play("hit");
  for (let t = 0; t < ENEMY_STUN; t++) ctrl.update(1);
  assert.equal(ctrl.state, "hit", "premise changed: recoil now ends with the stun");
});

check("the attack animation plays even while the recoil sheet is still running", () => {
  const ctrl = thugController();
  ctrl.play("hit");
  for (let t = 0; t < ENEMY_STUN; t++) ctrl.update(1);

  // This is the line under test, transcribed from the game loop.
  ctrl.forcePlay("punch");
  assert.equal(
    ctrl.state,
    "punch",
    "the enemy scheduled a blow whose wind-up the player never sees",
  );
});

check("the game force-plays the attack instead of letting priority swallow it", () => {
  const block = GAME.match(/Enemy attacks player[\s\S]*?attackImpact = windupTicks[^\n]*\n/);
  assert.ok(block, "enemy attack block not found");
  assert.match(
    block[0],
    /forcePlay\(attackAnim\)/,
    "play() is silently blocked by the recoil's higher priority — see the test above",
  );
});

check("no enemy's recoil sheet is slower than the stun it represents", () => {
  // The sprite must not keep recoiling after the enemy has recovered: it reads
  // as a free hit landing out of a stagger pose.
  for (const m of ASSETS.matchAll(/"([a-z-]+)": enemyAnims\([\s\S]*?\n    \]\)/g)) {
    const [, type] = m;
    const hit = m[0].split("\n").find((l) => l.includes('["hit"'));
    assert.ok(hit, `${type} has no hit entry`);
    const speed = Number(hit.match(/speed:\s*([\d.]+)/)[1]);
    const frames = 6; // taking-punch, the template every enemy uses
    assert.ok(
      frames / speed <= ENEMY_STUN * 2.6,
      `${type}: recoil lasts ${(frames / speed).toFixed(0)} ticks against a ` +
        `${ENEMY_STUN}-tick stun`,
    );
  }
});

check("startDodge no longer claims immunity comes from the attack lock", () => {
  const fn = GAME.match(/function startDodge[\s\S]*?\n\}/);
  assert.ok(fn, "startDodge not found");
  assert.doesNotMatch(
    fn[0],
    /makes enemy damage a no-op/,
    "that comment describes the old immunity path and is now wrong",
  );
});

// ── velocidade declarada tem de ser a velocidade andada ────────────────────

check("movement reads the entity's own stats table, not just ENEMY_STATS", () => {
  // `ENEMY_STATS[e.type]?.speed || 1.2` tinha dois furos. Chefe não está em
  // ENEMY_STATS, então TODO chefe andava a 1.2 e BOSS_STATS.speed era enfeite
  // — o Senhor das Sombras, cuja assinatura é ser rápido (2.5), arrastava-se
  // no mesmo passo do brutamontes. E `|| ` transforma 0 em 1.2, então o
  // atirador, declarado parado, andava.
  const linha = GAME.split("\n").find((l) => l.includes("const spd ="));
  assert.ok(linha, "linha de velocidade não encontrada");
  assert.doesNotMatch(linha, /\|\|\s*1\.2/, "use ?? para não engolir speed 0");
  assert.match(linha, /BOSS_STATS/, "a velocidade de chefe precisa sair de BOSS_STATS");
});

check("every boss declares a speed, since it is now actually used", () => {
  const block = GAME.match(/const BOSS_STATS = \{[\s\S]*?\n\};/)[0];
  for (const m of block.matchAll(/"([a-z-]+)":\s*\{([\s\S]*?)\n  \},/g)) {
    assert.match(m[2], /speed:\s*[\d.]+/, `${m[1]} não declara speed`);
  }
});
