"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Application, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import dynamic from "next/dynamic";
import AdBanner from "@/components/AdBanner";
import { loadAllAssets } from "./kungfu-assets";
import { AnimController } from "./kungfu-anim";
import { BossAI } from "./kungfu-boss-ai";

const KungFuSpriteTest = dynamic(() => import("./KungFuSpriteTest"), { ssr: false });

// ── Constants ──────────────────────────────────────────────────────────────
const CW = 480;
const CH = 320;
const GROUND_Y = 260;
const PLAYER_W = 32;
const PLAYER_H = 48;
const PLAYER_WALK_SPEED = 1.4; // similar to capanga-branco (1.2)
const PLAYER_RUN_SPEED = 3.2;
const DOUBLE_TAP_WINDOW = 12; // frames to detect double-tap
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const LEVEL_WIDTH = 2400;

const FRAME_SIZE = 48;

const ENEMY_STATS = {
  "capanga-branco": { hp: 1, speed: 1.2, damage: 5,  score: 100 },
  "capanga-cinza":  { hp: 2, speed: 1.5, damage: 8,  score: 150 },
  "capanga-rapido": { hp: 1, speed: 3.0, damage: 6,  score: 150 },
  "guarda-bastao":  { hp: 3, speed: 1.0, damage: 12, score: 200 },
  "atirador":       { hp: 2, speed: 0,   damage: 8,  score: 200 },
  "ninja":          { hp: 3, speed: 2.0, damage: 10, score: 200 },
  "ninja-espada":   { hp: 4, speed: 1.8, damage: 15, score: 250 },
  "samurai":        { hp: 5, speed: 1.0, damage: 18, score: 300 },
  "kunoichi":       { hp: 3, speed: 3.5, damage: 12, score: 250 },
  "lancador-bomba": { hp: 3, speed: 1.0, damage: 15, score: 250 },
};

const PHASE_ENEMIES = {
  1: ["capanga-branco", "capanga-cinza", "capanga-rapido"],
  2: ["capanga-branco", "capanga-cinza", "guarda-bastao", "atirador"],
  3: ["ninja", "kunoichi", "capanga-rapido", "lancador-bomba"],
  4: ["ninja-espada", "ninja", "samurai", "lancador-bomba"],
  5: ["samurai", "ninja-espada", "kunoichi", "guarda-bastao"],
};

// Enemies that keep their distance and throw instead of closing in.
const RANGED_ENEMIES = {
  "atirador":       { range: 200, projSpeed: 4.0, dmg: 8,  color: 0xdddddd, cooldown: 90,  w: 6, h: 6 },
  "lancador-bomba": { range: 170, projSpeed: 3.0, dmg: 15, color: 0xff8800, cooldown: 130, w: 8, h: 8 },
};

