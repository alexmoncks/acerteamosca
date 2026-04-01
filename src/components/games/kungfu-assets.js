/**
 * kungfu-assets.js
 * Asset manifest, sprite sheet cutter, and async loader for Kung Fu Castle.
 * Pure texture module — no game logic, containers, or sprites.
 */

import { Assets, Texture, Rectangle } from "pixi.js";

// ── Constants ──────────────────────────────────────────────────────────────
const FRAME_H = 48; // All sprites use 48×48 square frames

// ── Asset manifest ─────────────────────────────────────────────────────────

const ASSET_MANIFEST = {
  player: {
    frameH: FRAME_H,
    anims: {
      idle:    { src: "/images/kungfucastle/player/idle.png",        speed: 0.08, loop: true  },
      walk:    { src: "/images/kungfucastle/player/walk.png",        speed: 0.12, loop: true  },
      punch:   { src: "/images/kungfucastle/player/punch.png",       speed: 0.15, loop: false, next: "idle" },
      kick:    { src: "/images/kungfucastle/player/kick.png",        speed: 0.15, loop: false, next: "idle" },
      flyKick: { src: "/images/kungfucastle/player/flying-kick.png", speed: 0.15, loop: false, next: "idle" },
      sweep:   { src: "/images/kungfucastle/player/sweep.png",       speed: 0.15, loop: false, next: "idle" },
      jump:    { src: "/images/kungfucastle/player/jump.png",        speed: 0.10, loop: false },
      crouch:  { src: "/images/kungfucastle/player/crouch.png",      speed: 0.10, loop: false },
      hit:     { src: "/images/kungfucastle/player/hit.png",         speed: 0.12, loop: false, next: "idle" },
      special: { src: "/images/kungfucastle/player/special.png",     speed: 0.12, loop: false, next: "idle" },
    },
  },

  enemies: buildEnemyManifest(),
};

/**
 * Helper — build the anims map for one enemy type.
 * Each entry is [animName, opts] where opts may include a `file` override.
 */
function enemyAnims(type, animDefs) {
  const anims = {};
  for (const [name, opts] of animDefs) {
    const { file, speed, loop, next } = opts;
    const filename = file ?? name;
    anims[name] = {
      src: `/images/kungfucastle/enemies/${type}/${filename}.png`,
      speed,
      loop,
      ...(next !== undefined ? { next } : {}),
    };
  }
  return { frameH: FRAME_H, anims };
}

