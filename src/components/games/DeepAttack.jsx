"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import { DeepAttackMobileControls } from "@/components/MobileControls";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

// ── Constants ──────────────────────────────────────────────────────────
const CANVAS_W = 400;
const CANVAS_H = 600;
const PLAYER_W = 30;
const PLAYER_H = 36;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 8;
const BULLET_W = 3;
const BULLET_H = 12;
const ENERGY_MAX = 100;
const ENERGY_DRAIN = 0.03;
const SCROLL_BASE_SPEED = 1.5;
const FIRE_COOLDOWN = 8;
const SEGMENT_HEIGHT = 4;
const BUFFER_SEGMENTS = Math.ceil((CANVAS_H * 2) / SEGMENT_HEIGHT);

// ── Enemy types ────────────────────────────────────────────────────────
const ENEMY_TYPES = {
  basic:    { w: 24, h: 24, hp: 1,        speed: 2,   points: 10,  color: "#ff4444" },
  zigzag:   { w: 24, h: 24, hp: 1,        speed: 1.5, points: 20,  color: "#ffaa00" },
  big:      { w: 36, h: 36, hp: 3,        speed: 1,   points: 50,  color: "#aa44ff" },
  asteroid: { w: 28, h: 28, hp: Infinity, speed: 1.5, points: 0,   color: "#888888" },
};

