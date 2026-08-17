"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Application, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import dynamic from "next/dynamic";
import AdBanner from "@/components/AdBanner";
import { loadAllAssets } from "./kungfu-assets";
import { AnimController } from "./kungfu-anim";
import {
  regenHp,
  windupTicks,
  staggerEnemy,
  tickAttackImpact,
  countWindingUp,
  MAX_ATTACKERS,
} from "./kungfu-combat";
import { PHASE_SCENERY } from "./kungfu-scenery";

const KungFuSpriteTest = dynamic(() => import("./KungFuSpriteTest"), { ssr: false });

// ── Constants ──────────────────────────────────────────────────────────────
const CW = 480;
const CH = 320;
const GROUND_Y = 260;
const PLAYER_W = 32;
const PLAYER_H = 48;
const PLAYER_HP_MAX = 100;
// Passive health regeneration, as a % of MAX health per second.
const PLAYER_REGEN_PCT_PER_SEC = 0.5;
const BOSS_REGEN_PCT_PER_SEC = 2.5;
const PLAYER_WALK_SPEED = 1.4; // similar to capanga-branco (1.2)
const PLAYER_RUN_SPEED = 3.2;
const DOUBLE_TAP_WINDOW = 12; // frames to detect double-tap
// Backflip dodge — double-tap away from the direction you're facing.
const DODGE_DURATION = 28; // frames; matches the 10-frame backflip sheet
const DODGE_COOLDOWN = 40; // frames before another dodge is allowed
// Quanto tempo um inimigo fica atordoado ao levar um golpe. É a autoridade
// sobre a duração do recuo: a folha de `hit` de vários inimigos é mais longa
// que isso, e quem manda é este número, não o sprite.
const ENEMY_STUN = 20;
const DODGE_SPEED = 1.8;   // px/frame backwards → ~50px, clear of COMBAT_RANGE (23)
const DODGE_LIFT = -3.5;   // vertical impulse; under GRAVITY 0.27 the flip lands in ~26 frames
// Jump arc: apex = JUMP_FORCE² / (2·GRAVITY) ≈ 60px, airtime = 2·JUMP_FORCE / GRAVITY ≈ 42 frames (0.70s)
const GRAVITY = 0.27;
const JUMP_FORCE = -5.7;

const FRAME_SIZE = 48;

// Value separation between the player and everyone else, applied at runtime as
// a PixiJS tint rather than baked into the PNGs. The temple is dark and finding
// your own character is the first job of the art, so the player stays untinted
// and the cast is knocked back. Doing it here instead of in the sprite sheets
// costs nothing to change and no regeneration — tune these numbers freely.
//
// ENEMY_STATS may override with its own `tint`. That second lever exists
// because PixelLab generates the whole cast from one anchor and returns them at
// nearly the same luma: baked, the white-tunic thug and the gray one land 11
// points apart and read as the same character. The design ladder — worn white
// (weakest) → gray brawler → red sprinter — is restored here, where it can be
// retuned without touching a PNG.
const ENEMY_TINT = 0xb0b0b0;
const BOSS_TINT = 0xdadada;

// `attackAnim` is the animation name each type actually attacks with — it
// must exist in that entity's manifest entry in kungfu-assets.js (enforced
// by tests/attack-anim.test.mjs). capanga-cinza additionally declares
// `attackAnimAlt`, rolled 50/50 against `attackAnim` (see resolveAttackAnim).
const ENEMY_STATS = {
  // Os três capangas da fase 1 sobem a escada de valor: o de túnica branca é o
  // mais claro, o cinza o mais escuro, o vermelho fica no meio e se separa pela
  // cor. Sem esses tints eles saem a 8 pontos de luma um do outro.
  "capanga-branco": { hp: 1, speed: 1.2, damage: 5,  score: 100, attackAnim: "punch", tint: 0xc8c8c8 },
  "capanga-cinza":  { hp: 2, speed: 1.5, damage: 8,  score: 150, attackAnim: "punch", attackAnimAlt: "kick", tint: 0xa0a0a0 },
  "capanga-rapido": { hp: 1, speed: 3.0, damage: 6,  score: 150, attackAnim: "punch" },
  // Guarda e assassino já nascem escuros (armadura acolchoada cinza, seda azul
  // noturna): o tint padrão os afundaria no cenário noturno. Um tint quase
  // neutro basta — a distância para o jogador já vem da própria arte.
  "guarda-bastao":  { hp: 3, speed: 1.0, damage: 12, score: 200, attackAnim: "punch", tint: 0xdcdcdc },
  "atirador":       { hp: 2, speed: 0,   damage: 8,  score: 200, attackAnim: "attack" },
  "ninja":          { hp: 3, speed: 2.0, damage: 10, score: 200, attackAnim: "punch", tint: 0xf0f0f0 },
  "ninja-espada":   { hp: 4, speed: 1.8, damage: 15, score: 250, attackAnim: "attack", tint: 0xf0f0f0 },
  "samurai":        { hp: 5, speed: 1.0, damage: 18, score: 300, attackAnim: "punch", tint: 0xdcdcdc },
  "kunoichi":       { hp: 3, speed: 3.5, damage: 12, score: 250, attackAnim: "attack" },
  "lancador-bomba": { hp: 3, speed: 1.0, damage: 15, score: 250, attackAnim: "attack" },
};

const BOSS_STATS = {
  "mestre-capangas": {
    hp: 25, damage: 10, speed: 1.5, score: 1000, frameSize: 68,
    // Medida da arte entregue (união do conteúdo opaco de idle+walk), não
    // herdada do sprite anterior: o brutamontes chinês é bem mais largo e
    // encosta o pé no fundo do quadro, então a caixa antiga (23x49 em oy 9)
    // deixaria metade dele intangível.
    hitbox: { w: 36, h: 47, ox: 18, oy: 21 },
    groundOffset: 0,
    // Regerado a partir da âncora chinesa, então é desenhado para LESTE como o
    // resto do elenco. Os chefes ainda não convertidos continuam em -1.
    spriteFacing: 1,
    // A arte regerada é bem mais clara que a linhagem antiga de chefe (luma
    // 182 contra ~150), então BOSS_TINT sozinho o deixava a 13% do jogador —
    // perto demais de quem tem de ser a coisa mais clara da tela.
    tint: 0xcccccc,
    attackAnim: "punch",
  },
  "guardiao-portao": {
    hp: 35, damage: 14, speed: 1.2, score: 1500, frameSize: 68,
    hitbox: { w: 36, h: 52, ox: 17, oy: 7 },
    groundOffset: 12,
    // Como todos os chefes, a arte é desenhada virada para oeste.
    spriteFacing: -1,
    // The Guardião has no "punch"/"attack" anim — its telegraphed attack is
    // the horizontal sword swing (see the phase-2 design doc).
    attackAnim: "horizontal-swing",
  },
  "senhor-sombras": {
    hp: 30, damage: 14, speed: 2.5, score: 2000, frameSize: 68,
    // Medida da arte convertida: silhueta esguia de assassino, bem mais
    // estreita e baixa que a do brutamontes.
    hitbox: { w: 28, h: 38, ox: 16, oy: 30 },
    groundOffset: 0,
    // Regerado a partir da âncora chinesa: desenhado para LESTE.
    spriteFacing: 1,
    // Robe todo preto com detalhe roxo — luma 81 assado, contra 179 do
    // jogador. BOSS_TINT o afundaria ainda mais no salão escuro, e um chefe
    // que some no fundo não é atmosfera, é bug. Sem knock-back: a distância
    // para o jogador já é enorme.
    tint: 0xffffff,
    // Não tem "punch"/"attack": o moveset é de assassino. O golpe de sombra é
    // o ataque base e o combo entra na metade das vezes. `shuriken` existe na
    // folha mas fica de fora — não há sistema de projéteis, então ele animaria
    // um arremesso que não sai do lugar.
    attackAnim: "shadow-strike",
    attackAnimAlt: "ninja-combo",
  },
  "general-oni": {
    hp: 40, damage: 16, speed: 1.4, score: 2500, frameSize: 68,
    // Medida da arte entregue; conversão chinesa ainda não veio.
    hitbox: { w: 38, h: 58, ox: 15, oy: 8 },
    groundOffset: 2,
    spriteFacing: -1,
    attackAnim: "dual-slash",
    attackAnimAlt: "thrust-lunge",
  },
  "senhor-castelo": {
    // Chefe final: o único com moldura de 92px.
    hp: 50, damage: 18, speed: 1.6, score: 5000, frameSize: 92,
    hitbox: { w: 37, h: 77, ox: 29, oy: 11 },
    groundOffset: 4,
    spriteFacing: -1,
    // `ki-blast` e `summon-ninjas` existem na folha mas ficam de fora do
    // moveset base: um é projétil e o outro precisaria invocar inimigos.
    attackAnim: "sword-slash",
    attackAnimAlt: "steel-palm",
  },
};

