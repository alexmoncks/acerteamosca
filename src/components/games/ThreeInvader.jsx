"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";
import useLockScroll from "@/hooks/useLockScroll";

// ── Constants ──────────────────────────────────────────────────────────
const CW = 480;
const CH = 720;
const PLAYER_W = 32;
const PLAYER_H = 40;
const HIT_W = 16;
const HIT_H = 20;
const PLAYER_SPEED = 4;
const SHOT_COOLDOWN = 10; // frames between shots (6/sec at 60fps)
const BOMB_MAX = 9;
const LIVES_MAX = 5;
const SHOT_LEVEL_MAX = 5;
const TOTAL_PHASES = 25;
const TOTAL_WORLDS = 5;
const PHASES_PER_WORLD = 5;
const ACCENT = "#00f0ff";
const MAX_PARTICLES = 300;
const POWERUP_FALL_SPEED = 1.5;
const INVULN_TIME = 120; // 2s at 60fps
const RESPAWN_TIME = 120;

// ── Enemy type constants ───────────────────────────────────────────────
const ET_SCOUT = 0;
const ET_FIGHTER = 1;
const ET_BOMBER = 2;
const ET_ACE = 3;
const ET_CARRIER = 4;
const ET_MINE = 5;

const ENEMY_DEFS = [
  { name: "Scout",   color: "#39ff14", hp: 1, w: 24, h: 24, points: 50,  shotType: "single" },
  { name: "Fighter", color: "#ffd700", hp: 2, w: 26, h: 26, points: 100, shotType: "dual" },
  { name: "Bomber",  color: "#ff4444", hp: 3, w: 28, h: 28, points: 150, shotType: "triple" },
  { name: "Ace",     color: "#a855f7", hp: 1, w: 22, h: 22, points: 200, shotType: "aimed" },
  { name: "Carrier", color: "#1e3a5f", hp: 5, w: 36, h: 36, points: 300, shotType: "none" },
  { name: "Mine",    color: "#888888", hp: 1, w: 20, h: 20, points: 75,  shotType: "none" },
];

// ── Power-up types ─────────────────────────────────────────────────────
const PU_P = 0; // Shot level
const PU_B = 1; // Bomb
const PU_S = 2; // Shield
const PU_V = 3; // Speed
const PU_L = 4; // Laser
const PU_STAR = 5; // Invincibility
const PU_1UP = 6; // Extra life

const PU_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ffd700", "#ec4899"];
const PU_LABELS = ["P", "B", "S", "V", "L", "\u2605", "1UP"];
const PU_DURATIONS = [0, 0, 600, 720, 480, 300, 0]; // frames

// ── World configs ──────────────────────────────────────────────────────
const WORLD_NAMES = ["ORBITA TERRESTRE", "PHOBOS", "SUPERFICIE MARTE", "CINTURAO ASTEROIDES", "JUPITER"];
const WORLD_BG_COLORS = [
  ["#020824", "#0a2040", "#00c8ff"],
  ["#180828", "#2a0a40", "#b026ff"],
  ["#281008", "#401a0a", "#ff6600"],
  ["#080808", "#1a1a2e", "#4a90d9"],
  ["#000000", "#0a0a1a", "#ffd700"],
];
const WORLD_TAGS = [
  "Defenda a orbita terrestre",
  "Atravesse o campo de Phobos",
  "Avance pela superficie marciana",
  "Navegue pelo cinturao de asteroides",
  "Confronto final em Jupiter",
];

// ── Boss configs ───────────────────────────────────────────────────────
const BOSS_DEFS = [
  { name: "ORION-9",   hp: 50,  w: 96,  h: 80,  points: 2000,  color: "#00c8ff" },
  { name: "HIVE-01",   hp: 80,  w: 160, h: 64,  points: 5000,  color: "#b026ff" },
  { name: "GOLIATH",   hp: 100, w: 128, h: 96,  points: 8000,  color: "#ff6600" },
  { name: "CHARYBDIS", hp: 120, w: 144, h: 144, points: 12000, color: "#4a90d9" },
  { name: "3I/ATLAS",  hp: 200, w: 160, h: 200, points: 25000, color: "#ffd700" },
];

// ── Scoring ────────────────────────────────────────────────────────────
const RANK_THRESHOLDS = [
  { min: 0,      label: "Cadete" },
  { min: 10000,  label: "Tenente" },
  { min: 50000,  label: "Capitao" },
  { min: 150000, label: "Comandante" },
  { min: 300000, label: "Almirante" },
];

function getRank(score, completed) {
  if (completed) return "Heroi da Humanidade";
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= RANK_THRESHOLDS[i].min) return RANK_THRESHOLDS[i].label;
  }
  return "Cadete";
}

// ── Intro text ─────────────────────────────────────────────────────────
const INTRO_SCREENS = [
  "2186. Observatorios detectaram objeto anomalo na Nuvem de Oort.\nTrajetoria: sistema solar interior.\nVelocidade: 0.4c, desacelerando.\nCometas nao desaceleram.",
  "Sob a camada de gelo e poeira havia uma ESTRUTURA.\nUma nave. Colossal. Viva.\nDesignacao: 3I/ATLAS.\nOrigem: desconhecida.\nIntencao: hostil.",
  "Europa: silencio.\nGanimedes: 'ELES ESTAO DENTRO'.\nCalisto: transmissao interrompida.\nIo: convertida em forja de guerra.\nAs luas de Jupiter cairam em 72 horas.",
  "Voce pilota o ARROW-7, ultimo cacaestelar classe Aleste.\nMissao: da orbita terrestre ate Jupiter.\nObjetivo: destruir 3I/ATLAS.\n\n    /\\\n   /  \\\n  / () \\\n /______\\\n  ||  ||\n  /    \\\n\nA humanidade depende de voce.\n\nPRESSIONE PARA INICIAR",
];

// ── Audio Engine ───────────────────────────────────────────────────────
class InvaderAudio {
  constructor() { this.ctx = null; this.muted = false; }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume();
    } catch (_e) { /* no audio */ }
  }

  _osc(type, freq, dur, vol = 0.12, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  _noise(dur, vol = 0.1, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const sz = Math.floor(this.ctx.sampleRate * dur);
    if (sz <= 0) return;
    const buf = this.ctx.createBuffer(1, sz, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  _sweep(startF, endF, dur, vol = 0.1, type = "sine", delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startF, t);
    osc.frequency.linearRampToValueAtTime(endF, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  shoot() {
    this._sweep(1200, 600, 0.05, 0.08, "square");
  }

  bomb() {
    this._sweep(100, 400, 0.5, 0.12, "sawtooth");
    this._noise(0.4, 0.15, 0.2);
    this._osc("sine", 60, 0.4, 0.1, 0.3);
  }

  enemyHit() {
    this._noise(0.06, 0.08);
    this._sweep(600, 200, 0.1, 0.06);
  }

  bossHit() {
    this._osc("sine", 100, 0.15, 0.1);
  }

  powerUp() {
    this._osc("sine", 523, 0.1, 0.1, 0);
    this._osc("sine", 659, 0.1, 0.1, 0.08);
    this._osc("sine", 784, 0.12, 0.1, 0.16);
  }

  lifeLost() {
    this._noise(0.3, 0.12);
    this._osc("square", 120, 0.2, 0.1, 0.1);
    this._osc("square", 100, 0.2, 0.1, 0.35);
    this._osc("square", 80, 0.3, 0.1, 0.6);
  }

  phaseComplete() {
    this._osc("sine", 523, 0.12, 0.1, 0);
    this._osc("sine", 659, 0.12, 0.1, 0.1);
    this._osc("sine", 784, 0.12, 0.1, 0.2);
    this._osc("sine", 1047, 0.2, 0.1, 0.3);
  }

  gameOver() {
    this._osc("square", 440, 0.2, 0.12);
    this._osc("square", 349, 0.2, 0.12, 0.2);
    this._osc("square", 262, 0.4, 0.15, 0.4);
  }

  typeClick() {
    this._osc("square", 800, 0.02, 0.04);
  }
}

// ── Utility ────────────────────────────────────────────────────────────
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// ── Star field ─────────────────────────────────────────────────────────
function initStars(count) {
  const stars = [];
  for (let i = 0; i < (count || 80); i++) {
    stars.push({
      x: Math.random() * CW,
      y: Math.random() * CH,
      size: 0.5 + Math.random() * 2,
      speed: 0.2 + Math.random() * 1.5,
      alpha: 0.3 + Math.random() * 0.7,
      layer: Math.random() < 0.3 ? 2 : Math.random() < 0.5 ? 1 : 0,
    });
  }
  return stars;
}

// ── Object pools ───────────────────────────────────────────────────────
function createPool(maxSize) {
  return { items: [], maxSize };
}

function poolGet(pool, obj) {
  if (pool.items.length >= pool.maxSize) return null;
  pool.items.push(obj);
  return obj;
}

function poolRemove(pool, index) {
  pool.items[index] = pool.items[pool.items.length - 1];
  pool.items.pop();
}

// ── Phase wave definitions ─────────────────────────────────────────────
function getPhaseConfig(phase) {
  const world = Math.floor((phase - 1) / PHASES_PER_WORLD);
  const localPhase = ((phase - 1) % PHASES_PER_WORLD) + 1;
  const isBoss = localPhase === 5;

  let waves = [];
  let enemyTypes = [];
  let waveSize = 12;
  let waveCount = 3;
  let invaderGrid = false;
  let survivalMode = false;
  let survivalDuration = 0;

  switch (phase) {
    case 1:
      enemyTypes = [ET_SCOUT]; waveCount = 3; waveSize = 12; break;
    case 2:
      enemyTypes = [ET_SCOUT, ET_FIGHTER]; waveCount = 3; waveSize = 18; break;
    case 3:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_ACE]; waveCount = 4; waveSize = 15; break;
    case 4:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_ACE, ET_MINE]; waveCount = 4; waveSize = 20; break;
    case 5: break; // Boss

    case 6:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_BOMBER]; waveCount = 3; waveSize = 16; invaderGrid = true; break;
    case 7:
      enemyTypes = [ET_SCOUT, ET_FIGHTER]; waveCount = 4; waveSize = 16; break;
    case 8:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_CARRIER]; waveCount = 3; waveSize = 12; break;
    case 9:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_BOMBER, ET_ACE, ET_CARRIER]; waveCount = 5; waveSize = 20; break;
    case 10: break; // Boss

    case 11:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_BOMBER, ET_ACE]; waveCount = 4; waveSize = 18; break;
    case 12:
      enemyTypes = [ET_CARRIER, ET_SCOUT, ET_FIGHTER]; waveCount = 3; waveSize = 14; break;
    case 13:
      enemyTypes = [ET_MINE, ET_ACE, ET_FIGHTER]; waveCount = 4; waveSize = 16; break;
    case 14:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_BOMBER, ET_ACE]; waveCount = 5; waveSize = 24; invaderGrid = true; break;
    case 15: break; // Boss

    case 16:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_MINE]; waveCount = 4; waveSize = 16; break;
    case 17:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_BOMBER]; waveCount = 4; waveSize = 18; break;
    case 18:
      enemyTypes = [ET_MINE, ET_SCOUT, ET_ACE]; waveCount = 3; waveSize = 14; break;
    case 19:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_CARRIER, ET_MINE]; waveCount = 5; waveSize = 20; break;
    case 20: break; // Boss

    case 21:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_BOMBER, ET_ACE, ET_CARRIER, ET_MINE]; waveCount = 4; waveSize = 24; break;
    case 22:
      enemyTypes = [ET_FIGHTER, ET_ACE]; waveCount = 4; waveSize = 16; break;
    case 23:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_BOMBER, ET_ACE, ET_CARRIER, ET_MINE]; waveCount = 5; waveSize = 20; break;
    case 24:
      enemyTypes = [ET_SCOUT, ET_FIGHTER, ET_BOMBER, ET_ACE, ET_MINE]; survivalMode = true; survivalDuration = 5400; break; // 90s
    case 25: break; // Boss
    default: enemyTypes = [ET_SCOUT]; waveCount = 3; waveSize = 12;
  }

  return { world, localPhase, isBoss, enemyTypes, waveCount, waveSize, invaderGrid, survivalMode, survivalDuration };
}

// ── Drawing helpers ────────────────────────────────────────────────────

