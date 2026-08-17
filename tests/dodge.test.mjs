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

check("the dodge reuses the attack lock, so input is blocked during the flip", () => {
  const fn = GAME.match(/function startDodge[\s\S]*?\n\}/);
  assert.ok(fn, "startDodge not found");
  assert.match(fn[0], /player\.attacking\s*=\s*true/);
  assert.match(fn[0], /player\.attackType\s*=\s*null/);
  assert.match(fn[0], /player\.facing\s*=\s*originalFacing/);
});

check("the dodge raises its own invulnerability flag, not the attack lock's", () => {
  // The flip used to be invulnerable only because `attacking` was truthy and
  // enemy damage was gated on `!player.attacking`. That gate made EVERY punch
  // invulnerable too, so mashing attack beat dodging. Immunity is now read
  // from `player.dodging` in enemyHitLands; see tests/enemy-attack.test.mjs.
  const fn = GAME.match(/function startDodge[\s\S]*?\n\}/);
  assert.match(fn[0], /player\.dodging\s*=\s*true/);
  assert.match(
    GAME,
    /tickAttackImpact\(/,
    "enemy damage must resolve through tickAttackImpact, which reads player.dodging",
  );
});

/**
 * Assert that `expr` (e.g. "player.grounded") appears in `body` with the
 * given polarity — i.e. whether the nearest non-whitespace character before
 * it is a "!". Plain indexOf + backward scan, so it's robust to whitespace
 * and line breaks but still catches a stray "!" no matter how it's spaced.
 */
function assertGatePolarity(body, expr, negated) {
  const i = body.indexOf(expr);
  assert.ok(i > -1, `${expr} not found in canDodge`);
  let j = i - 1;
  while (j >= 0 && /\s/.test(body[j])) j--;
  const isNegated = body[j] === "!";
  assert.equal(
    isNegated,
    negated,
    `${expr} must be ${negated ? "negated (!" + expr + ")" : "unnegated (not !" + expr + ")"}`
  );
}

check("a dodge cannot start while airborne, busy, or on cooldown", () => {
  const fn = GAME.match(/function canDodge[\s\S]*?\n\}/);
  assert.ok(fn, "canDodge not found");
  const body = fn[0];
  assertGatePolarity(body, "player.grounded", false);
  assertGatePolarity(body, "player.attacking", true);
  assertGatePolarity(body, "player.dodging", true);
  assertGatePolarity(body, "player.crouching", true);
  assert.match(body, /player\.dodgeCooldown\s*<=\s*0/, "canDodge must check dodgeCooldown <= 0");
});
