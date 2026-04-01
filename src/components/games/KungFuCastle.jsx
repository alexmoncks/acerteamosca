"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Application, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import AdBanner from "@/components/AdBanner";
import { loadAllAssets } from "./kungfu-assets";
import { AnimController } from "./kungfu-anim";

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

const PHASE_ENEMIES = ["capanga-branco", "capanga-cinza", "capanga-rapido"];

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
    }
    // Row 1: transition (grass top + brick bottom) just below grass
    const transY = GROUND_Y - GRASS_OFFSET + TILE;
    for (let col = 0; col < tilesAcross; col++) {
      const s = new Sprite(transitionTile);
      s.x = col * TILE;
      s.y = transY;
      gameLayer.addChild(s);
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
      }
    }
  }

  // -- Decorative props
  // layer: "bg" = behind characters (midLayer), "fg" = in front (fgLayer), "game" = same level (gameLayer)
  const PROP_LAYOUT = [
    { asset: "torii-vermelho",       x: 60,   y: 10, layer: "game" },
    { asset: "cerejeira-sakura",     x: 200,  y: 5,  layer: "bg" },
    { asset: "lanterna-ishidoro",    x: 350,  y: 4,  layer: "fg" },
    { asset: "pedra-decorativa",     x: 500,  y: 4,  layer: "game" },
    { asset: "cerejeira-sakura",     x: 700,  y: 5,  layer: "bg" },
    { asset: "komainu",              x: 850,  y: 6,  layer: "game" },
    { asset: "cerca-bambu",          x: 1000, y: 4,  layer: "fg" },
    { asset: "lanterna-ishidoro",    x: 1150, y: 4,  layer: "fg" },
    { asset: "cerejeira-sakura",     x: 1350, y: 5,  layer: "game" },
    { asset: "pedra-decorativa",     x: 1500, y: 7,  layer: "fg" },
    { asset: "komainu",              x: 1650, y: 4,  layer: "fg" },
    { asset: "lanterna-ishidoro",    x: 1800, y: 6,  layer: "game" },
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
    gameOver: false,
    levelWidth: LEVEL_WIDTH,
  };
}