const BOSS_KILL_THRESHOLD = {
  1: 100,
  2: 80,
  3: 60,
  4: 50,
  5: 40,
};

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

  const { scenery } = textures;

  // -- Starry night sky
  const sky = new Graphics();
  sky.rect(0, 0, LEVEL_WIDTH, CH);
  sky.fill({ color: 0x06061a });
  // Stars — random small dots
  for (let i = 0; i < 200; i++) {
    const sx = Math.random() * LEVEL_WIDTH;
    const sy = Math.random() * (GROUND_Y - 40);
    const size = Math.random() < 0.15 ? 2 : 1;
    const brightness = 0.3 + Math.random() * 0.7;
    sky.rect(sx, sy, size, size);
    sky.fill({ color: 0xffffff, alpha: brightness });
  }
  bgLayer.addChild(sky);

  // -- Parallax mountains (bgLayer) — just above the tree line
  if (scenery.parallaxMountains) {
    const scale = 2.2;
    const mtnW = scenery.parallaxMountains.width * scale;
    const mtnH = scenery.parallaxMountains.height * scale;
    // Trees are 80px tall from GROUND_Y, mountains sit just above them
    const mtnY = GROUND_Y - 10 - mtnH + 28;
    const mtnCount = Math.ceil(LEVEL_WIDTH / mtnW) + 2;
    for (let i = 0; i < mtnCount; i++) {
      const s = new Sprite(scenery.parallaxMountains);
      s.scale.set(scale);
      s.x = i * mtnW;
      s.y = mtnY;
      s.alpha = 0.6;
      bgLayer.addChild(s);
    }
  }

  // -- Parallax trees (midLayer) — base touching the grass
  if (scenery.parallaxTrees) {
    const treeW = scenery.parallaxTrees.width;
    const treeH = scenery.parallaxTrees.height;
    const treeY = GROUND_Y - treeH + 18; // overlap into grass
    const treeCount = Math.ceil(LEVEL_WIDTH / treeW) + 2;
    for (let i = 0; i < treeCount; i++) {
      const s = new Sprite(scenery.parallaxTrees);
      s.x = i * treeW;
      s.y = treeY;
      midLayer.addChild(s);
    }
  }

  // -- Ground: grass row at feet level + brick wall rows below
  const groundSprites = { grass: [], transition: [], brick: [] };
  if (scenery.tileset && scenery.tileset.length >= 16) {
    const TILE = 32;
    const tilesAcross = Math.ceil(LEVEL_WIDTH / TILE);

    // Tile index map (from 4x4 grid):
    // 12 = wang_15 (all grass, seamless)
    // 3  = wang_12 (grass top + brick bottom — transition)
    // 9  = wang_3  (brick top + grass bottom)
    // 6  = wang_0  (mixed brick)
    const grassTile = scenery.tileset[12]; // full grass, seamless
    const transitionTile = scenery.tileset[3]; // grass top, brick bottom
    const brickTile = scenery.tileset[6]; // brick only, no grass

    // Row 0: grass — top of tile aligns with feet (shift up so grass surface = GROUND_Y)
    const GRASS_OFFSET = 52; // grass surface is ~14px from top of tile
    for (let col = 0; col < tilesAcross; col++) {
      const s = new Sprite(grassTile);
      s.x = col * TILE;
      s.y = GROUND_Y - GRASS_OFFSET;
      gameLayer.addChild(s);
      groundSprites.grass.push(s);
    }
    // Row 1: transition (grass top + brick bottom) just below grass
    const transY = GROUND_Y - GRASS_OFFSET + TILE;
    for (let col = 0; col < tilesAcross; col++) {
      const s = new Sprite(transitionTile);
      s.x = col * TILE;
      s.y = transY;
      gameLayer.addChild(s);
      groundSprites.transition.push(s);
    }
    // Rows 2+: pure brick filling to bottom of screen
    const brickStartY = transY + TILE;
    const rowsNeeded = Math.ceil((CH - brickStartY) / TILE) + 1;
    for (let row = 0; row < rowsNeeded; row++) {
      for (let col = 0; col < tilesAcross; col++) {
        const s = new Sprite(brickTile);
        s.x = col * TILE;
        s.y = brickStartY + row * TILE;
        gameLayer.addChild(s);
        groundSprites.brick.push(s);
      }
    }
  }

  // -- Decorative props
  // layer: "bg" = behind characters (midLayer), "fg" = in front (fgLayer), "game" = same level (gameLayer)
  const PROP_LAYOUT = [
    { asset: "torii-vermelho",       x: 60,   y: 10, layer: "game" },
    { asset: "cerejeira-sakura",     x: 200,  y: 5,  layer: "bg" },
    { asset: "lanterna-ishidoro",    x: 350,  y: 4,  layer: "fg" },
    { asset: "pedra-decorativa",     x: 500,  y: 1,  layer: "game" },
    { asset: "cerejeira-sakura",     x: 700,  y: 5,  layer: "bg" },
    { asset: "komainu",              x: 850,  y: 2,  layer: "game" },
    { asset: "cerca-bambu",          x: 1000, y: 4,  layer: "fg" },
    { asset: "lanterna-ishidoro",    x: 1150, y: 4,  layer: "fg" },
    { asset: "cerejeira-sakura",     x: 1350, y: 8,  layer: "fg" },
    { asset: "pedra-decorativa",     x: 1500, y: 1,  layer: "game" },
    { asset: "komainu",              x: 1650, y: 4,  layer: "fg" },
    { asset: "lanterna-ishidoro",    x: 1800, y: 2,  layer: "game" },
    { asset: "cerejeira-sakura",     x: 1950, y: 5,  layer: "bg" },
    { asset: "cerca-bambu",          x: 2100, y: 6,  layer: "fg" },
    { asset: "portao-arco-pedra",    x: 2300, y: 4,  layer: "game" },
    { asset: "escada-pedra-externa", x: 2370, y: 10, layer: "game" },
  ];

  const layerMap = { bg: midLayer, game: gameLayer, fg: fgLayer };
  for (const { asset, x, y, layer } of PROP_LAYOUT) {
    const tex = scenery.props[asset];
    if (!tex) continue;
    const s = new Sprite(tex);
    s.anchor.set(0.5, 1);
    s.x = x;
    s.y = GROUND_Y + y;
    (layerMap[layer] || gameLayer).addChild(s);
  }

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

  return {
    app,
    bgLayer, midLayer, gameLayer, fgLayer, hudLayer,
    playerSprite,
    playerAnim,
    textures,
    enemyAnims: [],
    hpBar, scoreText, phaseText, livesText, phaseTitle, phaseSub,
    enemies: [],
    particles: [],
    enemyProjectiles: [],
    player: {
      x: 80,
      y: GROUND_Y - PLAYER_H,
      vx: 0,
      vy: 0,
      hp: 100,
      lives: 3,
      score: 0,
      facing: 1,
      grounded: true,
      attacking: false,
      attackTimer: 0,
      attackType: null,
      running: false,
      tapTimer: { left: 0, right: 0 },
      currentSpeed: 0, // for deceleration
      hitbox: { w: 28, h: 40, ox: 10, oy: 4 },
    },
    cameraX: 0,
    phase: 1,
    frame: 0,
    spawnTimer: 0,
    killCount: 0,
    bossActive: false,
    bossDefeated: false,
    transitioning: false,
    transitionTimer: 0,
    transitionPhase: 1,
    victory: false,
    victoryTimer: 0,
    gameOver: false,
    levelWidth: LEVEL_WIDTH,
    _groundSprites: groundSprites,
  };
}