const PHASE_CONFIG = {
  1: {
    enemies: ["capanga-branco", "capanga-cinza", "capanga-rapido"],
    boss: "mestre-capangas",
    killThreshold: 100,
  },
  2: {
    enemies: ["guarda-bastao", "ninja", "kunoichi"],
    boss: "guardiao-portao",
    killThreshold: 100,
  },
  3: {
    enemies: ["ninja", "ninja-espada", "kunoichi"],
    boss: "senhor-sombras",
    killThreshold: 100,
  },
  4: {
    // A spec pedia `lancador-bomba` aqui, mas ele arremessa e não há sistema
    // de projéteis: entraria andando até o corpo a corpo para jogar uma bomba
    // que não sai da mão. O guarda de bastão ocupa o lugar do inimigo pesado
    // até os projéteis existirem.
    enemies: ["ninja-espada", "samurai", "guarda-bastao"],
    boss: "general-oni",
    killThreshold: 100,
  },
  5: {
    enemies: ["samurai", "kunoichi", "ninja-espada"],
    boss: "senhor-castelo",
    killThreshold: 100,
  },
};

const MAX_PHASE = Math.max(...Object.keys(PHASE_CONFIG).map(Number));
// Kills needed before the phase boss appears. Lives on `game` so the test-mode
// selector can zero it and drop straight into the boss fight.
const BOSS_KILL_THRESHOLD_DEFAULT = 100;

// Shared style for the test-mode phase buttons.
const S_TEST_BTN = {
  fontFamily: "'Fira Code', monospace",
  fontSize: 9,
  color: "#8892b0",
  background: "transparent",
  border: "1px solid #333",
  borderRadius: 6,
  padding: "6px 12px",
  cursor: "pointer",
};
const TRANSITION_FADE_FRAMES = 60;
const TRANSITION_CLEAR_FRAMES = 240;
const TRANSITION_INPUT_DELAY = 20;
const POST_BOSS_DELAY = 90;

// ── Translation ref (accessible from non-React functions) ──────────────
let _t = (k) => k;

// ============================================================
// BUILD SCENE
// ============================================================
async function buildScene(app) {
  const textures = await loadAllAssets();

  const bgLayer = new Container();
  const midLayer = new Container();
  const gameLayer = new Container();
  const fgLayer = new Container();
  const hudLayer = new Container();

  app.stage.addChild(bgLayer, midLayer, gameLayer, fgLayer, hudLayer);

  // Scenery lives in dedicated containers at fixed indices, so a phase change
  // can empty them without touching the player sprite (gameLayer) or the
  // particles (fgLayer), which share those same layers.
  const bgScenery = new Container();
  const midScenery = new Container();
  const groundScenery = new Container();
  const fgScenery = new Container();
  bgLayer.addChild(bgScenery);
  midLayer.addChild(midScenery);
  gameLayer.addChild(groundScenery);
  fgLayer.addChild(fgScenery);

  // Player
  const playerSprite = new Sprite(textures.player.idle.frames[0]);
  playerSprite.anchor.set(0.5, 1); // pivot at feet
  playerSprite.x = 80 + FRAME_SIZE / 2;
  playerSprite.y = GROUND_Y;
  gameLayer.addChild(playerSprite);
  const playerAnim = new AnimController({ sprite: playerSprite, anims: textures.player });

  // HUD - HP bar background
  const hpBg = new Graphics();
  hpBg.rect(16, 16, 104, 12);
  hpBg.fill({ color: 0x333333 });
  hudLayer.addChild(hpBg);

  // HUD - HP bar fill
  const hpBar = new Graphics();
  hudLayer.addChild(hpBar);

  // HUD - Text
  const hudStyle = new TextStyle({
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "bold",
    fill: 0xffffff,
  });
  const scoreText = new Text({ text: "", style: hudStyle });
  scoreText.x = 16;
  scoreText.y = 34;
  hudLayer.addChild(scoreText);

  const phaseText = new Text({ text: "", style: hudStyle });
  phaseText.x = 16;
  phaseText.y = 48;
  hudLayer.addChild(phaseText);

  const livesText = new Text({ text: "", style: hudStyle });
  livesText.x = CW - 80;
  livesText.y = 16;
  hudLayer.addChild(livesText);

  // Phase title overlay
  const phaseTitleStyle = new TextStyle({
    fontFamily: "monospace",
    fontSize: 18,
    fontWeight: "bold",
    fill: 0xffd700,
  });
  const phaseTitle = new Text({ text: "", style: phaseTitleStyle });
  phaseTitle.anchor.set(0.5);
  phaseTitle.x = CW / 2;
  phaseTitle.y = CH / 2 - 20;
  hudLayer.addChild(phaseTitle);

  const phaseSubStyle = new TextStyle({
    fontFamily: "monospace",
    fontSize: 12,
    fill: 0xcccccc,
  });
  const phaseSub = new Text({ text: "", style: phaseSubStyle });
  phaseSub.anchor.set(0.5);
  phaseSub.x = CW / 2;
  phaseSub.y = CH / 2 + 10;
  hudLayer.addChild(phaseSub);

  // Fade overlay (full screen, drawn on top — controlled by transition state)
  const fadeOverlay = new Graphics();
  fadeOverlay.rect(0, 0, CW, CH);
  fadeOverlay.fill({ color: 0x000000 });
  fadeOverlay.alpha = 0;
  hudLayer.addChild(fadeOverlay);
  // Phase title texts must render above fade — re-add to put them on top
  hudLayer.removeChild(phaseTitle);
  hudLayer.removeChild(phaseSub);
  hudLayer.addChild(phaseTitle);
  hudLayer.addChild(phaseSub);

  const game = {
    app,
    bgLayer, midLayer, gameLayer, fgLayer, hudLayer,
    sceneryLayers: null,
    playerSprite,
    playerAnim,
    textures,
    enemyAnims: [],
    // Controladores dos props que piscam (tochas, braseiros, lanternas).
    propAnims: [],
    hpBar, scoreText, phaseText, livesText, phaseTitle, phaseSub,
    fadeOverlay,
    transition: null,
    victory: false,
    bossDefeatedFrame: 0,
    enemies: [],
    particles: [],
    player: {
      x: 80,
      y: GROUND_Y - PLAYER_H,
      vx: 0,
      vy: 0,
      hp: PLAYER_HP_MAX,
      lives: 3,
      score: 0,
      facing: 1,
      grounded: true,
      attacking: false,
      attackTimer: 0,
      attackType: null,
      running: false,
      tapTimer: { left: 0, right: 0 },
      // Facing captured when each tap timer was armed — by the time the second
      // tap arrives, player.facing has already flipped toward the tapped side.
      tapFacing: { left: 1, right: 1 },
      dodging: false,
      dodgeCooldown: 0,
      dodgeVx: 0,
      currentSpeed: 0, // for deceleration
      hitbox: { w: 28, h: 40, ox: 10, oy: 4 },
    },
    cameraX: 0,
    phase: 1,
    frame: 0,
    spawnTimer: 0,
    killCount: 0,
    bossKillThreshold: BOSS_KILL_THRESHOLD_DEFAULT,
    bossActive: false,
    bossDefeated: false,
    gameOver: false,
    levelWidth: 0,
  };

  game.sceneryLayers = { bg: bgScenery, mid: midScenery, ground: groundScenery, fg: fgScenery };
  buildScenery(game, 1);

  return game;
}

