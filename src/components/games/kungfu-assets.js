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
      run:     { src: "/images/kungfucastle/player/run.png",         speed: 0.16, loop: true  },
      turn:    { src: "/images/kungfucastle/player/turn.png",        speed: 0.25, loop: false, next: "walk" },
      punch:   { src: "/images/kungfucastle/player/punch.png",       speed: 0.33, loop: false, next: "idle" },
      kick:    { src: "/images/kungfucastle/player/kick.png",        speed: 0.32, loop: false, next: "idle" },
      flyKick: { src: "/images/kungfucastle/player/flying-kick.png", speed: 0.22, loop: false, next: "idle" },
      sweep:   { src: "/images/kungfucastle/player/sweep.png",       speed: 0.27, loop: false, next: "idle" },
      jump:    { src: "/images/kungfucastle/player/jump.png",        speed: 0.28, loop: false },
      crouch:  { src: "/images/kungfucastle/player/crouch.png",      speed: 0.35, loop: false },
      hit:     { src: "/images/kungfucastle/player/hit.png",         speed: 0.12, loop: false, next: "idle" },
      special: { src: "/images/kungfucastle/player/special.png",     speed: 0.14, loop: false, next: "idle" },
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

// ── Boss manifest ─────────────────────────────────────────────────────────

function bossAnims(name, frameH, animList) {
  const base = `/images/kungfucastle/bosses/${name}`;
  const anims = {};
  for (const [animName, opts] of animList) {
    anims[animName] = {
      src: `${base}/${opts.file || animName}.png`,
      speed: opts.speed || 0.12,
      loop: opts.loop ?? false,
      next: opts.next,
    };
  }
  return { frameH, anims };
}

const BOSS_MANIFEST = {
  "mestre-capangas": bossAnims("mestre-capangas", 68, [
    ["idle",    { speed: 0.08, loop: true }],
    ["walk",    { speed: 0.10, loop: true }],
    ["punch",   { speed: 0.20, next: "idle" }],
    ["charge",  { speed: 0.18, next: "idle" }],
    ["stomp",   { speed: 0.15, next: "idle" }],
    ["grab",    { speed: 0.15, next: "idle" }],
    ["war-cry", { file: "war-cry", speed: 0.12, next: "idle" }],
    ["stunned", { speed: 0.10, loop: true }],
    ["windup",  { speed: 0.12, next: "punch" }],
    ["hit",     { speed: 0.15, next: "idle" }],
    ["death",   { speed: 0.08 }],
  ]),
};

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

// ── Scenery asset paths ───────────────────────────────────────────────────

const SCENERY_PATHS = [
  "/images/kungfucastle/tiles/fase1-jardim.png",
  "/images/kungfucastle/props/parallax-montanhas.png",
  "/images/kungfucastle/props/parallax-arvores.png",
  "/images/kungfucastle/props/cerejeira-sakura.png",
  "/images/kungfucastle/props/lanterna-ishidoro.png",
  "/images/kungfucastle/props/torii-vermelho.png",
  "/images/kungfucastle/props/pedra-decorativa.png",
  "/images/kungfucastle/props/cerca-bambu.png",
  "/images/kungfucastle/props/komainu.png",
  "/images/kungfucastle/props/portao-arco-pedra.png",
  "/images/kungfucastle/props/escada-pedra-externa.png",
];

// ── Loader ─────────────────────────────────────────────────────────────────

/**
 * Load all assets defined in ASSET_MANIFEST in parallel, cut sprite sheets,
 * and return organised texture maps.
 *
 * @returns {Promise<{ player: AnimMap, enemies: { [type: string]: AnimMap }, scenery: SceneryMap }>}
 *
 * AnimMap = { [animName]: { frames: Texture[], speed: number, loop: boolean, next?: string } }
 * SceneryMap = { tileset: Texture[], parallaxMountains: Texture, parallaxTrees: Texture, props: { [name]: Texture } }
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
  for (const boss of Object.values(BOSS_MANIFEST)) {
    for (const anim of Object.values(boss.anims)) {
      srcSet.add(anim.src);
    }
  }
  for (const path of SCENERY_PATHS) {
    srcSet.add(path);
  }

  const paths = [...srcSet];

  // 2. Load all textures in parallel (disable workers to avoid CSP blob: issues)
  Assets.setPreferences({ preferWorkers: false });
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

  // 6. Build boss AnimMaps
  const bosses = {};
  for (const [name, manifest] of Object.entries(BOSS_MANIFEST)) {
    bosses[name] = buildAnimMap(manifest);
  }

  // 7. Build scenery textures
  // Tileset: 128×128, 4×4 grid of 32×32 Wang tiles → 16 textures
  const tilesetSrc = textureMap["/images/kungfucastle/tiles/fase1-jardim.png"];
  const TILE_SIZE = 32;
  const tileset = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const rect = new Rectangle(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      tileset.push(new Texture({ source: tilesetSrc.source, frame: rect }));
    }
  }

  const parallaxMountains = textureMap["/images/kungfucastle/props/parallax-montanhas.png"];
  const parallaxTrees     = textureMap["/images/kungfucastle/props/parallax-arvores.png"];

  const PROP_NAMES = [
    "cerejeira-sakura",
    "lanterna-ishidoro",
    "torii-vermelho",
    "pedra-decorativa",
    "cerca-bambu",
    "komainu",
    "portao-arco-pedra",
    "escada-pedra-externa",
  ];
  const props = {};
  for (const name of PROP_NAMES) {
    const tex = textureMap[`/images/kungfucastle/props/${name}.png`];
    if (!tex) console.warn(`[kungfu-assets] Scenery prop not found: ${name}`);
    props[name] = tex;
  }

  const scenery = { tileset, parallaxMountains, parallaxTrees, props };

  // 7. Return organised texture maps
  return { player, enemies, bosses, scenery };
}
