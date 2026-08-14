import assert from "node:assert/strict";
import { check, near, source, repoPath } from "./helpers.mjs";
import fs from "node:fs";

const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");
const konst = (n) => parseFloat(GAME.match(new RegExp(`const ${n}\\s*=\\s*(-?[\\d.]+)`))[1]);

check("backflip.png exists", () => {
  assert.ok(fs.existsSync(repoPath("public/images/kungfucastle/player/backflip.png")));
});

check("backflip is registered as a player animation", () => {
  assert.match(ASSETS, /backflip:\s*\{[^}]*player\/backflip\.png/);
});

check("the animation spans the whole dodge", () => {
  const speed = parseFloat(ASSETS.match(/backflip:\s*\{[^}]*speed:\s*([\d.]+)/)[1]);
  near(10 / speed, konst("DODGE_DURATION"), 2);
});

check("dodge lasts 28 frames and cools down for 40", () => {
  assert.equal(konst("DODGE_DURATION"), 28);
  assert.equal(konst("DODGE_COOLDOWN"), 40);
});

check("dodge clears the enemy's 23px combat range", () => {
  assert.ok(konst("DODGE_SPEED") * konst("DODGE_DURATION") > 23 * 1.8);
});

check("the double-tap compares the facing stored when the timer was armed", () => {
  assert.match(GAME, /tapFacing\.left\s*===\s*1/);
  assert.match(GAME, /tapFacing\.right\s*===\s*-1/);
});

check("same-direction double-tap still starts a run", () => {
  assert.match(GAME, /player\.running\s*=\s*player\.tapTimer\.left\s*>\s*0/);
});

check("the dodge reuses the attack lock, so input is blocked and damage is nil", () => {
  const fn = GAME.match(/function startDodge[\s\S]*?\n\}/);
  assert.ok(fn, "startDodge not found");
  assert.match(fn[0], /player\.attacking\s*=\s*true/);
  assert.match(fn[0], /player\.attackType\s*=\s*null/);
  assert.match(fn[0], /player\.facing\s*=\s*originalFacing/);
});

check("enemy damage stays gated on !player.attacking", () => {
  assert.match(GAME, /if \(!player\.attacking\) \{\n\s*player\.hp -= e\.damage/);
});

check("a dodge cannot start while airborne, busy, or on cooldown", () => {
  const fn = GAME.match(/function canDodge[\s\S]*?\n\}/);
  assert.ok(fn, "canDodge not found");
  for (const g of ["grounded", "attacking", "dodging", "dodgeCooldown"]) {
    assert.match(fn[0], new RegExp(g), `canDodge must check ${g}`);
  }
});
