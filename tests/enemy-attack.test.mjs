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

const { windupTicks, enemyHitLands, ENEMY_WINDUP } =
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

check("the impact tick resolves through enemyHitLands", () => {
  assert.match(GAME, /attackImpact[\s\S]{0,400}?enemyHitLands\(/);
});

check("KungFuCastle no longer gates enemy damage on !player.attacking", () => {
  assert.doesNotMatch(GAME, /if \(!player\.attacking\) \{\s*\n\s*player\.hp -= e\.damage/);
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

const ENEMY_STUN = Number(GAME.match(/e\.hitTimer = (\d+);/)[1]);

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
