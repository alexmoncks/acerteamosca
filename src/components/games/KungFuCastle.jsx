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
const PLAYER_SPEED = 3;
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

  // -- Background: sky gradient + mountains
  const sky = new Graphics();
  sky.rect(0, 0, LEVEL_WIDTH, GROUND_Y);
  sky.fill({ color: 0x1a1a2e });
  bgLayer.addChild(sky);

  // Distant mountains (parallax bg)
  for (let i = 0; i < 12; i++) {
    const m = new Graphics();
    const mx = i * 220;
    const mh = 40 + Math.random() * 60;
    m.moveTo(mx, GROUND_Y);
    m.lineTo(mx + 60 + Math.random() * 40, GROUND_Y - mh);
    m.lineTo(mx + 120 + Math.random() * 40, GROUND_Y);
    m.closePath();
    m.fill({ color: 0x16213e });
    bgLayer.addChild(m);
  }

  // Mid-layer: trees / lanterns
  for (let i = 0; i < 20; i++) {
    const tree = new Graphics();
    const tx = i * 130 + Math.random() * 40;
    // Trunk
    tree.rect(tx + 6, GROUND_Y - 40, 8, 40);
    tree.fill({ color: 0x4a3728 });
    // Canopy
    tree.circle(tx + 10, GROUND_Y - 50, 18);
    tree.fill({ color: 0x2d5a3a });
    midLayer.addChild(tree);
  }

  // Ground
  const ground = new Graphics();
  ground.rect(0, GROUND_Y, LEVEL_WIDTH, CH - GROUND_Y);
  ground.fill({ color: 0x2d2d44 });
  // Ground line
  ground.rect(0, GROUND_Y, LEVEL_WIDTH, 2);
  ground.fill({ color: 0x4a4a6a });
  gameLayer.addChild(ground);

  // Stone path details
  for (let i = 0; i < LEVEL_WIDTH / 40; i++) {
    const stone = new Graphics();
    stone.rect(i * 40 + 2, GROUND_Y + 8, 36, 4);
    stone.fill({ color: 0x3a3a54 });
    gameLayer.addChild(stone);
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
    type, alive: true, hitTimer: 0,
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

  // ---- Player movement ----
  player.vx = 0;
  const spd = PLAYER_SPEED * dt;
  if (!player.attacking) {
    if (keys.has("ArrowLeft") || keys.has("KeyA")) {
      player.vx = -spd;
      player.facing = -1;
    }
    if (keys.has("ArrowRight") || keys.has("KeyD")) {
      player.vx = spd;
      player.facing = 1;
    }
  }
  player.x += player.vx;

  // Jump
  if ((keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW")) && player.grounded) {
    player.vy = JUMP_FORCE;
    player.grounded = false;
  }

  // Attack
  if ((keys.has("KeyZ") || keys.has("KeyN")) && !player.attacking && player.grounded) {
    player.attacking = true;
    player.attackTimer = 15;
    player.attackType = "punch";
    game.playerAnim.play("punch");
  }
  if ((keys.has("KeyX") || keys.has("KeyM")) && !player.attacking && player.grounded) {
    player.attacking = true;
    player.attackTimer = 20;
    player.attackType = "kick";
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
    }
  }

  // ---- Player animation state ----
  if (!player.attacking) {
    if (!player.grounded) game.playerAnim.play("jump");
    else if (Math.abs(player.vx) > 0.5) game.playerAnim.play("walk");
    else game.playerAnim.play("idle");
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
  const playerHb = getHitbox(player);

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    const eAnim = game.enemyAnims[i];
    if (!e.alive) continue;

    // Move toward player
    const dx = player.x - e.x;
    e.vx = dx > 0 ? ENEMY_STATS[e.type].speed * dt : -ENEMY_STATS[e.type].speed * dt;
    e.x += e.vx;

    if (e.hitTimer > 0) e.hitTimer -= dt;

    const eHb = getHitbox(e);

    // Attack range — damage player
    if (e.hitTimer <= 0 && aabb(eHb.x, eHb.y, eHb.w, eHb.h, playerHb.x, playerHb.y, playerHb.w, playerHb.h)) {
      if (!player.attacking) {
        player.hp -= e.damage;
        e.hitTimer = 60;
        game.playerAnim.play("hit");
        spawnParticles(game, player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, 0xff4444, 5);
      }
    }

    // Player attack hits enemy
    if (player.attacking && player.attackTimer > 5) {
      const attackX = player.facing === 1 ? player.x + PLAYER_W : player.x - 20;
      if (aabb(attackX, player.y, 20, PLAYER_H, eHb.x, eHb.y, eHb.w, eHb.h)) {
        e.hp--;
        e.hitTimer = 30;
        eAnim.play("hit");
        spawnParticles(game, e.x + e.w / 2, e.y + e.h / 2, 0xff8800, 6);
        if (e.hp <= 0) {
          e.alive = false;
          player.score += e.score;
          spawnParticles(game, e.x + e.w / 2, e.y + e.h / 2, 0xffd700, 12);
        }
      }
    }

    // Enemy animation state
    if (e.alive) {
      if (Math.abs(e.vx) > 0.1) eAnim.play("walk");
      else eAnim.play("idle");
      eAnim.setFacing(dx > 0 ? 1 : -1);
      eAnim.update(dt);
      eAnim.sprite.x = e.x + FRAME_SIZE / 2;
      eAnim.sprite.y = e.y + FRAME_SIZE;
    }
  }

  // Remove dead enemies
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    if (!game.enemies[i].alive) {
      game.enemyAnims[i].sprite.destroy();
      game.enemies.splice(i, 1);
      game.enemyAnims.splice(i, 1);
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

  // ---- Game over check ----
  if (player.hp <= 0) {
    player.lives--;
    if (player.lives <= 0) {
      game.gameOver = true;
    } else {
      player.hp = 100;
      player.x = game.cameraX + 80;
      player.y = GROUND_Y - PLAYER_H;
    }
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
