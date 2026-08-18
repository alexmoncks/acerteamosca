// O poder dos chefes.
//
// Cada chefe tem entre cinco e nove animações que nunca tocavam: war-cry,
// earthquake, demon-fury, devastation, vanish. Eram o moveset inteiro parado no
// disco enquanto o chefe repetia um soco. Agora cada um tem um PODER, e usá-lo
// custa alguma coisa: ele se AFASTA do corpo a corpo para carregar, e a carga é
// longa o bastante para o jogador ver, decidir e punir.
//
// A troca é essa. O chefe compra um golpe que dói mais e alcança mais longe; o
// jogador compra uma janela em que o chefe está longe, parado e vulnerável.
// Sem esses dois lados o poder seria só dano extra sem resposta.
import assert from "node:assert/strict";
import { check, source, loadModule } from "./helpers.mjs";

const {
  windupTicks, staggerEnemy, tickAttackImpact, powerStep, POWER_STATES, MAX_RECUO,
} = await loadModule("src/components/games/kungfu-combat.js");
const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");

const COMBAT_RANGE = Number(GAME.match(/const COMBAT_RANGE = ([\d.]+);/)[1]);

const poder = (over = {}) => ({
  windup: "war-cry", strike: "stomp",
  charge: 45, cooldown: 420, distance: 90, range: 70, damage: 22, ...over,
});
const chefe = (over = {}) => ({
  x: 100, alive: true, hitTimer: 0, attackImpact: 0,
  powerState: null, powerTimer: 0, powerCooldown: 0, ...over,
});

// ── a máquina de estados ───────────────────────────────────────────────────

check("a boss with its power on cooldown just fights normally", () => {
  const e = chefe({ powerCooldown: 100 });
  const r = powerStep(e, { x: 110 }, poder(), 1);
  assert.equal(e.powerState, null);
  assert.equal(r.acao, "nada");
  assert.equal(e.powerCooldown, 99, "o cooldown precisa correr mesmo sem usar");
});

check("the power starts by backing away, not by striking", () => {
  // Se ele soltasse o poder de perto, seria só um soco mais forte. A distância
  // é o que dá ao jogador o tempo e o espaço para responder.
  const e = chefe({ x: 100 });
  const r = powerStep(e, { x: 110 }, poder(), 1); // jogador encostado, à direita
  assert.equal(e.powerState, POWER_STATES.recuar);
  assert.equal(r.acao, "recuar");
  assert.equal(r.direcao, -1, "jogador à direita, chefe recua para a esquerda");
});

check("it backs away from whichever side the player is on", () => {
  // Nos dois casos o jogador está PERTO (60px, dentro dos 90 da distância de
  // carga), senão o chefe já entraria carregando e não haveria recuo a medir.
  const e = chefe({ x: 100 });
  assert.equal(powerStep(e, { x: 40 }, poder(), 1).direcao, 1,
    "jogador à esquerda, chefe recua para a direita");
  const f = chefe({ x: 100 });
  assert.equal(powerStep(f, { x: 160 }, poder(), 1).direcao, -1,
    "jogador à direita, chefe recua para a esquerda");
});

check("a player already far away skips the retreat", () => {
  // Nada a ganhar recuando de quem já está longe: ele carrega direto.
  const e = chefe({ x: 100 });
  const r = powerStep(e, { x: 100 + 95 }, poder(), 1);
  assert.equal(r.acao, "recuar", "o primeiro passo sempre entra no estado");
  const r2 = powerStep(e, { x: 100 + 95 }, poder(), 1);
  assert.equal(r2.acao, "carregar", "e no seguinte já está longe o bastante");
});

check("reaching the charge distance switches to charging", () => {
  const e = chefe({ powerState: POWER_STATES.recuar });
  const r = powerStep(e, { x: 100 + 95 }, poder(), 1); // já está a 95, além dos 90
  assert.equal(e.powerState, POWER_STATES.carregar);
  assert.equal(e.powerTimer, 45);
  assert.equal(r.acao, "carregar");
  assert.equal(r.anim, "war-cry");
});

check("charging holds still and counts down", () => {
  const e = chefe({ powerState: POWER_STATES.carregar, powerTimer: 10 });
  const r = powerStep(e, { x: 200 }, poder(), 3);
  assert.equal(e.powerTimer, 7);
  assert.equal(r.acao, "carregando");
  assert.ok(!r.direcao, "carregando ele não anda");
});

check("the charge ends in the strike, and the cooldown restarts", () => {
  const e = chefe({ powerState: POWER_STATES.carregar, powerTimer: 1 });
  const r = powerStep(e, { x: 200 }, poder(), 1);
  assert.equal(r.acao, "golpe");
  assert.equal(r.anim, "stomp");
  assert.equal(e.powerState, null);
  assert.equal(e.powerCooldown, 420);
});

check("being hit cancels the whole power, at any point", () => {
  // A punição por atravessar a distância. Sem isso, recuar seria de graça e o
  // jogador não teria motivo para perseguir.
  for (const estado of [POWER_STATES.recuar, POWER_STATES.carregar]) {
    const e = chefe({ powerState: estado, powerTimer: 20, attackImpact: 12 });
    staggerEnemy(e, 20);
    assert.equal(e.powerState, null, `atordoar durante ${estado} não cancelou`);
    assert.equal(e.attackImpact, 0);
  }
});

