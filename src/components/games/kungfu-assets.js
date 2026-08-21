/**
 * kungfu-assets.js
 * Asset manifest, sprite sheet cutter, and async loader for Kung Fu Castle.
 * Pure texture module — no game logic, containers, or sprites.
 */

import { Assets, Texture, Rectangle } from "pixi.js";
import { sceneryAssetPaths, sceneryTilesetNames } from "./kungfu-scenery";

// ── Constants ──────────────────────────────────────────────────────────────
const FRAME_H = 48; // All sprites use 48×48 square frames

// Cadência de locomoção — por que os `speed` de walk/run não são arbitrários.
//
// AnimController avança `speed × dt` quadros por frame, então um ciclo dura
// `frames / speed` frames e cobre `moveSpeed × frames / speed` pixels. Se essa
// distância não bater com a passada desenhada, o pé desliza: cadência rápida
// demais faz o personagem correr no lugar, lenta demais faz patinar.
//
// A referência é o walk do jogador, que já foi jogado e lê bem: 8 quadros a
// 0.16 com PLAYER_WALK_SPEED 1.4 → 70px por ciclo. A corrida tem passada mais
// longa; 96px por ciclo mantém a mesma leitura em velocidade alta.
//
//   speed = frames × moveSpeed / distância
//
// tests/locomotion.test.mjs recalcula isso a partir dos PNGs entregues e dos
// stats do jogo, então um inimigo novo com cadência errada falha na hora.
const WALK_CYCLE_PX = 70;
const RUN_CYCLE_PX = 96;
const locoSpeed = (frames, moveSpeed, cyclePx = WALK_CYCLE_PX) =>
  Math.round((frames * moveSpeed * 100) / cyclePx) / 100;

// ── Asset manifest ─────────────────────────────────────────────────────────

const ASSET_MANIFEST = {
  player: {
    frameH: FRAME_H,
    anims: {
      idle:    { src: "/images/kungfucastle/player/idle.png",        speed: 0.16, loop: true  }, // 8 frames (era 4): dobra a contagem, dobra a velocidade para manter o ciclo
      // 8 quadros; PLAYER_WALK_SPEED 1.4 e PLAYER_RUN_SPEED 3.2 (KungFuCastle.jsx).
      // A corrida estava herdando a cadência do passo e patinava a 2,3× a velocidade.
      walk:    { src: "/images/kungfucastle/player/walk.png",        speed: locoSpeed(8, 1.4), loop: true },
      run:     { src: "/images/kungfucastle/player/run.png",         speed: locoSpeed(8, 3.2, RUN_CYCLE_PX), loop: true },
      // 5 quadros de pivô, gerados em v3 interpolando a rotação leste até a
      // oeste. A folha está na ordem INVERTIDA de propósito: o jogo já trocou
      // player.facing antes de tocá-la, então setFacing espelha tudo, e arte
      // desenhada leste→frente→oeste apareceria girando para o lado errado.
      turn:    { src: "/images/kungfucastle/player/turn.png",        speed: 0.36, loop: false, next: "walk" },
      punch:   { src: "/images/kungfucastle/player/punch.png",       speed: 0.33, loop: false, next: "idle" },
      kick:    { src: "/images/kungfucastle/player/kick.png",        speed: 0.32, loop: false, next: "idle" },
      flyKick: { src: "/images/kungfucastle/player/flying-kick.png", speed: 0.22, loop: false, next: "idle" },
      sweep:   { src: "/images/kungfucastle/player/sweep.png",       speed: 0.27, loop: false, next: "idle" },
      jump:    { src: "/images/kungfucastle/player/jump.png",        speed: 0.21, loop: false },
      crouch:  { src: "/images/kungfucastle/player/crouch.png",      speed: 0.35, loop: false },
      hit:     { src: "/images/kungfucastle/player/hit.png",         speed: 0.12, loop: false, next: "idle" },
      // 9 quadros, gerados em v3: usada só na saída da fase, subindo a escada.
      climb:   { src: "/images/kungfucastle/player/climb.png",       speed: 0.18, loop: true },
      // 10 frames spread over DODGE_DURATION (28) → 10 / 28 ≈ 0.36
      backflip:{ src: "/images/kungfucastle/player/backflip.png",    speed: 0.36, loop: false, next: "idle" },
      special: { src: "/images/kungfucastle/player/special.png",     speed: 0.14, loop: false, next: "idle" },
    },
  },

  enemies: buildEnemyManifest(),
};