// ============================================================
// SPAWN ENEMY
// ============================================================
function spawnEnemy(game, type) {
  if (!type) {
    const pool = PHASE_CONFIG[game.phase]?.enemies || PHASE_CONFIG[1].enemies;
    type = pool[Math.floor(Math.random() * pool.length)];
  }
  const stats = ENEMY_STATS[type];
  if (!stats || !game.textures.enemies[type]) return;

  const side = Math.random() > 0.5 ? 1 : -1;
  const ex = side === 1 ? game.cameraX + CW + 20 : game.cameraX - FRAME_SIZE;

  const sprite = new Sprite(game.textures.enemies[type].idle.frames[0]);
  sprite.anchor.set(0.5, 1);
  sprite.tint = stats.tint ?? ENEMY_TINT;
  sprite.x = ex + FRAME_SIZE / 2;
  sprite.y = GROUND_Y;
  game.gameLayer.addChild(sprite);
  const anim = new AnimController({ sprite, anims: game.textures.enemies[type] });

  const enemy = {
    x: ex, y: GROUND_Y - FRAME_SIZE,
    w: FRAME_SIZE, h: FRAME_SIZE,
    vx: side === -1 ? stats.speed : -stats.speed,
    hp: stats.hp, damage: stats.damage, score: stats.score,
    type, alive: true, hitTimer: 0, attackCooldown: 30 + Math.random() * 30,
    hitbox: { w: 28, h: 40, ox: 10, oy: 8 },
  };

  game.enemies.push(enemy);
  game.enemyAnims.push(anim);
}

// ============================================================
// SPAWN BOSS
// ============================================================
function spawnBoss(game) {
  const bossType = PHASE_CONFIG[game.phase]?.boss;
  const stats = BOSS_STATS[bossType];
  if (!bossType || !stats || !game.textures.bosses[bossType]) return;

  const bossTextures = game.textures.bosses[bossType];
  const fs = stats.frameSize;

  const sprite = new Sprite(bossTextures.idle.frames[0]);
  sprite.anchor.set(0.5, 1);
  sprite.tint = stats.tint ?? BOSS_TINT;
  sprite.x = game.cameraX + CW + fs;
  sprite.y = GROUND_Y;
  game.gameLayer.addChild(sprite);

  const anim = new AnimController({
    sprite,
    anims: bossTextures,
    baseFacing: stats.spriteFacing || 1,
  });

  const enemy = {
    x: game.cameraX + CW + fs,
    y: GROUND_Y - PLAYER_H,
    w: fs,
    h: PLAYER_H,
    vx: 0,
    hp: stats.hp,
    maxHp: stats.hp,
    damage: stats.damage,
    score: stats.score,
    type: bossType,
    alive: true,
    isBoss: true,
    hitTimer: 0,
    attackCooldown: 60,
    hitbox: stats.hitbox,
    frameSize: fs,
    groundOffset: stats.groundOffset || 0,
  };

  game.enemies.push(enemy);
  game.enemyAnims.push(anim);
}

// ============================================================
// SCENERY — built per phase, torn down on phase change
// ============================================================

/** Resolve a band's symbolic y anchor to a pixel value. */
function resolveBandY(y, texHeight) {
  if (typeof y === "number") return y;
  if (y === "ground-overlap") return GROUND_Y - texHeight + 18;
  return GROUND_Y - 10 - texHeight + 28; // "horizon"
}

/** Paint the phase's sky into a Graphics. */
function drawSky(g, spec, width) {
  if (spec.type === "starfield") {
    g.rect(0, 0, width, CH);
    g.fill({ color: spec.color });
    for (let i = 0; i < spec.stars; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * (GROUND_Y - 40);
      const size = Math.random() < 0.15 ? 2 : 1;
      g.rect(sx, sy, size, size);
      g.fill({ color: 0xffffff, alpha: 0.3 + Math.random() * 0.7 });
    }
    return;
  }
  // gradient: horizontal bands interpolating `from` (top) to `to` (horizon)
  const BANDS = 32;
  const from = spec.from, to = spec.to;
  for (let i = 0; i < BANDS; i++) {
    const t = i / (BANDS - 1);
    const r = Math.round((((from >> 16) & 0xff) * (1 - t)) + (((to >> 16) & 0xff) * t));
    const gg = Math.round((((from >> 8) & 0xff) * (1 - t)) + (((to >> 8) & 0xff) * t));
    const b = Math.round(((from & 0xff) * (1 - t)) + ((to & 0xff) * t));
    g.rect(0, (i * CH) / BANDS, width, CH / BANDS + 1);
    g.fill({ color: (r << 16) | (gg << 8) | b });
  }
}

/**
 * Populate the scenery containers for `phase` and set the level width.
 * @param {object} game
 * @param {number} phase
 */
function buildScenery(game, phase) {
  const spec = PHASE_SCENERY[phase];
  if (!spec) {
    console.warn(`[kungfu] no scenery for phase ${phase}`);
    return;
  }
  const { scenery } = game.textures;
  const { bg, mid, ground, fg } = game.sceneryLayers;
  game.levelWidth = spec.levelWidth;

  // -- Sky
  const sky = new Graphics();
  drawSky(sky, spec.sky, spec.levelWidth);
  bg.addChild(sky);

  // -- Parallax bands
  const addBand = (band, container) => {
    const tex = scenery.props[band.asset];
    if (!tex) return;
    const scale = band.scale || 1;
    const w = tex.width * scale;
    const h = tex.height * scale;
    const y = resolveBandY(band.y, h);
    const step = band.tile ? w : band.every;
    if (step) {
      // Two extra repetitions past the level edge, matching the current
      // phase-1 loop (`Math.ceil(LEVEL_WIDTH / w) + 2`).
      for (let x = 0; x < spec.levelWidth + step * 2; x += step) {
        const s = new Sprite(tex);
        s.scale.set(scale);
        s.x = x;
        s.y = y;
        if (band.alpha !== undefined) s.alpha = band.alpha;
        container.addChild(s);
      }
    } else {
      const s = new Sprite(tex);
      s.scale.set(scale);
      s.x = band.x || 0;
      s.y = y;
      if (band.alpha !== undefined) s.alpha = band.alpha;
      container.addChild(s);
    }
  };
  for (const band of spec.bg) addBand(band, bg);
  for (const band of spec.mid) addBand(band, mid);

  // -- Ground: surface row at feet level + transition + fill rows below
  const tiles = scenery.tilesets[spec.tileset];
  if (tiles && tiles.length >= 16) {
    const TILE = 32;
    const across = Math.ceil(spec.levelWidth / TILE);
    const GRASS_OFFSET = 52; // surface sits ~14px from the top of the tile
    // Which of the 16 tiles plays each role. PixelLab does NOT emit a stable
    // Wang ordering across tilesets, então cada fase pode declarar a sua.
    //
    // Medido nos três tilesets em uso (jardim, portão, salão): o índice 12 é
    // TRANSPARENTE em todos, e o chão que se vê vem inteiro do `transition`
    // (índice 3, com conteúdo a partir da linha 16 do tile) sobre o `fill`
    // (índice 6, 100% opaco). Com GRASS_OFFSET 52 a transição começa em
    // GROUND_Y-20, então a borda visível do piso cai 4px acima do pé — é por
    // isso que funciona. Um tileset novo precisa ser medido antes de confiar
    // nesse padrão: se o índice 3 vier cheio desde a linha 0, o piso sobe meio
    // tile e o personagem afunda.
    const role = spec.tileRoles ?? { surface: 12, transition: 3, fill: 6 };
    const rows = [
      { tex: tiles[role.surface],    y: GROUND_Y - GRASS_OFFSET },
      { tex: tiles[role.transition], y: GROUND_Y - GRASS_OFFSET + TILE },
    ];
    for (const { tex, y } of rows) {
      for (let col = 0; col < across; col++) {
        const s = new Sprite(tex);
        s.x = col * TILE;
        s.y = y;
        ground.addChild(s);
      }
    }
    const brickStartY = GROUND_Y - GRASS_OFFSET + TILE * 2;
    const rowsNeeded = Math.ceil((CH - brickStartY) / TILE) + 1;
    for (let row = 0; row < rowsNeeded; row++) {
      for (let col = 0; col < across; col++) {
        const s = new Sprite(tiles[role.fill]);
        s.x = col * TILE;
        s.y = brickStartY + row * TILE;
        ground.addChild(s);
      }
    }
  }

  // -- Props. anchor (0.5, 1) means x is the CENTRE and y sinks the prop
  // below the ground line — this is exactly the current phase-1 placement,
  // so do not "simplify" it or every prop shifts.
  const target = { bg: mid, game: ground, fg };
  for (const { asset, x, y, layer } of spec.props) {
    const anim = scenery.propAnims?.[asset];
    const tex = anim ? anim.frames[0] : scenery.props[asset];
    if (!tex) {
      console.warn(`[kungfu] prop not found: ${asset}`);
      continue;
    }
    const s = new Sprite(tex);
    s.anchor.set(0.5, 1);
    s.x = x;
    s.y = GROUND_Y + y;
    (target[layer] || ground).addChild(s);

    if (anim) {
      // Every torch gets its own controller seeded at a different frame —
      // otherwise a corridor of them flickers in lockstep, which reads as
      // one animation stamped repeatedly rather than as separate fires.
      const ctrl = new AnimController({ sprite: s, anims: { flicker: anim } });
      ctrl.forcePlay("flicker");
      for (let i = 0; i < game.propAnims.length % anim.frames.length; i++) {
        ctrl.update(1 / anim.speed);
      }
      game.propAnims.push(ctrl);
    }
  }
}