// ── Audio engine ────────────────────────────────────────────────────────
class DeepAttackAudio {
  constructor() {
    this.ctx = null;
  }

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
  }

  _tone(freq, dur, vol = 0.15, type = "square") {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  shoot() {
    this._tone(880, 0.08, 0.1, "square");
    this._tone(660, 0.06, 0.05, "sawtooth");
  }

  hit() {
    this._tone(200, 0.15, 0.15, "square");
    this._tone(150, 0.2, 0.1, "sawtooth");
  }

  explosion() {
    // Noise burst for explosions
    if (!this.ctx) return;
    const dur = 0.3;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  powerUp() {
    this._tone(523, 0.1, 0.12, "sine");
    setTimeout(() => this._tone(659, 0.1, 0.12, "sine"), 80);
    setTimeout(() => this._tone(784, 0.15, 0.12, "sine"), 160);
  }

  gameOver() {
    this._tone(440, 0.2, 0.15, "square");
    setTimeout(() => this._tone(349, 0.2, 0.15, "square"), 200);
    setTimeout(() => this._tone(262, 0.4, 0.2, "square"), 400);
  }
}

// ── Utility ────────────────────────────────────────────────────────────
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── Parallax Stars ─────────────────────────────────────────────────────
function initStars() {
  const layers = [[], [], []];
  const speeds = [0.3, 0.7, 1.2];
  const counts = [40, 25, 15];
  for (let l = 0; l < 3; l++) {
    for (let i = 0; i < counts[l]; i++) {
      layers[l].push({
        x: Math.random() * CANVAS_W,
        y: Math.random() * CANVAS_H,
        size: 1 + l * 0.5,
        alpha: 0.3 + l * 0.2,
        speed: speeds[l],
      });
    }
  }
  return layers;
}

// ── Corridor generation ────────────────────────────────────────────────
function generateCorridorSegment(prevSegment, distance) {
  const minPct = 0.35;
  const maxPct = 0.7;
  const progress = Math.min(distance / 10000, 1);
  const width = CANVAS_W * (maxPct - (maxPct - minPct) * progress);
  let center = prevSegment
    ? (prevSegment.leftWall + prevSegment.rightWall) / 2
    : CANVAS_W / 2;
  center += (Math.random() - 0.5) * 8;
  center = Math.max(width / 2 + 5, Math.min(CANVAS_W - width / 2 - 5, center));
  return { leftWall: center - width / 2, rightWall: center + width / 2 };
}

function initCorridor() {
  const segments = [];
  for (let i = 0; i < BUFFER_SEGMENTS; i++) {
    segments.push(
      generateCorridorSegment(segments[segments.length - 1] || null, 0)
    );
  }
  return segments;
}

// ── Drawing helpers ────────────────────────────────────────────────────
function drawPlayer(ctx, x, y) {
  ctx.save();
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W / 2, y);
  ctx.lineTo(x + PLAYER_W, y + PLAYER_H);
  ctx.lineTo(x, y + PLAYER_H);
  ctx.closePath();
  ctx.fill();
  // Engine glow
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#ff6600";
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W / 2 - 5, y + PLAYER_H);
  ctx.lineTo(x + PLAYER_W / 2, y + PLAYER_H + 8 + Math.random() * 4);
  ctx.lineTo(x + PLAYER_W / 2 + 5, y + PLAYER_H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEnemyBasic(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w / 2, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEnemyZigzag(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEnemyBig(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = w / 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  // Fill with translucent
  ctx.fillStyle = color + "44";
  ctx.fill();
  ctx.restore();
}

function drawEnemyAsteroid(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = w / 2;
  ctx.beginPath();
  const points = 8;
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 / points) * i;
    // Jagged radius
    const jr = r * (0.7 + 0.3 * Math.sin(i * 2.7 + cx * 0.1));
    const px = cx + jr * Math.cos(angle);
    const py = cy + jr * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEnemy(ctx, enemy) {
  const { x, y, type } = enemy;
  const t = ENEMY_TYPES[type];
  switch (type) {
    case "basic":
      drawEnemyBasic(ctx, x, y, t.w, t.h, t.color);
      break;
    case "zigzag":
      drawEnemyZigzag(ctx, x, y, t.w, t.h, t.color);
      break;
    case "big":
      drawEnemyBig(ctx, x, y, t.w, t.h, t.color);
      // HP indicator
      if (enemy.hp < t.hp) {
        const pct = enemy.hp / t.hp;
        ctx.fillStyle = "#aa44ff88";
        ctx.fillRect(x, y - 6, t.w * pct, 3);
        ctx.strokeStyle = "#aa44ff44";
        ctx.strokeRect(x, y - 6, t.w, 3);
      }
      break;
    case "asteroid":
      drawEnemyAsteroid(ctx, x, y, t.w, t.h, t.color);
      break;
  }
}

function drawBullet(ctx, b) {
  ctx.save();
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
  // Trail
  ctx.globalAlpha = 0.3;
  ctx.fillRect(b.x, b.y + BULLET_H, BULLET_W, 8);
  ctx.globalAlpha = 0.1;
  ctx.fillRect(b.x, b.y + BULLET_H + 8, BULLET_W, 6);
  ctx.restore();
}

function drawPowerUp(ctx, p, frame) {
  ctx.save();
  const pulse = Math.sin(frame * 0.1) * 0.3 + 0.7;
  const r = 10 * pulse;
  ctx.shadowColor = "#39ff14";
  ctx.shadowBlur = 15 * pulse;
  ctx.fillStyle = `rgba(57,255,20,${0.4 * pulse})`;
  ctx.beginPath();
  ctx.arc(p.x + 10, p.y + 10, r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#39ff14";
  ctx.beginPath();
  ctx.arc(p.x + 10, p.y + 10, r, 0, Math.PI * 2);
  ctx.fill();
  // "E" letter
  ctx.fillStyle = "#050510";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("E", p.x + 10, p.y + 10);
  ctx.restore();
}

function drawParticle(ctx, p) {
  ctx.save();
  ctx.globalAlpha = p.life;
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 4;
  ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  ctx.restore();
}

function drawStars(ctx, layers, scrollSpeed) {
  for (let l = 0; l < layers.length; l++) {
    const stars = layers[l];
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.fillStyle = l === 2 ? "#aaddff" : "#ffffff";
      ctx.fillRect(s.x, s.y, s.size, s.size);
      ctx.restore();
    }
  }
}

function drawCorridor(ctx, segments, scrollOffset) {
  ctx.save();
  // Left wall
  ctx.shadowColor = "#ff2d95";
  ctx.shadowBlur = 12;
  for (let i = 0; i < segments.length - 1; i++) {
    const y = i * SEGMENT_HEIGHT - scrollOffset;
    if (y > CANVAS_H + 10 || y + SEGMENT_HEIGHT < -10) continue;
    const seg = segments[i];
    // Left wall bar
    ctx.fillStyle = "#ff2d9566";
    ctx.fillRect(0, y, seg.leftWall, SEGMENT_HEIGHT + 1);
    // Left edge glow line
    ctx.strokeStyle = "#ff2d95";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(seg.leftWall, y);
    const next = segments[i + 1];
    ctx.lineTo(next.leftWall, y + SEGMENT_HEIGHT);
    ctx.stroke();
    // Right wall bar
    ctx.fillStyle = "#ff2d9566";
    ctx.fillRect(seg.rightWall, y, CANVAS_W - seg.rightWall, SEGMENT_HEIGHT + 1);
    // Right edge glow line
    ctx.beginPath();
    ctx.moveTo(seg.rightWall, y);
    ctx.lineTo(next.rightWall, y + SEGMENT_HEIGHT);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHUD(ctx, score, energy, frame) {
  ctx.save();
  // Score top-left
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 6;
  ctx.font = "bold 14px 'Press Start 2P', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(score.toLocaleString(), 12, 12);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#4a5568";
  ctx.font = "7px 'Press Start 2P', monospace";
  ctx.fillText("SCORE", 12, 30);

  // Energy bar top-right
  const barW = 100;
  const barH = 10;
  const barX = CANVAS_W - barW - 12;
  const barY = 12;
  const pct = energy / ENERGY_MAX;
  let barColor;
  if (pct > 0.5) barColor = "#39ff14";
  else if (pct > 0.25) barColor = "#ffe600";
  else barColor = "#ff2d2d";

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(barX, barY, barW, barH);
  // Fill
  ctx.shadowColor = barColor;
  ctx.shadowBlur = 8;
  ctx.fillStyle = barColor;
  ctx.fillRect(barX, barY, barW * pct, barH);
  // Border
  ctx.shadowBlur = 0;
  ctx.strokeStyle = barColor + "88";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  // Label
  ctx.fillStyle = "#4a5568";
  ctx.font = "7px 'Press Start 2P', monospace";
  ctx.textAlign = "right";
  ctx.fillText("ENERGY", CANVAS_W - 12, 26);
  ctx.restore();
}

// ── Main Component ─────────────────────────────────────────────────────
export default function DeepAttack() {
  const { user, checkedCookie, registering, register } = useJogador("deepattack");
  const gameScale = useGameScale(CANVAS_W);
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const rafRef = useRef(null);
  const audioRef = useRef(null);

  // Game state refs (mutable for game loop)
  const gameRef = useRef(null);
  const screenRef = useRef("menu"); // menu | register | playing | gameover

  // React state for UI
  const [screen, setScreen] = useState("menu");
  const [autoFire, setAutoFire] = useState(false);
  const autoFireRef = useRef(false);
  const [finalStats, setFinalStats] = useState({ score: 0, distance: 0, enemies: 0, best: 0 });
  const playCountRef = useRef(0);

  // Keep screenRef in sync
  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { autoFireRef.current = autoFire; }, [autoFire]);

  // ── Initialize game state ──────────────────────────────────────────
  const initGame = useCallback(() => {
    const corridor = initCorridor();
    gameRef.current = {
      playerX: CANVAS_W / 2 - PLAYER_W / 2,
      playerY: CANVAS_H - PLAYER_H - 40,
      bullets: [],
      enemies: [],
      powerUps: [],
      particles: [],
      corridor,
      corridorOffset: 0,
      corridorDistance: 0,
      stars: initStars(),
      score: 0,
      energy: ENERGY_MAX,
      fireCooldown: 0,
      frame: 0,
      enemySpawnTimer: 0,
      powerUpSpawnTimer: 0,
      enemiesDestroyed: 0,
      distance: 0,
      scrollSpeed: SCROLL_BASE_SPEED,
      nextEnemyId: 0,
      gameOver: false,
    };
  }, []);

  // ── Spawn enemies ──────────────────────────────────────────────────
  const spawnEnemy = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;

    const dist = g.distance;
    const progress = Math.min(dist / 10000, 1);

    // Pick type based on distance progress (weighted)
    let type;
    const r = Math.random();
    if (progress < 0.2) {
      type = r < 0.7 ? "basic" : r < 0.9 ? "zigzag" : "asteroid";
    } else if (progress < 0.5) {
      type = r < 0.4 ? "basic" : r < 0.7 ? "zigzag" : r < 0.85 ? "big" : "asteroid";
    } else {
      type = r < 0.25 ? "basic" : r < 0.5 ? "zigzag" : r < 0.75 ? "big" : "asteroid";
    }

    const t = ENEMY_TYPES[type];
    // Top of screen = start segment + visible segments
    const topSegIdx = Math.floor(g.corridorOffset / SEGMENT_HEIGHT) + Math.ceil(CANVAS_H / SEGMENT_HEIGHT);
    const seg = g.corridor[Math.min(topSegIdx, g.corridor.length - 1)];
    const minX = seg ? seg.leftWall + 5 : 20;
    const maxX = seg ? seg.rightWall - t.w - 5 : CANVAS_W - 20 - t.w;

    if (maxX <= minX) return; // corridor too narrow

    const x = minX + Math.random() * (maxX - minX);
    g.enemies.push({
      id: g.nextEnemyId++,
      type,
      x,
      y: -t.h - 10,
      w: t.w,
      h: t.h,
      hp: t.hp,
      speed: t.speed * (1 + progress * 0.5),
      spawnFrame: g.frame,
      baseX: x,
    });
  }, []);

  // ── Spawn power-up ────────────────────────────────────────────────
  const spawnPowerUp = useCallback(() => {
    const g = gameRef.current;
    if (!g) return;
    const topSegIdx = Math.floor(g.corridorOffset / SEGMENT_HEIGHT) + Math.ceil(CANVAS_H / SEGMENT_HEIGHT);
    const seg = g.corridor[Math.min(topSegIdx, g.corridor.length - 1)];
    const minX = seg ? seg.leftWall + 10 : 30;
    const maxX = seg ? seg.rightWall - 30 : CANVAS_W - 50;
    if (maxX <= minX) return;
    g.powerUps.push({
      x: minX + Math.random() * (maxX - minX),
      y: -20,
      w: 20,
      h: 20,
    });
  }, []);

  // ── Spawn explosion particles ──────────────────────────────────────
  const spawnExplosion = useCallback((x, y, color, count) => {
    const g = gameRef.current;
    if (!g) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      g.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.03,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    if (screenRef.current !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const g = gameRef.current;
    if (!g || g.gameOver) return;

    const keys = keysRef.current;
    g.frame++;

    // ---- Calculate scroll speed (increases slightly with distance) ----
    const distProgress = Math.min(g.distance / 10000, 1);
    g.scrollSpeed = SCROLL_BASE_SPEED + distProgress * 1.5;

    // ---- Player movement ----
    if (keys.has("ArrowLeft"))  g.playerX -= PLAYER_SPEED;
    if (keys.has("ArrowRight")) g.playerX += PLAYER_SPEED;

    // Player is at bottom of screen, corridor scrolls down, so player's corridor position is at the "beginning" of visible segments
    const playerSegIdx = Math.floor(g.corridorOffset / SEGMENT_HEIGHT) + Math.floor((CANVAS_H - g.playerY) / SEGMENT_HEIGHT);
    const clampSeg = g.corridor[Math.min(Math.max(playerSegIdx, 0), g.corridor.length - 1)];
    if (clampSeg) {
      g.playerX = Math.max(clampSeg.leftWall + 2, Math.min(clampSeg.rightWall - PLAYER_W - 2, g.playerX));
    } else {
      g.playerX = Math.max(2, Math.min(CANVAS_W - PLAYER_W - 2, g.playerX));
    }

    // ---- Firing ----
    if (g.fireCooldown > 0) g.fireCooldown--;
    if ((keys.has(" ") || autoFireRef.current) && g.fireCooldown <= 0) {
      g.bullets.push({
        x: g.playerX + PLAYER_W / 2 - BULLET_W / 2,
        y: g.playerY - BULLET_H,
        w: BULLET_W,
        h: BULLET_H,
      });
      g.fireCooldown = FIRE_COOLDOWN;
      audioRef.current?.shoot();
    }

    // ---- Update bullets ----
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      g.bullets[i].y -= BULLET_SPEED;
      if (g.bullets[i].y + BULLET_H < 0) {
        g.bullets.splice(i, 1);
      }
    }

    // ---- Scroll corridor ----
    g.corridorOffset += g.scrollSpeed;
    g.distance += g.scrollSpeed;

    // Generate new corridor segments as needed
    const totalSegments = Math.ceil((g.corridorOffset + CANVAS_H + 200) / SEGMENT_HEIGHT);
    while (g.corridor.length < totalSegments) {
      g.corridor.push(
        generateCorridorSegment(
          g.corridor[g.corridor.length - 1],
          g.distance
        )
      );
    }

    // Trim old corridor segments that are well past the bottom of screen
    const minSegIdx = Math.floor(g.corridorOffset / SEGMENT_HEIGHT) - 10;
    if (minSegIdx > 100) {
      // Shift corridor to prevent unbounded memory growth
      const removeCount = minSegIdx - 50;
      if (removeCount > 0) {
        g.corridor.splice(0, removeCount);
        g.corridorOffset -= removeCount * SEGMENT_HEIGHT;
      }
    }

    // ---- Update stars (parallax) ----
    for (let l = 0; l < g.stars.length; l++) {
      const stars = g.stars[l];
      for (let i = 0; i < stars.length; i++) {
        stars[i].y += stars[i].speed * g.scrollSpeed;
        if (stars[i].y > CANVAS_H) {
          stars[i].y = -2;
          stars[i].x = Math.random() * CANVAS_W;
        }
      }
    }

    // ---- Update enemies ----
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      e.y += e.speed + g.scrollSpeed * 0.3;

      // Type-specific movement
      if (e.type === "zigzag") {
        const elapsed = g.frame - e.spawnFrame;
        e.x = e.baseX + Math.sin(elapsed * 0.08) * 40;
      }

      // Clamp enemy within corridor
      const enemySegIdx = Math.floor((g.corridorOffset + e.y) / SEGMENT_HEIGHT);
      const eSeg = g.corridor[Math.min(Math.max(enemySegIdx, 0), g.corridor.length - 1)];
      if (eSeg) {
        const et = ENEMY_TYPES[e.type];
        e.x = Math.max(eSeg.leftWall + 2, Math.min(eSeg.rightWall - et.w - 2, e.x));
      }

      // Remove if off-screen bottom
      if (e.y > CANVAS_H + 50) {
        g.enemies.splice(i, 1);
      }
    }

    // ---- Update power-ups ----
    for (let i = g.powerUps.length - 1; i >= 0; i--) {
      g.powerUps[i].y += g.scrollSpeed;
      if (g.powerUps[i].y > CANVAS_H + 30) {
        g.powerUps.splice(i, 1);
      }
    }

    // ---- Spawn enemies ----
    g.enemySpawnTimer++;
    const spawnInterval = Math.max(20, 60 - distProgress * 40);
    if (g.enemySpawnTimer >= spawnInterval) {
      g.enemySpawnTimer = 0;
      spawnEnemy();
    }

    // ---- Spawn power-ups ----
    g.powerUpSpawnTimer += g.scrollSpeed;
    if (g.powerUpSpawnTimer >= 300) {
      g.powerUpSpawnTimer = 0;
      spawnPowerUp();
    }

    // ---- Collision: bullets vs enemies ----
    for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi];
      let bulletHit = false;
      for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
        const e = g.enemies[ei];
        const et = ENEMY_TYPES[e.type];
        if (aabb(b, { x: e.x, y: e.y, w: et.w, h: et.h })) {
          bulletHit = true;
          if (e.hp !== Infinity) {
            e.hp--;
            if (e.hp <= 0) {
              g.score += et.points;
              g.enemiesDestroyed++;
              spawnExplosion(e.x + et.w / 2, e.y + et.h / 2, et.color, 12);
              g.enemies.splice(ei, 1);
              audioRef.current?.explosion();
            } else {
              spawnExplosion(e.x + et.w / 2, e.y + et.h / 2, et.color, 4);
              audioRef.current?.hit();
            }
          } else {
            // Asteroid - bullet destroyed, asteroid unharmed
            spawnExplosion(b.x, b.y, "#aaaaaa", 3);
            audioRef.current?.hit();
          }
          break;
        }
      }
      if (bulletHit) {
        g.bullets.splice(bi, 1);
      }
    }

    // ---- Collision: player vs enemies ----
    const playerBox = { x: g.playerX + 4, y: g.playerY + 4, w: PLAYER_W - 8, h: PLAYER_H - 8 };
    for (let i = 0; i < g.enemies.length; i++) {
      const e = g.enemies[i];
      const et = ENEMY_TYPES[e.type];
      if (aabb(playerBox, { x: e.x, y: e.y, w: et.w, h: et.h })) {
        // Game over by collision
        spawnExplosion(g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2, "#22d3ee", 20);
        g.gameOver = true;
        audioRef.current?.gameOver();
        endGame(g);
        return;
      }
    }

    // ---- Collision: player vs power-ups ----
    for (let i = g.powerUps.length - 1; i >= 0; i--) {
      if (aabb(playerBox, g.powerUps[i])) {
        g.energy = Math.min(ENERGY_MAX, g.energy + 25);
        spawnExplosion(g.powerUps[i].x + 10, g.powerUps[i].y + 10, "#39ff14", 8);
        g.powerUps.splice(i, 1);
        audioRef.current?.powerUp();
      }
    }

    // ---- Collision: player vs walls ----
    if (clampSeg) {
      const shipLeft = g.playerX + 3;
      const shipRight = g.playerX + PLAYER_W - 3;
      if (shipLeft < clampSeg.leftWall || shipRight > clampSeg.rightWall) {
        spawnExplosion(g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2, "#ff2d95", 20);
        g.gameOver = true;
        audioRef.current?.gameOver();
        endGame(g);
        return;
      }
    }

    // ---- Drain energy ----
    g.energy -= ENERGY_DRAIN;
    if (g.energy <= 0) {
      g.energy = 0;
      g.gameOver = true;
      spawnExplosion(g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2, "#ffe600", 16);
      audioRef.current?.gameOver();
      endGame(g);
      return;
    }

    // ---- Update particles ----
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const p = g.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        g.particles.splice(i, 1);
      }
    }

    // ──────────────── RENDER ────────────────
    // 1. Background
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // 2. Stars
    drawStars(ctx, g.stars, g.scrollSpeed);

    // 3. Corridor walls - higher segments at top, lower at bottom
    const startSeg = Math.floor(g.corridorOffset / SEGMENT_HEIGHT);
    const visibleSegs = Math.ceil(CANVAS_H / SEGMENT_HEIGHT) + 2;
    const drawOffset = g.corridorOffset % SEGMENT_HEIGHT;

    ctx.save();
    for (let i = 0; i < visibleSegs && (startSeg + i) < g.corridor.length - 1; i++) {
      const seg = g.corridor[startSeg + i];
      const nextSeg = g.corridor[startSeg + i + 1];
      // Invert: highest segment index at y=0 (top), lowest at y=CANVAS_H (bottom)
      const y = CANVAS_H - (i + 1) * SEGMENT_HEIGHT + drawOffset;

      // Left wall fill
      ctx.fillStyle = "rgba(255,45,149,0.15)";
      ctx.fillRect(0, y, seg.leftWall, SEGMENT_HEIGHT + 1);

      // Right wall fill
      ctx.fillRect(seg.rightWall, y, CANVAS_W - seg.rightWall, SEGMENT_HEIGHT + 1);

      // Left wall edge glow
      ctx.save();
      ctx.shadowColor = "#ff2d95";
      ctx.shadowBlur = 8;
      ctx.strokeStyle = "#ff2d95";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(seg.leftWall, y);
      ctx.lineTo(nextSeg.leftWall, y + SEGMENT_HEIGHT);
      ctx.stroke();

      // Right wall edge glow
      ctx.beginPath();
      ctx.moveTo(seg.rightWall, y);
      ctx.lineTo(nextSeg.rightWall, y + SEGMENT_HEIGHT);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 4. Power-ups
    for (let i = 0; i < g.powerUps.length; i++) {
      drawPowerUp(ctx, g.powerUps[i], g.frame);
    }

    // 5. Enemies
    for (let i = 0; i < g.enemies.length; i++) {
      drawEnemy(ctx, g.enemies[i]);
    }

    // 6. Bullets
    for (let i = 0; i < g.bullets.length; i++) {
      drawBullet(ctx, g.bullets[i]);
    }

    // 7. Player
    drawPlayer(ctx, g.playerX, g.playerY);

    // 8. Particles
    for (let i = 0; i < g.particles.length; i++) {
      drawParticle(ctx, g.particles[i]);
    }

    // 9. HUD
    drawHUD(ctx, g.score, g.energy, g.frame);

    // Distance indicator (bottom center)
    ctx.save();
    ctx.fillStyle = "#4a5568";
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`DIST: ${Math.floor(g.distance)}`, CANVAS_W / 2, CANVAS_H - 8);
    ctx.restore();
  }, [spawnEnemy, spawnPowerUp, spawnExplosion]);

  // ── End game ───────────────────────────────────────────────────────
  const endGame = useCallback((g) => {
    const stats = {
      score: g.score,
      distance: Math.floor(g.distance),
      enemies: g.enemiesDestroyed,
      best: 0,
    };

    // Load best score
    try {
      const saved = localStorage.getItem("deepattack_best");
      if (saved) stats.best = parseInt(saved, 10) || 0;
    } catch {}
    if (g.score > stats.best) {
      stats.best = g.score;
      try { localStorage.setItem("deepattack_best", String(g.score)); } catch {}
    }

    setFinalStats(stats);

    // Submit score
    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pontos: g.score,
        jogo: "deepattack",
        metadata: {
          distancia: Math.floor(g.distance),
          inimigosDestruidos: g.enemiesDestroyed,
        },
      }),
    }).catch(() => {});

    window.gtag?.("event", "game_end", {
      game_name: "deepattack",
      score: g.score,
    });

    setScreen("gameover");
  }, []);

  // ── Start game loop ────────────────────────────────────────────────
  const startGameLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const loop = () => {
      gameLoop();
      if (screenRef.current === "playing") {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [gameLoop]);

  // ── Keyboard input ────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (screenRef.current !== "playing") return;
      if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };
    const onKeyUp = (e) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Screen transitions ─────────────────────────────────────────────
  const initAudio = async () => {
    if (!audioRef.current) {
      audioRef.current = new DeepAttackAudio();
    }
    await audioRef.current.init();
  };

  const handleRegister = async (userData) => {
    const jogador = await register(userData);
    if (jogador) {
      await initAudio();
      playCountRef.current++;
      initGame();
      setScreen("playing");
      window.gtag?.("event", "game_start", { game_name: "deepattack" });
    }
  };

  const handleMenuStart = async () => {
    if (user) {
      await initAudio();
      playCountRef.current++;
      initGame();
      setScreen("playing");
      window.gtag?.("event", "game_start", { game_name: "deepattack" });
    } else {
      setScreen("register");
    }
  };

  const handleRestart = async () => {
    await initAudio();
    playCountRef.current++;
    initGame();
    setScreen("playing");
    window.gtag?.("event", "game_start", { game_name: "deepattack" });
  };

  // Start loop when screen becomes "playing"
  useEffect(() => {
    if (screen === "playing") {
      startGameLoop();
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [screen, startGameLoop]);

  // Draw menu stars animation on canvas when in menu/gameover
  useEffect(() => {
    if (screen !== "menu" && screen !== "gameover") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const stars = initStars();
    let animId;

    const drawMenuBg = () => {
      ctx.fillStyle = "#050510";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      for (let l = 0; l < stars.length; l++) {
        for (let i = 0; i < stars[l].length; i++) {
          const s = stars[l][i];
          s.y += s.speed * 0.5;
          if (s.y > CANVAS_H) { s.y = 0; s.x = Math.random() * CANVAS_W; }
          ctx.save();
          ctx.globalAlpha = s.alpha;
          ctx.fillStyle = l === 2 ? "#aaddff" : "#ffffff";
          ctx.fillRect(s.x, s.y, s.size, s.size);
          ctx.restore();
        }
      }
      animId = requestAnimationFrame(drawMenuBg);
    };
    animId = requestAnimationFrame(drawMenuBg);
    return () => cancelAnimationFrame(animId);
  }, [screen]);

  const onToggleAutoFire = useCallback(() => {
    setAutoFire((v) => !v);
  }, []);

  if (!checkedCookie) return null;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050510",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Fira Code', monospace",
        overflow: "hidden",
        padding: 12,
      }}
    >
      <style>{`
        @keyframes deepPulse {
          0%, 100% { text-shadow: 0 0 20px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.2); }
          50% { text-shadow: 0 0 30px rgba(34,211,238,0.8), 0 0 60px rgba(34,211,238,0.3); }
        }
        @keyframes menuFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes fadeSlideIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes scoreCount {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {screen !== "menu" && (
        <>
          <h1
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 18,
              color: "#22d3ee",
              textShadow: "0 0 20px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.15)",
              marginBottom: 8,
              letterSpacing: 3,
              textAlign: "center",
            }}
          >
            DEEP ATTACK
          </h1>
          <p
            style={{
              color: "#4a5568",
              fontSize: 10,
              marginBottom: 14,
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            DESTRUA OS INIMIGOS NO CORREDOR
          </p>
        </>
      )}

      <div
        style={{
          width: CANVAS_W * gameScale,
          height: CANVAS_H * gameScale,
          touchAction: screen === "playing" ? "none" : "auto",
        }}
      >
        <div
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            position: "relative",
            border: "2px solid rgba(34,211,238,0.3)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 0 30px rgba(34,211,238,0.1)",
            transform: `scale(${gameScale})`,
            transformOrigin: "top left",
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ display: "block", width: CANVAS_W, height: CANVAS_H }}
          />

          {/* Menu overlay */}
          {screen === "menu" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,5,16,0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
              }}
            >
              <h1
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 24,
                  color: "#22d3ee",
                  animation: "deepPulse 2s ease-in-out infinite",
                  marginBottom: 6,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                DEEP
                <br />
                ATTACK
              </h1>

              {/* Decorative ship */}
              <div style={{ animation: "menuFloat 2s ease-in-out infinite", marginBottom: 30, marginTop: 10 }}>
                <svg width="40" height="48" viewBox="0 0 40 48">
                  <polygon points="20,0 40,36 0,36" fill="#22d3ee" opacity="0.8" />
                  <polygon points="15,36 20,46 25,36" fill="#ff6600" opacity="0.6" />
                </svg>
              </div>

              <button
                onClick={handleMenuStart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  color: "#050510",
                  background: "#22d3ee",
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 40px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(34,211,238,0.4)",
                  letterSpacing: 2,
                }}
              >
                JOGAR
              </button>

              <div
                style={{
                  marginTop: 30,
                  color: "#667",
                  fontSize: 9,
                  fontFamily: "'Press Start 2P', monospace",
                  textAlign: "center",
                  lineHeight: 2,
                }}
              >
                <div>SETAS: MOVER</div>
                <div>ESPACO: ATIRAR</div>
              </div>
            </div>
          )}

          {/* Register overlay */}
          {screen === "register" && (
            <RegisterModal
              onRegister={handleRegister}
              loading={registering}
              jogoNome="DEEP ATTACK"
              accentColor="#22d3ee"
            />
          )}

          {/* Game Over overlay */}
          {screen === "gameover" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,5,16,0.92)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                animation: "fadeSlideIn 0.4s ease-out",
              }}
            >
              <h2
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 20,
                  color: "#ff2d95",
                  textShadow: "0 0 20px rgba(255,45,149,0.5)",
                  marginBottom: 24,
                }}
              >
                GAME OVER
              </h2>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 28,
                  alignItems: "center",
                }}
              >
                <div style={{ textAlign: "center", animation: "scoreCount 0.5s ease-out" }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                    PONTOS
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: "#22d3ee", textShadow: "0 0 10px rgba(34,211,238,0.5)" }}>
                    {finalStats.score.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 24 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                      DISTANCIA
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#39ff14" }}>
                      {finalStats.distance.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                      INIMIGOS
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ffaa00" }}>
                      {finalStats.enemies}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "center", marginTop: 4 }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                    MELHOR PONTUACAO
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: "#e879f9", textShadow: "0 0 8px rgba(232,121,249,0.4)" }}>
                    {finalStats.best.toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                onClick={handleRestart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12,
                  color: "#050510",
                  background: "#22d3ee",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 32px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(34,211,238,0.4)",
                  letterSpacing: 2,
                }}
              >
                JOGAR NOVAMENTE
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile controls */}
      {screen === "playing" && (
        <DeepAttackMobileControls
          keysRef={keysRef}
          onToggleAutoFire={onToggleAutoFire}
          autoFire={autoFire}
        />
      )}

      {user && screen === "playing" && (
        <div
          style={{
            width: CANVAS_W * gameScale,
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
            padding: "0 4px",
          }}
        >
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Fira Code', monospace" }}>
            {user.nome}
          </span>
        </div>
      )}

      <AdBanner slot="deepattack_bottom" style={{ marginTop: 16, maxWidth: CANVAS_W }} />
    </div>
  );
}
