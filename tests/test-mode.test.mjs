// Test-mode phase selector: `?tst=t` exposes buttons that start the game at a
// chosen phase, optionally with the boss spawning immediately.
import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

const GAME = source("src/components/games/KungFuCastle.jsx");

// ── The boss trigger is data, not a literal buried in update() ───────────────

check("the boss kill threshold has a module-level default of 100", () => {
  assert.match(GAME, /const BOSS_KILL_THRESHOLD_DEFAULT\s*=\s*100/);
});

check("update() reads the threshold from game state, not a local constant", () => {
  const fn = GAME.match(/function update\(game, keys, dt\)[\s\S]*?\n\}/);
  assert.ok(fn, "update() not found");
  assert.ok(
    !/const BOSS_KILL_THRESHOLD\s*=\s*\d+/.test(fn[0]),
    "the hardcoded local constant must be gone — the selector cannot override it",
  );
  assert.match(fn[0], /game\.bossKillThreshold/);
});

check("the game state carries bossKillThreshold, defaulted", () => {
  assert.match(GAME, /bossKillThreshold:\s*BOSS_KILL_THRESHOLD_DEFAULT/);
});

check("loadPhase does not clobber the threshold", () => {
  const fn = GAME.match(/function loadPhase[\s\S]*?\n\}/);
  assert.ok(fn, "loadPhase not found");
  assert.ok(
    !/bossKillThreshold/.test(fn[0]),
    "resetting it in loadPhase would kill the boss shortcut on a phase change",
  );
});

check("the HUD shows the real threshold, not a hardcoded 100", () => {
  const hud = GAME.match(/scoreText\.text\s*=[^;]+;/);
  assert.ok(hud, "score/KO HUD line not found");
  assert.ok(
    !/\/100/.test(hud[0]),
    "a hardcoded /100 would lie whenever the threshold is overridden",
  );
  assert.match(hud[0], /bossKillThreshold/);
});

// ── The selector itself ─────────────────────────────────────────────────────

check("the selector is gated behind test mode", () => {
  const block = GAME.match(/MODO TESTE[\s\S]{0,1200}/);
  assert.ok(block, "test-mode block not found");
  const before = GAME.slice(0, GAME.indexOf("MODO TESTE"));
  assert.match(
    before.slice(-400),
    /isTstMode\s*&&/,
    "the phase selector must only render when ?tst=t is set",
  );
});

check("the phase buttons derive from PHASE_CONFIG, not a hardcoded list", () => {
  const block = GAME.match(/MODO TESTE[\s\S]{0,1600}/)[0];
  assert.match(
    block,
    /Object\.keys\(PHASE_CONFIG\)/,
    "a hardcoded roster would silently stop covering phases 3-5 when they are added",
  );
});

check("each phase offers both a normal start and a boss shortcut", () => {
  const block = GAME.match(/MODO TESTE[\s\S]{0,1600}/)[0];
  assert.match(block, /startTest\(\s*n\s*,\s*false\s*\)/);
  assert.match(block, /startTest\(\s*n\s*,\s*true\s*\)/);
});

// ── Wiring into the PixiJS scene ────────────────────────────────────────────

check("the boss shortcut zeroes the threshold before the ticker starts", () => {
  assert.match(GAME, /startAtBoss\s*\)?\s*\)?\s*scene\.bossKillThreshold\s*=\s*0/);
});

check("a non-default start phase is loaded after the scene is built", () => {
  const idx = GAME.indexOf("const scene = await buildScene(app)");
  assert.ok(idx > -1, "buildScene call not found");
  const after = GAME.slice(idx, idx + 600);
  assert.match(after, /loadPhase\(scene,\s*startPhase\)/);
});

check("startPhase and startAtBoss are React state, so a restart keeps them", () => {
  assert.match(GAME, /const \[startPhase, setStartPhase\] = useState\(1\)/);
  assert.match(GAME, /const \[startAtBoss, setStartAtBoss\] = useState\(false\)/);
});
