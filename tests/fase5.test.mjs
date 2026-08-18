// A pool da fase 5 é um apanhado do jogo inteiro: os três dela mais o inimigo
// mais forte de cada etapa anterior. Este teste recalcula essa regra a partir
// de ENEMY_STATS, então mexer no dano de um inimigo qualquer denuncia aqui se
// a lista deixou de valer.
import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

const GAME = source("src/components/games/KungFuCastle.jsx");

const stats = {};
for (const m of GAME.match(/const ENEMY_STATS = \{[\s\S]*?\n\};/)[0]
  .matchAll(/"([a-z-]+)":[^\n]*?hp: (\d+),\s*speed: [\d.]+,\s*damage: (\d+)/g)) {
  stats[m[1]] = { hp: Number(m[2]), dmg: Number(m[3]) };
}

const pools = {};
for (const m of GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/)[0]
  .matchAll(/(\d+):\s*\{[\s\S]*?enemies: \[([^\]]*)\]/g)) {
  pools[m[1]] = [...m[2].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]);
}

/** Maior dano; empate desfeito por vida. */
const maisForte = (tipos) =>
  tipos.slice().sort((a, b) => stats[b].dmg - stats[a].dmg || stats[b].hp - stats[a].hp)[0];

check("every phase pool was parsed with known enemies", () => {
  assert.equal(Object.keys(pools).length, 5);
  for (const [f, p] of Object.entries(pools)) {
    assert.ok(p.length >= 3, `fase ${f} tem só ${p.length} inimigos`);
    for (const t of p) assert.ok(stats[t], `fase ${f}: ${t} não está em ENEMY_STATS`);
  }
});

check("phase 5 includes the strongest enemy of every earlier phase", () => {
  for (const f of [1, 2, 3, 4]) {
    const forte = maisForte(pools[f]);
    assert.ok(pools[5].includes(forte),
      `fase 5 deveria trazer ${forte}, o mais forte da fase ${f}`);
  }
});

check("phase 5 keeps the three it was designed with", () => {
  for (const t of ["samurai", "kunoichi", "ninja-espada"]) {
    assert.ok(pools[5].includes(t), `fase 5 perdeu ${t}`);
  }
});

check("phase 5 has no enemy that belongs to no phase", () => {
  // Um inimigo que só aparece na 5 seria uma estreia no último andar — a fase
  // é reencontro, não novidade.
  const anteriores = new Set([...pools[1], ...pools[2], ...pools[3], ...pools[4]]);
  for (const t of pools[5]) {
    assert.ok(anteriores.has(t), `${t} aparece só na fase 5`);
  }
});