/** Destroy everything buildScenery created, keeping the containers. */
function clearScenery(game) {
  for (const container of Object.values(game.sceneryLayers)) {
    for (const child of container.removeChildren()) child.destroy();
  }
  // Os sprites que estes controladores animavam acabaram de ser destruídos —
  // manter os controladores faria update() tocar em sprite morto na fase seguinte.
  game.propAnims.length = 0;
}

// ============================================================
// LOAD PHASE — clears enemies, resets phase state, keeps player score/lives
// ============================================================
function loadPhase(game, n) {
  for (const a of game.enemyAnims) a.sprite.destroy();
  game.enemies = [];
  game.enemyAnims = [];

  for (const p of game.particles) p.destroy();
  game.particles = [];

  game.phase = n;
  clearScenery(game);
  buildScenery(game, n);
  game.killCount = 0;
  game.bossActive = false;
  game.bossDefeated = false;
  game.bossDefeatedFrame = 0;
  game.spawnTimer = 0;
  game.frame = 0;

  game.player.x = 80;
  game.player.y = GROUND_Y - PLAYER_H;
  game.player.vx = 0;
  game.player.vy = 0;
  game.player.hp = PLAYER_HP_MAX;
  game.player.attacking = false;
  game.player.attackType = null;
  game.player.attackTimer = 0;
  game.player.dying = false;
  // Dodge state: the only place that ever cleared it was nested inside
  // `if (player.attacking) { if (attackTimer <= 0) ... }` above — a branch
  // this function's own `attacking = false` makes unreachable. Landing the
  // killing blow on the boss and then backflipping before the phase
  // transition fires stranded `dodging`/`dodgeVx` true forever otherwise:
  // a permanent DODGE_SPEED drag plus canDodge() locked out for the run.
  game.player.dodging = false;
  game.player.dodgeVx = 0;
  game.player.dodgeCooldown = 0;
  // Same class of staleness: changing phase mid-run/mid-crouch materialised
  // movement with no input for several frames.
  game.player.currentSpeed = 0;
  game.player.running = false;
  game.player.crouching = false;
  game.cameraX = 0;
}

// ============================================================
// TRANSITION — phase end fade-out → clear screen → fade-in
// ============================================================
function updateTransition(game, keys, dt) {
  const t = game.transition;
  t.timer -= dt;

  if (t.state === "fadeOut") {
    game.fadeOverlay.alpha = Math.min(1, 1 - t.timer / TRANSITION_FADE_FRAMES);
    if (t.timer <= 0) {
      t.state = "phaseClear";
      t.timer = TRANSITION_CLEAR_FRAMES;
      game.fadeOverlay.alpha = 1;
      const isLast = game.phase >= MAX_PHASE;
      game.phaseTitle.text = isLast
        ? _t("victory.title")
        : `${_t("phaseClear.title")} ${game.phase}`;
      game.phaseSub.text = _t("phaseClear.continue");
      game.phaseTitle.alpha = 1;
      game.phaseSub.alpha = 1;
    }
    return;
  }

  if (t.state === "phaseClear") {
    const ready = t.timer < TRANSITION_CLEAR_FRAMES - TRANSITION_INPUT_DELAY;
    const pressed = keys.has("Space") || keys.has("Enter") || keys.has("KeyZ") || keys.has("KeyX");
    if ((ready && pressed) || t.timer <= 0) {
      if (game.phase >= MAX_PHASE) {
        game.victory = true;
        game.transition = null;
      } else {
        loadPhase(game, game.phase + 1);
        t.state = "fadeIn";
        t.timer = TRANSITION_FADE_FRAMES;
        game.phaseTitle.alpha = 0;
        game.phaseSub.alpha = 0;
      }
    }
    return;
  }

  if (t.state === "fadeIn") {
    game.fadeOverlay.alpha = Math.max(0, t.timer / TRANSITION_FADE_FRAMES);
    if (t.timer <= 0) {
      game.fadeOverlay.alpha = 0;
      game.transition = null;
    }
  }
}

// ============================================================
// SPAWN PARTICLES
// ============================================================
function spawnParticles(game, x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const p = new Graphics();
    p.circle(0, 0, 1.5 + Math.random() * 2.5);
    p.fill({ color });
    p.x = x;
    p.y = y;
    p.vx = (Math.random() - 0.5) * 6;
    p.vy = (Math.random() - 0.5) * 6 - 2;
    p.life = 1.0;
    p.decay = 0.02 + Math.random() * 0.03;
    game.fgLayer.addChild(p);
    game.particles.push(p);
  }
}

// ============================================================
// AABB COLLISION
// ============================================================
function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ============================================================
// GEThitbox HELPER
// ============================================================
// ============================================================
// BACKFLIP DODGE
// ============================================================

/** True when the player may start a backflip right now. */
function canDodge(player) {
  return (
    player.grounded &&
    !player.attacking &&
    !player.dodging &&
    !player.crouching &&
    player.dodgeCooldown <= 0
  );
}

/**
 * Leap backwards in a flip, invulnerable for the whole animation.
 *
 * Reuses the existing attack lock to block every input gate while the flip
 * plays; `attackType` stays null, so the flip itself deals no damage. The
 * invulnerability is separate and explicit — `enemyHitLands` reads
 * `player.dodging`. It used to ride on `attacking` being truthy, which also
 * made every ordinary punch invulnerable.
 *
 * @param {object} game
 * @param {number} originalFacing  Facing before the first tap flipped it
 */
function startDodge(game, originalFacing) {
  const { player } = game;
  player.dodging = true;
  player.facing = originalFacing; // flip away while still facing the enemy
  player.attacking = true;
  player.attackType = null;
  player.attackTimer = DODGE_DURATION;
  player.dodgeVx = -originalFacing * DODGE_SPEED;
  player.currentSpeed = 0;
  player.running = false;
  player.vy = DODGE_LIFT;
  player.grounded = false;
  game.playerAnim.forcePlay("backflip");
}

function getHitbox(entity) {
  return {
    x: entity.x + (entity.hitbox?.ox || 0),
    y: entity.y + (entity.hitbox?.oy || 0),
    w: entity.hitbox?.w || 28,
    h: entity.hitbox?.h || 40,
  };
}

