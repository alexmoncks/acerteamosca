import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

const GAME = source("src/components/games/KungFuCastle.jsx");

check("phase 2 is configured with its three enemies and its boss", () => {
  const block = GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/)[0];
  const entry = block.match(/\n  2:\s*\{[\s\S]*?\n  \},/);
  assert.ok(entry, "PHASE_CONFIG[2] not found");
  for (const e of ["guarda-bastao", "ninja", "kunoichi"]) {
    assert.match(entry[0], new RegExp(`"${e}"`), `phase 2 must spawn ${e}`);
  }
  assert.match(entry[0], /boss:\s*"guardiao-portao"/);
});

check("phase 2 does not reuse phase 1's enemies", () => {
  const block = GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/)[0];
  const entry = block.match(/\n  2:\s*\{[\s\S]*?\n  \},/)[0];
  for (const e of ["capanga-branco", "capanga-cinza", "capanga-rapido"]) {
    assert.ok(!entry.includes(`"${e}"`), `phase 2 should not spawn ${e}`);
  }
});

check("the Guardião has stats matching the design doc", () => {
  const entry = GAME.match(/"guardiao-portao":\s*\{[\s\S]*?\n  \},/);
  assert.ok(entry, "BOSS_STATS['guardiao-portao'] not found");
  assert.match(entry[0], /hp:\s*35/);
  assert.match(entry[0], /score:\s*1500/);
  assert.match(entry[0], /frameSize:\s*68/);
  assert.match(entry[0], /spriteFacing:\s*-1/);
});

check("the Guardião's hitbox matches the measured sprite ({ w: 36, h: 52, ox: 17, oy: 7 })", () => {
  const entry = GAME.match(/"guardiao-portao":\s*\{[\s\S]*?\n  \},/);
  assert.ok(entry, "BOSS_STATS['guardiao-portao'] not found");
  const hitbox = entry[0].match(/hitbox:\s*\{([\s\S]*?)\}/);
  assert.ok(hitbox, "guardiao-portao.hitbox not found");
  // Tolerant of reformatting (line breaks, field order) but strict on each
  // number: this hitbox is what decides whether a standing punch can reach
  // the boss (see task-5-report.md), so a corrupted ox must fail loudly.
  const measured = { w: 36, h: 52, ox: 17, oy: 7 };
  for (const [field, value] of Object.entries(measured)) {
    assert.match(
      hitbox[1],
      new RegExp(`\\b${field}:\\s*${value}\\b`),
      `guardiao-portao.hitbox.${field} should be ${value}`
    );
  }
});

check("MAX_PHASE derives from PHASE_CONFIG and the phases are contiguous from 1", () => {
  // Antes isto fixava o número 2 e virava tarefa a cada fase nova. O que
  // importa não é o valor: é que MAX_PHASE saia de PHASE_CONFIG (e não de um
  // literal que envelhece) e que não haja buraco na numeração — uma fase 4 sem
  // fase 3 faria o jogo pular de fase sem cenário.
  assert.match(GAME, /const MAX_PHASE = Math\.max\(\.\.\.Object\.keys\(PHASE_CONFIG\)/);
  const block = GAME.match(/const PHASE_CONFIG = \{[\s\S]*?\n\};/)[0];
  const phases = [...block.matchAll(/^\s{2}(\d+):\s*\{/gm)].map((m) => Number(m[1])).sort((a, b) => a - b);
  assert.ok(phases.length >= 2, `só ${phases.length} fase(s) em PHASE_CONFIG`);
  assert.deepEqual(phases, phases.map((_, i) => i + 1), `numeração com buraco: ${phases}`);
});