/**
 * As animações do jogador — caminho da folha e cadência — para quem precisa
 * delas sem PixiJS.
 *
 * A vitrine da tela inicial (KungFuVitrine.jsx) desenha o jogador em DOM, com
 * `background-position`, e precisa do mesmo `speed` que o AnimController usa
 * dentro da partida. Ler daqui é o que impede a tela inicial e o jogo de
 * divergirem no dia em que alguém acertar a cadência de um golpe.
 */
export const PLAYER_ANIMS = ASSET_MANIFEST.player.anims;
export const PLAYER_FRAME_H = ASSET_MANIFEST.player.frameH;

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
    // Cada `walk`/`run` usa locoSpeed(quadros do PNG, ENEMY_STATS.speed) —
    // ver o bloco de cadência no topo. Nunca copie o número do vizinho: dois
    // inimigos com contagens de quadro iguais e velocidades diferentes precisam
    // de cadências diferentes, senão o mais rápido patina.
    "capanga-branco": enemyAnims("capanga-branco", [
      ["idle",  { speed: 0.16, loop: true  }],
      ["walk",  { speed: locoSpeed(8, 1.2), loop: true }],
      ["punch", { speed: 0.15, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "capanga-cinza": enemyAnims("capanga-cinza", [
      ["idle",  { speed: 0.16, loop: true }], // 8 quadros, mesma cadência de respiro do elenco
      ["walk",  { speed: locoSpeed(8, 1.5), loop: true }],
      ["punch", { speed: 0.15, loop: false, next: "idle" }],
      ["kick",  { speed: 0.15, loop: false, next: "idle" }], // 7 quadros: roundhouse é mais longo que o soco
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "capanga-rapido": enemyAnims("capanga-rapido", [
      ["idle",  { speed: 0.16, loop: true }],
      ["walk",  { file: "run", speed: locoSpeed(8, 3.0, RUN_CYCLE_PX), loop: true }],
      // 3 quadros (lead-jab): ~17 ticks contra os 40 do capanga branco. O golpe
      // rápido é a assinatura desse inimigo, então a cadência acompanha.
      ["punch", { speed: 0.18, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "guarda-bastao": enemyAnims("guarda-bastao", [
      ["idle",  { speed: 0.16, loop: true }],
      ["walk",  { speed: locoSpeed(8, 1.0), loop: true }],
      ["punch", { speed: 0.15, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    // ENEMY_STATS.speed é 0 para o atirador: ele fica parado e ataca à
    // distância, então `walk` nunca toca. Fica no manifesto porque o carregador
    // exige o arquivo, e a cadência aqui é indiferente.
    "atirador": enemyAnims("atirador", [
      ["idle",   { speed: 0.08, loop: true  }],
      ["walk",   { speed: 0.12, loop: true  }],
      ["attack", { file: "throw", speed: 0.12, loop: false, next: "idle" }],
      ["hit",    { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "ninja": enemyAnims("ninja", [
      ["idle",  { speed: 0.16, loop: true }],
      ["walk",  { speed: locoSpeed(8, 2.0), loop: true }],
      ["punch", { speed: 0.18, loop: false, next: "idle" }],
      ["kick",  { speed: 0.18, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "ninja-espada": enemyAnims("ninja-espada", [
      ["idle",   { speed: 0.16, loop: true }],
      ["walk",   { speed: locoSpeed(8, 1.8), loop: true }],
      ["attack", { file: "slash", speed: 0.15, loop: false, next: "idle" }],
      ["kick",   { speed: 0.15, loop: false, next: "idle" }],
      ["hit",    { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "samurai": enemyAnims("samurai", [
      ["idle",  { speed: 0.16, loop: true }],
      ["walk",  { speed: locoSpeed(8, 1.0), loop: true }],
      ["punch", { speed: 0.15, loop: false, next: "idle" }],
      ["kick",  { speed: 0.15, loop: false, next: "idle" }],
      ["hit",   { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "kunoichi": enemyAnims("kunoichi", [
      ["idle",   { speed: 0.16, loop: true }],
      ["walk",   { file: "run",         speed: locoSpeed(8, 3.5, RUN_CYCLE_PX), loop: true }],
      ["attack", { file: "flying-kick", speed: 0.15, loop: false, next: "idle" }],
      ["hit",    { speed: 0.12, loop: false, next: "idle" }],
    ]),

    "lancador-bomba": enemyAnims("lancador-bomba", [
      ["idle",   { speed: 0.08, loop: true  }],
      ["walk",   { speed: locoSpeed(6, 1.0), loop: true }],
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

  "guardiao-portao": bossAnims("guardiao-portao", 68, [
    ["idle",             { speed: 0.08, loop: true }],
    ["walk",             { speed: 0.10, loop: true }],
    ["horizontal-swing", { speed: 0.12, next: "idle" }],
    ["overhead-smash",   { speed: 0.09, next: "idle" }],
    ["stuck",            { speed: 0.05, loop: true }],
    ["earthquake",       { speed: 0.09, next: "idle" }],
    ["shield-block",     { speed: 0.07, loop: true }],
    ["charge",           { speed: 0.14, loop: true }],
    ["kick",             { speed: 0.16, next: "idle" }],
    ["taunt",            { speed: 0.07, next: "idle" }],
    ["hit",              { speed: 0.15, next: "idle" }],
    ["death",            { speed: 0.08 }],
  ]),

  "senhor-sombras": bossAnims("senhor-sombras", 68, [
    ["idle",          { speed: 0.16, loop: true }], // 8 quadros, como o resto do elenco
    // Corrida de 8 quadros a BOSS_STATS.speed 2.5 — ele é o chefe rápido, e a
    // cadência sai do mesmo cálculo de passada do elenco em vez de ser chutada.
    ["walk",          { speed: locoSpeed(8, 2.5, RUN_CYCLE_PX), loop: true }],
    ["shadow-strike", { speed: 0.15, next: "idle" }],
    ["ninja-combo",   { speed: 0.18, next: "idle" }],
    ["shadow-sweep",  { speed: 0.14, next: "idle" }],
    ["dash-kick",     { speed: 0.16, next: "idle" }],
    ["vanish",        { speed: 0.14, next: "idle" }],
    ["clone",         { speed: 0.12, next: "idle" }],
    ["smoke-bomb",    { speed: 0.14, next: "idle" }],
    // `shuriken` fica fora do manifesto até existir sistema de projéteis:
    // carregado, seria uma animação de arremesso sem nada saindo da mão.
    ["hit",           { speed: 0.15, next: "idle" }],
    ["death",         { speed: 0.08 }],
  ]),

  "general-oni": bossAnims("general-oni", 68, [
    ["idle",          { speed: 0.08, loop: true }],
    ["walk",          { speed: 0.12, loop: true }],
    ["dual-slash",    { speed: 0.15, next: "idle" }],
    ["thrust-lunge",  { speed: 0.16, next: "idle" }],
    ["counter-slash", { speed: 0.16, next: "idle" }],
    ["spin-blades",   { speed: 0.14, next: "idle" }],
    ["crushing-leap", { speed: 0.12, next: "idle" }],
    ["cross-block",   { speed: 0.10, loop: true }],
    ["demon-fury",    { speed: 0.12, next: "idle" }],
    ["oni-roar",      { speed: 0.10, next: "idle" }],
    ["kick",          { speed: 0.16, next: "idle" }],
    // `summon` fica fora: invocaria inimigos, mecânica que ainda não existe.
    ["hit",           { speed: 0.15, next: "idle" }],
    ["death",         { speed: 0.08 }],
  ]),

  "senhor-castelo": bossAnims("senhor-castelo", 92, [
    ["idle",            { speed: 0.08, loop: true }],
    ["walk",            { speed: 0.12, loop: true }],
    ["sword-slash",     { speed: 0.15, next: "idle" }],
    ["steel-palm",      { speed: 0.16, next: "idle" }],
    ["imperial-combo",  { speed: 0.16, next: "idle" }],
    ["crescent-kick",   { speed: 0.15, next: "idle" }],
    ["flying-kick",     { speed: 0.15, next: "idle" }],
    ["draw-sword",      { speed: 0.12, next: "idle" }],
    ["supreme-strike",  { speed: 0.11, next: "idle" }],
    ["devastation",     { speed: 0.10, next: "idle" }],
    ["ki-barrier",      { speed: 0.10, loop: true }],
    ["teleport-out",    { speed: 0.16, next: "idle" }],
    ["teleport-in",     { speed: 0.16, next: "idle" }],
    // `ki-blast` (projétil) e `summon-ninjas` (invocação) ficam fora até as
    // mecânicas existirem.
    ["hit",             { speed: 0.15, next: "idle" }],
    ["death",           { speed: 0.08 }],
  ]),
};

// ── Animated props ────────────────────────────────────────────────────────

/**
 * Props that are horizontal frame strips rather than single images: anything
 * that emits light, so the flame crackles and the glow breathes instead of
 * standing still. Speeds are deliberately unequal — flames synchronised across
 * a level read as machinery, not as fire.
 */
export const ANIMATED_PROPS = {
  "tocha-fogo":     { frames: 9, speed: 0.22 },
  "braseiro-fogo":  { frames: 9, speed: 0.18 },
  "lanterna-papel": { frames: 9, speed: 0.12 },
  "lanterna-seda":  { frames: 9, speed: 0.10 },
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

// ── Loader ─────────────────────────────────────────────────────────────────

/**
 * Load all assets defined in ASSET_MANIFEST in parallel, cut sprite sheets,
 * and return organised texture maps.
 *
 * An AnimMap is `{ [animName]: { frames: Texture[], speed, loop, next? } }`.
 *
 * `scenery` is `{ tilesets, props, propAnims }`:
 *   tilesets   `{ [name]: Texture[] }` — 16 tiles each
 *   props      `{ [name]: Texture }`   — single frame
 *   propAnims  `{ [name]: { frames: Texture[], speed, loop } }` — light sources
 *
 * @returns {Promise<object>}
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
  for (const path of sceneryAssetPaths()) {
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
  // Tilesets: each is a 128×128 sheet, a 4×4 grid of 32×32 Wang tiles → 16 textures
  const TILE_SIZE = 32;
  const tilesets = {};
  for (const name of sceneryTilesetNames()) {
    const src = textureMap[`/images/kungfucastle/tiles/${name}.png`];
    if (!src) {
      console.warn(`[kungfu-assets] Tileset not found: ${name}`);
      continue;
    }
    const frames = [];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const rect = new Rectangle(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        frames.push(new Texture({ source: src.source, frame: rect }));
      }
    }
    tilesets[name] = frames;
  }

  // Props (and parallax bands) come straight from the scenery description.
  const props = {};
  for (const path of sceneryAssetPaths()) {
    if (!path.includes("/props/")) continue;
    const name = path.split("/").pop().replace(".png", "");
    const tex = textureMap[path];
    if (!tex) console.warn(`[kungfu-assets] Scenery prop not found: ${name}`);
    props[name] = tex;
  }

  // Light sources are horizontal strips, not single frames — cut them so the
  // flame can flicker. The frame count cannot be inferred from the aspect
  // ratio: props are not square, so a 32x48 strip of 9 is indistinguishable
  // from one tall still. It is declared.
  const propAnims = {};
  for (const [name, def] of Object.entries(ANIMATED_PROPS)) {
    const tex = props[name];
    if (!tex) continue;
    const frameW = Math.round(tex.width / def.frames);
    const frames = [];
    for (let i = 0; i < def.frames; i++) {
      frames.push(new Texture({
        source: tex.source,
        frame: new Rectangle(i * frameW, 0, frameW, tex.height),
      }));
    }
    propAnims[name] = { frames, speed: def.speed, loop: true };
  }

  const scenery = { tilesets, props, propAnims };

  // 7. Return organised texture maps
  return { player, enemies, bosses, scenery };
}
