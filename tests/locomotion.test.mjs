// Foot-slide check: the walk/run cadence must match how fast the character
// actually moves across the ground.
//
// AnimController advances `speed × dt` frames per tick, so a cycle lasts
// `frames / speed` ticks and covers `moveSpeed × frames / speed` pixels. When
// that distance drifts from the drawn stride the feet skate — cadence too fast
// reads as running in place, too slow as moonwalking. This bit the player's
// run, which had inherited the walk's 0.16 while moving at 2.3× the speed.
//
// Everything here is derived, not asserted by hand: frame counts come from the
// shipped PNGs, move speeds from ENEMY_STATS, cadence from the manifest. A new
// enemy with a copied-from-the-neighbour cadence fails the day it lands.
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath } from "./helpers.mjs";
import sharp from "sharp";

const GAME = source("src/components/games/KungFuCastle.jsx");
const ASSETS = source("src/components/games/kungfu-assets.js");

const num = (name, src = GAME) => {
  const m = src.match(new RegExp(`const ${name} = ([\\d.]+);`));
  assert.ok(m, `${name} not found`);
  return Number(m[1]);
};

const WALK_CYCLE_PX = num("WALK_CYCLE_PX", ASSETS);
const RUN_CYCLE_PX = num("RUN_CYCLE_PX", ASSETS);
const PLAYER_WALK_SPEED = num("PLAYER_WALK_SPEED");
const PLAYER_RUN_SPEED = num("PLAYER_RUN_SPEED");

/** Number of square frames in a horizontal strip. */
async function frameCount(relPath) {
  const m = await sharp(repoPath(relPath)).metadata();
  return Math.round(m.width / m.height);
}

/** ENEMY_STATS.speed per enemy type, read from the game source. */
function enemySpeeds() {
  const block = GAME.match(/const ENEMY_STATS = \{[\s\S]*?\n\};/);
  assert.ok(block, "ENEMY_STATS not found");
  const out = {};
  for (const m of block[0].matchAll(/"([a-z-]+)":\s*\{[^}]*?speed:\s*([\d.]+)/g)) {
    out[m[1]] = Number(m[2]);
  }
  return out;
}

/**
 * The `["walk", {...}]` entry of one enemy's manifest block: which file it
 * points at (walk unless overridden) and the cadence it was given.
 */
function walkEntry(type) {
  const block = ASSETS.match(
    new RegExp(`"${type}": enemyAnims\\("${type}", \\[[\\s\\S]*?\\n    \\]\\)`),
  );
  assert.ok(block, `manifest block for ${type} not found`);
  const line = block[0].split("\n").find((l) => l.includes('["walk"'));
  assert.ok(line, `${type} has no walk entry`);
  const file = line.match(/file:\s*"([\w-]+)"/)?.[1] ?? "walk";
  const loco = line.match(/locoSpeed\((\d+),\s*([\d.]+)(?:,\s*(\w+))?\)/);
  const literal = line.match(/speed:\s*([\d.]+)/);
  return { file, loco, literal: literal ? Number(literal[1]) : null };
}

const speeds = enemySpeeds();
const types = Object.keys(speeds).sort();

// Frame counts have to be read before the synchronous checks run.
const frames = {};
for (const t of types) {
  const { file } = walkEntry(t);
  const p = `public/images/kungfucastle/enemies/${t}/${file}.png`;
  frames[t] = fs.existsSync(repoPath(p)) ? await frameCount(p) : null;
}
const playerWalkFrames = await frameCount("public/images/kungfucastle/player/walk.png");
const playerRunFrames = await frameCount("public/images/kungfucastle/player/run.png");

const cadence = (frameN, moveSpeed, cyclePx) =>
  Math.round((frameN * moveSpeed * 100) / cyclePx) / 100;

check("ENEMY_STATS parsed", () => {
  assert.ok(types.length >= 10, `only parsed ${types.length} enemies`);
});

check("the player's walk cadence is the reference the cycle lengths calibrate on", () => {
  assert.equal(cadence(playerWalkFrames, PLAYER_WALK_SPEED, WALK_CYCLE_PX), 0.16);
});

check("the player's run does not inherit the walk cadence", () => {
  const line = ASSETS.split("\n").find((l) => l.includes("player/run.png"));
  assert.ok(line, "player run entry not found");
  const m = line.match(/locoSpeed\((\d+),\s*([\d.]+),\s*RUN_CYCLE_PX\)/);
  assert.ok(m, "player run must derive its cadence from locoSpeed(..., RUN_CYCLE_PX)");
  assert.equal(Number(m[1]), playerRunFrames, "frame count in locoSpeed does not match run.png");
  assert.equal(Number(m[2]), PLAYER_RUN_SPEED, "move speed in locoSpeed is not PLAYER_RUN_SPEED");
});

for (const t of types) {
  const moveSpeed = speeds[t];

  // A stationary enemy never plays its walk, so there is no stride to match.
  if (moveSpeed === 0) {
    check(`${t} is stationary, so its walk cadence is unconstrained`, () => {
      assert.equal(moveSpeed, 0);
    });
    continue;
  }

  check(`${t} derives its walk cadence from its own move speed`, () => {
    const { file, loco, literal } = walkEntry(t);
    assert.ok(loco, `${t} walk must use locoSpeed(frames, moveSpeed[, cycle]), got ${literal}`);

    const [, declaredFrames, declaredSpeed, cycleName] = loco;
    assert.equal(
      Number(declaredFrames),
      frames[t],
      `${t}: locoSpeed says ${declaredFrames} frames, ${file}.png has ${frames[t]}`,
    );
    assert.equal(
      Number(declaredSpeed),
      moveSpeed,
      `${t}: locoSpeed says ${declaredSpeed} px/frame, ENEMY_STATS says ${moveSpeed}`,
    );

    // A run sheet covers more ground per cycle than a walk; using the walk
    // cycle for a sprint is exactly the bug this suite exists to catch.
    const expectedCycle = file === "run" ? "RUN_CYCLE_PX" : undefined;
    assert.equal(
      cycleName,
      expectedCycle,
      `${t}: ${file}.png should use ${expectedCycle ?? "the default walk cycle"}`,
    );
  });
}
