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

/** The tint an enemy actually spawns with: its own override, else the class default. */
function tintFor(type) {
  const block = GAME.match(/const ENEMY_STATS = \{[\s\S]*?\n\};/);
  assert.ok(block, "ENEMY_STATS not found");
  const entry = block[0].split("\n").find((l) => l.includes(`"${type}":`));
  assert.ok(entry, `${type} not found in ENEMY_STATS`);
  const own = entry.match(/tint:\s*(0x[0-9a-f]{6})/);
  return own ? Number(own[1]) : ENEMY_TINT;
}

/** Luma of a tint, as the fraction of the original brightness it leaves. */
const tintFactor = (t) =>
  (0.2126 * ((t >> 16) & 255) + 0.7152 * ((t >> 8) & 255) + 0.0722 * (t & 255)) / 255;

/**
 * Mean luma of a sheet's body pixels. Outline and hair sit below DARK_FLOOR and
 * are excluded — they are the same near-black on every character, so including
 * them would drag both means toward each other and hide the very gap we measure.
 */
const DARK_FLOOR = 55;
async function bodyStats(relPath) {
  const { data, info } = await sharp(repoPath(relPath)).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  let luma = 0;
  let chroma = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 16) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (l <= DARK_FLOOR) continue;
    const max = Math.max(r, g, b);
    luma += l;
    chroma += max > 0 ? (max - Math.min(r, g, b)) / max : 0;
    n++;
  }
  assert.ok(n > 0, `${relPath} has no body pixels above the dark floor`);
  return { luma: luma / n, chroma: chroma / n };
}

const PLAYER_IDLE = "public/images/kungfucastle/player/idle.png";
const ENEMY_DIR = "public/images/kungfucastle/enemies";
const BOSS_DIR = "public/images/kungfucastle/bosses";

// Every enemy that ships an idle sheet, so a new enemy is covered the day it
// lands rather than the day someone remembers to add it here.
const enemies = fs
  .readdirSync(repoPath(ENEMY_DIR))
  .filter((d) => fs.existsSync(repoPath(`${ENEMY_DIR}/${d}/idle.png`)))
  .sort();

// Boss art comes from a different generation lineage than the anchor cast, so
// it needs the same measured check rather than trusting BOSS_TINT's ordering.
const bosses = fs
  .readdirSync(repoPath(BOSS_DIR))
  .filter((d) => fs.existsSync(repoPath(`${BOSS_DIR}/${d}/idle.png`)))
  .sort();

const playerLuma = (await bodyStats(PLAYER_IDLE)).luma;
const enemyLuma = {};
const enemyChroma = {};
for (const e of enemies) {
  const s = await bodyStats(`${ENEMY_DIR}/${e}/idle.png`);
  enemyLuma[e] = s.luma;
  enemyChroma[e] = s.chroma;
}
const bossLuma = {};
for (const b of bosses) bossLuma[b] = (await bodyStats(`${BOSS_DIR}/${b}/idle.png`)).luma;

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

check("spawnEnemy applies the per-type tint, falling back to ENEMY_TINT", () => {
  assert.match(GAME, /function spawnEnemy[\s\S]*?tint = stats\.tint \?\? ENEMY_TINT/);
});

// The three phase-1 thugs spawn together and share a silhouette, so each pair
// needs SOME channel keeping them apart. Branco and cinza both wear neutral
// cloth, so theirs has to be value. Rapido wears red — hue does that job, and
// forcing it onto the same luma ladder would be a rule invented for the test
// rather than for the screen.
check("capanga-branco reads lighter than capanga-cinza", () => {
  const branco = enemyLuma["capanga-branco"] * tintFactor(tintFor("capanga-branco"));
  const cinza = enemyLuma["capanga-cinza"] * tintFactor(tintFor("capanga-cinza"));
  assert.ok(
    cinza <= branco * 0.92,
    `cinza ${cinza.toFixed(1)} vs branco ${branco.toFixed(1)} — they wear the same ` +
      `neutral cloth, so 8% is the smallest gap that separates them at 48px`,
  );
});

check("capanga-rapido separates by hue, not value", () => {
  assert.ok(
    enemyChroma["capanga-rapido"] >= 0.35,
    `rapido's mean chroma is ${enemyChroma["capanga-rapido"].toFixed(2)} — the red ` +
      `tunic is what tells it apart from the other two thugs`,
  );
  for (const t of ["capanga-branco", "capanga-cinza"]) {
    assert.ok(
      enemyChroma[t] < enemyChroma["capanga-rapido"],
      `${t} (${enemyChroma[t].toFixed(2)}) should be less saturated than rapido`,
    );
  }
});

check("spawnBoss applies BOSS_TINT", () => {
  assert.match(GAME, /function spawnBoss[\s\S]*?tint = BOSS_TINT/);
});

check("at least one enemy is found to measure", () => {
  assert.ok(enemies.length > 0, `no idle sheets under ${ENEMY_DIR}`);
});

// 0.85 is the loosest gap that still reads on screen: the hero's robe clips to
// white, so an enemy at 0.9 of his luma is a shade, not a different character.
const GAP = 0.85;
const separates = (name, luma, tint) => {
  const onScreen = luma * tintFactor(tint);
  assert.ok(
    onScreen <= playerLuma * GAP,
    `${name} at ${onScreen.toFixed(1)} vs player ${playerLuma.toFixed(1)} ` +
      `— needs <= ${(playerLuma * GAP).toFixed(1)}`,
  );
};

for (const e of enemies) {
  check(`${e} reads clearly darker than the player once tinted`, () =>
    separates(e, enemyLuma[e], tintFor(e)));
}

check("at least one boss is found to measure", () => {
  assert.ok(bosses.length > 0, `no idle sheets under ${BOSS_DIR}`);
});

for (const b of bosses) {
  check(`${b} reads clearly darker than the player once tinted`, () =>
    separates(b, bossLuma[b], BOSS_TINT));
}