// ============================================================
// SPAWN ENEMY
// ============================================================
function spawnEnemy(game, type) {
  if (!type) {
    const pool = PHASE_ENEMIES[game.phase] || PHASE_ENEMIES[1];
    type = pool[Math.floor(Math.random() * pool.length)];
  }
  const stats = ENEMY_STATS[type];
  if (!stats || !game.textures.enemies[type]) return;

  const side = Math.random() > 0.5 ? 1 : -1;
  const ex = side === 1 ? game.cameraX + CW + 20 : game.cameraX - FRAME_SIZE;

  const sprite = new Sprite(game.textures.enemies[type].idle.frames[0]);
  sprite.anchor.set(0.5, 1);
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
// footPad = transparent rows below the feet in each boss's idle frame. The sprite
// pivot is the frame's bottom edge, so it has to be pushed down by that much for
// the boss to stand on the same ground line as the player.
const BOSS_FOR_PHASE = {
  1: { type: "mestre-capangas", hp: 30,  damage: 10, speed: 1.5, score: 1000, frameSize: 68, footPad: 10 },
  2: { type: "guardiao-portao", hp: 40,  damage: 12, speed: 1.2, score: 1500, frameSize: 68, footPad: 9  },
  3: { type: "senhor-sombras",  hp: 45,  damage: 14, speed: 2.5, score: 2000, frameSize: 68, footPad: 8  },
  4: { type: "general-oni",     hp: 55,  damage: 16, speed: 1.8, score: 2500, frameSize: 68, footPad: 2  },
  5: { type: "senhor-castelo",  hp: 70,  damage: 18, speed: 2.0, score: 5000, frameSize: 92, footPad: 4  },
};

function spawnBoss(game) {
  const bossDef = BOSS_FOR_PHASE[game.phase];
  if (!bossDef || !game.textures.bosses[bossDef.type]) return;

  const bossTextures = game.textures.bosses[bossDef.type];
  const fs = bossDef.frameSize;

  const sprite = new Sprite(bossTextures.idle.frames[0]);
  sprite.anchor.set(0.5, 1);
  sprite.x = game.cameraX + CW + fs;
  sprite.y = GROUND_Y;
  game.gameLayer.addChild(sprite);

  const anim = new AnimController({ sprite, anims: bossTextures });
  const ai = new BossAI(bossDef.type);

  const hitboxW = fs === 92 ? 30 : 23;
  const hitboxH = fs === 92 ? 60 : 49;
  const hitboxOx = fs === 92 ? 31 : 23;
  const hitboxOy = fs === 92 ? 16 : 9;

  const enemy = {
    x: game.cameraX + CW + fs,
    y: GROUND_Y - PLAYER_H,
    w: fs,
    h: PLAYER_H,
    vx: 0,
    hp: bossDef.hp,
    maxHp: bossDef.hp,
    damage: bossDef.damage,
    score: bossDef.score,
    type: bossDef.type,
    alive: true,
    isBoss: true,
    ai,
    hitTimer: 0,
    attackCooldown: 60,
    hitbox: { w: hitboxW, h: hitboxH, ox: hitboxOx, oy: hitboxOy },
    frameSize: fs,
    groundOffset: bossDef.footPad,
    _arcY: 0,
  };

  game.enemies.push(enemy);
  game.enemyAnims.push(anim);
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
function getHitbox(entity) {
  return {
    x: entity.x + (entity.hitbox?.ox || 0),
    y: entity.y + (entity.hitbox?.oy || 0),
    w: entity.hitbox?.w || 28,
    h: entity.hitbox?.h || 40,
  };
}

// ============================================================
// REBUILD TILESET (swap ground tiles for new phase)
// ============================================================
function rebuildTileset(game, phase) {
  const tiles = game.textures.scenery.tilesets[phase];
  if (!tiles || tiles.length < 16) return;

  const grassTile = tiles[12];
  const transitionTile = tiles[3];
  const brickTile = tiles[6];

  if (!game._groundSprites) return;
  for (const s of game._groundSprites.grass) s.texture = grassTile;
  for (const s of game._groundSprites.transition) s.texture = transitionTile;
  for (const s of game._groundSprites.brick) s.texture = brickTile;
}

// ============================================================
// UPDATE (called every tick — NO re-renders)
// ============================================================
function update(game, keys, dt) {
  const { player } = game;
  game.frame++;

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
        player.hp = 100;
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

  // Detect fresh key press (rising edge) for double-tap
  if (leftDown && !wasLeft) {
    player.running = player.tapTimer.left > 0; // second tap within window = run
    player.tapTimer.left = DOUBLE_TAP_WINDOW;
  }
  if (rightDown && !wasRight) {
    player.running = player.tapTimer.right > 0;
    player.tapTimer.right = DOUBLE_TAP_WINDOW;
  }
  player._prevLeft = leftDown;
  player._prevRight = rightDown;

  // Count down tap timers
  if (player.tapTimer.left > 0) player.tapTimer.left -= dt;
  if (player.tapTimer.right > 0) player.tapTimer.right -= dt;

  // Target speed based on input
  const targetSpeed = player.running ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;
  let moveDir = 0;
  const prevFacing = player.facing;
  if (!player.attacking) {
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
    punch:   { duration: 20, hitStart: 10, hitEnd: 5, reach: 18, hitH: 20, hitOy: 8, dmg: 1 },
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

  // Sweep: continuous slide during animation
  if (player.attacking && player.attackType === "sweep") {
    player.vx = player.facing * PLAYER_RUN_SPEED * 1.0 * dt;
    player.x += player.vx;
  }

  // CROUCH: hold down (not attacking)
  if (downDown && !player.attacking && player.grounded) {
    player.crouching = true;
    game.playerAnim.forcePlay("crouch");
  } else if (!downDown) {
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
      player.vy = JUMP_FORCE * 0.6;
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
      // Force-reset past attack priority so idle/walk can take over
      game.playerAnim.forcePlay("idle");
    }
  }

  // ---- Player animation state ----
  if (!player.attacking) {
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
  game.playerSprite.x = player.x + FRAME_SIZE / 2;
  game.playerSprite.y = player.y + PLAYER_H;

  // ---- Phase transition / victory ----
  // Wait for the boss death animation to finish (sprite removed) before starting.
  if (game.bossDefeated && !game.transitioning && !game.victory && game.enemies.length === 0) {
    if (game.phase >= 5) {
      game.victory = true;
      game.victoryTimer = 0;
    } else {
      game.transitioning = true;
      game.transitionTimer = 180;
      game.transitionPhase = game.phase + 1;
    }
  }

  if (game.transitioning) {
    game.transitionTimer -= dt;
    const progress = 1 - game.transitionTimer / 180;
    game.phaseTitle.text = `${_t("hud.phase")} ${game.transitionPhase}`;
    game.phaseTitle.alpha = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
    game.phaseSub.text = _t(`phases.${game.transitionPhase}`);
    game.phaseSub.alpha = game.phaseTitle.alpha;

    // Swap the tileset at the darkest point of the fade
    if (!game._tilesSwapped && progress >= 0.5) {
      game._tilesSwapped = true;
      rebuildTileset(game, game.transitionPhase);
      for (const proj of game.enemyProjectiles) proj.gfx.destroy();
      game.enemyProjectiles.length = 0;
      player.x = 80;
      player.y = GROUND_Y - PLAYER_H;
      player.vy = 0;
      player.currentSpeed = 0;
      player.hp = Math.min(100, player.hp + 30);
      game.cameraX = 0;
    }

    if (game.transitionTimer <= 0) {
      game.phase = game.transitionPhase;
      game.killCount = 0;
      game.bossActive = false;
      game.bossDefeated = false;
      game.transitioning = false;
      game._tilesSwapped = false;
      game.spawnTimer = 60;
    }
  }

  if (game.victory) {
    game.victoryTimer += dt;
    game.phaseTitle.text = "VICTORY!";
    game.phaseTitle.alpha = 1;
    game.phaseSub.text = `${_t("hud.score")}: ${player.score}`;
    game.phaseSub.alpha = 1;
    if (game.victoryTimer > 300) {
      game.won = true;
      game.gameOver = true;
    }
  }

  // ---- Spawn enemies / boss ----
  const threshold = BOSS_KILL_THRESHOLD[game.phase] || 100;
  if (!game.bossActive && !game.bossDefeated && !game.transitioning && !game.victory) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0 && game.enemies.length < 5 && game.killCount < threshold) {
      spawnEnemy(game);
      game.spawnTimer = 90 + Math.random() * 60;
    }
    if (game.killCount >= threshold && game.enemies.length === 0) {
      spawnBoss(game);
      game.bossActive = true;
    }
  }

  // ---- Update enemies ----
  const COMBAT_RANGE = 23;

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    const eAnim = game.enemyAnims[i];

    // --- Dead enemy: knockback + fade out ---
    if (!e.alive) {
      if (!e.deathTimer) {
        e.deathTimer = 30;
        e.knockVx = (player.x > e.x ? -3 : 3);
        if (e.isBoss && e.ai) {
          e.ai.onDeath();
          for (const proj of e.ai.projectiles) proj.gfx?.destroy();
          e.ai.projectiles.length = 0;
        }
      }
      e.deathTimer -= dt;
      e.x += e.knockVx * dt;
      eAnim.sprite.x = e.x + (e.frameSize || FRAME_SIZE) / 2;
      eAnim.sprite.alpha = Math.max(0, e.deathTimer / 30);
      eAnim.sprite.y += 0.5 * dt;
      if (e.isBoss) eAnim.forcePlay("death");
      eAnim.update(dt);
      if (e.deathTimer <= 0) {
        eAnim.sprite.destroy();
        game.enemies.splice(i, 1);
        game.enemyAnims.splice(i, 1);
      }
      continue;
    }

    const dx = player.x - e.x;
    const dist = Math.abs(dx);
    const facing = dx > 0 ? 1 : -1;

    if (e.hitTimer > 0) e.hitTimer -= dt;

    // ── Boss AI ──
    if (e.isBoss && e.ai) {
      const spawnCb = () => spawnEnemy(game);
      const aiResult = e.ai.update(e, player, dt, spawnCb, eAnim);

      if (aiResult.vx) e.x += aiResult.vx;
      e.x = Math.max(0, Math.min(game.levelWidth - (e.frameSize || FRAME_SIZE), e.x));

      // Boss attack hits player
      if (aiResult.hit && e.hitTimer <= 0) {
        const h = aiResult.hit;
        const bx = e.x + (e.frameSize || FRAME_SIZE) / 2;
        const hitX = aiResult.facing === 1 ? bx : bx - h.reach;
        const hitY = e.y + (h.hitOy || 8);
        const pHb = getHitbox(player);

        if (h.aoe || aabb(hitX, hitY, h.reach, h.hitH, pHb.x, pHb.y, pHb.w, pHb.h)) {
          if (h.groundOnly && !player.grounded) {
            // Ground-only attacks miss airborne players
          } else {
            player.hp -= h.dmg;
            player.x += aiResult.facing * h.knockback;
            game.playerAnim.forcePlay("hit");
            spawnParticles(game, player.x + FRAME_SIZE / 2, player.y + PLAYER_H / 2, 0xff4444, 8);
          }
        }
      }

      // Boss projectiles — render, collide, then drain
      if (e.ai.projectiles) {
        const pHb = getHitbox(player);
        for (let pi = e.ai.projectiles.length - 1; pi >= 0; pi--) {
          const proj = e.ai.projectiles[pi];

          if (!proj.gfx) {
            const g = new Graphics();
            g.rect(0, 0, proj.w, proj.h);
            g.fill({ color: proj.color || 0xffdd55 });
            game.gameLayer.addChild(g);
            proj.gfx = g;
          }
          proj.gfx.x = proj.x;
          proj.gfx.y = proj.y;

          if (aabb(proj.x, proj.y, proj.w, proj.h, pHb.x, pHb.y, pHb.w, pHb.h)) {
            player.hp -= proj.dmg;
            player.x += (proj.vx > 0 ? 1 : -1) * (proj.knockback || 6);
            game.playerAnim.forcePlay("hit");
            spawnParticles(game, player.x + FRAME_SIZE / 2, player.y + PLAYER_H / 2, 0xff4444, 5);
            proj.expired = true;
          }

          if (proj.expired) {
            proj.gfx.destroy();
            e.ai.projectiles.splice(pi, 1);
          }
        }
      }

      eAnim.setFacing(aiResult.facing);
      eAnim.update(dt);
      const efs = e.frameSize || FRAME_SIZE;
      eAnim.sprite.x = e.x + efs / 2;
      eAnim.sprite.y = GROUND_Y + (e.groundOffset || 0) + (e._arcY || 0);

    } else {
      // ── Regular enemy AI ──
      if (e.attackCooldown > 0) e.attackCooldown -= dt;

      const ranged = RANGED_ENEMIES[e.type];
      // Ranged types hold a stand-off distance instead of closing to melee range.
      const stopDist = ranged ? ranged.range * 0.7 : COMBAT_RANGE;

      if (dist > stopDist && e.hitTimer <= 0) {
        const spd = (ENEMY_STATS[e.type]?.speed || 1.2) * dt;
        e.vx = facing * spd;
        e.x += e.vx;
      } else {
        e.vx = 0;
      }

      if (ranged) {
        if (dist <= ranged.range && e.hitTimer <= 0 && (e.attackCooldown || 0) <= 0) {
          e.attackCooldown = ranged.cooldown + Math.random() * 40;
          if (eAnim.anims.attack) eAnim.play("attack");
          const g = new Graphics();
          g.rect(0, 0, ranged.w, ranged.h);
          g.fill({ color: ranged.color });
          game.gameLayer.addChild(g);
          game.enemyProjectiles.push({
            x: e.x + FRAME_SIZE / 2 + facing * 12,
            y: e.y + 20,
            vx: facing * ranged.projSpeed,
            w: ranged.w, h: ranged.h,
            dmg: ranged.dmg,
            life: 150,
            gfx: g,
          });
        }
      }

      const playerInReach = !ranged && dist <= COMBAT_RANGE && player.grounded;
      if (playerInReach && e.hitTimer <= 0 && (e.attackCooldown || 0) <= 0) {
        e.attackCooldown = 50 + Math.random() * 30;
        // Enemies carry different attack anims (punch/kick/attack) — pick one they own.
        const options = ["punch", "kick", "attack"].filter((a) => eAnim.anims[a]);
        if (options.length) {
          eAnim.play(options[Math.floor(Math.random() * options.length)]);
        }

        if (!player.attacking) {
          player.hp -= e.damage;
          game.playerAnim.play("hit");
          spawnParticles(game, player.x + FRAME_SIZE / 2, player.y + PLAYER_H / 2, 0xff4444, 5);
        }
      }

      if (e.alive && e.hitTimer <= 0) {
        if (Math.abs(e.vx) > 0.1) eAnim.play("walk");
        else if (dist > COMBAT_RANGE) eAnim.play("idle");
      }
      eAnim.setFacing(facing);
      eAnim.update(dt);
      const efs = e.frameSize || FRAME_SIZE;
      eAnim.sprite.x = e.x + efs / 2;
      eAnim.sprite.y = GROUND_Y + (e.groundOffset || 0);
    }

    const eHb = getHitbox(e);

    // --- Player attack hits enemy ---
    const atk = player.attackType && ATTACKS[player.attackType];
    const inHitWindow = atk && player.attackTimer <= atk.hitStart && player.attackTimer > atk.hitEnd;
    if (player.attacking && inHitWindow) {
      const isSpecial = player.attackType === "special";
      const px = player.x + FRAME_SIZE / 2;

      const attackX = isSpecial
        ? (player.facing === 1 ? px : 0)
        : (player.facing === 1 ? px + 2 : px - 2 - atk.reach);
      const attackW = isSpecial
        ? (player.facing === 1 ? game.levelWidth - px : px)
        : atk.reach;
      const attackY = player.y + (atk.hitOy || 8);

      if (aabb(attackX, attackY, attackW, atk.hitH, eHb.x, eHb.y, eHb.w, eHb.h)) {
        // Boss blocking check
        const bossBlocking = e.isBoss && e.ai && e.ai.isBlocking();
        if (bossBlocking && !isSpecial) {
          spawnParticles(game, e.x + (e.frameSize || FRAME_SIZE) / 2, attackY, 0x8888ff, 4);
        } else if (!e.justHit) {
          e.justHit = true;
          if (isSpecial) {
            e.hp = e.isBoss ? e.hp - Math.ceil(e.maxHp * 0.04) : 0;
          } else {
            e.hp -= atk.dmg || 1;
          }
          e.hitTimer = 20;
          eAnim.play("hit");
          e.x += player.facing * (isSpecial ? 30 : 14);
          const pColor = isSpecial ? 0xffd700 : 0xff8800;
          spawnParticles(game, e.x + (e.frameSize || FRAME_SIZE) / 2, attackY + atk.hitH / 2, pColor, isSpecial ? 12 : 6);
          if (e.hp <= 0) {
            e.alive = false;
            player.score += e.score;
            if (!e.isBoss) game.killCount++;
            spawnParticles(game, e.x + (e.frameSize || FRAME_SIZE) / 2, e.y + FRAME_SIZE / 2, 0xffd700, 12);
            if (e.isBoss) {
              game.bossActive = false;
              game.bossDefeated = true;
              spawnParticles(game, e.x + (e.frameSize || FRAME_SIZE) / 2, e.y + FRAME_SIZE / 2, 0xff4444, 20);
            }
          }
        }
      }
    } else if (!player.attacking) {
      e.justHit = false;
    }
  }

  // ---- Enemy projectiles ----
  {
    const pHb = getHitbox(player);
    for (let i = game.enemyProjectiles.length - 1; i >= 0; i--) {
      const proj = game.enemyProjectiles[i];
      proj.x += proj.vx * dt;
      proj.life -= dt;
      proj.gfx.x = proj.x;
      proj.gfx.y = proj.y;

      let done = proj.life <= 0 || proj.x < 0 || proj.x > game.levelWidth;

      if (!done && aabb(proj.x, proj.y, proj.w, proj.h, pHb.x, pHb.y, pHb.w, pHb.h)) {
        player.hp -= proj.dmg;
        game.playerAnim.forcePlay("hit");
        spawnParticles(game, player.x + FRAME_SIZE / 2, player.y + PLAYER_H / 2, 0xff4444, 5);
        done = true;
      }

      if (done) {
        proj.gfx.destroy();
        game.enemyProjectiles.splice(i, 1);
      }
    }
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

  game.scoreText.text = `${_t("hud.score")}: ${player.score}  KO: ${game.killCount}/${threshold}`;
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

  // Phase title fade (the transition/victory blocks own the overlay while active)
  if (!game.transitioning && !game.victory) {
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

}

// ============================================================
// TOUCH CONTROLS
// ============================================================
function TouchButton({ code, label, keysRef, size = 56, color = "#dc2626" }) {
  const codes = Array.isArray(code) ? code : [code];
  const press = (e) => {
    e.preventDefault();
    for (const c of codes) keysRef.current.add(c);
  };
  const release = () => {
    for (const c of codes) keysRef.current.delete(c);
  };
  return (
    <button
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `${color}33`,
        border: `2px solid ${color}aa`,
        color: "#ccd6f6",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: size > 50 ? 11 : 9,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {label}
    </button>
  );
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
  const [won, setWon] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

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
      gameRef.current = scene;

      app.ticker.add((ticker) => {
        const g = gameRef.current;
        if (!g || g.gameOver) {
          if (g?.gameOver) {
            setFinalScore(g.player.score);
            setWon(!!g.won);
            setScreen("gameover");
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
        <>
          <div
            ref={containerRef}
            style={{ width: "100%", maxWidth: 960, margin: "0 auto" }}
          />
          {isTouch && (
            <div
              style={{
                position: "fixed",
                left: 0,
                right: 0,
                bottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                padding: "0 16px",
                pointerEvents: "none",
                zIndex: 30,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 52px)", gridTemplateRows: "repeat(2, 52px)", gap: 4, pointerEvents: "auto" }}>
                <div />
                <TouchButton code="ArrowUp" label="▲" keysRef={keysRef} size={52} color="#00f0ff" />
                <div />
                <TouchButton code="ArrowLeft" label="◀" keysRef={keysRef} size={52} color="#00f0ff" />
                <TouchButton code="ArrowDown" label="▼" keysRef={keysRef} size={52} color="#00f0ff" />
                <TouchButton code="ArrowRight" label="▶" keysRef={keysRef} size={52} color="#00f0ff" />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", pointerEvents: "auto" }}>
                <TouchButton code={["KeyZ", "KeyX"]} label="SP" keysRef={keysRef} size={44} color="#ffd700" />
                <div style={{ display: "flex", gap: 10 }}>
                  <TouchButton code="KeyZ" label="Z" keysRef={keysRef} size={58} color="#dc2626" />
                  <TouchButton code="KeyX" label="X" keysRef={keysRef} size={58} color="#b026ff" />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {screen === "gameover" && (
        <div style={{ textAlign: "center" }}>
          <h2
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 22,
              color: won ? "#ffd700" : "#dc2626",
              textShadow: won ? "0 0 20px rgba(255,215,0,0.5)" : "none",
              marginBottom: 16,
            }}
          >
            {won ? "VICTORY!" : "GAME OVER"}
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

      {screen === "spritetest" && (
        <KungFuSpriteTest onBack={() => setScreen("menu")} />
      )}

      <AdBanner slot="kungfucastle_bottom" style={{ marginTop: 16, maxWidth: 960 }} />
    </div>
  );
}