check("a dead boss stops charging", () => {
  const e = chefe({ alive: false, powerState: POWER_STATES.carregar, powerTimer: 5 });
  const r = powerStep(e, { x: 200 }, poder(), 1);
  assert.equal(r.acao, "nada");
});

check("a boss with no power declared never enters the machine", () => {
  const e = chefe();
  assert.equal(powerStep(e, { x: 110 }, undefined, 1).acao, "nada");
  assert.equal(e.powerState, null);
});

check("retreating gives up if the player keeps closing the gap", () => {
  // Sem desistência, um jogador colado prende o chefe recuando até a parede e
  // a luta trava: ele nunca chega à distância, nunca carrega, nunca golpeia.
  // Com o teto, o poder sai de perto — mais perigoso para quem perseguiu.
  const e = chefe({ x: 100 });
  const colado = { x: 110 }; // sempre a 10px, nunca deixa chegar aos 90
  const acoes = [];
  for (let t = 0; t < MAX_RECUO + 10; t++) acoes.push(powerStep(e, colado, poder(), 1).acao);
  assert.ok(acoes.includes("carregar"),
    `recuou ${acoes.length} ticks sem nunca carregar: ${[...new Set(acoes)]}`);
  assert.ok(acoes.indexOf("carregar") <= MAX_RECUO + 1,
    "o teto de recuo não foi respeitado");
});

// ── o golpe carregado ──────────────────────────────────────────────────────

check("the power strikes harder and further than the ordinary attack", () => {
  const p = poder();
  assert.ok(p.range > COMBAT_RANGE, `alcance ${p.range} não é maior que o corpo a corpo`);
  assert.ok(p.charge >= 30, `carga de ${p.charge} ticks é curta demais para reagir`);
});

check("the scheduled blow carries the power's own damage and reach", () => {
  // Sem isso o golpe carregado cairia com o dano e o alcance do soco comum, e a
  // recuada inteira teria sido de graça para o jogador.
  const e = chefe({ attackImpact: 2, attackDamage: 22, attackRange: 70 });
  const p = { x: 100 + 60, grounded: true, dodging: false };
  assert.equal(tickAttackImpact(e, p, e.attackRange, 1), false, "ainda não");
  assert.equal(tickAttackImpact(e, p, e.attackRange, 1), true, "60px cabe nos 70 do poder");
  const f = chefe({ attackImpact: 1, attackDamage: 22, attackRange: 70 });
  assert.equal(tickAttackImpact(f, { x: 100 + 60, grounded: true, dodging: false }, COMBAT_RANGE, 1),
    false, "com o alcance do soco comum, 60px erraria");
});

// ── fiação ─────────────────────────────────────────────────────────────────

check("every boss declares a power built from animations it actually has", () => {
  const bloco = GAME.match(/const BOSS_STATS = \{[\s\S]*?\n\};/)[0];
  const entradas = [...bloco.matchAll(/"([a-z-]+)":\s*\{([\s\S]*?)\n  \},/g)];
  assert.equal(entradas.length, 5, `esperava 5 chefes, li ${entradas.length}`);

  for (const [, nome, corpo] of entradas) {
    const p = corpo.match(/power:\s*\{([\s\S]*?)\}/);
    assert.ok(p, `${nome} não declara power`);
    const manifesto = ASSETS.match(
      new RegExp(`"${nome}": bossAnims\\("${nome}", \\d+, \\[([\\s\\S]*?)\\]\\)`),
    );
    assert.ok(manifesto, `${nome} não está no manifesto`);
    for (const campo of ["windup", "strike"]) {
      const anim = p[1].match(new RegExp(`${campo}: "([a-z-]+)"`));
      assert.ok(anim, `${nome}.power.${campo} ausente`);
      assert.match(manifesto[1], new RegExp(`\\["${anim[1]}"`),
        `${nome}.power.${campo} aponta para "${anim[1]}", que ele não tem`);
    }
  }
});

check("no boss wastes its power on an animation it already attacks with", () => {
  // O poder precisa LER como outra coisa. Se fosse a mesma animação do soco, a
  // recuada não seria telegrafia de nada.
  const bloco = GAME.match(/const BOSS_STATS = \{[\s\S]*?\n\};/)[0];
  for (const [, nome, corpo] of bloco.matchAll(/"([a-z-]+)":\s*\{([\s\S]*?)\n  \},/g)) {
    const ataques = [...corpo.matchAll(/attackAnim(?:Alt)?: "([a-z-]+)"/g)].map((m) => m[1]);
    const p = corpo.match(/power:\s*\{([\s\S]*?)\}/)[1];
    for (const campo of ["windup", "strike"]) {
      const anim = p.match(new RegExp(`${campo}: "([a-z-]+)"`))[1];
      assert.ok(!ataques.includes(anim),
        `${nome}: o poder usa "${anim}", que já é ataque comum`);
    }
  }
});

check("the game loop drives the machine and forces the animation", () => {
  assert.match(GAME, /powerStep\(e, player, stats\?\.power, dt\)/);
  // forcePlay e não play: a carga tem prioridade sobre o walk/idle que o bloco
  // de animação tentaria pôr por cima, do mesmo jeito que o ataque comum.
  assert.match(GAME, /eAnim\.forcePlay\(passo\.anim\)/);
});