function buildEnemyManifest() {
  return {
    "capanga-branco": enemyAnims("capanga-branco", [
      ["idle",  { speed: 0.08, loop: true  }],
      ["walk",  { speed: 0.12, loop: true  }],
      ["punch", { speed: 0.15, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "capanga-cinza": enemyAnims("capanga-cinza", [
      ["idle",  { speed: 0.08, loop: true  }],
      ["walk",  { speed: 0.12, loop: true  }],
      ["punch", { speed: 0.15, loop: false, next: "idle" }],
      ["kick",  { speed: 0.15, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "capanga-rapido": enemyAnims("capanga-rapido", [
      ["idle",  { speed: 0.08, loop: true  }],
      ["walk",  { file: "run", speed: 0.14, loop: true  }],
      ["punch", { speed: 0.18, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "guarda-bastao": enemyAnims("guarda-bastao", [
      ["idle",  { speed: 0.08, loop: true  }],
      ["walk",  { speed: 0.10, loop: true  }],
      ["punch", { speed: 0.15, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "atirador": enemyAnims("atirador", [
      ["idle",   { speed: 0.08, loop: true  }],
      ["walk",   { speed: 0.12, loop: true  }],
      ["attack", { file: "throw", speed: 0.12, loop: false, next: "idle" }],
      ["hit",    { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "ninja": enemyAnims("ninja", [
      ["idle",  { speed: 0.08, loop: true  }],
      ["walk",  { speed: 0.14, loop: true  }],
      ["punch", { speed: 0.18, loop: false, next: "idle" }],
      ["kick",  { speed: 0.18, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "ninja-espada": enemyAnims("ninja-espada", [
      ["idle",   { speed: 0.08, loop: true  }],
      ["walk",   { speed: 0.12, loop: true  }],
      ["attack", { file: "slash", speed: 0.15, loop: false, next: "idle" }],
      ["kick",   { speed: 0.15, loop: false, next: "idle" }],
      ["hit",    { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "samurai": enemyAnims("samurai", [
      ["idle",  { speed: 0.08, loop: true  }],
      ["walk",  { speed: 0.10, loop: true  }],
      ["punch", { speed: 0.15, loop: false, next: "idle" }],
      ["kick",  { speed: 0.15, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "kunoichi": enemyAnims("kunoichi", [
      ["idle",   { speed: 0.08, loop: true  }],
      ["walk",   { file: "run",         speed: 0.14, loop: true  }],
      ["attack", { file: "flying-kick", speed: 0.15, loop: false, next: "idle" }],
      ["hit",    { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "lancador-bomba": enemyAnims("lancador-bomba", [
      ["idle",   { speed: 0.08, loop: true  }],
      ["walk",   { speed: 0.10, loop: true  }],
      ["attack", { file: "throw", speed: 0.12, loop: false, next: "idle" }],
      ["hit",    { speed: 0.12, loop: false, next: "idle" }],
    ]),
  };
}

// ── Sprite sheet cutter ────────────────────────────────────────────────────

/**
 * Cut a horizontal sprite strip into an array of individual Textures.
 *
 * Assumes all frames are square: width = frameH × frameCount.
 *
 * @param {Texture} texture  The loaded base texture (horizontal strip)
 * @param {number}  frameH   Height (and width) of each square frame in pixels
 * @returns {Texture[]}      Array of frame textures left-to-right
 */
export function cutSpriteSheet(texture, frameH) {
  const frameCount = Math.round(texture.width / frameH);
  const frames = [];

  for (let i = 0; i < frameCount; i++) {
    const rect = new Rectangle(i * frameH, 0, frameH, frameH);
    frames.push(new Texture({ source: texture.source, frame: rect }));
  }

  return frames;
}

// ── Loader ─────────────────────────────────────────────────────────────────

/**
 * Load all assets defined in ASSET_MANIFEST in parallel, cut sprite sheets,
 * and return organised texture maps.
 *
 * @returns {Promise<{ player: AnimMap, enemies: { [type: string]: AnimMap } }>}
 *
 * AnimMap = { [animName]: { frames: Texture[], speed: number, loop: boolean, next?: string } }
 */
export async function loadAllAssets() {
  // 1. Collect every unique source path across the whole manifest
  const srcSet = new Set();

  for (const anim of Object.values(ASSET_MANIFEST.player.anims)) {
    srcSet.add(anim.src);
  }
  for (const enemy of Object.values(ASSET_MANIFEST.enemies)) {
    for (const anim of Object.values(enemy.anims)) {
      srcSet.add(anim.src);
    }
  }

  const paths = [...srcSet];

  // 2. Load all textures in parallel
  const textureMap = await Assets.load(paths);
  // Assets.load(string[]) resolves to { [src]: Texture }

  // 3. Helper — build an AnimMap from a manifest section
  function buildAnimMap({ frameH, anims }) {
    const result = {};
    for (const [name, def] of Object.entries(anims)) {
      const texture = textureMap[def.src];
      if (!texture) {
        console.warn(`[kungfu-assets] Texture not found for: ${def.src}`);
        continue;
      }
      const entry = {
        frames: cutSpriteSheet(texture, frameH),
        speed: def.speed,
        loop: def.loop,
      };
      if (def.next !== undefined) entry.next = def.next;
      result[name] = entry;
    }
    return result;
  }

  // 4. Build player AnimMap
  const player = buildAnimMap(ASSET_MANIFEST.player);

  // 5. Build enemy AnimMaps
  const enemies = {};
  for (const [type, manifest] of Object.entries(ASSET_MANIFEST.enemies)) {
    enemies[type] = buildAnimMap(manifest);
  }

  // 6. Return organised texture maps
  return { player, enemies };
}
