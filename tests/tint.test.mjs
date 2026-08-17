// Value separation between the player and the rest of the cast.
//
// The art itself cannot carry this: PixelLab generates every character from the
// same anchor, so the hero and a white-tunic thug come out at nearly the same
// luma. The separation is applied at runtime with sprite.tint, which costs no
// generations and can be retuned without touching a single PNG.
//
// These checks read the shipped sheets, so regenerating a character with a
// brighter palette fails here instead of silently making the enemies look like
// the player.
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath } from "./helpers.mjs";
import sharp from "sharp";

const GAME = source("src/components/games/KungFuCastle.jsx");

const hex = (name) => {
  const m = GAME.match(new RegExp(`const ${name} = (0x[0-9a-f]{6});`));
  assert.ok(m, `${name} not found in KungFuCastle.jsx`);
  return Number(m[1]);
};

const ENEMY_TINT = hex("ENEMY_TINT");
const BOSS_TINT = hex("BOSS_TINT");

/** Luma of a tint, as the fraction of the original brightness it leaves. */
const tintFactor = (t) =>
  (0.2126 * ((t >> 16) & 255) + 0.7152 * ((t >> 8) & 255) + 0.0722 * (t & 255)) / 255;

/**
 * Mean luma of a sheet's body pixels. Outline and hair sit below DARK_FLOOR and
 * are excluded — they are the same near-black on every character, so including
 * them would drag both means toward each other and hide the very gap we measure.
 */
const DARK_FLOOR = 55;
async function bodyLuma(relPath) {
  const { data, info } = await sharp(repoPath(relPath)).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  let sum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 16) continue;
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (l <= DARK_FLOOR) continue;
    sum += l;
    n++;
  }
  assert.ok(n > 0, `${relPath} has no body pixels above the dark floor`);
  return sum / n;
}

const PLAYER_IDLE = "public/images/kungfucastle/player/idle.png";
const ENEMY_DIR = "public/images/kungfucastle/enemies";

// Every enemy that ships an idle sheet, so a new enemy is covered the day it
// lands rather than the day someone remembers to add it here.
const enemies = fs
  .readdirSync(repoPath(ENEMY_DIR))
  .filter((d) => fs.existsSync(repoPath(`${ENEMY_DIR}/${d}/idle.png`)))
  .sort();

const playerLuma = await bodyLuma(PLAYER_IDLE);
const enemyLuma = {};
for (const e of enemies) enemyLuma[e] = await bodyLuma(`${ENEMY_DIR}/${e}/idle.png`);

check("the player is never tinted", () => {
  // The player sprite is built inline, not in a spawn function — match the
  // variable instead, and fail loudly if that variable is ever renamed.
  assert.match(GAME, /const playerSprite = new Sprite\(/, "playerSprite was renamed");
  assert.doesNotMatch(GAME, /playerSprite\.tint\s*=/, "the player sprite must stay untinted");
});

check("enemies are tinted darker than bosses, bosses darker than the player", () => {
  assert.ok(tintFactor(ENEMY_TINT) < tintFactor(BOSS_TINT), "enemies must be the darkest");
  assert.ok(tintFactor(BOSS_TINT) < 1, "bosses must sit below the player");
});

check("spawnEnemy applies ENEMY_TINT", () => {
  assert.match(GAME, /function spawnEnemy[\s\S]*?tint = ENEMY_TINT/);
});

check("spawnBoss applies BOSS_TINT", () => {
  assert.match(GAME, /function spawnBoss[\s\S]*?tint = BOSS_TINT/);
});

check("at least one enemy is found to measure", () => {
  assert.ok(enemies.length > 0, `no idle sheets under ${ENEMY_DIR}`);
});

// 0.85 is the loosest gap that still reads on screen: the hero's robe clips to
// white, so an enemy at 0.9 of his luma is a shade, not a different character.
for (const e of enemies) {
  check(`${e} reads clearly darker than the player once tinted`, () => {
    const onScreen = enemyLuma[e] * tintFactor(ENEMY_TINT);
    assert.ok(
      onScreen <= playerLuma * 0.85,
      `${e} at ${onScreen.toFixed(1)} vs player ${playerLuma.toFixed(1)} ` +
        `— needs <= ${(playerLuma * 0.85).toFixed(1)}`,
    );
  });
}