function drawPlayerShip(ctx, x, y, tilt, invuln, frame) {
  ctx.save();
  if (invuln && Math.floor(frame / 4) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  const cx = x + PLAYER_W / 2;
  const cy = y + PLAYER_H / 2;
  ctx.translate(cx, cy);
  ctx.rotate(tilt * 0.15);
  ctx.translate(-cx, -cy);

  // Main body (blue metallic)
  ctx.shadowColor = "#4488ff";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#2255aa";
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W / 2, y);
  ctx.lineTo(x + PLAYER_W - 2, y + PLAYER_H * 0.7);
  ctx.lineTo(x + PLAYER_W - 4, y + PLAYER_H);
  ctx.lineTo(x + 4, y + PLAYER_H);
  ctx.lineTo(x + 2, y + PLAYER_H * 0.7);
  ctx.closePath();
  ctx.fill();

  // Highlight stripe
  ctx.fillStyle = "#4488cc";
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W / 2, y + 4);
  ctx.lineTo(x + PLAYER_W / 2 + 4, y + PLAYER_H * 0.6);
  ctx.lineTo(x + PLAYER_W / 2 - 4, y + PLAYER_H * 0.6);
  ctx.closePath();
  ctx.fill();

  // Delta wings
  ctx.fillStyle = "#1a3a6a";
  ctx.beginPath();
  ctx.moveTo(x + 2, y + PLAYER_H * 0.5);
  ctx.lineTo(x - 6, y + PLAYER_H * 0.85);
  ctx.lineTo(x + 6, y + PLAYER_H * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W - 2, y + PLAYER_H * 0.5);
  ctx.lineTo(x + PLAYER_W + 6, y + PLAYER_H * 0.85);
  ctx.lineTo(x + PLAYER_W - 6, y + PLAYER_H * 0.85);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#00ddff";
  ctx.beginPath();
  ctx.ellipse(x + PLAYER_W / 2, y + PLAYER_H * 0.35, 3, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Booster glow
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#00eeff";
  const boosterLen = 6 + Math.random() * 6;
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W / 2 - 5, y + PLAYER_H);
  ctx.lineTo(x + PLAYER_W / 2, y + PLAYER_H + boosterLen);
  ctx.lineTo(x + PLAYER_W / 2 + 5, y + PLAYER_H);
  ctx.closePath();
  ctx.fill();

  // Secondary boosters on wings
  const booster2 = 3 + Math.random() * 3;
  ctx.fillStyle = "#00ccee88";
  ctx.beginPath();
  ctx.moveTo(x + 6, y + PLAYER_H);
  ctx.lineTo(x + 8, y + PLAYER_H + booster2);
  ctx.lineTo(x + 10, y + PLAYER_H);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + PLAYER_W - 10, y + PLAYER_H);
  ctx.lineTo(x + PLAYER_W - 8, y + PLAYER_H + booster2);
  ctx.lineTo(x + PLAYER_W - 6, y + PLAYER_H);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawEnemy(ctx, enemy, frame) {
  const def = ENEMY_DEFS[enemy.type];
  const { x, y } = enemy;
  const w = def.w, h = def.h;
  const cx = x + w / 2, cy = y + h / 2;

  ctx.save();
  ctx.shadowColor = def.color;
  ctx.shadowBlur = 8;

  switch (enemy.type) {
    case ET_SCOUT: {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + w, y + h * 0.6);
      ctx.lineTo(cx + 4, y + h);
      ctx.lineTo(cx - 4, y + h);
      ctx.lineTo(x, y + h * 0.6);
      ctx.closePath();
      ctx.fill();
      // Eye
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case ET_FIGHTER: {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + w, y + h * 0.5);
      ctx.lineTo(x + w - 4, y + h);
      ctx.lineTo(x + 4, y + h);
      ctx.lineTo(x, y + h * 0.5);
      ctx.closePath();
      ctx.fill();
      // Wings
      ctx.fillStyle = "#cc9900";
      ctx.fillRect(x - 4, y + h * 0.3, 8, 4);
      ctx.fillRect(x + w - 4, y + h * 0.3, 8, 4);
      // Eye
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case ET_BOMBER: {
      ctx.fillStyle = def.color;
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      ctx.fillStyle = "#cc0000";
      ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
      // Cannons
      ctx.fillStyle = "#ff6666";
      ctx.fillRect(x - 2, y + h * 0.4, 4, 8);
      ctx.fillRect(x + w - 2, y + h * 0.4, 4, 8);
      ctx.fillRect(cx - 2, y + h - 2, 4, 6);
      break;
    }
    case ET_ACE: {
      const angle = frame * 0.1;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = angle + (Math.PI * 2 / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? w / 2 : w / 4;
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case ET_CARRIER: {
      ctx.fillStyle = def.color;
      ctx.fillRect(x, y + 4, w, h - 8);
      ctx.fillStyle = "#2a5a8f";
      ctx.fillRect(x + 4, y, w - 8, h);
      // Hangars
      ctx.fillStyle = "#39ff14";
      ctx.fillRect(x + 8, y + h / 2 - 3, 6, 6);
      ctx.fillRect(x + w - 14, y + h / 2 - 3, 6, 6);
      // HP bar
      if (enemy.hp < def.hp) {
        const pct = enemy.hp / def.hp;
        ctx.fillStyle = "#39ff1488";
        ctx.fillRect(x, y - 6, w * pct, 3);
        ctx.strokeStyle = "#39ff1444";
        ctx.strokeRect(x, y - 6, w, 3);
      }
      break;
    }
    case ET_MINE: {
      const pulse = 0.8 + 0.2 * Math.sin(frame * 0.15);
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(cx, cy, w / 2 * pulse, 0, Math.PI * 2);
      ctx.fill();
      // Spikes
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 / 8) * i + frame * 0.03;
        ctx.beginPath();
        ctx.moveTo(cx + (w / 2 - 2) * Math.cos(a), cy + (h / 2 - 2) * Math.sin(a));
        ctx.lineTo(cx + (w / 2 + 4) * Math.cos(a), cy + (h / 2 + 4) * Math.sin(a));
        ctx.stroke();
      }
      break;
    }
    default: break;
  }
  ctx.restore();
}

function drawBoss(ctx, boss, frame) {
  const def = BOSS_DEFS[boss.bossIndex];
  const { x, y } = boss;
  const w = def.w, h = def.h;
  const cx = x + w / 2, cy = y + h / 2;
  const hpPct = boss.hp / boss.maxHp;
  const damageFlash = boss.damageFlash > 0;

  ctx.save();
  ctx.shadowColor = damageFlash ? "#ffffff" : def.color;
  ctx.shadowBlur = damageFlash ? 20 : 12;

  switch (boss.bossIndex) {
    case 0: { // ORION-9 satellite
      ctx.fillStyle = damageFlash ? "#ffffff" : "#336699";
      // Main body
      ctx.fillRect(cx - 20, y + 10, 40, h - 20);
      // Solar panels
      const panelOpen = hpPct > 0.3;
      if (panelOpen) {
        ctx.fillStyle = damageFlash ? "#ffffff" : "#4488cc";
        ctx.fillRect(x, y + 20, 30, h - 40);
        ctx.fillRect(x + w - 30, y + 20, 30, h - 40);
        // Panel lines
        ctx.strokeStyle = "#00aaff44";
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 24 + i * 8);
          ctx.lineTo(x + 28, y + 24 + i * 8);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + w - 28, y + 24 + i * 8);
          ctx.lineTo(x + w - 2, y + 24 + i * 8);
          ctx.stroke();
        }
      }
      // Central antenna (weak point)
      ctx.fillStyle = damageFlash ? "#ffffff" : "#ff4444";
      ctx.beginPath();
      ctx.arc(cx, y + 6, 6, 0, Math.PI * 2);
      ctx.fill();
      // Glow
      ctx.fillStyle = `rgba(0,200,255,${0.3 + 0.2 * Math.sin(frame * 0.08)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 1: { // HIVE-01 base
      ctx.fillStyle = damageFlash ? "#ffffff" : "#3a1a5a";
      ctx.fillRect(x, y, w, h);
      // Turret slots
      if (boss.turretHpL > 0) {
        ctx.fillStyle = "#b026ff";
        ctx.fillRect(x + 10, y + h - 20, 30, 20);
      }
      if (boss.turretHpR > 0) {
        ctx.fillStyle = "#b026ff";
        ctx.fillRect(x + w - 40, y + h - 20, 30, 20);
      }
      // Core
      ctx.fillStyle = damageFlash ? "#ffffff" : "#ff00ff";
      ctx.beginPath();
      ctx.arc(cx, cy, 16 + 3 * Math.sin(frame * 0.05), 0, Math.PI * 2);
      ctx.fill();
      // Hangars
      ctx.fillStyle = "#22ff22";
      ctx.fillRect(cx - 20, y + h - 8, 10, 8);
      ctx.fillRect(cx + 10, y + h - 8, 10, 8);
      break;
    }
    case 2: { // GOLIATH tank
      ctx.fillStyle = damageFlash ? "#ffffff" : "#664422";
      // Treads
      ctx.fillRect(x, y + 10, 20, h - 20);
      ctx.fillRect(x + w - 20, y + 10, 20, h - 20);
      // Body
      ctx.fillStyle = damageFlash ? "#ffffff" : "#885533";
      ctx.fillRect(x + 20, y + 15, w - 40, h - 30);
      // Turret
      ctx.fillStyle = damageFlash ? "#ffffff" : "#aa6644";
      ctx.fillRect(cx - 25, y, 50, 30);
      // Cannon
      ctx.fillStyle = "#ff6600";
      ctx.fillRect(cx - 4, y + 30, 8, 20);
      // Core glow
      ctx.fillStyle = `rgba(255,100,0,${0.3 + 0.2 * Math.sin(frame * 0.06)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 3: { // CHARYBDIS asteroid
      const pulse = 1 + 0.05 * Math.sin(frame * 0.04);
      ctx.fillStyle = damageFlash ? "#ffffff" : "#555555";
      ctx.beginPath();
      const pts = 12;
      for (let i = 0; i < pts; i++) {
        const a = (Math.PI * 2 / pts) * i;
        const r = (w / 2) * pulse * (0.75 + 0.25 * Math.sin(i * 3.1 + 1.7));
        const px = cx + r * Math.cos(a);
        const py = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      // Eye (weak point)
      if (boss.eyeOpen) {
        ctx.fillStyle = damageFlash ? "#ffffff" : "#ff0000";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 12, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tentacles
      ctx.strokeStyle = damageFlash ? "#ffffff" : "#4a90d9";
      ctx.lineWidth = 3;
      for (let i = 0; i < (boss.tentacles || 2); i++) {
        const baseAngle = (Math.PI * 2 / (boss.tentacles || 2)) * i + frame * 0.02;
        ctx.beginPath();
        ctx.moveTo(cx + (w / 2 - 10) * Math.cos(baseAngle), cy + (h / 2 - 10) * Math.sin(baseAngle));
        for (let j = 1; j <= 4; j++) {
          const segAngle = baseAngle + Math.sin(frame * 0.05 + j) * 0.5;
          const segR = w / 2 + j * 12;
          ctx.lineTo(cx + segR * Math.cos(segAngle), cy + segR * Math.sin(segAngle));
        }
        ctx.stroke();
      }
      break;
    }
    case 4: { // 3I/ATLAS
      // Organic-geometric alien ship
      ctx.fillStyle = damageFlash ? "#ffffff" : "#1a1a3a";
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(x + w, cy - 20);
      ctx.lineTo(x + w - 20, y + h);
      ctx.lineTo(x + 20, y + h);
      ctx.lineTo(x, cy - 20);
      ctx.closePath();
      ctx.fill();
      // Inner structure
      ctx.fillStyle = damageFlash ? "#ffffff" : "#3a2a6a";
      ctx.beginPath();
      ctx.moveTo(cx, y + 20);
      ctx.lineTo(x + w - 30, cy);
      ctx.lineTo(cx + 10, y + h - 30);
      ctx.lineTo(cx - 10, y + h - 30);
      ctx.lineTo(x + 30, cy);
      ctx.closePath();
      ctx.fill();
      // Core
      const coreGlow = 0.5 + 0.5 * Math.sin(frame * 0.03);
      ctx.fillStyle = `rgba(255,215,0,${coreGlow})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 20 + 5 * Math.sin(frame * 0.04), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = damageFlash ? "#ffffff" : "#ffd700";
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
      // Energy lines
      ctx.strokeStyle = `rgba(255,215,0,${0.3 + 0.3 * Math.sin(frame * 0.06)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI * 2 / 6) * i + frame * 0.01;
        ctx.beginPath();
        ctx.moveTo(cx + 15 * Math.cos(a), cy + 15 * Math.sin(a));
        ctx.lineTo(cx + (w / 2 - 10) * Math.cos(a), cy + (h / 2 - 10) * Math.sin(a));
        ctx.stroke();
      }
      break;
    }
    default: break;
  }

  // HP bar at top
  ctx.shadowBlur = 0;
  const barW = w + 20;
  const barX = cx - barW / 2;
  const barY = y - 14;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(barX, barY, barW, 8);
  const hpColor = hpPct > 0.5 ? "#39ff14" : hpPct > 0.25 ? "#ffd700" : "#ff4444";
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpPct, 8);
  ctx.strokeStyle = hpColor + "88";
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, 8);

  ctx.restore();
}

function drawPlayerBullet(ctx, b) {
  ctx.save();
  ctx.shadowColor = "#00ffff";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#00eeff";
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.globalAlpha = 0.3;
  ctx.fillRect(b.x, b.y + b.h, b.w, 6);
  ctx.restore();
}