// ============================================================
// ATTACK ANIMATION RESOLUTION
// ============================================================
// Types already warned about a missing attackAnim — logged once each so a
// misconfigured future entity is loud without spamming every attack tick.
const warnedMissingAttackAnim = new Set();

/**
 * Resolve which animation an enemy/boss should play for its current attack.
 * Every entry in ENEMY_STATS/BOSS_STATS declares the animation it actually
 * attacks with via `attackAnim` (capanga-cinza also has `attackAnimAlt`,
 * rolled 50/50 against `attackAnim` — its existing punch-or-kick behaviour).
 *
 * @param {object} e      Enemy/boss instance (has `.type`)
 * @param {object} eAnim  Its AnimController
 * @returns {string}      An animation name `eAnim` is guaranteed to have
 */
function resolveAttackAnim(e, eAnim) {
  const stats = ENEMY_STATS[e.type] ?? BOSS_STATS[e.type];
  let name = stats?.attackAnim;
  if (stats?.attackAnimAlt && Math.random() > 0.5) name = stats.attackAnimAlt;

  if (name && eAnim.anims[name]) return name;

  // Unreachable for any entity whose stats correctly declare an attackAnim —
  // this is a safety net for a future/misconfigured entity, not a normal
  // code path. Never silently no-op (that was the bug): fall back to
  // something `eAnim` is verified to have, and say so loudly, once per type.
  if (!warnedMissingAttackAnim.has(e.type)) {
    warnedMissingAttackAnim.add(e.type);
    console.error(
      `[kungfu] "${e.type}" has no usable attackAnim (declared "${name}") — ` +
        `falling back to "idle". Add attackAnim to its ENEMY_STATS/BOSS_STATS entry.`
    );
  }
  return eAnim.anims.idle ? "idle" : Object.keys(eAnim.anims)[0];
}