// ============================================================
// SPAWN ENEMY
// ============================================================
function spawnEnemy(game, type) {
  if (!type) {
    type = PHASE_ENEMIES[Math.floor(Math.random() * PHASE_ENEMIES.length)];
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
  if (!player.attacking) {
    if (leftDown) { moveDir = -1; player.facing = -1; }
    if (rightDown) { moveDir = 1; player.facing = 1; }
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

  // Stop running if direction changes
  if ((leftDown && player.facing === 1) || (rightDown && player.facing === -1)) {
    player.running = false;
    player.currentSpeed = PLAYER_WALK_SPEED;
  }

  player.x += player.vx;

  // Jump
  if ((keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW")) && player.grounded) {
    player.vy = JUMP_FORCE;
    player.grounded = false;
  }

  // Attack — each type has: duration, hit window (when damage activates), reach, damage multiplier
  const ATTACKS = {
    punch:   { duration: 20, hitStart: 10, hitEnd: 5, reach: 18, hitH: 20, hitOy: 8, dmg: 1 },
    kick:    { duration: 24, hitStart: 12, hitEnd: 6, reach: 22, hitH: 20, hitOy: 14, dmg: 2 },
    flyKick: { duration: 28, hitStart: 14, hitEnd: 6, reach: 28, hitH: 24, hitOy: 6, dmg: 3 },
  };
  // Flying kick: kick while in the air
  if ((keys.has("KeyX") || keys.has("KeyM")) && !player.attacking && !player.grounded) {
    player.attacking = true;
    player.attackType = "flyKick";
    player.attackTimer = ATTACKS.flyKick.duration;
    game.playerAnim.forcePlay("flyKick");
    // Boost forward in facing direction
    player.vx = player.facing * PLAYER_RUN_SPEED * 1.5 * dt;
  }
  // Ground punch
  if ((keys.has("KeyZ") || keys.has("KeyN")) && !player.attacking && player.grounded) {
    player.attacking = true;
    player.attackType = "punch";
    player.attackTimer = ATTACKS.punch.duration;
    game.playerAnim.play("punch");
  }
  // Ground kick
  if ((keys.has("KeyX") || keys.has("KeyM")) && !player.attacking && player.grounded) {
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
      game.playerAnim.forcePlay(player.currentSpeed > 0.3 ? "walk" : "idle");
    } else if (player.currentSpeed > 0.3) {
      game.playerAnim.play("walk");
    } else {
      game.playerAnim.play("idle");
    }
  }
  game.playerAnim.setFacing(player.facing);
  game.playerAnim.update(dt);
  game.playerSprite.x = player.x + FRAME_SIZE / 2;
  game.playerSprite.y = player.y + PLAYER_H;

  // ---- Spawn enemies ----
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0 && game.enemies.length < 5) {
    spawnEnemy(game);
    game.spawnTimer = 90 + Math.random() * 60;
  }

  // ---- Update enemies ----
  const COMBAT_RANGE = 23; // distance to stop and attack (~1px overlap)

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    const eAnim = game.enemyAnims[i];

    // --- Dead enemy: knockback + fade out ---
    if (!e.alive) {
      if (!e.deathTimer) {
        e.deathTimer = 30;
        e.knockVx = (player.x > e.x ? -3 : 3); // fly away from player
      }
      e.deathTimer -= dt;
      e.x += e.knockVx * dt;
      eAnim.sprite.x = e.x + FRAME_SIZE / 2;
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
    const facing = dx > 0 ? 1 : -1;

    if (e.hitTimer > 0) e.hitTimer -= dt;
    if (e.attackCooldown > 0) e.attackCooldown -= dt;

    // --- Movement: stop at combat range, don't overlap ---
    if (dist > COMBAT_RANGE && e.hitTimer <= 0) {
      const spd = (ENEMY_STATS[e.type]?.speed || 1.2) * dt;
      e.vx = facing * spd;
      e.x += e.vx;
    } else {
      e.vx = 0;
    }

    const eHb = getHitbox(e);

    // --- Enemy attacks player when in range (only if player is on ground) ---
    const playerInReach = dist <= COMBAT_RANGE && player.grounded;
    if (playerInReach && e.hitTimer <= 0 && (e.attackCooldown || 0) <= 0) {
      e.attackCooldown = 50 + Math.random() * 30;
      const attackAnim = e.type === "capanga-cinza" && Math.random() > 0.5 ? "kick" : "punch";
      eAnim.play(eAnim.anims[attackAnim] ? attackAnim : "punch");

      if (!player.attacking) {
        player.hp -= e.damage;
        game.playerAnim.play("hit");
        spawnParticles(game, player.x + FRAME_SIZE / 2, player.y + PLAYER_H / 2, 0xff4444, 5);
      }
    }

    // --- Player attack hits enemy (only during active hit frames) ---
    const atk = player.attackType && ATTACKS[player.attackType];
    const inHitWindow = atk && player.attackTimer <= atk.hitStart && player.attackTimer > atk.hitEnd;
    if (player.attacking && inHitWindow) {
      // Attack hitbox: extends from player sprite edge in facing direction
      // positioned at correct body height (not full sprite)
      const px = player.x + FRAME_SIZE / 2;
      const attackX = player.facing === 1 ? px + 2 : px - 2 - atk.reach;
      const attackY = player.y + (atk.hitOy || 8);
      if (aabb(attackX, attackY, atk.reach, atk.hitH, eHb.x, eHb.y, eHb.w, eHb.h)) {
        if (!e.justHit) {
          e.justHit = true;
          e.hp--;
          e.hitTimer = 20;
          eAnim.play("hit");
          e.x += player.facing * 14;
          spawnParticles(game, e.x + FRAME_SIZE / 2, attackY + atk.hitH / 2, 0xff8800, 6);
          if (e.hp <= 0) {
            e.alive = false;
            player.score += e.score;
            spawnParticles(game, e.x + FRAME_SIZE / 2, e.y + FRAME_SIZE / 2, 0xffd700, 12);
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
    eAnim.sprite.x = e.x + FRAME_SIZE / 2;
    eAnim.sprite.y = e.y + FRAME_SIZE;
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

  game.scoreText.text = `${_t("hud.score")}: ${player.score}`;
  game.phaseText.text = `${_t("hud.phase")}: ${game.phase}`;
  game.livesText.text = `${_t("hud.lives")}: ${player.lives}`;

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
  const [screen, setScreen] = useState("menu");
  const [finalScore, setFinalScore] = useState(0);

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

  // ── Input ──────────────────────────────────────────────────────
  useEffect(() => {
    const onDown = (e) => keysRef.current.add(e.code);
    const onUp = (e) => keysRef.current.delete(e.code);
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
        minHeight: "100vh",
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

      <AdBanner slot="kungfucastle_bottom" style={{ marginTop: 16, maxWidth: 960 }} />
    </div>
  );
}