function drawEnemyBullet(ctx, b) {
  ctx.save();
  ctx.shadowColor = "#ff4444";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#ff6666";
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHomingMissile(ctx, m, frame) {
  ctx.save();
  ctx.shadowColor = "#ff8800";
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#ffaa00";
  ctx.beginPath();
  ctx.moveTo(m.x + m.w / 2, m.y);
  ctx.lineTo(m.x + m.w, m.y + m.h);
  ctx.lineTo(m.x, m.y + m.h);
  ctx.closePath();
  ctx.fill();
  // Trail
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#ff4400";
  ctx.beginPath();
  ctx.moveTo(m.x + m.w / 2 - 2, m.y + m.h);
  ctx.lineTo(m.x + m.w / 2, m.y + m.h + 4 + Math.random() * 3);
  ctx.lineTo(m.x + m.w / 2 + 2, m.y + m.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLaser(ctx, x, y, frame) {
  ctx.save();
  const width = 6 + 2 * Math.sin(frame * 0.3);
  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 15;
  ctx.fillStyle = `rgba(168,85,247,${0.6 + 0.3 * Math.sin(frame * 0.2)})`;
  ctx.fillRect(x - width / 2, 0, width, y);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 1, 0, 2, y);
  ctx.restore();
}

function drawPowerUp(ctx, pu, frame) {
  ctx.save();
  const pulse = 0.8 + 0.2 * Math.sin(frame * 0.1);
  const r = 10 * pulse;
  const color = PU_COLORS[pu.type];

  ctx.shadowColor = color;
  ctx.shadowBlur = 12 * pulse;
  ctx.fillStyle = color + "44";
  ctx.beginPath();
  ctx.arc(pu.x + 10, pu.y + 10, r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(pu.x + 10, pu.y + 10, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000000";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(PU_LABELS[pu.type], pu.x + 10, pu.y + 10);
  ctx.restore();
}

function drawBombEffect(ctx, bomb) {
  if (!bomb.active) return;
  ctx.save();
  const progress = bomb.timer / bomb.maxTimer;
  const radius = 240 * progress;
  const alpha = 1 - progress;

  // White-blue ring
  ctx.strokeStyle = `rgba(200,220,255,${alpha * 0.8})`;
  ctx.lineWidth = 8 - 6 * progress;
  ctx.shadowColor = "#88aaff";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(CW / 2, CH / 2, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Flash overlay at start
  if (progress < 0.1) {
    ctx.fillStyle = `rgba(255,255,255,${(0.1 - progress) * 5})`;
    ctx.fillRect(0, 0, CW, CH);
  }
  ctx.restore();
}

function drawShield(ctx, x, y, frame) {
  ctx.save();
  const pulse = 0.8 + 0.2 * Math.sin(frame * 0.08);
  ctx.strokeStyle = `rgba(34,197,94,${0.4 * pulse})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = "#22c55e";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x + PLAYER_W / 2, y + PLAYER_H / 2, PLAYER_W * 0.8 * pulse, 0, Math.PI * 2);
  ctx.stroke();
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

function drawScanlines(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.03)";
  for (let y = 0; y < CH; y += 3) {
    ctx.fillRect(0, y, CW, 1);
  }
  ctx.restore();
}

function drawStars(ctx, stars, scrollMult) {
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.layer === 2 ? "#aaddff" : s.layer === 1 ? "#ccccff" : "#ffffff";
    ctx.fillRect(s.x, s.y, s.size, s.size);
    ctx.restore();
  }
}

function drawWorldBg(ctx, world, frame, parallaxOffset) {
  const colors = WORLD_BG_COLORS[world] || WORLD_BG_COLORS[0];

  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, CH);

  // World-specific parallax elements
  switch (world) {
    case 0: { // Earth
      ctx.fillStyle = `rgba(0,100,200,0.15)`;
      ctx.beginPath();
      ctx.arc(CW * 0.7, CH * 0.3 + Math.sin(frame * 0.005) * 10, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(0,150,255,0.08)`;
      ctx.beginPath();
      ctx.arc(CW * 0.7, CH * 0.3 + Math.sin(frame * 0.005) * 10, 130, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 1: { // Phobos
      ctx.fillStyle = `rgba(180,30,60,0.12)`;
      ctx.beginPath();
      ctx.arc(CW * 0.3, CH * 0.4 + Math.sin(frame * 0.004) * 8, 100, 0, Math.PI * 2);
      ctx.fill();
      // Phobos moon
      ctx.fillStyle = `rgba(140,100,80,0.2)`;
      ctx.beginPath();
      ctx.arc(CW * 0.7, CH * 0.2 + Math.sin(frame * 0.006) * 5, 30, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 2: { // Mars surface
      // Terrain lines
      ctx.strokeStyle = `rgba(255,100,0,0.08)`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const y = CH * 0.6 + i * 30 + Math.sin(frame * 0.003 + i) * 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= CW; x += 40) {
          ctx.lineTo(x, y + Math.sin(x * 0.02 + frame * 0.002) * 15);
        }
        ctx.stroke();
      }
      break;
    }
    case 3: { // Asteroid belt
      // Jupiter in background
      ctx.fillStyle = `rgba(200,150,80,0.1)`;
      ctx.beginPath();
      ctx.arc(CW * 0.5, CH + 100 + Math.sin(frame * 0.003) * 10, 250, 0, Math.PI * 2);
      ctx.fill();
      // Bands
      ctx.strokeStyle = `rgba(180,130,60,0.06)`;
      ctx.lineWidth = 8;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(CW * 0.5, CH + 100, 230 + i * 20, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      break;
    }
    case 4: { // Jupiter
      // Jupiter takes 60% of screen
      ctx.fillStyle = `rgba(200,150,80,0.15)`;
      ctx.beginPath();
      ctx.arc(CW * 0.5, CH * 0.6, CH * 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Bands
      ctx.strokeStyle = `rgba(180,120,50,0.1)`;
      ctx.lineWidth = 12;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(CW * 0.5, CH * 0.6, CH * 0.3 + i * 25, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
      }
      // Great Red Spot
      ctx.fillStyle = `rgba(200,80,40,0.12)`;
      ctx.beginPath();
      ctx.ellipse(CW * 0.35, CH * 0.55, 30, 18, 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: break;
  }
}

// ── HUD Drawing ────────────────────────────────────────────────────────
function drawHUD(ctx, g) {
  ctx.save();

  // Lives (mini ships)
  for (let i = 0; i < g.lives; i++) {
    const lx = 12 + i * 22;
    const ly = 12;
    ctx.fillStyle = "#4488ff";
    ctx.beginPath();
    ctx.moveTo(lx + 6, ly);
    ctx.lineTo(lx + 12, ly + 12);
    ctx.lineTo(lx, ly + 12);
    ctx.closePath();
    ctx.fill();
  }

  // Phase number
  ctx.fillStyle = "#4a5568";
  ctx.font = "8px 'Press Start 2P', monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`FASE ${g.phase}`, 12, 30);

  // Score
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = ACCENT;
  ctx.shadowBlur = 4;
  ctx.font = "bold 12px 'Press Start 2P', monospace";
  ctx.textAlign = "center";
  ctx.fillText(g.score.toLocaleString(), CW / 2, 12);
  ctx.shadowBlur = 0;

  // Combo
  if (g.combo > 1) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.fillText(`x${g.combo}`, CW / 2, 28);
  }

  // Bombs
  ctx.textAlign = "right";
  ctx.fillStyle = "#3b82f6";
  ctx.font = "8px 'Press Start 2P', monospace";
  for (let i = 0; i < g.bombs; i++) {
    ctx.fillText("\u25C6", CW - 12 - i * 14, 12);
  }

  // Shot level bar
  const slBarW = 80;
  const slBarH = 6;
  const slBarX = CW - 12 - slBarW;
  const slBarY = 26;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(slBarX, slBarY, slBarW, slBarH);
  ctx.fillStyle = "#00eeff";
  ctx.fillRect(slBarX, slBarY, slBarW * (g.shotLevel / SHOT_LEVEL_MAX), slBarH);
  ctx.strokeStyle = "#00eeff44";
  ctx.lineWidth = 1;
  ctx.strokeRect(slBarX, slBarY, slBarW, slBarH);
  ctx.fillStyle = "#4a5568";
  ctx.font = "6px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`LV${g.shotLevel}`, slBarX - 4, slBarY + 5);

  // Active power-up timers
  let puY = 44;
  if (g.shieldTimer > 0) {
    ctx.fillStyle = "#22c55e";
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`SHIELD ${Math.ceil(g.shieldTimer / 60)}s`, CW - 12, puY);
    puY += 12;
  }
  if (g.speedTimer > 0) {
    ctx.fillStyle = "#eab308";
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`SPEED ${Math.ceil(g.speedTimer / 60)}s`, CW - 12, puY);
    puY += 12;
  }
  if (g.laserTimer > 0) {
    ctx.fillStyle = "#a855f7";
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`LASER ${Math.ceil(g.laserTimer / 60)}s`, CW - 12, puY);
    puY += 12;
  }
  if (g.starTimer > 0) {
    ctx.fillStyle = "#ffd700";
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`STAR ${Math.ceil(g.starTimer / 60)}s`, CW - 12, puY);
    puY += 12;
  }

  ctx.restore();
}

// ══════════════════════════════════════════════════════════════════════
// ── Main Component ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════
export default function ThreeInvader() {
  const { user, checkedCookie, registering, register } = useJogador("3invader");
  const gameScale = useGameScale(CW);
  const canvasRef = useRef(null);
  const keysRef = useRef(new Set());
  const rafRef = useRef(null);
  const audioRef = useRef(null);
  const touchRef = useRef({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, playerStartX: 0, playerStartY: 0 });

  const gameRef = useRef(null);
  const screenRef = useRef("menu");

  const [screen, setScreen] = useState("menu");
  const [muted, setMuted] = useState(false);
  const [finalStats, setFinalStats] = useState(null);
  const [introScreen, setIntroScreen] = useState(0);
  const [introText, setIntroText] = useState("");
  const [introCharIndex, setIntroCharIndex] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  const [continueCount, setContinueCount] = useState(10);
  const playCountRef = useRef(0);

  useLockScroll(screen === "playing" || screen === "intro");

  useEffect(() => { screenRef.current = screen; }, [screen]);

  // ── Intro cinematic ──────────────────────────────────────────────
  useEffect(() => {
    if (screen !== "intro") return;
    const fullText = INTRO_SCREENS[introScreen];
    if (introCharIndex < fullText.length) {
      const timer = setTimeout(() => {
        setIntroText(fullText.substring(0, introCharIndex + 1));
        setIntroCharIndex(introCharIndex + 1);
        audioRef.current?.typeClick();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [screen, introScreen, introCharIndex]);

  const advanceIntro = useCallback(() => {
    if (introCharIndex < INTRO_SCREENS[introScreen].length) {
      // Skip to full text
      setIntroText(INTRO_SCREENS[introScreen]);
      setIntroCharIndex(INTRO_SCREENS[introScreen].length);
      return;
    }
    if (introScreen < INTRO_SCREENS.length - 1) {
      setIntroScreen(introScreen + 1);
      setIntroCharIndex(0);
      setIntroText("");
    } else {
      // End intro
      try { localStorage.setItem("3invader_intro_seen", "1"); } catch {}
      setScreen("menu");
    }
  }, [introScreen, introCharIndex]);

  useEffect(() => {
    if (screen !== "intro") return;
    const handler = (e) => {
      e.preventDefault();
      advanceIntro();
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("touchstart", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, [screen, advanceIntro]);

  // ── Initialize game state ──────────────────────────────────────
  const initGame = useCallback((startPhase = 1, lives = 3, score = 0, bombs = 5, continues = 3) => {
    gameRef.current = {
      // Player
      playerX: CW / 2 - PLAYER_W / 2,
      playerY: CH - PLAYER_H - 60,
      playerTilt: 0,
      lives,
      bombs,
      shotLevel: 1,
      score,
      combo: 1,
      comboKills: 0,
      continues,

      // Phase
      phase: startPhase,
      world: Math.floor((startPhase - 1) / PHASES_PER_WORLD),
      waveIndex: 0,
      waveEnemiesSpawned: 0,
      waveEnemiesTotal: 0,
      waveDelay: 0,
      phaseComplete: false,
      phaseBossActive: false,
      phaseConfig: null,
      phaseDeathCount: 0,
      phaseBombUsed: false,
      phaseTimer: 0,

      // Survival mode
      survivalTimer: 0,

      // Entities (pools)
      playerBullets: [],
      enemyBullets: [],
      enemies: [],
      homingMissiles: [],
      powerUps: [],
      particles: [],
      boss: null,

      // Bomb animation
      bombEffect: { active: false, timer: 0, maxTimer: 48 }, // 0.8s
      bombInvuln: false,

      // Power-up timers
      shieldTimer: 0,
      speedTimer: 0,
      laserTimer: 0,
      starTimer: 0,
      invulnTimer: 0,
      respawnTimer: 0,
      dead: false,

      // Formation grid for Galaga
      formationGrid: [],
      formationX: 0,
      formationY: 40,
      formationDir: 1,
      formationDiveTimer: 0,

      // Invaders grid for Space Invaders pattern
      invaderGrid: [],
      invaderDir: 1,
      invaderSpeed: 0.5,
      invaderDropTimer: 0,

      // Visual
      stars: initStars(100),
      screenShake: 0,
      frame: 0,
      nextId: 0,

      // Boss warning
      bossWarning: 0,

      // Phase transition
      phaseTransitionTimer: 0,
      worldTransitionTimer: 0,
      showingWorldBriefing: false,

      // Score tracking
      totalEnemiesKilled: 0,
      completed: false,
    };

    setupPhase(gameRef.current, startPhase);
  }, []);

  // ── Setup phase ────────────────────────────────────────────────
  function setupPhase(g, phase) {
    g.phase = phase;
    g.world = Math.floor((phase - 1) / PHASES_PER_WORLD);
    g.phaseConfig = getPhaseConfig(phase);
    g.waveIndex = 0;
    g.waveEnemiesSpawned = 0;
    g.waveDelay = 60;
    g.phaseComplete = false;
    g.phaseBossActive = false;
    g.phaseDeathCount = 0;
    g.phaseBombUsed = false;
    g.phaseTimer = 0;
    g.survivalTimer = 0;
    g.boss = null;
    g.bossWarning = 0;
    g.phaseTransitionTimer = 0;
    g.worldTransitionTimer = 0;
    g.showingWorldBriefing = false;

    // Clear enemy bullets
    g.enemyBullets = [];

    // Setup formations
    g.formationGrid = [];
    g.formationX = CW / 2 - 100;
    g.formationY = 40;
    g.formationDir = 1;
    g.formationDiveTimer = 0;

    g.invaderGrid = [];
    g.invaderDir = 1;
    g.invaderSpeed = 0.5;

    if (g.phaseConfig.isBoss) {
      g.bossWarning = 180; // 3s warning
    }
  }

  // ── Spawn enemy ────────────────────────────────────────────────
  function spawnEnemy(g, type, x, y, pattern) {
    const def = ENEMY_DEFS[type];
    const enemy = {
      id: g.nextId++,
      type,
      x: x !== undefined ? x : 20 + Math.random() * (CW - 40 - def.w),
      y: y !== undefined ? y : -def.h - 10,
      w: def.w,
      h: def.h,
      hp: def.hp,
      maxHp: def.hp,
      speed: 1 + g.world * 0.3,
      pattern: pattern || "galaga",
      patternTimer: 0,
      baseX: 0,
      baseY: 0,
      gridSlot: null,
      inGrid: false,
      diving: false,
      diveTargetX: 0,
      diveTargetY: 0,
      shootTimer: 120 + Math.floor(Math.random() * 120),
      alive: true,
      hasPowerUp: Math.random() < 0.15,
      enterPhase: 0,
      enterAngle: Math.random() * Math.PI * 2,
      sineOffset: Math.random() * Math.PI * 2,
    };
    enemy.baseX = enemy.x;
    enemy.baseY = enemy.y;
    g.enemies.push(enemy);
    return enemy;
  }

  // ── Spawn boss ─────────────────────────────────────────────────
  function spawnBoss(g) {
    const bossIndex = g.world;
    const def = BOSS_DEFS[bossIndex];
    g.boss = {
      bossIndex,
      x: CW / 2 - def.w / 2,
      y: -def.h - 20,
      targetY: 40,
      w: def.w,
      h: def.h,
      hp: def.hp,
      maxHp: def.hp,
      phase: 1,
      phaseTimer: 0,
      shootTimer: 0,
      damageFlash: 0,
      alive: true,
      patternTimer: 0,
      spawnTimer: 0,
      entering: true,
      // Boss-specific
      turretHpL: bossIndex === 1 ? 15 : 0,
      turretHpR: bossIndex === 1 ? 15 : 0,
      eyeOpen: false,
      eyeTimer: 0,
      tentacles: bossIndex === 3 ? 2 : 0,
      chargePhase: false,
      chargeTarget: 0,
    };
    g.phaseBossActive = true;
  }

  // ── Spawn particles ────────────────────────────────────────────
  function spawnExplosion(g, x, y, color, count) {
    for (let i = 0; i < count && g.particles.length < MAX_PARTICLES; i++) {
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
  }

  function spawnExhaust(g) {
    if (g.dead || g.particles.length >= MAX_PARTICLES) return;
    g.particles.push({
      x: g.playerX + PLAYER_W / 2 + (Math.random() - 0.5) * 8,
      y: g.playerY + PLAYER_H + 5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 1 + Math.random() * 2,
      life: 0.6,
      decay: 0.04,
      color: Math.random() < 0.5 ? "#00ccff" : "#0088cc",
      size: 1 + Math.random() * 2,
    });
  }

  // ── Player shooting ────────────────────────────────────────────
  function firePlayerShot(g) {
    const cx = g.playerX + PLAYER_W / 2;
    const topY = g.playerY;
    const bw = 3;
    const bh = 12;
    const dmg = 1 + (g.shotLevel - 1) * 0.25;

    switch (g.shotLevel) {
      case 1:
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: 0, vy: -8, dmg });
        break;
      case 2:
        g.playerBullets.push({ x: cx - 5, y: topY - bh, w: bw, h: bh, vx: 0, vy: -8, dmg });
        g.playerBullets.push({ x: cx + 2, y: topY - bh, w: bw, h: bh, vx: 0, vy: -8, dmg });
        break;
      case 3: {
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: 0, vy: -8, dmg });
        const spread = Math.PI / 12; // 15 deg
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: Math.sin(-spread) * 8, vy: Math.cos(spread) * -8, dmg });
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: Math.sin(spread) * 8, vy: Math.cos(spread) * -8, dmg });
        break;
      }
      case 4: {
        g.playerBullets.push({ x: cx - 5, y: topY - bh, w: bw, h: bh, vx: 0, vy: -8, dmg });
        g.playerBullets.push({ x: cx + 2, y: topY - bh, w: bw, h: bh, vx: 0, vy: -8, dmg });
        const spread4 = Math.PI / 9; // 20 deg
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: Math.sin(-spread4) * 8, vy: Math.cos(spread4) * -8, dmg });
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: Math.sin(spread4) * 8, vy: Math.cos(spread4) * -8, dmg });
        break;
      }
      case 5: {
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: 0, vy: -8, dmg });
        const s5a = Math.PI / 12;
        const s5b = Math.PI / 7;
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: Math.sin(-s5a) * 8, vy: Math.cos(s5a) * -8, dmg });
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: Math.sin(s5a) * 8, vy: Math.cos(s5a) * -8, dmg });
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: Math.sin(-s5b) * 8, vy: Math.cos(s5b) * -8, dmg });
        g.playerBullets.push({ x: cx - bw / 2, y: topY - bh, w: bw, h: bh, vx: Math.sin(s5b) * 8, vy: Math.cos(s5b) * -8, dmg });
        // Homing missiles
        spawnHomingMissile(g, cx - 10, topY);
        spawnHomingMissile(g, cx + 10, topY);
        break;
      }
      default: break;
    }
  }

  function spawnHomingMissile(g, x, y) {
    g.homingMissiles.push({
      x, y, w: 6, h: 10,
      vx: (Math.random() - 0.5) * 2,
      vy: -4,
      dmg: 1,
      life: 180, // 3s max
      target: null,
    });
  }

  // ── Enemy shooting ─────────────────────────────────────────────
  function enemyShoot(g, enemy) {
    const def = ENEMY_DEFS[enemy.type];
    const cx = enemy.x + def.w / 2;
    const cy = enemy.y + def.h;
    const speed = 3 + g.world * 0.3;

    switch (def.shotType) {
      case "single":
        g.enemyBullets.push({ x: cx - 3, y: cy, w: 6, h: 6, vx: 0, vy: speed });
        break;
      case "dual":
        g.enemyBullets.push({ x: cx - 8, y: cy, w: 6, h: 6, vx: 0, vy: speed });
        g.enemyBullets.push({ x: cx + 2, y: cy, w: 6, h: 6, vx: 0, vy: speed });
        break;
      case "triple": {
        g.enemyBullets.push({ x: cx - 3, y: cy, w: 6, h: 6, vx: 0, vy: speed });
        g.enemyBullets.push({ x: cx - 3, y: cy, w: 6, h: 6, vx: -1.5, vy: speed });
        g.enemyBullets.push({ x: cx - 3, y: cy, w: 6, h: 6, vx: 1.5, vy: speed });
        break;
      }
      case "aimed": {
        const a = angleTo(cx, cy, g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2);
        g.enemyBullets.push({ x: cx - 3, y: cy, w: 6, h: 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
        break;
      }
      default: break;
    }
  }

  // ── Boss shooting ──────────────────────────────────────────────
  function bossShoot(g, boss) {
    const cx = boss.x + boss.w / 2;
    const cy = boss.y + boss.h;
    const speed = 3;
    const pcx = g.playerX + PLAYER_W / 2;
    const pcy = g.playerY + PLAYER_H / 2;

    switch (boss.bossIndex) {
      case 0: { // ORION-9
        const hpPct = boss.hp / boss.maxHp;
        if (hpPct > 0.7) {
          // Triple shot
          for (let i = -1; i <= 1; i++) {
            g.enemyBullets.push({ x: cx + i * 15 - 3, y: cy, w: 6, h: 6, vx: i * 0.8, vy: speed });
          }
        } else if (hpPct > 0.3) {
          // Quintuple spread
          for (let i = -2; i <= 2; i++) {
            g.enemyBullets.push({ x: cx + i * 12 - 3, y: cy, w: 6, h: 6, vx: i * 1.2, vy: speed });
          }
        } else {
          // Circular 8-dir
          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 / 8) * i;
            g.enemyBullets.push({ x: cx - 3, y: boss.y + boss.h / 2, w: 6, h: 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
          }
        }
        break;
      }
      case 1: { // HIVE-01
        const hpPct1 = boss.hp / boss.maxHp;
        if (hpPct1 > 0.6) {
          // Turret aimed shots
          if (boss.turretHpL > 0) {
            const a = angleTo(boss.x + 25, boss.y + boss.h, pcx, pcy);
            g.enemyBullets.push({ x: boss.x + 22, y: boss.y + boss.h, w: 6, h: 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
          }
          if (boss.turretHpR > 0) {
            const a = angleTo(boss.x + boss.w - 25, boss.y + boss.h, pcx, pcy);
            g.enemyBullets.push({ x: boss.x + boss.w - 28, y: boss.y + boss.h, w: 6, h: 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
          }
        } else if (hpPct1 > 0.25) {
          // Bullet curtain
          for (let i = 0; i < 8; i++) {
            g.enemyBullets.push({
              x: boss.x + (boss.w / 9) * (i + 0.5),
              y: boss.y + boss.h,
              w: 6, h: 6, vx: 0, vy: speed + Math.random()
            });
          }
        } else {
          // Laser sweep (simulated with fast bullets)
          const sweepAngle = Math.sin(boss.phaseTimer * 0.03) * 0.8;
          for (let i = 0; i < 3; i++) {
            g.enemyBullets.push({
              x: cx - 3, y: cy,
              w: 6, h: 6,
              vx: Math.sin(sweepAngle + (i - 1) * 0.1) * 4,
              vy: Math.cos(sweepAngle) * 4,
            });
          }
        }
        break;
      }
      case 2: { // GOLIATH
        const hpPct2 = boss.hp / boss.maxHp;
        if (hpPct2 > 0.6) {
          // Main cannon aimed
          const a = angleTo(cx, cy, pcx, pcy);
          for (let i = 0; i < 3; i++) {
            g.enemyBullets.push({
              x: cx - 3, y: cy,
              w: 8, h: 8,
              vx: Math.cos(a + (i - 1) * 0.15) * (speed + 1),
              vy: Math.sin(a + (i - 1) * 0.15) * (speed + 1),
            });
          }
        } else if (hpPct2 > 0.1) {
          // 12-bullet salvo
          for (let i = 0; i < 12; i++) {
            const a = (Math.PI * 2 / 12) * i + boss.phaseTimer * 0.02;
            g.enemyBullets.push({ x: cx - 3, y: boss.y + boss.h / 2, w: 6, h: 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
          }
        } else {
          // Kamikaze charge (move toward player)
          boss.chargePhase = true;
          boss.chargeTarget = pcx;
        }
        break;
      }
      case 3: { // CHARYBDIS
        if (boss.eyeOpen) {
          // Energy jets
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 / 6) * i + boss.phaseTimer * 0.015;
            g.enemyBullets.push({ x: cx - 3, y: cy, w: 6, h: 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
          }
        } else {
          // Rock shots
          for (let i = 0; i < 4; i++) {
            g.enemyBullets.push({
              x: cx + (Math.random() - 0.5) * boss.w,
              y: cy,
              w: 8, h: 8,
              vx: (Math.random() - 0.5) * 2,
              vy: speed + Math.random(),
            });
          }
        }
        break;
      }
      case 4: { // 3I/ATLAS
        const hpPct4 = boss.hp / boss.maxHp;
        if (hpPct4 > 0.7) {
          // Large splitting orbs
          for (let i = -1; i <= 1; i++) {
            g.enemyBullets.push({ x: cx + i * 30 - 4, y: cy, w: 10, h: 10, vx: i * 0.5, vy: speed - 0.5 });
          }
        } else if (hpPct4 > 0.3) {
          // Cycle attacks
          const cycle = Math.floor(boss.phaseTimer / 120) % 4;
          if (cycle === 0) {
            // Laser sweep
            const sweepA = Math.sin(boss.phaseTimer * 0.04) * 1.2;
            for (let i = 0; i < 5; i++) {
              g.enemyBullets.push({ x: cx - 3, y: cy, w: 6, h: 6, vx: Math.sin(sweepA + (i - 2) * 0.15) * 4, vy: Math.cos(sweepA) * 3 });
            }
          } else if (cycle === 1) {
            // Missile spread
            for (let i = 0; i < 8; i++) {
              const a = angleTo(cx, cy, pcx, pcy) + (i - 3.5) * 0.2;
              g.enemyBullets.push({ x: cx - 3, y: cy, w: 6, h: 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
            }
          } else if (cycle === 2) {
            // Bullet curtain
            for (let i = 0; i < 12; i++) {
              g.enemyBullets.push({ x: boss.x + (boss.w / 13) * (i + 0.5), y: cy, w: 6, h: 6, vx: 0, vy: speed + Math.random() * 0.5 });
            }
          } else {
            // Circular
            for (let i = 0; i < 16; i++) {
              const a = (Math.PI * 2 / 16) * i;
              g.enemyBullets.push({ x: cx - 3, y: cy - 20, w: 6, h: 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed });
            }
          }
        } else {
          // Desperation - all attacks combined
          for (let i = 0; i < 12; i++) {
            const a = (Math.PI * 2 / 12) * i + boss.phaseTimer * 0.03;
            g.enemyBullets.push({ x: cx - 3, y: cy, w: 6, h: 6, vx: Math.cos(a) * (speed + 1), vy: Math.sin(a) * (speed + 1) });
          }
          // Gravity pull effect (handled in update)
        }
        break;
      }
      default: break;
    }
  }

  // ── Spawn wave ─────────────────────────────────────────────────
  function spawnWave(g) {
    const cfg = g.phaseConfig;
    if (!cfg || cfg.isBoss) return;

    if (cfg.survivalMode) {
      // Continuous spawning
      const type = cfg.enemyTypes[Math.floor(Math.random() * cfg.enemyTypes.length)];
      spawnEnemy(g, type, undefined, undefined, type === ET_BOMBER ? "invader" : "galaga");
      return;
    }

    const count = cfg.waveSize;
    const types = cfg.enemyTypes;

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const pattern = (cfg.invaderGrid && type === ET_BOMBER) ? "invader" : "galaga";
      const x = 20 + (i % 8) * 50 + Math.random() * 20;
      const y = -30 - Math.floor(i / 8) * 40 - Math.random() * 20;
      const e = spawnEnemy(g, type, x, y, pattern);

      if (pattern === "galaga") {
        const gridCol = i % 8;
        const gridRow = Math.floor(i / 8);
        e.gridSlot = { col: gridCol, row: gridRow };
        e.baseX = 40 + gridCol * 50;
        e.baseY = 50 + gridRow * 40;
      } else if (pattern === "invader") {
        const gridCol = i % 8;
        const gridRow = Math.floor(i / 8);
        e.gridSlot = { col: gridCol, row: gridRow };
        e.inGrid = true;
        e.x = 20 + gridCol * 50;
        e.y = 30 + gridRow * 35;
      }
    }
  }

  // ── Drop power-up ──────────────────────────────────────────────
  function dropPowerUp(g, x, y) {
    // Determine type based on current needs
    let type;
    const r = Math.random();
    if (r < 0.35) type = PU_P;
    else if (r < 0.5) type = PU_B;
    else if (r < 0.65) type = PU_S;
    else if (r < 0.75) type = PU_V;
    else if (r < 0.85) type = PU_L;
    else if (r < 0.93) type = PU_STAR;
    else type = PU_1UP;

    g.powerUps.push({ x: x - 10, y, w: 20, h: 20, type });
  }

  // ── Apply power-up ────────────────────────────────────────────
  function applyPowerUp(g, type) {
    switch (type) {
      case PU_P:
        if (g.shotLevel < SHOT_LEVEL_MAX) g.shotLevel++;
        else g.score += 500;
        break;
      case PU_B:
        if (g.bombs < BOMB_MAX) g.bombs++;
        break;
      case PU_S:
        g.shieldTimer = PU_DURATIONS[PU_S];
        break;
      case PU_V:
        g.speedTimer = PU_DURATIONS[PU_V];
        break;
      case PU_L:
        g.laserTimer = PU_DURATIONS[PU_L];
        break;
      case PU_STAR:
        g.starTimer = PU_DURATIONS[PU_STAR];
        break;
      case PU_1UP:
        if (g.lives < LIVES_MAX) g.lives++;
        break;
      default: break;
    }
  }

  // ── Player death ───────────────────────────────────────────────
  function playerDie(g) {
    if (g.dead || g.starTimer > 0 || g.bombInvuln || g.invulnTimer > 0) return false;

    if (g.shieldTimer > 0) {
      g.shieldTimer = 0;
      spawnExplosion(g, g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2, "#22c55e", 15);
      g.screenShake = 10;
      return false;
    }

    g.dead = true;
    g.lives--;
    g.shotLevel = 1;
    g.combo = 1;
    g.comboKills = 0;
    g.phaseDeathCount++;
    g.respawnTimer = RESPAWN_TIME;
    g.screenShake = 20;

    spawnExplosion(g, g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2, "#4488ff", 30);
    spawnExplosion(g, g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2, "#ff4444", 20);
    audioRef.current?.lifeLost();

    return true;
  }

  // ── Use bomb ───────────────────────────────────────────────────
  function useBomb(g) {
    if (g.bombs <= 0 || g.dead || g.bombEffect.active) return;
    g.bombs--;
    g.phaseBombUsed = true;
    g.bombEffect.active = true;
    g.bombEffect.timer = 0;
    g.bombInvuln = true;
    g.screenShake = 15;

    // Clear all enemy bullets
    g.enemyBullets = [];

    // Damage enemies
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      g.enemies[i].hp -= 3;
      if (g.enemies[i].hp <= 0) {
        const def = ENEMY_DEFS[g.enemies[i].type];
        g.score += def.points;
        g.totalEnemiesKilled++;
        spawnExplosion(g, g.enemies[i].x + def.w / 2, g.enemies[i].y + def.h / 2, def.color, 10);
        if (g.enemies[i].hasPowerUp) dropPowerUp(g, g.enemies[i].x + def.w / 2, g.enemies[i].y + def.h / 2);
        g.enemies.splice(i, 1);
      }
    }

    // Damage boss
    if (g.boss && g.boss.alive) {
      g.boss.hp -= 5;
      g.boss.damageFlash = 10;
      if (g.boss.hp <= 0) {
        g.boss.alive = false;
      }
    }

    audioRef.current?.bomb();
  }

  // ── Game loop ──────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    if (screenRef.current !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const g = gameRef.current;
    if (!g) return;

    const keys = keysRef.current;
    g.frame++;

    // ---- Phase transition timers ----
    if (g.phaseTransitionTimer > 0) {
      g.phaseTransitionTimer--;
      if (g.phaseTransitionTimer <= 0) {
        if (g.phase >= TOTAL_PHASES) {
          // Victory!
          handleVictory(g);
          return;
        }
        const nextPhase = g.phase + 1;
        const nextWorld = Math.floor((nextPhase - 1) / PHASES_PER_WORLD);
        if (nextWorld !== g.world) {
          g.worldTransitionTimer = 180;
          g.showingWorldBriefing = true;
          g.phase = nextPhase;
          g.world = nextWorld;
        } else {
          setupPhase(g, nextPhase);
        }
      }
      // Still draw during transition
      renderFrame(ctx, g);
      return;
    }

    if (g.worldTransitionTimer > 0) {
      g.worldTransitionTimer--;
      if (g.worldTransitionTimer <= 0) {
        g.showingWorldBriefing = false;
        setupPhase(g, g.phase);
      }
      renderFrame(ctx, g);
      return;
    }

    // ---- Boss warning ----
    if (g.bossWarning > 0) {
      g.bossWarning--;
      if (g.bossWarning <= 0) {
        spawnBoss(g);
      }
      renderFrame(ctx, g);
      return;
    }

    // ---- Pause ----
    if (keys.has("p") || keys.has("P") || keys.has("Escape")) {
      keys.delete("p");
      keys.delete("P");
      keys.delete("Escape");
      setScreen("paused");
      return;
    }

    // ---- Respawn logic ----
    if (g.dead) {
      g.respawnTimer--;
      if (g.respawnTimer <= 0) {
        if (g.lives <= 0) {
          // Game over
          handleGameOver(g);
          return;
        }
        g.dead = false;
        g.playerX = CW / 2 - PLAYER_W / 2;
        g.playerY = CH - PLAYER_H - 60;
        g.invulnTimer = INVULN_TIME;
      }
      updateParticles(g);
      updateStars(g);
      renderFrame(ctx, g);
      return;
    }

    g.phaseTimer++;

    // ---- Player movement ----
    const moveSpeed = g.speedTimer > 0 ? PLAYER_SPEED * 1.5 : PLAYER_SPEED;
    let dx = 0, dy = 0;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx -= moveSpeed;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx += moveSpeed;
    if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy -= moveSpeed;
    if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy += moveSpeed;

    // Touch movement
    const touch = touchRef.current;
    if (touch.active) {
      const tdx = touch.currentX - touch.startX;
      const tdy = touch.currentY - touch.startY;
      g.playerX = clamp(touch.playerStartX + tdx, 0, CW - PLAYER_W);
      g.playerY = clamp(touch.playerStartY + tdy, 0, CH - PLAYER_H);
    } else {
      g.playerX = clamp(g.playerX + dx, 0, CW - PLAYER_W);
      g.playerY = clamp(g.playerY + dy, 0, CH - PLAYER_H);
    }

    // Visual tilt
    g.playerTilt = lerp(g.playerTilt, dx * 0.5, 0.2);

    // ---- Invulnerability timer ----
    if (g.invulnTimer > 0) g.invulnTimer--;

    // ---- Power-up timers ----
    if (g.shieldTimer > 0) g.shieldTimer--;
    if (g.speedTimer > 0) g.speedTimer--;
    if (g.laserTimer > 0) g.laserTimer--;
    if (g.starTimer > 0) g.starTimer--;

    // ---- Bomb effect ----
    if (g.bombEffect.active) {
      g.bombEffect.timer++;
      if (g.bombEffect.timer >= g.bombEffect.maxTimer) {
        g.bombEffect.active = false;
        g.bombInvuln = false;
      }
    }

    // ---- Shooting ----
    if (!g.dead) {
      // Auto-fire on mobile (touch), or N key on desktop
      const isMobile = touch.active;
      const wantShoot = keys.has("n") || keys.has("N") || keys.has(" ") || isMobile;

      if (wantShoot && g.frame % SHOT_COOLDOWN === 0) {
        if (g.laserTimer <= 0) {
          firePlayerShot(g);
          audioRef.current?.shoot();
        }
      }

      // Bomb
      if (keys.has("m") || keys.has("M")) {
        keys.delete("m");
        keys.delete("M");
        useBomb(g);
      }
    }

    // ---- Laser ----
    if (g.laserTimer > 0 && !g.dead) {
      const laserX = g.playerX + PLAYER_W / 2;
      // Damage enemies in laser path
      for (let i = g.enemies.length - 1; i >= 0; i--) {
        const e = g.enemies[i];
        const eDef = ENEMY_DEFS[e.type];
        if (Math.abs((e.x + eDef.w / 2) - laserX) < 10 && e.y < g.playerY) {
          e.hp -= 0.15;
          if (e.hp <= 0) {
            g.score += eDef.points * g.combo;
            g.totalEnemiesKilled++;
            g.comboKills++;
            updateCombo(g);
            spawnExplosion(g, e.x + eDef.w / 2, e.y + eDef.h / 2, eDef.color, 10);
            if (e.hasPowerUp) dropPowerUp(g, e.x + eDef.w / 2, e.y + eDef.h / 2);
            // Carrier spawns scouts
            if (e.type === ET_CARRIER) {
              for (let s = 0; s < 3; s++) {
                spawnEnemy(g, ET_SCOUT, e.x + (s - 1) * 20, e.y, "galaga");
              }
            }
            g.enemies.splice(i, 1);
            audioRef.current?.enemyHit();
          }
        }
      }
      // Damage boss
      if (g.boss && g.boss.alive) {
        const bCx = g.boss.x + g.boss.w / 2;
        if (Math.abs(bCx - laserX) < g.boss.w / 2) {
          let dmgMult = 1;
          if (g.boss.bossIndex === 3 && g.boss.eyeOpen) dmgMult = 3;
          g.boss.hp -= 0.1 * dmgMult;
          g.boss.damageFlash = 3;
          if (g.boss.hp <= 0) g.boss.alive = false;
        }
      }
    }

    // ---- Update player bullets ----
    for (let i = g.playerBullets.length - 1; i >= 0; i--) {
      const b = g.playerBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y + b.h < -10 || b.x < -20 || b.x > CW + 20) {
        g.playerBullets.splice(i, 1);
      }
    }

    // ---- Update homing missiles ----
    for (let i = g.homingMissiles.length - 1; i >= 0; i--) {
      const m = g.homingMissiles[i];
      m.life--;
      if (m.life <= 0 || m.y < -20) {
        g.homingMissiles.splice(i, 1);
        continue;
      }

      // Find nearest target
      let nearDist = Infinity;
      let nearTarget = null;
      for (let j = 0; j < g.enemies.length; j++) {
        const e = g.enemies[j];
        const d = dist(m.x, m.y, e.x + ENEMY_DEFS[e.type].w / 2, e.y + ENEMY_DEFS[e.type].h / 2);
        if (d < nearDist) { nearDist = d; nearTarget = e; }
      }
      if (g.boss && g.boss.alive) {
        const d = dist(m.x, m.y, g.boss.x + g.boss.w / 2, g.boss.y + g.boss.h / 2);
        if (d < nearDist) { nearDist = d; nearTarget = g.boss; }
      }

      if (nearTarget) {
        const tx = nearTarget.x + (nearTarget.w || ENEMY_DEFS[nearTarget.type]?.w || 20) / 2;
        const ty = nearTarget.y + (nearTarget.h || ENEMY_DEFS[nearTarget.type]?.h || 20) / 2;
        const a = angleTo(m.x, m.y, tx, ty);
        m.vx = lerp(m.vx, Math.cos(a) * 5, 0.08);
        m.vy = lerp(m.vy, Math.sin(a) * 5, 0.08);
      }

      m.x += m.vx;
      m.y += m.vy;
    }

    // ---- Update enemy bullets ----
    for (let i = g.enemyBullets.length - 1; i >= 0; i--) {
      const b = g.enemyBullets[i];
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > CH + 10 || b.y < -10 || b.x < -10 || b.x > CW + 10) {
        g.enemyBullets.splice(i, 1);
      }
    }

    // ---- Update enemies ----
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      const def = ENEMY_DEFS[e.type];
      e.patternTimer++;

      switch (e.pattern) {
        case "galaga": {
          if (e.enterPhase < 60) {
            // Enter with curve
            e.enterPhase++;
            const t = e.enterPhase / 60;
            const targetX = e.baseX;
            const targetY = e.baseY;
            e.x = lerp(e.x, targetX + Math.sin(e.enterAngle + e.enterPhase * 0.1) * 30, 0.04);
            e.y = lerp(e.y, targetY, 0.03);
          } else if (!e.diving) {
            e.inGrid = true;
            // Formation movement
            const gridX = 40 + (e.gridSlot?.col || 0) * 50;
            const gridY = 50 + (e.gridSlot?.row || 0) * 40;
            e.x = lerp(e.x, gridX + g.formationX - CW / 2 + 100, 0.05);
            e.y = lerp(e.y, gridY, 0.05);

            // Shoot periodically
            e.shootTimer--;
            if (e.shootTimer <= 0 && def.shotType !== "none") {
              e.shootTimer = 120 + Math.floor(Math.random() * 180) - g.world * 20;
              enemyShoot(g, e);
            }
          } else {
            // Diving
            e.x = lerp(e.x, e.diveTargetX, 0.03);
            e.y += e.speed * 2.5;
            // Shoot during dive
            if (e.patternTimer % 30 === 0 && def.shotType !== "none") {
              enemyShoot(g, e);
            }
            if (e.y > CH + 20) {
              g.enemies.splice(i, 1);
              continue;
            }
          }
          break;
        }
        case "invader": {
          // Space Invaders pattern
          if (e.inGrid) {
            e.x += g.invaderDir * g.invaderSpeed;
            e.shootTimer--;
            if (e.shootTimer <= 0 && def.shotType !== "none") {
              e.shootTimer = 180 + Math.floor(Math.random() * 240) - g.world * 30;
              enemyShoot(g, e);
            }
          }
          break;
        }
        default: {
          // Default downward movement
          e.y += e.speed;
          if (e.type === ET_ACE) {
            e.x += Math.sin(e.patternTimer * 0.05 + e.sineOffset) * 3;
          }
          if (e.type === ET_MINE) {
            e.y += 0.3; // Slow float
          }
          e.shootTimer--;
          if (e.shootTimer <= 0 && def.shotType !== "none") {
            e.shootTimer = 120 + Math.floor(Math.random() * 120);
            enemyShoot(g, e);
          }
          if (e.y > CH + 20) {
            g.enemies.splice(i, 1);
            continue;
          }
          break;
        }
      }
    }

    // ---- Formation movement (Galaga) ----
    g.formationX += g.formationDir * (0.3 + g.world * 0.1);
    if (g.formationX > 60 || g.formationX < -60) {
      g.formationDir *= -1;
    }

    // ---- Galaga dive timer ----
    g.formationDiveTimer++;
    const diveInterval = Math.max(60, 180 - g.world * 20 - g.phase * 3);
    if (g.formationDiveTimer >= diveInterval) {
      g.formationDiveTimer = 0;
      const gridEnemies = g.enemies.filter(e => e.pattern === "galaga" && e.inGrid && !e.diving);
      const diveCount = Math.min(1 + Math.floor(g.world * 0.5), 3, gridEnemies.length);
      for (let d = 0; d < diveCount; d++) {
        const e = gridEnemies[Math.floor(Math.random() * gridEnemies.length)];
        if (e) {
          e.diving = true;
          e.inGrid = false;
          e.diveTargetX = g.playerX + PLAYER_W / 2;
        }
      }
    }

    // ---- Invader grid movement (Space Invaders) ----
    const invaders = g.enemies.filter(e => e.pattern === "invader" && e.inGrid);
    if (invaders.length > 0) {
      let hitEdge = false;
      for (const e of invaders) {
        if (e.x < 10 || e.x + ENEMY_DEFS[e.type].w > CW - 10) {
          hitEdge = true;
          break;
        }
      }
      if (hitEdge) {
        g.invaderDir *= -1;
        for (const e of invaders) {
          e.y += 15;
        }
        // Speed up as fewer remain
        g.invaderSpeed = 0.5 + (1 - invaders.length / 32) * 2;
      }
    }

    // ---- Mine proximity check ----
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      if (e.type === ET_MINE) {
        const d = dist(e.x + 10, e.y + 10, g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2);
        if (d < 48) {
          // Explode
          spawnExplosion(g, e.x + 10, e.y + 10, "#ff4444", 15);
          g.enemies.splice(i, 1);
          g.screenShake = 10;
          if (!g.dead && g.invulnTimer <= 0 && g.starTimer <= 0 && !g.bombInvuln) {
            playerDie(g);
          }
          continue;
        }
      }
    }

    // ---- Update boss ----
    if (g.boss && g.boss.alive) {
      const boss = g.boss;
      boss.phaseTimer++;

      if (boss.entering) {
        boss.y = lerp(boss.y, boss.targetY, 0.02);
        if (Math.abs(boss.y - boss.targetY) < 2) {
          boss.entering = false;
          boss.y = boss.targetY;
        }
      } else {
        // Boss movement
        if (!boss.chargePhase) {
          boss.x += Math.sin(boss.phaseTimer * 0.015) * 1.5;
          boss.x = clamp(boss.x, 10, CW - boss.w - 10);

          // Update boss phase based on HP
          const hpPct = boss.hp / boss.maxHp;
          if (hpPct > 0.7) boss.phase = 1;
          else if (hpPct > 0.3) boss.phase = 2;
          else boss.phase = 3;
        } else {
          // Charging toward player (Goliath)
          boss.y += 3;
          boss.x = lerp(boss.x, g.playerX - boss.w / 2, 0.05);
          if (boss.y > CH + 50) {
            boss.y = -boss.h - 20;
            boss.chargePhase = false;
            boss.entering = true;
          }
        }

        // Boss shooting
        boss.shootTimer++;
        const shootInterval = Math.max(20, 60 - boss.phase * 15);
        if (boss.shootTimer >= shootInterval) {
          boss.shootTimer = 0;
          bossShoot(g, boss);
        }

        // Boss spawn enemies
        boss.spawnTimer++;
        if (boss.spawnTimer >= 480 && boss.bossIndex !== 2) { // Every 8s
          boss.spawnTimer = 0;
          if (boss.phase >= 1) {
            spawnEnemy(g, ET_SCOUT, boss.x + 20, boss.y + boss.h, "galaga");
            spawnEnemy(g, ET_SCOUT, boss.x + boss.w - 40, boss.y + boss.h, "galaga");
          }
        }

        // CHARYBDIS eye timer
        if (boss.bossIndex === 3) {
          boss.eyeTimer++;
          const eyeCycle = 600 - boss.phase * 100; // Opens more frequently in later phases
          if (!boss.eyeOpen && boss.eyeTimer >= eyeCycle) {
            boss.eyeOpen = true;
            boss.eyeTimer = 0;
          } else if (boss.eyeOpen && boss.eyeTimer >= 180) { // Open for 3s
            boss.eyeOpen = false;
            boss.eyeTimer = 0;
          }
          boss.tentacles = Math.min(boss.phase + 1, 4);
        }

        // 3I/ATLAS gravity pull in phase 3
        if (boss.bossIndex === 4 && boss.phase === 3 && !g.dead) {
          const pullStr = 0.3;
          const bcx = boss.x + boss.w / 2;
          const bcy = boss.y + boss.h / 2;
          const pAngle = angleTo(g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2, bcx, bcy);
          g.playerX += Math.cos(pAngle) * pullStr;
          g.playerY += Math.sin(pAngle) * pullStr;
          g.playerX = clamp(g.playerX, 0, CW - PLAYER_W);
          g.playerY = clamp(g.playerY, 0, CH - PLAYER_H);
        }
      }

      if (boss.damageFlash > 0) boss.damageFlash--;
    }

    // Check boss death
    if (g.boss && !g.boss.alive) {
      const def = BOSS_DEFS[g.boss.bossIndex];
      g.score += def.points * g.combo;
      if (!g.phaseBombUsed) g.score += 3000;
      g.totalEnemiesKilled++;
      spawnExplosion(g, g.boss.x + g.boss.w / 2, g.boss.y + g.boss.h / 2, def.color, 40);
      spawnExplosion(g, g.boss.x + g.boss.w / 2, g.boss.y + g.boss.h / 2, "#ffffff", 20);
      g.screenShake = 30;
      audioRef.current?.phaseComplete();
      g.boss = null;
      g.phaseBossActive = false;

      // Phase complete
      completePhase(g);
    }

    // ---- Collision: player bullets vs enemies ----
    for (let bi = g.playerBullets.length - 1; bi >= 0; bi--) {
      const b = g.playerBullets[bi];
      let hit = false;

      for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
        const e = g.enemies[ei];
        const def = ENEMY_DEFS[e.type];
        if (aabb(b, { x: e.x, y: e.y, w: def.w, h: def.h })) {
          hit = true;
          e.hp -= b.dmg;
          if (e.hp <= 0) {
            g.score += def.points * g.combo;
            g.totalEnemiesKilled++;
            g.comboKills++;
            updateCombo(g);
            spawnExplosion(g, e.x + def.w / 2, e.y + def.h / 2, def.color, 12);
            if (e.hasPowerUp) dropPowerUp(g, e.x + def.w / 2, e.y + def.h / 2);
            // Carrier spawns scouts on death
            if (e.type === ET_CARRIER) {
              for (let s = 0; s < 3; s++) {
                spawnEnemy(g, ET_SCOUT, e.x + (s - 1) * 20, e.y, "galaga");
              }
            }
            g.enemies.splice(ei, 1);
            audioRef.current?.enemyHit();
          } else {
            spawnExplosion(g, b.x, b.y, def.color, 4);
            audioRef.current?.enemyHit();
          }
          break;
        }
      }

      // Bullet vs boss
      if (!hit && g.boss && g.boss.alive) {
        if (aabb(b, { x: g.boss.x, y: g.boss.y, w: g.boss.w, h: g.boss.h })) {
          hit = true;
          let dmgMult = 1;
          // Weak points
          if (g.boss.bossIndex === 0) {
            // Antenna (top center)
            const acx = g.boss.x + g.boss.w / 2;
            if (Math.abs(b.x - acx) < 10 && b.y < g.boss.y + 15) dmgMult = 2;
          }
          if (g.boss.bossIndex === 3 && g.boss.eyeOpen) {
            const ecx = g.boss.x + g.boss.w / 2;
            const ecy = g.boss.y + g.boss.h / 2;
            if (Math.abs(b.x - ecx) < 15 && Math.abs(b.y - ecy) < 15) dmgMult = 3;
          }
          // Turret damage for HIVE-01
          if (g.boss.bossIndex === 1) {
            if (b.x < g.boss.x + 45 && g.boss.turretHpL > 0) {
              g.boss.turretHpL -= b.dmg;
            } else if (b.x > g.boss.x + g.boss.w - 45 && g.boss.turretHpR > 0) {
              g.boss.turretHpR -= b.dmg;
            }
          }
          g.boss.hp -= b.dmg * dmgMult;
          g.boss.damageFlash = 5;
          spawnExplosion(g, b.x, b.y, "#ffffff", 3);
          if (g.boss.hp <= 0) g.boss.alive = false;
          audioRef.current?.bossHit();
        }
      }

      if (hit) {
        g.playerBullets.splice(bi, 1);
      }
    }

    // ---- Collision: homing missiles vs enemies/boss ----
    for (let mi = g.homingMissiles.length - 1; mi >= 0; mi--) {
      const m = g.homingMissiles[mi];
      let hit = false;

      for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
        const e = g.enemies[ei];
        const def = ENEMY_DEFS[e.type];
        if (aabb(m, { x: e.x, y: e.y, w: def.w, h: def.h })) {
          hit = true;
          e.hp -= m.dmg;
          if (e.hp <= 0) {
            g.score += def.points * g.combo;
            g.totalEnemiesKilled++;
            g.comboKills++;
            updateCombo(g);
            spawnExplosion(g, e.x + def.w / 2, e.y + def.h / 2, def.color, 10);
            if (e.hasPowerUp) dropPowerUp(g, e.x + def.w / 2, e.y + def.h / 2);
            if (e.type === ET_CARRIER) {
              for (let s = 0; s < 3; s++) {
                spawnEnemy(g, ET_SCOUT, e.x + (s - 1) * 20, e.y, "galaga");
              }
            }
            g.enemies.splice(ei, 1);
          }
          break;
        }
      }

      if (!hit && g.boss && g.boss.alive) {
        if (aabb(m, { x: g.boss.x, y: g.boss.y, w: g.boss.w, h: g.boss.h })) {
          hit = true;
          g.boss.hp -= m.dmg;
          g.boss.damageFlash = 5;
          if (g.boss.hp <= 0) g.boss.alive = false;
        }
      }

      if (hit) {
        spawnExplosion(g, m.x, m.y, "#ffaa00", 6);
        g.homingMissiles.splice(mi, 1);
      }
    }

    // ---- Star invincibility contact damage ----
    if (g.starTimer > 0 && !g.dead) {
      const pBox = { x: g.playerX, y: g.playerY, w: PLAYER_W, h: PLAYER_H };
      for (let i = g.enemies.length - 1; i >= 0; i--) {
        const e = g.enemies[i];
        const def = ENEMY_DEFS[e.type];
        if (aabb(pBox, { x: e.x, y: e.y, w: def.w, h: def.h })) {
          g.score += def.points * g.combo;
          g.totalEnemiesKilled++;
          g.comboKills++;
          updateCombo(g);
          spawnExplosion(g, e.x + def.w / 2, e.y + def.h / 2, "#ffd700", 12);
          if (e.hasPowerUp) dropPowerUp(g, e.x + def.w / 2, e.y + def.h / 2);
          g.enemies.splice(i, 1);
        }
      }
    }

    // ---- Collision: enemy bullets vs player ----
    if (!g.dead && g.invulnTimer <= 0 && g.starTimer <= 0 && !g.bombInvuln) {
      const hitBox = {
        x: g.playerX + (PLAYER_W - HIT_W) / 2,
        y: g.playerY + (PLAYER_H - HIT_H) / 2,
        w: HIT_W, h: HIT_H,
      };
      for (let i = g.enemyBullets.length - 1; i >= 0; i--) {
        if (aabb(hitBox, g.enemyBullets[i])) {
          g.enemyBullets.splice(i, 1);
          if (playerDie(g)) break;
        }
      }
    }

    // ---- Collision: enemies vs player ----
    if (!g.dead && g.invulnTimer <= 0 && g.starTimer <= 0 && !g.bombInvuln) {
      const hitBox = {
        x: g.playerX + (PLAYER_W - HIT_W) / 2,
        y: g.playerY + (PLAYER_H - HIT_H) / 2,
        w: HIT_W, h: HIT_H,
      };
      for (let i = 0; i < g.enemies.length; i++) {
        const e = g.enemies[i];
        const def = ENEMY_DEFS[e.type];
        if (aabb(hitBox, { x: e.x, y: e.y, w: def.w, h: def.h })) {
          playerDie(g);
          break;
        }
      }
    }

    // ---- Collision: boss vs player ----
    if (!g.dead && g.boss && g.boss.alive && !g.boss.entering && g.invulnTimer <= 0 && g.starTimer <= 0 && !g.bombInvuln) {
      const hitBox = {
        x: g.playerX + (PLAYER_W - HIT_W) / 2,
        y: g.playerY + (PLAYER_H - HIT_H) / 2,
        w: HIT_W, h: HIT_H,
      };
      if (aabb(hitBox, { x: g.boss.x, y: g.boss.y, w: g.boss.w, h: g.boss.h })) {
        playerDie(g);
      }
    }

    // ---- Collision: player vs power-ups ----
    if (!g.dead) {
      const pBox = { x: g.playerX, y: g.playerY, w: PLAYER_W, h: PLAYER_H };
      for (let i = g.powerUps.length - 1; i >= 0; i--) {
        if (aabb(pBox, g.powerUps[i])) {
          applyPowerUp(g, g.powerUps[i].type);
          spawnExplosion(g, g.powerUps[i].x + 10, g.powerUps[i].y + 10, PU_COLORS[g.powerUps[i].type], 8);
          g.powerUps.splice(i, 1);
          audioRef.current?.powerUp();
        }
      }
    }

    // ---- Update power-ups ----
    for (let i = g.powerUps.length - 1; i >= 0; i--) {
      g.powerUps[i].y += POWERUP_FALL_SPEED;
      if (g.powerUps[i].y > CH + 20) {
        g.powerUps.splice(i, 1);
      }
    }

    // ---- Update particles ----
    updateParticles(g);

    // ---- Update stars ----
    updateStars(g);

    // ---- Exhaust particles ----
    if (!g.dead && g.frame % 3 === 0) {
      spawnExhaust(g);
    }

    // ---- Screen shake decay ----
    if (g.screenShake > 0) g.screenShake *= 0.9;
    if (g.screenShake < 0.5) g.screenShake = 0;

    // ---- Phase/wave management ----
    if (!g.phaseConfig.isBoss && !g.phaseBossActive && !g.phaseComplete) {
      if (g.phaseConfig.survivalMode) {
        g.survivalTimer++;
        // Continuous spawn
        if (g.frame % Math.max(15, 40 - g.world * 5) === 0) {
          spawnWave(g);
        }
        if (g.survivalTimer >= g.phaseConfig.survivalDuration) {
          completePhase(g);
        }
      } else {
        g.waveDelay--;
        if (g.waveDelay <= 0 && g.waveIndex < g.phaseConfig.waveCount) {
          // Check if previous wave is mostly cleared
          const aliveCount = g.enemies.length;
          if (aliveCount < 5 || g.waveIndex === 0) {
            spawnWave(g);
            g.waveIndex++;
            g.waveDelay = 300 + Math.floor(Math.random() * 120);
          }
        }

        // Check if all waves done and enemies cleared
        if (g.waveIndex >= g.phaseConfig.waveCount && g.enemies.length === 0) {
          completePhase(g);
        }
      }
    }

    // ---- Render ----
    renderFrame(ctx, g);
  }, []);

  function updateCombo(g) {
    if (g.comboKills >= 50) g.combo = 4;
    else if (g.comboKills >= 25) g.combo = 3;
    else if (g.comboKills >= 10) g.combo = 2;
    else g.combo = 1;
  }

  function completePhase(g) {
    g.phaseComplete = true;
    audioRef.current?.phaseComplete();

    // Phase bonus
    const phaseBonus = g.phaseDeathCount === 0 ? 1000 * g.phase : 500 * g.phase;
    g.score += phaseBonus;

    // World bonus
    const localPhase = ((g.phase - 1) % PHASES_PER_WORLD) + 1;
    if (localPhase === 5) {
      g.score += 5000 * (g.world + 1);
    }

    g.phaseTransitionTimer = 180; // 3s
  }

  function handleGameOver(g) {
    const stats = {
      score: g.score,
      phase: g.phase,
      enemies: g.totalEnemiesKilled,
      rank: getRank(g.score, false),
      best: 0,
      continues: g.continues,
    };

    try {
      const saved = localStorage.getItem("3invader_best");
      if (saved) stats.best = parseInt(saved, 10) || 0;
    } catch {}
    if (g.score > stats.best) {
      stats.best = g.score;
      try { localStorage.setItem("3invader_best", String(g.score)); } catch {}
    }

    setFinalStats(stats);
    audioRef.current?.gameOver();

    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pontos: g.score,
        jogo: "3invader",
        metadata: {
          fase: g.phase,
          inimigosDestruidos: g.totalEnemiesKilled,
          rank: stats.rank,
        },
      }),
    }).catch(() => {});

    window.gtag?.("event", "game_end", {
      game_name: "3invader",
      score: g.score,
      phase: g.phase,
    });

    if (g.continues > 0) {
      setContinueCount(10);
      setScreen("gameover");
    } else {
      setScreen("gameover");
    }
  }

  function handleVictory(g) {
    g.completed = true;
    g.score += 100000; // Completion bonus

    const stats = {
      score: g.score,
      phase: TOTAL_PHASES,
      enemies: g.totalEnemiesKilled,
      rank: getRank(g.score, true),
      best: 0,
      continues: g.continues,
    };

    try {
      const saved = localStorage.getItem("3invader_best");
      if (saved) stats.best = parseInt(saved, 10) || 0;
    } catch {}
    if (g.score > stats.best) {
      stats.best = g.score;
      try { localStorage.setItem("3invader_best", String(g.score)); } catch {}
    }

    setFinalStats(stats);
    audioRef.current?.phaseComplete();

    fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pontos: g.score,
        jogo: "3invader",
        metadata: {
          fase: TOTAL_PHASES,
          inimigosDestruidos: g.totalEnemiesKilled,
          rank: stats.rank,
          completed: true,
        },
      }),
    }).catch(() => {});

    window.gtag?.("event", "game_complete", {
      game_name: "3invader",
      score: g.score,
    });

    setScreen("victory");
  }

  function updateParticles(g) {
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const p = g.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        g.particles.splice(i, 1);
      }
    }
  }

  function updateStars(g) {
    for (let i = 0; i < g.stars.length; i++) {
      const s = g.stars[i];
      s.y += s.speed;
      if (s.y > CH) {
        s.y = -2;
        s.x = Math.random() * CW;
      }
    }
  }

  // ── Render frame ───────────────────────────────────────────────
  function renderFrame(ctx, g) {
    ctx.save();

    // Screen shake
    if (g.screenShake > 0) {
      const sx = (Math.random() - 0.5) * g.screenShake;
      const sy = (Math.random() - 0.5) * g.screenShake;
      ctx.translate(sx, sy);
    }

    // Background
    drawWorldBg(ctx, g.world, g.frame, 0);

    // Stars
    drawStars(ctx, g.stars, 1);

    // Power-ups
    for (let i = 0; i < g.powerUps.length; i++) {
      drawPowerUp(ctx, g.powerUps[i], g.frame);
    }

    // Enemies
    for (let i = 0; i < g.enemies.length; i++) {
      drawEnemy(ctx, g.enemies[i], g.frame);
    }

    // Boss
    if (g.boss && g.boss.alive) {
      drawBoss(ctx, g.boss, g.frame);
    }

    // Enemy bullets
    for (let i = 0; i < g.enemyBullets.length; i++) {
      drawEnemyBullet(ctx, g.enemyBullets[i]);
    }

    // Player bullets
    for (let i = 0; i < g.playerBullets.length; i++) {
      drawPlayerBullet(ctx, g.playerBullets[i]);
    }

    // Homing missiles
    for (let i = 0; i < g.homingMissiles.length; i++) {
      drawHomingMissile(ctx, g.homingMissiles[i], g.frame);
    }

    // Laser beam
    if (g.laserTimer > 0 && !g.dead) {
      drawLaser(ctx, g.playerX + PLAYER_W / 2, g.playerY, g.frame);
    }

    // Player
    if (!g.dead) {
      drawPlayerShip(ctx, g.playerX, g.playerY, g.playerTilt, g.invulnTimer > 0, g.frame);
      if (g.shieldTimer > 0) {
        drawShield(ctx, g.playerX, g.playerY, g.frame);
      }
      if (g.starTimer > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(255,215,0,${0.5 + 0.3 * Math.sin(g.frame * 0.15)})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(g.playerX + PLAYER_W / 2, g.playerY + PLAYER_H / 2, PLAYER_W, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Particles
    for (let i = 0; i < g.particles.length; i++) {
      drawParticle(ctx, g.particles[i]);
    }

    // Bomb effect
    drawBombEffect(ctx, g.bombEffect);

    // Scanlines
    drawScanlines(ctx);

    // HUD
    drawHUD(ctx, g);

    // Boss warning
    if (g.bossWarning > 0) {
      const flash = Math.floor(g.bossWarning / 15) % 2 === 0;
      if (flash) {
        ctx.save();
        ctx.fillStyle = "rgba(255,0,0,0.15)";
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = "#ff4444";
        ctx.font = "bold 14px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 20;
        ctx.fillText("ALERTA: INIMIGO DETECTADO", CW / 2, CH / 2 - 20);
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillText(BOSS_DEFS[g.world]?.name || "BOSS", CW / 2, CH / 2 + 10);
        ctx.restore();
      }
    }

    // Phase transition overlay
    if (g.phaseTransitionTimer > 0 && g.phaseComplete) {
      ctx.save();
      ctx.fillStyle = "rgba(5,5,16,0.6)";
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 14px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "#22c55e";
      ctx.shadowBlur = 15;
      ctx.fillText(`FASE ${g.phase} COMPLETA!`, CW / 2, CH / 2 - 20);
      ctx.fillStyle = "#ffd700";
      ctx.font = "10px 'Press Start 2P', monospace";
      const bonus = g.phaseDeathCount === 0 ? 1000 * g.phase : 500 * g.phase;
      ctx.fillText(`BONUS: +${bonus.toLocaleString()}`, CW / 2, CH / 2 + 10);
      ctx.restore();
    }

    // World briefing overlay
    if (g.showingWorldBriefing) {
      ctx.save();
      ctx.fillStyle = "rgba(5,5,16,0.9)";
      ctx.fillRect(0, 0, CW, CH);
      const wColors = WORLD_BG_COLORS[g.world];
      ctx.fillStyle = "#4a5568";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`MUNDO ${g.world + 1}`, CW / 2, CH / 2 - 50);
      ctx.fillStyle = wColors?.[2] || ACCENT;
      ctx.font = "bold 16px 'Press Start 2P', monospace";
      ctx.shadowColor = wColors?.[2] || ACCENT;
      ctx.shadowBlur = 20;
      ctx.fillText(WORLD_NAMES[g.world] || "???", CW / 2, CH / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#8892b0";
      ctx.font = "10px 'Fira Code', monospace";
      ctx.fillText(WORLD_TAGS[g.world] || "", CW / 2, CH / 2 + 15);
      ctx.restore();
    }

    // Survival timer
    if (g.phaseConfig?.survivalMode && !g.phaseComplete) {
      const remaining = Math.ceil((g.phaseConfig.survivalDuration - g.survivalTimer) / 60);
      ctx.save();
      ctx.fillStyle = "#ff4444";
      ctx.font = "bold 12px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${remaining}s`, CW / 2, 50);
      ctx.restore();
    }

    // Tutorial text for phase 1
    if (g.phase === 1 && g.phaseTimer < 600) {
      ctx.save();
      const tutAlpha = Math.max(0, 1 - g.phaseTimer / 600);
      ctx.textAlign = "center";
      let tutText = "";
      if (g.phaseTimer < 200) tutText = "SETAS/WASD: MOVER";
      else if (g.phaseTimer < 400) tutText = "N/ESPACO: ATIRAR";
      else tutText = "M: BOMBA NOVA";
      // Background box
      ctx.font = "11px 'Press Start 2P', monospace";
      const tw = ctx.measureText(tutText).width;
      ctx.fillStyle = `rgba(0,0,0,${0.7 * tutAlpha})`;
      ctx.fillRect(CW / 2 - tw / 2 - 16, CH / 2 - 16, tw + 32, 32);
      ctx.strokeStyle = `rgba(0,240,255,${0.6 * tutAlpha})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(CW / 2 - tw / 2 - 16, CH / 2 - 16, tw + 32, 32);
      // Text with glow
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(255,255,255,${tutAlpha})`;
      ctx.fillText(tutText, CW / 2, CH / 2 + 4);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Continue countdown ─────────────────────────────────────────
  useEffect(() => {
    if (screen !== "gameover" || !finalStats || finalStats.continues <= 0) return;
    if (continueCount <= 0) return;
    const timer = setInterval(() => {
      setContinueCount(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, finalStats, continueCount]);

  // ── Start game loop ────────────────────────────────────────────
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

  // ── Keyboard input ─────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (screenRef.current === "paused") {
        if (e.key === "p" || e.key === "P" || e.key === "Escape") {
          e.preventDefault();
          setScreen("playing");
        }
        return;
      }
      if (screenRef.current !== "playing") return;
      const gameKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "A", "d", "D", "w", "W", "s", "S", "n", "N", "m", "M", " ", "p", "P", "Escape"];
      if (gameKeys.includes(e.key)) {
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

  // ── Touch input ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getScaledPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) / gameScale,
        y: (touch.clientY - rect.top) / gameScale,
      };
    };

    const onTouchStart = (e) => {
      if (screenRef.current !== "playing") return;
      e.preventDefault();
      const pos = getScaledPos(e);
      const g = gameRef.current;
      if (g) {
        touchRef.current = {
          active: true,
          startX: pos.x,
          startY: pos.y,
          currentX: pos.x,
          currentY: pos.y,
          playerStartX: g.playerX,
          playerStartY: g.playerY,
        };
      }
    };

    const onTouchMove = (e) => {
      if (screenRef.current !== "playing") return;
      e.preventDefault();
      if (!touchRef.current.active) return;
      const pos = getScaledPos(e);
      touchRef.current.currentX = pos.x;
      touchRef.current.currentY = pos.y;
    };

    const onTouchEnd = (e) => {
      e.preventDefault();
      touchRef.current.active = false;
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [gameScale]);

  // ── Cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Start loop when playing ────────────────────────────────────
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

  // ── Menu/gameover background animation ─────────────────────────
  useEffect(() => {
    if (screen !== "menu" && screen !== "gameover" && screen !== "victory" && screen !== "howtoplay" && screen !== "highscores") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const stars = initStars(80);
    let animId;

    const drawMenuBg = () => {
      ctx.fillStyle = "#020824";
      ctx.fillRect(0, 0, CW, CH);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.y += s.speed * 0.5;
        if (s.y > CH) { s.y = 0; s.x = Math.random() * CW; }
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.layer === 2 ? "#aaddff" : "#ffffff";
        ctx.fillRect(s.x, s.y, s.size, s.size);
        ctx.restore();
      }
      animId = requestAnimationFrame(drawMenuBg);
    };
    animId = requestAnimationFrame(drawMenuBg);
    return () => cancelAnimationFrame(animId);
  }, [screen]);

  // ── Screen transitions ─────────────────────────────────────────
  const initAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new InvaderAudio();
    }
    audioRef.current.init();
    audioRef.current.muted = muted;
  };

  const handleMenuStart = () => {
    if (user) {
      // Check if intro has been seen
      let introSeen = false;
      try { introSeen = !!localStorage.getItem("3invader_intro_seen"); } catch {}
      if (!introSeen) {
        initAudio();
        setIntroScreen(0);
        setIntroCharIndex(0);
        setIntroText("");
        setScreen("intro");
        return;
      }
      initAudio();
      playCountRef.current++;
      initGame();
      setScreen("playing");
      window.gtag?.("event", "game_start", { game_name: "3invader" });
    } else {
      setScreen("register");
    }
  };

  const handleRegister = async (userData) => {
    const jogador = await register(userData);
    if (jogador && !jogador.error) {
      // Check intro
      let introSeen = false;
      try { introSeen = !!localStorage.getItem("3invader_intro_seen"); } catch {}
      if (!introSeen) {
        initAudio();
        setIntroScreen(0);
        setIntroCharIndex(0);
        setIntroText("");
        setScreen("intro");
        return;
      }
      initAudio();
      playCountRef.current++;
      initGame();
      setScreen("playing");
      window.gtag?.("event", "game_start", { game_name: "3invader" });
    }
  };

  const handleRestart = () => {
    initAudio();
    playCountRef.current++;
    initGame();
    setScreen("playing");
    window.gtag?.("event", "game_start", { game_name: "3invader" });
  };

  const handleContinue = () => {
    if (!finalStats || finalStats.continues <= 0) return;
    const g = gameRef.current;
    initAudio();
    initGame(g?.phase || 1, 3, g?.score || 0, 5, (g?.continues || 3) - 1);
    setScreen("playing");
  };

  const handleViewIntro = () => {
    initAudio();
    setIntroScreen(0);
    setIntroCharIndex(0);
    setIntroText("");
    setScreen("intro");
  };

  const handleResume = () => {
    setScreen("playing");
  };

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  };

  if (!checkedCookie) return null;

  // ── Render ─────────────────────────────────────────────────────
  const isPlaying = screen === "playing" || screen === "paused";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020824",
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
        @keyframes invPulse {
          0%, 100% { text-shadow: 0 0 20px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.2); }
          50% { text-shadow: 0 0 30px rgba(0,240,255,0.8), 0 0 60px rgba(0,240,255,0.3); }
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
        @keyframes bossFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes typewriter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Top ad */}
      {!isPlaying && screen !== "intro" && (
        <AdBanner slot="3invader_top" style={{ marginBottom: 12, maxWidth: CW }} />
      )}

      {!isPlaying && screen !== "menu" && screen !== "intro" && screen !== "howtoplay" && screen !== "highscores" && (
        <>
          <h1
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 18,
              color: ACCENT,
              textShadow: `0 0 20px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.15)`,
              marginBottom: 8,
              letterSpacing: 3,
              textAlign: "center",
            }}
          >
            3INVADER
          </h1>
          <p
            style={{
              color: "#4a5568",
              fontSize: 9,
              marginBottom: 14,
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            DEFENDA A HUMANIDADE
          </p>
        </>
      )}

      <div
        style={{
          width: CW * gameScale,
          height: CH * gameScale,
          touchAction: isPlaying ? "none" : "auto",
        }}
      >
        <div
          style={{
            width: CW,
            height: CH,
            position: "relative",
            border: `2px solid rgba(0,240,255,0.3)`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: `0 0 30px rgba(0,240,255,0.1)`,
            transform: `scale(${gameScale})`,
            transformOrigin: "top left",
          }}
        >
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            style={{ display: "block", width: CW, height: CH }}
          />

          {/* ── INTRO CINEMATIC ────────────────────────── */}
          {screen === "intro" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(2,8,36,0.95)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: 30,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 12,
                  color: "#00ff88",
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                  maxWidth: 400,
                  textShadow: "0 0 5px rgba(0,255,136,0.5)",
                }}
              >
                {introText}
                <span style={{ animation: "bossFlash 0.8s infinite" }}>_</span>
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                  color: "#4a5568",
                }}
              >
                TOQUE OU PRESSIONE PARA CONTINUAR
              </div>
            </div>
          )}

          {/* ── MENU ───────────────────────────────────── */}
          {screen === "menu" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(2,8,36,0.85)",
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
                  fontSize: 28,
                  color: ACCENT,
                  animation: "invPulse 2s ease-in-out infinite",
                  marginBottom: 4,
                  textAlign: "center",
                  lineHeight: 1.3,
                  letterSpacing: 4,
                }}
              >
                3INVADER
              </h1>
              <p
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 10,
                  color: "#4a5568",
                  marginBottom: 20,
                }}
              >
                ARROW-7 vs 3I/ATLAS
              </p>

              {/* Ship icon */}
              <div style={{ animation: "menuFloat 2s ease-in-out infinite", marginBottom: 24 }}>
                <svg width="40" height="48" viewBox="0 0 40 48">
                  <polygon points="20,0 38,28 30,40 10,40 2,28" fill="#2255aa" opacity="0.9" />
                  <polygon points="20,5 30,24 10,24" fill="#4488cc" opacity="0.7" />
                  <ellipse cx="20" cy="16" rx="3" ry="4" fill="#00ddff" opacity="0.9" />
                  <polygon points="15,40 20,48 25,40" fill="#00eeff" opacity="0.6" />
                </svg>
              </div>

              <button
                onClick={handleMenuStart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 13,
                  color: "#020824",
                  background: ACCENT,
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 36px",
                  cursor: "pointer",
                  boxShadow: `0 0 20px rgba(0,240,255,0.4)`,
                  letterSpacing: 2,
                  marginBottom: 12,
                }}
              >
                INICIAR MISSAO
              </button>

              <button
                onClick={() => setScreen("howtoplay")}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: ACCENT,
                  background: "transparent",
                  border: `1px solid ${ACCENT}44`,
                  borderRadius: 6,
                  padding: "8px 24px",
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                INSTRUCOES
              </button>

              <button
                onClick={handleViewIntro}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#666",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  padding: "8px 24px",
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                HISTORIA
              </button>

              <button
                onClick={() => setScreen("highscores")}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#666",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  padding: "8px 24px",
                  cursor: "pointer",
                  marginBottom: 16,
                }}
              >
                HIGH SCORES
              </button>

              {/* Rank display */}
              {(() => {
                let best = 0;
                try { best = parseInt(localStorage.getItem("3invader_best"), 10) || 0; } catch {}
                if (best > 0) {
                  return (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                        MELHOR: {best.toLocaleString()}
                      </div>
                      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: "#ffd700" }}>
                        {getRank(best, false)}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div style={{
                position: "absolute",
                bottom: 12,
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 7,
                color: "#8899aa",
                textAlign: "center",
                background: "rgba(0,0,0,0.5)",
                padding: "4px 10px",
                borderRadius: 4,
                border: "1px solid rgba(0,240,255,0.2)",
              }}>
                SETAS/WASD: MOVER | N: ATIRAR | M: BOMBA
              </div>
            </div>
          )}

          {/* ── REGISTER ───────────────────────────────── */}
          {screen === "register" && (
            <RegisterModal
              onRegister={handleRegister}
              loading={registering}
              jogoNome="3INVADER"
              accentColor={ACCENT}
            />
          )}

          {/* ── HOW TO PLAY ────────────────────────────── */}
          {screen === "howtoplay" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(2,8,36,0.95)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                zIndex: 100,
                padding: "20px 16px",
                overflowY: "auto",
              }}
            >
              <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: ACCENT, marginBottom: 16 }}>
                INSTRUCOES
              </h2>

              <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 11, color: "#8892b0", lineHeight: 1.8, maxWidth: 420 }}>
                <div style={{ color: "#ffd700", fontWeight: "bold", marginBottom: 4 }}>CONTROLES (TECLADO)</div>
                <div>Setas / WASD: Mover a nave</div>
                <div>N / Espaco: Atirar (segurar)</div>
                <div>M: Bomba NOVA</div>
                <div>P / ESC: Pausar</div>

                <div style={{ color: "#ffd700", fontWeight: "bold", marginTop: 12, marginBottom: 4 }}>CONTROLES (MOBILE)</div>
                <div>Arrastar: Mover (auto-tiro)</div>
                <div>Botao BOMBA: Bomba NOVA</div>

                <div style={{ color: "#ffd700", fontWeight: "bold", marginTop: 12, marginBottom: 4 }}>POWER-UPS</div>
                <div><span style={{ color: "#ef4444" }}>P</span>: +1 nivel de tiro (max 5)</div>
                <div><span style={{ color: "#3b82f6" }}>B</span>: +1 bomba (max 9)</div>
                <div><span style={{ color: "#22c55e" }}>S</span>: Escudo (10s)</div>
                <div><span style={{ color: "#eab308" }}>V</span>: Velocidade +50% (12s)</div>
                <div><span style={{ color: "#a855f7" }}>L</span>: Laser penetrante (8s)</div>
                <div><span style={{ color: "#ffd700" }}>{"\u2605"}</span>: Invencibilidade (5s)</div>
                <div><span style={{ color: "#ec4899" }}>1UP</span>: Vida extra</div>

                <div style={{ color: "#ffd700", fontWeight: "bold", marginTop: 12, marginBottom: 4 }}>MISSAO</div>
                <div>25 fases em 5 mundos</div>
                <div>Cada mundo termina com um BOSS</div>
                <div>Da orbita terrestre ate Jupiter</div>
                <div>Destrua 3I/ATLAS para salvar a humanidade!</div>
              </div>

              <button
                onClick={() => setScreen("menu")}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 10,
                  color: ACCENT,
                  background: "transparent",
                  border: `1px solid ${ACCENT}44`,
                  borderRadius: 6,
                  padding: "10px 24px",
                  cursor: "pointer",
                  marginTop: 20,
                }}
              >
                VOLTAR
              </button>
            </div>
          )}

          {/* ── HIGH SCORES ────────────────────────────── */}
          {screen === "highscores" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(2,8,36,0.95)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
              }}
            >
              <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: ACCENT, marginBottom: 20 }}>
                HIGH SCORES
              </h2>

              {(() => {
                let best = 0;
                try { best = parseInt(localStorage.getItem("3invader_best"), 10) || 0; } catch {}
                return (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#4a5568", marginBottom: 8 }}>
                      SUA MELHOR PONTUACAO
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 24, color: "#ffd700", textShadow: "0 0 10px rgba(255,215,0,0.5)", marginBottom: 12 }}>
                      {best.toLocaleString()}
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: ACCENT }}>
                      {getRank(best, false)}
                    </div>
                  </div>
                );
              })()}

              <div style={{ marginTop: 24, fontFamily: "'Fira Code', monospace", fontSize: 10, color: "#4a5568", textAlign: "center", lineHeight: 2 }}>
                <div style={{ color: "#ffd700" }}>RANKS:</div>
                <div>0-10K: Cadete</div>
                <div>10K-50K: Tenente</div>
                <div>50K-150K: Capitao</div>
                <div>150K-300K: Comandante</div>
                <div>300K+: Almirante</div>
                <div style={{ color: "#ffd700" }}>Completar: Heroi da Humanidade</div>
              </div>

              <button
                onClick={() => setScreen("menu")}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 10,
                  color: ACCENT,
                  background: "transparent",
                  border: `1px solid ${ACCENT}44`,
                  borderRadius: 6,
                  padding: "10px 24px",
                  cursor: "pointer",
                  marginTop: 20,
                }}
              >
                VOLTAR
              </button>
            </div>
          )}

          {/* ── PAUSED ─────────────────────────────────── */}
          {screen === "paused" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(2,8,36,0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
              }}
            >
              <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: ACCENT, marginBottom: 24 }}>
                PAUSADO
              </h2>
              <button
                onClick={handleResume}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12,
                  color: "#020824",
                  background: ACCENT,
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 32px",
                  cursor: "pointer",
                  boxShadow: `0 0 20px rgba(0,240,255,0.4)`,
                  letterSpacing: 2,
                  marginBottom: 12,
                }}
              >
                CONTINUAR
              </button>
              <button
                onClick={() => { setScreen("menu"); }}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#666",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  padding: "8px 20px",
                  cursor: "pointer",
                }}
              >
                MENU
              </button>
              <div style={{ marginTop: 16, fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#4a5568" }}>
                P / ESC: RETOMAR
              </div>
            </div>
          )}

          {/* ── GAME OVER ──────────────────────────────── */}
          {screen === "gameover" && finalStats && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(2,8,36,0.92)",
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
                  marginBottom: 20,
                }}
              >
                GAME OVER
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, alignItems: "center" }}>
                <div style={{ textAlign: "center", animation: "scoreCount 0.5s ease-out" }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                    PONTOS
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: ACCENT, textShadow: `0 0 10px rgba(0,240,255,0.5)` }}>
                    {finalStats.score.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 20 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>FASE</div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#39ff14" }}>{finalStats.phase}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>INIMIGOS</div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ffaa00" }}>{finalStats.enemies}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>RANK</div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#ffd700" }}>{finalStats.rank}</div>
                  </div>
                </div>

                <div style={{ textAlign: "center", marginTop: 4 }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>MELHOR</div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: "#e879f9", textShadow: "0 0 8px rgba(232,121,249,0.4)" }}>
                    {finalStats.best.toLocaleString()}
                  </div>
                </div>
              </div>

              {finalStats.continues > 0 && continueCount > 0 && (
                <button
                  onClick={handleContinue}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 11,
                    color: "#020824",
                    background: "#ffd700",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 28px",
                    cursor: "pointer",
                    boxShadow: "0 0 15px rgba(255,215,0,0.4)",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  CONTINUAR ({continueCount}s)
                </button>
              )}

              <button
                onClick={handleRestart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 11,
                  color: "#020824",
                  background: ACCENT,
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 28px",
                  cursor: "pointer",
                  boxShadow: `0 0 15px rgba(0,240,255,0.4)`,
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                REINICIAR
              </button>

              <button
                onClick={() => setScreen("menu")}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#666",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  padding: "8px 20px",
                  cursor: "pointer",
                }}
              >
                MENU
              </button>

              <AdBanner slot="3invader_between" style={{ marginTop: 12, maxWidth: 300 }} />
            </div>
          )}

          {/* ── VICTORY ────────────────────────────────── */}
          {screen === "victory" && finalStats && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(2,8,36,0.92)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                animation: "fadeSlideIn 0.6s ease-out",
              }}
            >
              <h2
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 18,
                  color: "#ffd700",
                  textShadow: "0 0 30px rgba(255,215,0,0.6), 0 0 60px rgba(255,215,0,0.3)",
                  marginBottom: 8,
                  animation: "invPulse 1.5s ease-in-out infinite",
                }}
              >
                VITORIA!
              </h2>

              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: "#ffd700", marginBottom: 8 }}>
                3I/ATLAS DESTRUIDO!
              </div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#22c55e", marginBottom: 16 }}>
                A HUMANIDADE ESTA SALVA
              </div>

              <div style={{ textAlign: "center", animation: "scoreCount 0.5s ease-out", marginBottom: 12 }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>PONTUACAO FINAL</div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 24, color: "#ffd700", textShadow: "0 0 15px rgba(255,215,0,0.5)" }}>
                  {finalStats.score.toLocaleString()}
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>INIMIGOS</div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ffaa00" }}>{finalStats.enemies}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>RANK</div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ffd700" }}>{finalStats.rank}</div>
                </div>
              </div>

              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#a855f7", marginBottom: 16 }}>
                +100,000 BONUS FINAL
              </div>

              <button
                onClick={handleRestart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12,
                  color: "#020824",
                  background: "#ffd700",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 32px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(255,215,0,0.4)",
                  letterSpacing: 2,
                  marginBottom: 8,
                }}
              >
                JOGAR NOVAMENTE
              </button>

              <button
                onClick={() => setScreen("menu")}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#666",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  padding: "8px 20px",
                  cursor: "pointer",
                }}
              >
                MENU
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile controls */}
      {screen === "playing" && (
        <div
          data-allow-touch
          style={{
            width: CW * gameScale,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 8,
            padding: "0 4px",
          }}
        >
          <button
            onClick={toggleMute}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
              color: muted ? "#ff4444" : "#4a5568",
              background: "transparent",
              border: `1px solid ${muted ? "#ff444444" : "#4a556844"}`,
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {muted ? "SOM OFF" : "SOM ON"}
          </button>

          <button
            data-allow-touch
            onTouchStart={(e) => {
              e.stopPropagation();
              const g = gameRef.current;
              if (g) useBomb(g);
            }}
            onClick={() => {
              const g = gameRef.current;
              if (g) useBomb(g);
            }}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 11,
              color: "#3b82f6",
              background: "rgba(59,130,246,0.15)",
              border: "2px solid #3b82f6",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            BOMBA
          </button>

          <button
            data-allow-touch
            onClick={() => {
              keysRef.current.add("Escape");
              setTimeout(() => keysRef.current.delete("Escape"), 100);
            }}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
              color: "#4a5568",
              background: "transparent",
              border: "1px solid #4a556844",
              borderRadius: 6,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            PAUSA
          </button>
        </div>
      )}

      {user && isPlaying && (
        <div
          style={{
            width: CW * gameScale,
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
            padding: "0 4px",
          }}
        >
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Fira Code', monospace" }}>
            {user.nome}
          </span>
        </div>
      )}

      <AdBanner slot="3invader_bottom" style={{ marginTop: 16, maxWidth: CW }} />
    </div>
  );
}