// ============================================================
// UPDATE (called every tick — NO re-renders)
// ============================================================
function update(game, keys, dt) {
  const { player } = game;
  game.frame++;

  // ---- Transition (blocks gameplay; only animates fade + particles) ----
  if (game.transition) {
    updateTransition(game, keys, dt);
    game.playerAnim.update(dt);
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt;
      p.life -= p.decay * dt;
      p.alpha = p.life;
      if (p.life <= 0) {
        p.destroy();
        game.particles.splice(i, 1);
      }
    }
    return;
  }

  // ---- Trigger phase-end transition once boss has been defeated ----
  if (game.bossDefeated && !game.transition && game.frame - game.bossDefeatedFrame > POST_BOSS_DELAY) {
    game.transition = { state: "fadeOut", timer: TRANSITION_FADE_FRAMES };
    return;
  }

  // ---- Death sequence (blocks all input/updates) ----
  if (player.hp <= 0 && !player.dying) {
    player.dying = true;
    player.deathTimer = 90;
    player.attacking = false;
    player.attackType = null;
    game.playerAnim.forcePlay("hit");
  }

  if (player.dying) {
    player.deathTimer -= dt;
    game.playerSprite.y += 0.5 * dt;
    game.playerSprite.alpha = Math.max(0.2, player.deathTimer / 90);
    game.playerSprite.rotation += 0.02 * dt;
    game.playerAnim.update(dt);

    if (player.deathTimer <= 0) {
      player.dying = false;
      player.lives--;
      game.playerSprite.alpha = 1;
      game.playerSprite.rotation = 0;
      if (player.lives <= 0) {
        game.gameOver = true;
      } else {
        player.hp = PLAYER_HP_MAX;
        player.x = 80;
        player.y = GROUND_Y - PLAYER_H;
        player.vy = 0;
        player.grounded = true;
        game.playerAnim.forcePlay("idle");
        game.playerSprite.x = player.x + FRAME_SIZE / 2;
        game.playerSprite.y = player.y + PLAYER_H;
      }
    }
    return;
  }

  // ---- Player movement (walk / double-tap to run / decelerate on release) ----
  const leftDown = keys.has("ArrowLeft") || keys.has("KeyA");
  const rightDown = keys.has("ArrowRight") || keys.has("KeyD");
  const wasLeft = player._prevLeft || false;
  const wasRight = player._prevRight || false;

  // Detect fresh key press (rising edge) for double-tap.
  // Double-tap TOWARD the way you face = run; double-tap AWAY = backflip dodge.
  if (leftDown && !wasLeft) {
    if (player.tapTimer.left > 0 && player.tapFacing.left === 1 && canDodge(player)) {
      startDodge(game, 1);
    } else {
      player.running = player.tapTimer.left > 0; // second tap within window = run
    }
    player.tapTimer.left = DOUBLE_TAP_WINDOW;
    player.tapFacing.left = player.facing;
  }
  if (rightDown && !wasRight) {
    if (player.tapTimer.right > 0 && player.tapFacing.right === -1 && canDodge(player)) {
      startDodge(game, -1);
    } else {
      player.running = player.tapTimer.right > 0;
    }
    player.tapTimer.right = DOUBLE_TAP_WINDOW;
    player.tapFacing.right = player.facing;
  }
  player._prevLeft = leftDown;
  player._prevRight = rightDown;

  // Count down tap timers
  if (player.tapTimer.left > 0) player.tapTimer.left -= dt;
  if (player.tapTimer.right > 0) player.tapTimer.right -= dt;
  if (player.dodgeCooldown > 0) player.dodgeCooldown -= dt;

  // Target speed based on input
  const targetSpeed = player.running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
  let moveDir = 0;
  const prevFacing = player.facing;
  if (!player.attacking && !player.crouching) {
    if (leftDown) { moveDir = -1; player.facing = -1; }
    if (rightDown) { moveDir = 1; player.facing = 1; }
  }

  // Direction change while running → play turn animation
  const dirChanged = moveDir !== 0 && moveDir !== prevFacing;
  if (dirChanged) {
    if (player.running && !player._turning) {
      game.playerAnim.forcePlay("turn");
      player._turning = true;
    }
    player.running = false;
    player.currentSpeed = PLAYER_WALK_SPEED;
  }
  // Clear turning flag when turn animation finishes
  if (player._turning && game.playerAnim.state !== "turn") {
    player._turning = false;
  }

  if (moveDir !== 0) {
    // Accelerate toward target speed
    const accel = player.running ? 0.25 : 0.2;
    player.currentSpeed += (targetSpeed - player.currentSpeed) * accel;
    player.vx = moveDir * player.currentSpeed * dt;
  } else {
    // Decelerate when no input
    player.currentSpeed *= 0.85; // friction
    if (player.currentSpeed < 0.1) { player.currentSpeed = 0; player.running = false; }
    player.vx = player.facing * player.currentSpeed * dt;
  }

  player.x += player.vx;

  // Jump
  if ((keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW")) && player.grounded) {
    player.vy = JUMP_FORCE;
    player.grounded = false;
  }

  // Attack definitions
  const ATTACKS = {
    // punch.png winds up for 5 of its 6 frames — the arm is only extended on
    // frame 5, which the sheet reaches ~15 frames in. Damage must wait for it.
    punch:   { duration: 20, hitStart: 5,  hitEnd: 1, reach: 18, hitH: 20, hitOy: 8, dmg: 1 },
    kick:    { duration: 24, hitStart: 12, hitEnd: 6, reach: 22, hitH: 20, hitOy: 14, dmg: 2 },
    flyKick: { duration: 28, hitStart: 14, hitEnd: 6, reach: 28, hitH: 24, hitOy: 6, dmg: 3 },
    sweep:   { duration: 26, hitStart: 13, hitEnd: 6, reach: 26, hitH: 16, hitOy: 32, dmg: 2 },
    special: { duration: 30, hitStart: 15, hitEnd: 5, reach: 144, hitH: 48, hitOy: 0, dmg: 999, hpCost: 2 },
  };

  // Crouch / Sweep / Special
  const downDown = keys.has("ArrowDown") || keys.has("KeyS");
  const wasDown = player._prevDown || false;
  const punchKey = keys.has("KeyZ") || keys.has("KeyN");
  const kickKey = keys.has("KeyX") || keys.has("KeyM");

  // SPECIAL: Z+X (punch+kick) simultaneously — costs 2% HP
  if (punchKey && kickKey && !player.attacking && player.grounded) {
    player.attacking = true;
    player.attackType = "special";
    player.attackTimer = ATTACKS.special.duration;
    player.hp = Math.max(1, player.hp - ATTACKS.special.hpCost);
    game.playerAnim.forcePlay("special");
    spawnParticles(game, player.x + FRAME_SIZE / 2, player.y + PLAYER_H / 2, 0xffd700, 20);
  }

  // SWEEP: double-tap down — slides forward
  if (downDown && !wasDown) {
    if (player._downTapTimer > 0 && !player.attacking && player.grounded) {
      player.attacking = true;
      player.attackType = "sweep";
      player.attackTimer = ATTACKS.sweep.duration;
      game.playerAnim.forcePlay("sweep");
      player._downTapTimer = 0;
    } else {
      player._downTapTimer = DOUBLE_TAP_WINDOW;
    }
  }
  player._prevDown = downDown;
  if (player._downTapTimer > 0) player._downTapTimer -= dt;

  // Dodge: fixed backward drift for the whole flip, overriding any residual
  // walk velocity from the taps that triggered it.
  if (player.dodging) {
    player.vx = player.dodgeVx * dt;
    player.x += player.vx;
    // Teardown normally happens below once attackTimer counts down to 0
    // (dodging reuses the attack lock). If something ends `attacking` first
    // — a frame that returns early, a future code path — don't let
    // `dodging` strand itself: self-heal instead of permanently dragging
    // the player sideways and locking canDodge() out for the rest of the run.
    if (!player.attacking) {
      player.dodging = false;
      player.dodgeVx = 0;
    }
  }

  // Sweep: continuous slide during animation
  if (player.attacking && player.attackType === "sweep") {
    player.vx = player.facing * PLAYER_RUN_SPEED * 1.0 * dt;
    player.x += player.vx;
  }

  // CROUCH: hold down (not attacking)
  // forcePlay only on ENTRY — calling it every held frame resets the sheet to
  // frame 0, which is a standing pose, so the crouch never visibly happens.
  if (downDown && !player.attacking && player.grounded) {
    if (!player.crouching) game.playerAnim.forcePlay("crouch");
    player.crouching = true;
  } else {
    player.crouching = false;
  }

  // Flying kick: kick while airborne OR kick while running
  const canFlyKick = !player.attacking && (kickKey && !punchKey);
  if (canFlyKick && (!player.grounded || player.running)) {
    player.attacking = true;
    player.attackType = "flyKick";
    player.attackTimer = ATTACKS.flyKick.duration;
    game.playerAnim.forcePlay("flyKick");
    // Launch into air if on ground (running voadora)
    if (player.grounded) {
      player.vy = JUMP_FORCE * 0.7; // keeps the ~30px flying-kick arc under the lighter gravity
      player.grounded = false;
    }
    player.currentSpeed = PLAYER_RUN_SPEED * 1.5;
    player.vx = player.facing * player.currentSpeed * dt;
  }
  // Ground punch
  if ((keys.has("KeyZ") || keys.has("KeyN")) && !player.attacking && player.grounded && !player.crouching) {
    player.attacking = true;
    player.attackType = "punch";
    player.attackTimer = ATTACKS.punch.duration;
    game.playerAnim.play("punch");
  }
  // Ground kick
  if ((keys.has("KeyX") || keys.has("KeyM")) && !player.attacking && player.grounded && !player.crouching) {
    player.attacking = true;
    player.attackType = "kick";
    player.attackTimer = ATTACKS.kick.duration;
    game.playerAnim.play("kick");
  }

  // Gravity
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  if (player.y >= GROUND_Y - PLAYER_H) {
    player.y = GROUND_Y - PLAYER_H;
    player.vy = 0;
    player.grounded = true;
  }

  // Clamp to level
  player.x = Math.max(0, Math.min(game.levelWidth - PLAYER_W, player.x));

  // Attack timer
  if (player.attacking) {
    player.attackTimer -= dt;
    if (player.attackTimer <= 0) {
      player.attacking = false;
      player.attackType = null;
      if (player.dodging) {
        player.dodging = false;
        player.dodgeCooldown = DODGE_COOLDOWN;
      }
      // Force-reset past attack priority so idle/walk can take over
      game.playerAnim.forcePlay("idle");
    }
  }

  // ---- Passive health regeneration ----
  // Reached only while alive and in normal play — the transition and
  // death-sequence blocks above return before this point.
  player.hp = regenHp(player.hp, PLAYER_HP_MAX, PLAYER_REGEN_PCT_PER_SEC, dt);

  // ---- Player animation state ----
  // Skipped while crouching: `crouch` ends with _done = true, so any play()
  // here would be accepted and would snap the held pose back to idle.
  if (!player.attacking && !player.crouching) {
    if (!player.grounded) {
      game.playerAnim.play("jump");
    } else if (game.playerAnim.state === "jump" || game.playerAnim.state === "flyKick") {
      // Just landed — force-reset past jump/flyKick priority
      player.attacking = false;
      player.attackType = null;
      game.playerAnim.forcePlay(player.currentSpeed > 0.3 ? (player.running ? "run" : "walk") : "idle");
    } else if (player._turning) {
      // Let turn animation play out (transitions to run via next)
    } else if (player.currentSpeed > 0.3) {
      game.playerAnim.play(player.running ? "run" : "walk");
    } else {
      game.playerAnim.play("idle");
    }
  }
  game.playerAnim.setFacing(player.facing);
  game.playerAnim.update(dt);

  // Props que emitem luz crepitam por conta própria, independentes do jogador.
  for (const a of game.propAnims) a.update(dt);
  game.playerSprite.x = player.x + FRAME_SIZE / 2;
  game.playerSprite.y = player.y + PLAYER_H;

  // ---- Spawn enemies / boss ----
  if (!game.bossActive && !game.bossDefeated) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0 && game.enemies.length < 5 && game.killCount < game.bossKillThreshold) {
      spawnEnemy(game);
      game.spawnTimer = 90 + Math.random() * 60;
    }
    // Spawn boss when kill threshold reached and no more regular enemies
    if (game.killCount >= game.bossKillThreshold && game.enemies.length === 0) {
      spawnBoss(game);
      game.bossActive = true;
    }
  }

  // ---- Update enemies ----
  const COMBAT_RANGE = 23; // distance to stop and attack (~1px overlap)

  // Senha de ataque: no máximo MAX_ATTACKERS golpes em preparo por vez. Começa
  // contando quem já está no meio de um e sobe conforme novos entram, porque
  // eles entram dentro deste mesmo laço.
  let atacando = countWindingUp(game.enemies);

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    const eAnim = game.enemyAnims[i];

    // Horizontal offset player→enemy, measured between sprite CENTRES.
    // Regular enemies share the player's 48px frame, but the boss frame is
    // 68px, so comparing left edges skews every direction test by 10px.
    const dxCenter =
      (player.x + FRAME_SIZE / 2) - (e.x + (e.frameSize || FRAME_SIZE) / 2);

    // --- Dead enemy: knockback + fade out ---
    if (!e.alive) {
      if (!e.deathTimer) {
        e.deathTimer = 30;
        e.knockVx = dxCenter > 0 ? -3 : 3; // fly away from player
      }
      e.deathTimer -= dt;
      e.x += e.knockVx * dt;
      eAnim.sprite.x = e.x + (e.frameSize || FRAME_SIZE) / 2;
      eAnim.sprite.alpha = Math.max(0, e.deathTimer / 30);
      eAnim.sprite.y += 0.5 * dt; // sink slightly
      if (e.deathTimer <= 0) {
        eAnim.sprite.destroy();
        game.enemies.splice(i, 1);
        game.enemyAnims.splice(i, 1);
      }
      continue;
    }

    const dx = player.x - e.x;
    const dist = Math.abs(dx);
    // Enemies face TOWARD player
    const facing = dxCenter > 0 ? 1 : -1;

    if (e.hitTimer > 0) e.hitTimer -= dt;
    if (e.attackCooldown > 0) e.attackCooldown -= dt;

    // Bosses regenerate; regular enemies don't. Runs BEFORE the player's
    // damage block so a killing blow this frame is never undone.
    if (e.isBoss) {
      e.hp = regenHp(e.hp, e.maxHp, BOSS_REGEN_PCT_PER_SEC, dt);
    }

    // --- Movement: stop at combat range, don't overlap ---
    if (dist > COMBAT_RANGE && e.hitTimer <= 0) {
      // Chefe não está em ENEMY_STATS: lendo só de lá, todo chefe andava a 1.2
      // e BOSS_STATS.speed era enfeite. `??` em vez de `||` porque o atirador
      // declara speed 0, e `0 || 1.2` o punha a andar.
      const spd = (ENEMY_STATS[e.type]?.speed ?? BOSS_STATS[e.type]?.speed ?? 1.2) * dt;
      e.vx = facing * spd;
      e.x += e.vx;
    } else {
      e.vx = 0;
    }

    const eHb = getHitbox(e);

    // --- Enemy attacks player when in range (only if player is on ground) ---
    // Starting the attack only schedules the blow. Everything that decides
    // whether it connects is re-read at the impact tick below, so the player
    // has a window to walk out, jump, flip, or hit first.
    const playerInReach = dist <= COMBAT_RANGE && player.grounded;
    if (playerInReach && e.hitTimer <= 0 && (e.attackCooldown || 0) <= 0
        && atacando < MAX_ATTACKERS) {
      atacando++;
      e.attackCooldown = 50 + Math.random() * 30;
      const attackAnim = resolveAttackAnim(e, eAnim);
      // forcePlay, não play: `hit` tem prioridade 4 e `punch` tem 3, e a folha
      // de recuo dura ~50 ticks contra os 20 de e.hitTimer. Nessa janela de 30
      // ticks — o caso comum logo depois de CADA soco do jogador — play() era
      // recusado em silêncio e o impacto era agendado assim mesmo: dano sem
      // nenhuma telegrafia, exatamente o que o wind-up existe para eliminar.
      // Quem manda na duração do atordoamento é e.hitTimer, que este bloco já
      // exigiu estar zerado; a animação segue o estado, não o contrário.
      // Inimigos mortos saem do laço antes daqui, então não há `death` a
      // atropelar.
      eAnim.forcePlay(attackAnim);
      e.attackImpact = windupTicks(eAnim.anims[attackAnim]);
    }

    // --- The blow connects (or the player got out of it) ---
    if (tickAttackImpact(e, player, COMBAT_RANGE, dt)) {
      player.hp -= e.damage;
      game.playerAnim.play("hit");
      spawnParticles(game, player.x + FRAME_SIZE / 2, player.y + PLAYER_H / 2, 0xff4444, 5);
    }

    // --- Player attack hits enemy (only during active hit frames) ---
    const atk = player.attackType && ATTACKS[player.attackType];
    const inHitWindow = atk && player.attackTimer <= atk.hitStart && player.attackTimer > atk.hitEnd;
    if (player.attacking && inHitWindow) {
      const isSpecial = player.attackType === "special";
      const px = player.x + FRAME_SIZE / 2;

      // Special: hits ALL enemies in front (infinite reach)
      // Normal attacks: hitbox from sprite edge
      const attackX = isSpecial
        ? (player.facing === 1 ? px : 0)
        : (player.facing === 1 ? px + 2 : px - 2 - atk.reach);
      const attackW = isSpecial
        ? (player.facing === 1 ? game.levelWidth - px : px)
        : atk.reach;
      const attackY = player.y + (atk.hitOy || 8);

      if (aabb(attackX, attackY, attackW, atk.hitH, eHb.x, eHb.y, eHb.w, eHb.h)) {
        if (!e.justHit) {
          e.justHit = true;
          if (isSpecial) {
            // Special: instant kill normal enemies, 4% damage to bosses
            e.hp = e.isBoss ? e.hp - Math.ceil(e.maxHp * 0.04) : 0;
          } else {
            e.hp -= atk.dmg || 1;
          }
          // Atordoa E mata o golpe em preparo: só checar hitTimer na hora
          // do impacto não basta, porque vários wind-ups são mais longos que o
          // atordoamento e o golpe reapareceria depois da recuperação, sem
          // nenhuma animação para explicá-lo.
          staggerEnemy(e, ENEMY_STUN);
          eAnim.play("hit");
          e.x += player.facing * (isSpecial ? 30 : 14);
          const pColor = isSpecial ? 0xffd700 : 0xff8800;
          spawnParticles(game, e.x + FRAME_SIZE / 2, attackY + atk.hitH / 2, pColor, isSpecial ? 12 : 6);
          if (e.hp <= 0) {
            e.alive = false;
            player.score += e.score;
            if (!e.isBoss) game.killCount++;
            spawnParticles(game, e.x + FRAME_SIZE / 2, e.y + FRAME_SIZE / 2, 0xffd700, 12);
            // Boss defeated
            if (e.isBoss) {
              game.bossActive = false;
              game.bossDefeated = true;
              game.bossDefeatedFrame = game.frame;
              spawnParticles(game, e.x + FRAME_SIZE / 2, e.y + FRAME_SIZE / 2, 0xff4444, 20);
            }
          }
        }
      }
    } else if (!player.attacking) {
      e.justHit = false;
    }

    // --- Enemy animation state ---
    if (e.alive && e.hitTimer <= 0) {
      if (Math.abs(e.vx) > 0.1) eAnim.play("walk");
      else if (dist > COMBAT_RANGE) eAnim.play("idle");
      // if in combat range, attack anim plays from above
    }
    eAnim.setFacing(facing);
    eAnim.update(dt);
    const efs = e.frameSize || FRAME_SIZE;
    eAnim.sprite.x = e.x + efs / 2;
    eAnim.sprite.y = GROUND_Y + (e.groundOffset || 0);
  }

  // ---- Particles ----
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.2 * dt;
    p.life -= p.decay * dt;
    p.alpha = p.life;
    if (p.life <= 0) {
      p.destroy();
      game.particles.splice(i, 1);
    }
  }

  // ---- Camera ----
  const targetX = player.x - CW * 0.35;
  game.cameraX += (targetX - game.cameraX) * 0.08;
  game.cameraX = Math.max(0, Math.min(game.cameraX, game.levelWidth - CW));

  game.bgLayer.x = -game.cameraX * 0.15;
  game.midLayer.x = -game.cameraX * 0.5;
  game.gameLayer.x = -game.cameraX;
  game.fgLayer.x = -game.cameraX;
  // hudLayer stays at 0

  // ---- HUD ----
  game.hpBar.clear();
  game.hpBar.rect(18, 18, Math.max(0, player.hp), 8);
  game.hpBar.fill({ color: player.hp > 30 ? 0x22c55e : 0xef4444 });

  game.scoreText.text = `${_t("hud.score")}: ${player.score}  KO: ${game.killCount}/${game.bossKillThreshold}`;
  game.phaseText.text = `${_t("hud.phase")}: ${game.phase}`;
  game.livesText.text = `${_t("hud.lives")}: ${player.lives}`;

  // Boss HP bar
  const bossEnemy = game.enemies.find(e => e.isBoss && e.alive);
  if (bossEnemy) {
    const bossW = 160;
    const bossX = (CW - bossW) / 2;
    game.hpBar.rect(bossX, CH - 24, bossW, 8);
    game.hpBar.fill({ color: 0x333333 });
    game.hpBar.rect(bossX, CH - 24, Math.max(0, (bossEnemy.hp / bossEnemy.maxHp) * bossW), 8);
    game.hpBar.fill({ color: 0xcc0000 });
  }

  // Phase title fade
  if (game.frame < 120) {
    const alpha = Math.max(0, 1 - game.frame / 120);
    game.phaseTitle.text = `${_t("hud.phase")} ${game.phase}`;
    game.phaseTitle.alpha = alpha;
    game.phaseSub.text = _t(`phases.${game.phase}`);
    game.phaseSub.alpha = alpha;
  } else {
    game.phaseTitle.alpha = 0;
    game.phaseSub.alpha = 0;
  }

}

// ============================================================
// COMPONENT
// ============================================================
export default function KungFuCastle() {
  const t = useTranslations("games.kungfucastle");
  const containerRef = useRef(null);
  const appRef = useRef(null);
  const gameRef = useRef(null);
  const keysRef = useRef(new Set());
  const isTstMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tst") === "t";
  const [screen, setScreen] = useState(isTstMode ? "spritetest" : "menu");
  const [finalScore, setFinalScore] = useState(0);
  // Test-mode entry point. Kept in state so "play again" after a game over
  // returns to the phase being tested instead of dropping back to phase 1.
  const [startPhase, setStartPhase] = useState(1);
  const [startAtBoss, setStartAtBoss] = useState(false);

  // Keep translation ref in sync
  _t = t;

  // ── PixiJS Init ────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "playing") return;

    let destroyed = false;
    const app = new Application();

    (async () => {
      await app.init({
        width: CW,
        height: CH,
        backgroundColor: 0x050510,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        preference: "webgl",
      });

      if (destroyed) { app.destroy(); return; }

      containerRef.current?.appendChild(app.canvas);
      app.canvas.style.imageRendering = "pixelated";
      app.canvas.style.width = "100%";
      app.canvas.style.height = "auto";
      app.canvas.style.maxHeight = "calc(100vh - 80px)";
      app.canvas.style.objectFit = "contain";
      app.canvas.style.borderRadius = "8px";
      app.canvas.style.border = "2px solid rgba(220,38,38,0.27)";
      appRef.current = app;

      const scene = await buildScene(app);
      if (destroyed) { app.destroy(true, { children: true }); return; }

      // Test-mode entry: zero the threshold BEFORE loadPhase, so the boss is
      // already eligible on the first frame of the requested phase.
      if (startAtBoss) scene.bossKillThreshold = 0;
      if (startPhase !== 1) loadPhase(scene, startPhase);

      gameRef.current = scene;

      // Test mode only: hand the live scene to whatever is driving the browser.
      // Combat behaviour (did the flip actually dodge? does mashing attack
      // still grant immunity?) can only be answered from state — reading it
      // back off the canvas is impossible, since PixiJS runs without
      // preserveDrawingBuffer and the drawing buffer is blank by the time a
      // script can copy it.
      if (isTstMode) window.__kungfu = scene;

      app.ticker.add((ticker) => {
        const g = gameRef.current;
        if (!g || g.gameOver || g.victory) {
          if (g?.gameOver) {
            setFinalScore(g.player.score);
            setScreen("gameover");
          } else if (g?.victory) {
            setFinalScore(g.player.score);
            setScreen("victory");
          }
          return;
        }
        update(g, keysRef.current, ticker.deltaTime);
      });
    })();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [screen]);

  // ── Input (prevent scroll on game keys) ────────────────────────
  useEffect(() => {
    const GAME_KEYS = new Set([
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "Space", "KeyA", "KeyD", "KeyW", "KeyS",
      "KeyZ", "KeyX", "KeyN", "KeyM",
    ]);
    const onDown = (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      keysRef.current.add(e.code);
    };
    const onUp = (e) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      keysRef.current.delete(e.code);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // ── Handlers ───────────────────────────────────────────────────
  const handleStart = () => {
    setStartPhase(1);
    setStartAtBoss(false);
    setScreen("playing");
  };

  /** Test mode: drop straight into `phase`, optionally with the boss already due. */
  const startTest = (phase, atBoss) => {
    setStartPhase(phase);
    setStartAtBoss(atBoss);
    setScreen("playing");
  };

  const handleRestart = () => {
    setScreen("playing");
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: "#050510",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: screen === "playing" ? "flex-start" : "center",
        fontFamily: "'Fira Code', monospace",
        padding: 12,
        paddingTop: screen === "playing" ? 60 : 12,
      }}
    >
      {screen === "menu" && (
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 24,
              color: "#dc2626",
              textShadow: "0 0 20px rgba(220,38,38,0.5)",
              marginBottom: 8,
              letterSpacing: 3,
            }}
          >
            {t("title")}
          </h1>
          <p style={{ fontSize: 11, color: "#8892b0", marginBottom: 24 }}>
            {t("subtitle")}
          </p>

          <div
            style={{
              width: 120,
              height: 80,
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              border: "2px solid #dc262644",
              borderRadius: 8,
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            🥋
          </div>

          <button
            onClick={handleStart}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 13,
              color: "#050510",
              background: "#dc2626",
              border: "none",
              borderRadius: 8,
              padding: "14px 36px",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(220,38,38,0.4)",
              letterSpacing: 2,
              marginBottom: 12,
            }}
          >
            {t("start")}
          </button>

          {isTstMode && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 9, color: "#8892b0", letterSpacing: 2, marginBottom: 8 }}>
                MODO TESTE
              </p>
              {Object.keys(PHASE_CONFIG)
                .map(Number)
                .sort((a, b) => a - b)
                .map((n) => (
                  <div key={n} style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 6 }}>
                    <button onClick={() => startTest(n, false)} style={S_TEST_BTN}>
                      FASE {n}
                    </button>
                    <button onClick={() => startTest(n, true)} style={{ ...S_TEST_BTN, color: "#dc2626" }}>
                      FASE {n} &#9656; CHEFE
                    </button>
                  </div>
                ))}
            </div>
          )}

          {isTstMode && (
            <button
              onClick={() => setScreen("spritetest")}
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 9,
                color: "#8892b0",
                background: "transparent",
                border: "1px solid #333",
                borderRadius: 6,
                padding: "8px 20px",
                cursor: "pointer",
                marginTop: 12,
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              Sprite Test
            </button>
          )}

          <p style={{ fontSize: 9, color: "#4a5568", marginTop: 16 }}>
            {t("controlsHint")}
          </p>
        </div>
      )}

      {screen === "playing" && (
        <div
          ref={containerRef}
          style={{ width: "100%", maxWidth: 960, margin: "0 auto" }}
        />
      )}

      {screen === "gameover" && (
        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 22,
              color: "#dc2626",
              marginBottom: 16,
            }}
          >
            GAME OVER
          </h2>
          <p style={{ color: "#ccd6f6", fontSize: 14, marginBottom: 8 }}>
            {_t("hud.score")}: {finalScore}
          </p>
          <button
            onClick={handleRestart}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 11,
              color: "#050510",
              background: "#dc2626",
              border: "none",
              borderRadius: 8,
              padding: "12px 28px",
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(220,38,38,0.4)",
              letterSpacing: 2,
              marginTop: 16,
            }}
          >
            {t("start")}
          </button>
        </div>
      )}

      {screen === "victory" && (
        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 24,
              color: "#ffd700",
              textShadow: "0 0 30px rgba(255,215,0,0.6)",
              marginBottom: 12,
              letterSpacing: 4,
            }}
          >
            {t("victory.title")}
          </h2>
          <p style={{ color: "#ccd6f6", fontSize: 12, marginBottom: 8 }}>
            {t("victory.subtitle")}
          </p>
          <p style={{ color: "#ccd6f6", fontSize: 14, marginBottom: 16, marginTop: 16 }}>
            {_t("hud.score")}: {finalScore}
          </p>
          <button
            onClick={handleRestart}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 11,
              color: "#050510",
              background: "#ffd700",
              border: "none",
              borderRadius: 8,
              padding: "12px 28px",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(255,215,0,0.5)",
              letterSpacing: 2,
              marginTop: 8,
            }}
          >
            {t("victory.restart")}
          </button>
        </div>
      )}

      {screen === "spritetest" && (
        <KungFuSpriteTest onBack={() => setScreen("menu")} />
      )}

      <AdBanner slot="kungfucastle_bottom" style={{ marginTop: 16, maxWidth: 960 }} />
    </div>
  );
}
