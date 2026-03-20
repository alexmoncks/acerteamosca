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
const ACCENT = "#00f0ff";
const PADDLE_W = 96;
const PADDLE_H = 16;
const PADDLE_Y = CH - 40;
const BALL_R = 6;
const BALL_SPEED = 5;
const BRICK_COLS = 12;
const BRICK_W = 36;
const BRICK_H = 16;
const BRICK_GAP = 2;
const GRID_OFFSET_X = (CW - BRICK_COLS * (BRICK_W + BRICK_GAP)) / 2;
const GRID_OFFSET_Y = 60;
const MAX_PARTICLES = 200;
const CAPSULE_SPEED = 1.5;
const MAX_LIVES = 5;
const TOTAL_PHASES = 25;

// Brick types
const BT_NORMAL = 0;
const BT_SILVER = 1;
const BT_GOLD = 2;
const BT_INDESTRUCTIBLE = 3;
const BT_POWERUP = 4;
const BT_EXPLOSIVE = 5;

// Power-up types
const PU_TRIPLE = 0;
const PU_STICKY = 1;
const PU_CANNON = 2;
const PU_BIG = 3;
const PU_FIRE = 4;
const PU_SHIELD = 5;
const PU_LIFE = 6;

const PU_COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#eab308", "#f97316", "#a855f7", "#ec4899"];
const PU_NAMES = ["TRIPLE", "STICKY", "CANNON", "BIG", "FIRE", "SHIELD", "LIFE"];
const PU_DURATIONS = [Infinity, 15000, 20000, 12000, 10000, Infinity, 0];

// Enemy types
const ET_DRONE = 0;
const ET_ZIGZAG = 1;
const ET_TANK = 2;
const ET_KAMIKAZE = 3;

const ENEMY_HP = [1, 1, 2, 1];
const ENEMY_PTS = [50, 75, 100, 60];
const ENEMY_COLORS = ["#22d3ee", "#a855f7", "#6b7280", "#ef4444"];

// World configs
const WORLD_NAMES = ["INICIO", "INVASAO", "ARSENAL", "CAOS", "FINAL"];
const WORLD_TAGS = [
  "Aprenda os controles",
  "Os inimigos chegaram",
  "Poder de fogo total",
  "Sobreviva ao caos",
  "O desafio final"
];
const WORLD_BG = [
  ["#050520", "#0a1a3a", "#00f0ff"],
  ["#100520", "#2a0a3a", "#b026ff"],
  ["#051005", "#0a3a1a", "#39ff14"],
  ["#200505", "#3a1a0a", "#ff4444"],
  ["#050505", "#1a1a0a", "#ffd700"]
];

// Row colors for normal bricks (rainbow)
const ROW_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
  "#10b981", "#f43f5e", "#a855f7", "#14b8a6",
  "#f59e0b", "#6366f1"
];

// ── Audio Engine ──────────────────────────────────────────────────────
class BrickAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

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
    const sz = this.ctx.sampleRate * dur;
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

  paddleHit() { this._osc("triangle", 200, 0.1, 0.12); }
  brickHit(type) {
    const pitches = [600, 800, 400, 300, 600, 500];
    this._osc("square", pitches[type] || 600, 0.05, 0.1);
  }
  brickDestroy() {
    this._noise(0.08, 0.1);
    this._sweep(800, 200, 0.15, 0.08);
  }
  silverHit() {
    this._osc("triangle", 800, 0.08, 0.1);
    this._noise(0.05, 0.06);
  }
  goldHit(hitsLeft) {
    this._osc("sine", 400 + (5 - hitsLeft) * 60, 0.2, 0.12);
  }
  goldDestroy() {
    this._osc("sine", 523, 0.1, 0.1, 0);
    this._osc("sine", 659, 0.1, 0.1, 0.08);
    this._osc("sine", 784, 0.1, 0.1, 0.16);
    this._osc("sine", 1047, 0.15, 0.1, 0.24);
    this._noise(0.3, 0.04, 0.1);
  }
  explosive() {
    this._noise(0.4, 0.15);
    this._osc("sine", 80, 0.4, 0.12);
  }
  powerUpCollect() {
    this._sweep(300, 900, 0.2, 0.12, "sine");
  }
  enemySpawn() {
    this._osc("square", 880, 0.05, 0.08, 0);
    this._osc("square", 1100, 0.05, 0.08, 0.06);
  }
  enemyDestroy() {
    this._noise(0.15, 0.1);
    this._sweep(600, 100, 0.2, 0.08);
  }
  ballLost() {
    this._sweep(600, 100, 0.3, 0.1, "sine");
  }
  lifeLost() {
    this._osc("square", 120, 0.2, 0.12, 0);
    this._osc("square", 100, 0.2, 0.12, 0.25);
    this._osc("square", 80, 0.3, 0.12, 0.5);
  }
  phaseComplete() {
    this._osc("sine", 523, 0.12, 0.12, 0);
    this._osc("sine", 659, 0.12, 0.12, 0.1);
    this._osc("sine", 784, 0.12, 0.12, 0.2);
    this._osc("sine", 1047, 0.2, 0.12, 0.3);
  }
  cannonShot() {
    this._sweep(1000, 200, 0.08, 0.08, "sawtooth");
  }
}

// ── Level Definitions ────────────────────────────────────────────────
function buildLevel(phase) {
  const bricks = [];
  const add = (col, row, type) => {
    if (col >= 0 && col < BRICK_COLS && row >= 0 && row < 16) {
      bricks.push({
        x: GRID_OFFSET_X + col * (BRICK_W + BRICK_GAP),
        y: GRID_OFFSET_Y + row * (BRICK_H + BRICK_GAP),
        w: BRICK_W, h: BRICK_H,
        type, hp: type === BT_SILVER ? 2 : type === BT_GOLD ? 5 : type === BT_INDESTRUCTIBLE ? 999 : 1,
        maxHp: type === BT_SILVER ? 2 : type === BT_GOLD ? 5 : 1,
        col, row
      });
    }
  };

  switch (phase) {
    case 1: // Tutorial: 5 rows, 12 cols, 60 normal
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 12; c++) add(c, r, BT_NORMAL);
      break;

    case 2: // V-pattern with silver tips
      for (let r = 0; r < 7; r++) {
        const start = r;
        const end = 11 - r;
        if (start <= end) {
          add(start, r, r === 6 ? BT_SILVER : BT_NORMAL);
          if (start !== end) add(end, r, r === 6 ? BT_SILVER : BT_NORMAL);
          for (let c = start + 1; c < end; c++) {
            add(c, r, (c === start + 1 || c === end - 1) ? BT_SILVER : BT_NORMAL);
          }
        }
      }
      break;

    case 3: // Diamond with power-ups center
      for (let r = 0; r < 8; r++) {
        const hw = r < 4 ? r + 1 : 8 - r;
        const cx = 5;
        for (let c = cx - hw; c <= cx + hw; c++) {
          if (c >= 0 && c < 12) {
            const dist = Math.abs(c - cx) + Math.abs(r - 3.5);
            if (dist < 2) add(c, r, BT_POWERUP);
            else if (Math.abs(c - cx) === hw || r === 0 || r === 7) add(c, r, BT_SILVER);
            else add(c, r, BT_NORMAL);
          }
        }
      }
      break;

    case 4: // Chess pattern
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 12; c++) {
          if ((r + c) % 2 === 0) {
            const isExplosive = (r === 2 || r === 3) && (c === 2 || c === 5 || c === 9);
            add(c, r, isExplosive ? BT_EXPLOSIVE : (r > 2 ? BT_SILVER : BT_NORMAL));
          }
        }
      break;

    case 5: // BOSS: Fortress
      // Gold core
      for (let r = 2; r < 5; r++)
        for (let c = 4; c < 8; c++) add(c, r, BT_GOLD);
      // Silver walls
      for (let r = 1; r < 6; r++) { add(3, r, BT_SILVER); add(8, r, BT_SILVER); }
      for (let c = 3; c < 9; c++) { add(c, 1, BT_SILVER); add(c, 5, BT_SILVER); }
      // Normal outer
      for (let c = 1; c < 11; c++) { add(c, 0, BT_NORMAL); add(c, 6, BT_NORMAL); }
      // Power-ups
      add(5, 3, BT_POWERUP); add(6, 3, BT_POWERUP);
      break;

    case 6: // Horizontal lines with gaps
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 12; c++) {
          if (c === 3 || c === 8) continue;
          if (r % 3 === 0) add(c, r, BT_SILVER);
          else if (c === 5 || c === 6) add(c, r, BT_POWERUP);
          else add(c, r, BT_NORMAL);
        }
      break;

    case 7: // Maze with indestructibles
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 12; c++) {
          if ((r === 1 || r === 3 || r === 5 || r === 7) && c > 1 && c < 10 && c % 3 !== 0)
            add(c, r, BT_INDESTRUCTIBLE);
          else if (r % 2 === 0)
            add(c, r, (r + c) % 5 === 0 ? BT_SILVER : BT_NORMAL);
        }
      break;

    case 8: // Diagonal lines
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 12; c++) {
          if ((r + c) % 3 === 0) {
            if (c === r % 12) add(c, r, BT_GOLD);
            else if ((r + c) % 6 === 0) add(c, r, BT_POWERUP);
            else add(c, r, r < 5 ? BT_NORMAL : BT_SILVER);
          }
        }
      break;

    case 9: // Defensive clusters
      for (let cy = 1; cy < 8; cy += 3)
        for (let cx = 1; cx < 11; cx += 4) {
          add(cx, cy, BT_GOLD);
          add(cx - 1, cy, BT_SILVER); add(cx + 1, cy, BT_SILVER);
          add(cx, cy - 1, BT_SILVER); add(cx, cy + 1, BT_SILVER);
          add(cx - 1, cy - 1, BT_NORMAL); add(cx + 1, cy - 1, BT_NORMAL);
          add(cx - 1, cy + 1, BT_EXPLOSIVE); add(cx + 1, cy + 1, BT_EXPLOSIVE);
        }
      break;

    case 10: // BOSS: Circular arena
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 12; c++) {
          const dx = c - 5.5, dy = r - 4.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 2) add(c, r, BT_GOLD);
          else if (dist < 3.5) add(c, r, BT_SILVER);
          else if (dist < 5 && dist > 4) add(c, r, BT_INDESTRUCTIBLE);
          else if (dist >= 3.5 && dist < 4 && (c + r) % 3 === 0) add(c, r, BT_POWERUP);
        }
      break;

    case 11: // Dense explosives, chain reactions
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 12; c++) {
          if ((r + c) % 2 === 0) add(c, r, BT_EXPLOSIVE);
          else if (r < 3) add(c, r, BT_SILVER);
          else add(c, r, BT_NORMAL);
        }
      break;

    case 12: // Gold frame
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 12; c++) {
          if (r === 0 || r === 7 || c === 0 || c === 11) add(c, r, BT_GOLD);
          else if (r === 1 || r === 6 || c === 1 || c === 10) add(c, r, BT_SILVER);
          else if ((r + c) % 4 === 0) add(c, r, BT_POWERUP);
          else add(c, r, BT_NORMAL);
        }
      break;

    case 13: // Rainbow with power-ups
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 12; c++) {
          if (c % 3 === 1 && r % 2 === 0) add(c, r, BT_POWERUP);
          else if (r === 3 || r === 4) add(c, r, BT_SILVER);
          else add(c, r, BT_NORMAL);
        }
      break;

    case 14: // Triple wall N->S->G
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 12; c++) {
          if (r < 3) add(c, r, BT_NORMAL);
          else if (r < 6) add(c, r, BT_SILVER);
          else if (r < 8) add(c, r, BT_GOLD);
          else if (c % 3 === 0) add(c, r, BT_INDESTRUCTIBLE);
        }
      break;

    case 15: // BOSS: Tank shape
      // Tank body
      for (let r = 2; r < 8; r++)
        for (let c = 2; c < 10; c++) {
          if (r < 4) add(c, r, BT_GOLD);
          else if (r < 6) add(c, r, BT_SILVER);
          else add(c, r, BT_NORMAL);
        }
      // Turret
      for (let c = 4; c < 8; c++) { add(c, 0, BT_INDESTRUCTIBLE); add(c, 1, BT_GOLD); }
      // Treads
      for (let r = 2; r < 8; r++) { add(1, r, BT_INDESTRUCTIBLE); add(10, r, BT_INDESTRUCTIBLE); }
      // Power-ups
      add(5, 4, BT_POWERUP); add(6, 4, BT_POWERUP);
      add(5, 6, BT_POWERUP); add(6, 6, BT_POWERUP);
      break;

    case 16: // Arrow shape
      for (let r = 0; r < 10; r++) {
        const tipC = 5;
        const w = r < 5 ? r + 1 : 10 - r;
        for (let c = tipC - w; c <= tipC + w; c++) {
          if (c >= 0 && c < 12) {
            if (Math.abs(c - tipC) === w) add(c, r, BT_EXPLOSIVE);
            else if (r < 3) add(c, r, BT_GOLD);
            else if (r < 6) add(c, r, BT_SILVER);
            else add(c, r, BT_NORMAL);
          }
        }
      }
      break;

    case 17: // Prison cells
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 12; c++) {
          if (r % 3 === 0 || c % 4 === 0) add(c, r, BT_INDESTRUCTIBLE);
          else if ((r + c) % 3 === 0) add(c, r, BT_GOLD);
          else if (r % 3 === 1) add(c, r, BT_SILVER);
          else if (c === 2 && r === 2) add(c, r, BT_POWERUP);
          else if (c === 6 && r === 5) add(c, r, BT_POWERUP);
          else add(c, r, BT_NORMAL);
        }
      break;

    case 18: // Spiral
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 12; c++) {
          const ang = Math.atan2(r - 5, c - 6);
          const dist = Math.sqrt((r - 5) * (r - 5) + (c - 6) * (c - 6));
          const spiral = (ang + Math.PI) / (2 * Math.PI) * 6 + dist;
          if (Math.floor(spiral) % 2 === 0) {
            if (dist < 2) add(c, r, BT_GOLD);
            else if (dist < 4) add(c, r, BT_SILVER);
            else if ((r + c) % 7 === 0) add(c, r, BT_POWERUP);
            else if ((r + c) % 5 === 0) add(c, r, BT_EXPLOSIVE);
            else add(c, r, BT_NORMAL);
          }
        }
      break;

    case 19: // Darkness level
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 12; c++) {
          if ((r === 0 || r === 9) && c % 2 === 0) add(c, r, BT_INDESTRUCTIBLE);
          else if (r > 0 && r < 9) {
            if (dist2(c, r, 3, 4) < 2 || dist2(c, r, 8, 4) < 2) add(c, r, BT_GOLD);
            else if ((r + c) % 3 === 0) add(c, r, BT_SILVER);
            else add(c, r, BT_NORMAL);
          }
        }
      break;

    case 20: // BOSS: Skull
      { // Skull outline
        const skull = [
          "..XXXXXXXX..",
          ".XXXXXXXXXX.",
          "XXXX..XX..XX",
          "XXXX..XX..XX",
          "XXXXXXXXXXXX",
          ".XXXXXXXXXX.",
          "..XXXXXXXX..",
          "..X.XX.XX.X.",
          "..XXXXXXXX..",
          "...XXXXXX..."
        ];
        for (let r = 0; r < skull.length; r++)
          for (let c = 0; c < 12; c++) {
            if (skull[r][c] === 'X') {
              if (r < 2 || r > 7) add(c, r, BT_SILVER);
              else if (r === 2 || r === 3) {
                if (c === 4 || c === 5 || c === 7 || c === 8) continue;
                if (c < 4 || c > 8) add(c, r, BT_GOLD);
                else add(c, r, BT_EXPLOSIVE);
              } else if (r === 4 || r === 5) add(c, r, BT_GOLD);
              else add(c, r, BT_SILVER);
            }
          }
        add(5, 5, BT_POWERUP); add(6, 5, BT_POWERUP);
        add(3, 7, BT_POWERUP); add(8, 7, BT_POWERUP);
        // indestructible frame
        for (let c = 0; c < 12; c++) { add(c, 0, BT_INDESTRUCTIBLE); }
      }
      break;

    case 21: // Mostly gold
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 12; c++) {
          if ((r + c) % 5 === 0) add(c, r, BT_SILVER);
          else if (c === 5 && r === 4) add(c, r, BT_POWERUP);
          else if (c === 6 && r === 4) add(c, r, BT_POWERUP);
          else add(c, r, BT_GOLD);
        }
      break;

    case 22: // Tetris pieces (they descend -- handled in game loop)
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 12; c++) {
          if (r < 2) add(c, r, BT_INDESTRUCTIBLE);
          else if (r < 4) add(c, r, BT_GOLD);
          else if (r < 6) add(c, r, BT_SILVER);
          else {
            if ((r + c) % 4 === 0) add(c, r, BT_POWERUP);
            else add(c, r, BT_NORMAL);
          }
        }
      break;

    case 23: // INVERTED
      for (let r = 0; r < 8; r++)
        for (let c = 0; c < 12; c++) {
          if (r < 2) add(c, r, BT_GOLD);
          else if (r < 4) add(c, r, BT_SILVER);
          else if ((r + c) % 3 === 0) add(c, r, BT_EXPLOSIVE);
          else add(c, r, BT_NORMAL);
        }
      break;

    case 24: // 3 waves - first wave
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 12; c++) {
          if ((r + c) % 3 === 0) add(c, r, BT_POWERUP);
          else if (r < 2) add(c, r, BT_SILVER);
          else add(c, r, BT_NORMAL);
        }
      break;

    case 25: // BOSS FINAL: Fly shape
      {
        const fly = [
          "..XX....XX..",
          ".XXXX..XXXX.",
          "XXXXXXXXXXXX",
          ".XXXXXXXXXX.",
          "..XXXXXXXX..",
          "XXXXXXXXXXXX",
          ".XXXXXXXXXX.",
          "..XXXXXXXX..",
          "...XX..XX...",
          "..XX....XX.."
        ];
        for (let r = 0; r < fly.length; r++)
          for (let c = 0; c < 12; c++) {
            if (fly[r][c] === 'X') {
              if (r < 2) add(c, r, BT_INDESTRUCTIBLE);
              else if (r < 4) add(c, r, BT_GOLD);
              else if (r < 6) add(c, r, BT_EXPLOSIVE);
              else if (r < 8) add(c, r, BT_SILVER);
              else add(c, r, BT_NORMAL);
            }
          }
        // power-ups scattered
        add(5, 3, BT_POWERUP); add(6, 3, BT_POWERUP);
        add(4, 5, BT_POWERUP); add(7, 5, BT_POWERUP);
        add(5, 7, BT_POWERUP); add(6, 7, BT_POWERUP);
      }
      break;

    default: // Fallback
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 12; c++) add(c, r, BT_NORMAL);
  }

  return bricks;
}

function dist2(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function getWorldForPhase(phase) {
  return Math.floor((phase - 1) / 5);
}

function isBossPhase(phase) {
  return phase % 5 === 0;
}

// ── Collision helpers ────────────────────────────────────────────────
function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
  const nearX = Math.max(rx, Math.min(cx, rx + rw));
  const nearY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearX;
  const dy = cy - nearY;
  return dx * dx + dy * dy <= cr * cr;
}

function ballBrickSide(bx, by, br, rx, ry, rw, rh) {
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const dx = bx - cx;
  const dy = by - cy;
  const ratioX = dx / (rw / 2 + br);
  const ratioY = dy / (rh / 2 + br);
  if (Math.abs(ratioX) > Math.abs(ratioY)) return ratioX > 0 ? "right" : "left";
  return ratioY > 0 ? "bottom" : "top";
}

// ── Main Component ──────────────────────────────────────────────────
export default function BrickBreaker() {
  const { user, checkedCookie, registering, register } = useJogador("brickbreaker");
  const gameScale = useGameScale(CW);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const audioRef = useRef(null);
  const gameRef = useRef(null);
  const screenRef = useRef("menu");
  const keysRef = useRef(new Set());
  const touchRef = useRef({ active: false, startX: 0, paddleStart: 0 });
  const lastTimeRef = useRef(0);

  const [screen, setScreen] = useState("menu");
  const [muted, setMuted] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [dontShowTutorial, setDontShowTutorial] = useState(false);
  const [selectWorld, setSelectWorld] = useState(false);
  const [finalStats, setFinalStats] = useState(null);
  const playCountRef = useRef(0);
  const pendingStartPhaseRef = useRef(1);

  useLockScroll(screen === "playing" || screen === "paused");

  useEffect(() => { screenRef.current = screen; }, [screen]);

  // ── High score & progress ───────────────────────────────────────
  const getHighScore = () => {
    try { return parseInt(localStorage.getItem("bb_highscore") || "0", 10); } catch { return 0; }
  };
  const setHighScore = (s) => {
    try { if (s > getHighScore()) localStorage.setItem("bb_highscore", String(s)); } catch { /* */ }
  };
  const getUnlockedWorld = () => {
    try { return parseInt(localStorage.getItem("bb_world") || "0", 10); } catch { return 0; }
  };
  const setUnlockedWorld = (w) => {
    try { if (w > getUnlockedWorld()) localStorage.setItem("bb_world", String(w)); } catch { /* */ }
  };
  const getMaxPhase = () => {
    try { return parseInt(localStorage.getItem("bb_maxphase") || "1", 10); } catch { return 1; }
  };
  const setMaxPhase = (p) => {
    try { if (p > getMaxPhase()) localStorage.setItem("bb_maxphase", String(p)); } catch { /* */ }
  };

  // ── Create initial game state ──────────────────────────────────
  const initGame = useCallback((startPhase = 1) => {
    const bricks = buildLevel(startPhase);
    gameRef.current = {
      phase: startPhase,
      world: getWorldForPhase(startPhase),
      bricks,
      balls: [],
      paddle: { x: CW / 2 - PADDLE_W / 2, w: PADDLE_W },
      lives: 3,
      score: 0,
      combo: 0,
      capsules: [],
      powerUps: [], // active power-ups {type, timer, data}
      enemies: [],
      particles: [],
      cannonBullets: [],
      shieldActive: false,
      sticky: false,
      stickyBall: null, // offset from paddle center
      fireBall: false,
      bigPaddle: false,
      frame: 0,
      phaseTime: 0,
      paused: false,
      invulnerable: 0,
      screenShake: 0,
      enemySpawnTimer: 0,
      cannonTimer: 0,
      cannonShots: 0,
      livesLostThisPhase: 0,
      totalBricksDestroyed: 0,
      totalEnemiesDestroyed: 0,
      ballTrail: [],
      wave: 1, // for phase 24
      phaseStartTime: Date.now(),
      brickDescentTimer: 0, // for phase 22
      speedMult: 1,
      darkMode: false,
      inverted: false,
      launched: false,
    };
    // Place initial ball on paddle
    resetBallOnPaddle(gameRef.current);
  }, []);

  function resetBallOnPaddle(g) {
    const pw = g.bigPaddle ? 144 : PADDLE_W;
    g.balls = [{
      x: g.paddle.x + pw / 2,
      y: PADDLE_Y - BALL_R - 1,
      vx: 0,
      vy: 0,
      active: true
    }];
    g.launched = false;
    g.sticky = false;
    g.stickyBall = null;
  }

  function launchBall(g) {
    if (g.launched && !g.stickyBall) return;
    const speed = BALL_SPEED * g.speedMult;
    if (g.stickyBall !== null && g.balls.length > 0) {
      // Release sticky ball
      const b = g.balls.find(b2 => b2.stuck);
      if (b) {
        const angle = -Math.PI / 4 + Math.random() * Math.PI / 2;
        b.vx = Math.sin(angle) * speed;
        b.vy = -Math.cos(angle) * speed;
        b.stuck = false;
        g.stickyBall = null;
      }
      return;
    }
    if (!g.launched) {
      g.launched = true;
      const angle = -Math.PI / 4 + Math.random() * Math.PI / 2;
      g.balls[0].vx = Math.sin(angle) * speed;
      g.balls[0].vy = -Math.cos(angle) * speed;
    }
  }

  // ── Spawn particles ────────────────────────────────────────────
  function spawnParticles(g, x, y, color, count, speed = 3) {
    for (let i = 0; i < count && g.particles.length < MAX_PARTICLES; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 0.5 + Math.random() * speed;
      g.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 1,
        decay: 0.02 + Math.random() * 0.03,
        color,
        size: 1.5 + Math.random() * 2.5
      });
    }
  }

  // ── Explode brick ─────────────────────────────────────────────
  function explodeBrick(g, brick) {
    const cx = brick.col;
    const cy = brick.row;
    audioRef.current?.explosive();
    spawnParticles(g, brick.x + BRICK_W / 2, brick.y + BRICK_H / 2, "#ff4444", 15, 4);
    g.screenShake = 8;

    // Destroy adjacent
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const idx = g.bricks.findIndex(b => b.col === cx + dc && b.row === cy + dr);
        if (idx !== -1) {
          const adj = g.bricks[idx];
          if (adj.type !== BT_INDESTRUCTIBLE) {
            g.score += 10;
            spawnParticles(g, adj.x + BRICK_W / 2, adj.y + BRICK_H / 2, "#ff8800", 6);
            if (adj.type === BT_POWERUP) dropCapsule(g, adj);
            if (adj.type === BT_EXPLOSIVE) {
              g.bricks.splice(idx, 1);
              explodeBrick(g, adj);
            } else {
              g.bricks.splice(idx, 1);
            }
            g.totalBricksDestroyed++;
          }
        }
      }
  }

  // ── Drop capsule ───────────────────────────────────────────────
  function dropCapsule(g, brick) {
    const types = [PU_TRIPLE, PU_STICKY, PU_CANNON, PU_BIG, PU_FIRE, PU_SHIELD, PU_LIFE];
    const type = types[Math.floor(Math.random() * types.length)];
    g.capsules.push({
      x: brick.x + BRICK_W / 2 - 12,
      y: brick.y,
      w: 24, h: 12,
      type,
      rot: 0
    });
  }

  // ── Activate power-up ────────────────────────────────────────
  function activatePowerUp(g, type) {
    audioRef.current?.powerUpCollect();

    switch (type) {
      case PU_TRIPLE: {
        if (g.balls.length < 3) {
          const activeBalls = g.balls.filter(b => b.active && !b.stuck);
          if (activeBalls.length > 0) {
            const base = activeBalls[0];
            const speed = Math.sqrt(base.vx * base.vx + base.vy * base.vy) || BALL_SPEED * g.speedMult;
            for (let i = 0; i < 2; i++) {
              const angle = Math.atan2(base.vy, base.vx) + (i === 0 ? -0.4 : 0.4);
              g.balls.push({
                x: base.x, y: base.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                active: true
              });
            }
          }
        }
        break;
      }
      case PU_STICKY:
        addTimedPowerUp(g, PU_STICKY, 15000);
        g.sticky = true;
        break;
      case PU_CANNON:
        addTimedPowerUp(g, PU_CANNON, 20000);
        g.cannonShots = 30;
        g.cannonTimer = 0;
        break;
      case PU_BIG:
        addTimedPowerUp(g, PU_BIG, 12000);
        g.bigPaddle = true;
        g.paddle.w = 144;
        break;
      case PU_FIRE:
        addTimedPowerUp(g, PU_FIRE, 10000);
        g.fireBall = true;
        break;
      case PU_SHIELD:
        g.shieldActive = true;
        break;
      case PU_LIFE:
        g.lives = Math.min(MAX_LIVES, g.lives + 1);
        break;
    }
  }

  function addTimedPowerUp(g, type, duration) {
    // Remove existing of same type
    g.powerUps = g.powerUps.filter(p => p.type !== type);
    // Limit to 2 timed
    const timed = g.powerUps.filter(p => PU_DURATIONS[p.type] !== Infinity && PU_DURATIONS[p.type] !== 0);
    if (timed.length >= 2) {
      // Remove oldest
      const oldest = timed[0];
      g.powerUps = g.powerUps.filter(p => p !== oldest);
      deactivatePowerUp(g, oldest.type);
    }
    g.powerUps.push({ type, timer: duration });
  }

  function deactivatePowerUp(g, type) {
    switch (type) {
      case PU_STICKY: g.sticky = false; break;
      case PU_CANNON: g.cannonShots = 0; break;
      case PU_BIG:
        g.bigPaddle = false;
        g.paddle.w = PADDLE_W;
        g.paddle.x = Math.min(g.paddle.x, CW - PADDLE_W);
        break;
      case PU_FIRE: g.fireBall = false; break;
    }
  }

  // ── Lose life ──────────────────────────────────────────────────
  function loseLife(g) {
    g.lives--;
    g.livesLostThisPhase++;
    g.screenShake = 10;
    audioRef.current?.lifeLost();

    // Clear all power-ups
    for (const pu of g.powerUps) deactivatePowerUp(g, pu.type);
    g.powerUps = [];
    g.shieldActive = false;
    g.fireBall = false;
    g.sticky = false;
    g.bigPaddle = false;
    g.paddle.w = PADDLE_W;
    g.capsules = [];
    g.cannonBullets = [];

    if (g.lives <= 0) {
      return false; // game over
    }

    // Respawn
    g.invulnerable = 2000;
    resetBallOnPaddle(g);
    return true;
  }

  // ── End game ───────────────────────────────────────────────────
  const endGame = useCallback((g, victory = false) => {
    const hs = getHighScore();
    const finalScore = g.score + (victory ? 50000 : 0);
    setHighScore(finalScore);
    setMaxPhase(g.phase);
    setUnlockedWorld(g.world);

    setFinalStats({
      score: finalScore,
      phase: g.phase,
      bricks: g.totalBricksDestroyed,
      enemies: g.totalEnemiesDestroyed,
      best: Math.max(hs, finalScore),
      victory
    });

    if (user) {
      fetch("/api/pontuacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pontos: finalScore,
          jogo: "brickbreaker",
          metadata: { phase: g.phase, bricks: g.totalBricksDestroyed, enemies: g.totalEnemiesDestroyed },
        }),
      }).catch(() => {});
    }

    window.gtag?.("event", "game_end", {
      game_name: "brickbreaker",
      score: finalScore,
      phase: g.phase,
    });

    setScreen(victory ? "victory" : "gameover");
  }, [user]);

  // ── Check phase complete ──────────────────────────────────────
  function checkPhaseComplete(g) {
    const destructible = g.bricks.filter(b => b.type !== BT_INDESTRUCTIBLE);
    return destructible.length === 0;
  }

  // ── Advance to next phase ─────────────────────────────────────
  function advancePhase(g) {
    audioRef.current?.phaseComplete();
    const timeBonus = Math.max(0, 60000 - (Date.now() - g.phaseStartTime));
    const phaseBonus = 1000 * g.phase + Math.floor(timeBonus / 1000) * 10;
    const perfectBonus = g.livesLostThisPhase === 0 ? 500 : 0;
    const prevWorld = g.world;

    g.score += phaseBonus + perfectBonus;
    g.phase++;
    setMaxPhase(g.phase);

    if (g.phase > TOTAL_PHASES) {
      endGame(g, true);
      return "victory";
    }

    const newWorld = getWorldForPhase(g.phase);
    if (newWorld !== prevWorld) {
      g.world = newWorld;
      setUnlockedWorld(newWorld);
      g.score += 2000 * newWorld;
      return "worldTransition";
    }

    return "phaseComplete";
  }

  // ── Load next phase bricks ────────────────────────────────────
  function loadPhase(g) {
    g.bricks = buildLevel(g.phase);
    g.enemies = [];
    g.capsules = [];
    g.cannonBullets = [];
    g.particles = [];
    g.enemySpawnTimer = 0;
    g.livesLostThisPhase = 0;
    g.combo = 0;
    g.phaseStartTime = Date.now();
    g.wave = 1;
    g.brickDescentTimer = 0;
    g.speedMult = 1;
    g.darkMode = g.phase === 19;
    g.inverted = g.phase === 23;

    // Clear power-ups
    for (const pu of g.powerUps) deactivatePowerUp(g, pu.type);
    g.powerUps = [];
    g.shieldActive = false;

    resetBallOnPaddle(g);
  }

  // ── Game loop ─────────────────────────────────────────────────
  const gameLoop = useCallback((timestamp) => {
    const g = gameRef.current;
    if (!g || screenRef.current !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const rawDt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const dt = Math.min(rawDt, 33); // cap at ~30fps min
    const dtFactor = dt / 16.667; // normalize to 60fps

    if (g.paused) {
      drawGame(ctx, g);
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    g.frame++;
    g.phaseTime += dt;

    // Phase 18: speed acceleration
    if (g.phase === 18) {
      g.speedMult = 1 + g.phaseTime * 0.000005;
    }

    // Phase 22: brick descent
    if (g.phase === 22) {
      g.brickDescentTimer += dt;
      if (g.brickDescentTimer > 15000) {
        g.brickDescentTimer = 0;
        for (const b of g.bricks) {
          b.y += BRICK_H + BRICK_GAP;
          b.row++;
        }
      }
    }

    // Phase 24: waves
    if (g.phase === 24 && g.wave < 3 && checkPhaseComplete(g)) {
      g.wave++;
      const newBricks = buildLevel(24);
      for (const b of newBricks) {
        b.row += (g.wave - 1) * 2;
        b.y += (g.wave - 1) * 2 * (BRICK_H + BRICK_GAP);
      }
      g.bricks = newBricks;
    }

    const keys = keysRef.current;
    const pw = g.bigPaddle ? 144 : PADDLE_W;

    // ── Paddle movement ────────────────────────────────────
    const paddleSpeed = 6 * dtFactor;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) {
      g.paddle.x = Math.max(0, g.paddle.x - paddleSpeed);
    }
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) {
      g.paddle.x = Math.min(CW - pw, g.paddle.x + paddleSpeed);
    }

    // ── Invulnerability timer ──────────────────────────────
    if (g.invulnerable > 0) g.invulnerable -= dt;

    // ── Screen shake decay ─────────────────────────────────
    if (g.screenShake > 0) g.screenShake *= 0.85;
    if (g.screenShake < 0.5) g.screenShake = 0;

    // ── Power-up timers ────────────────────────────────────
    for (let i = g.powerUps.length - 1; i >= 0; i--) {
      const pu = g.powerUps[i];
      if (PU_DURATIONS[pu.type] !== Infinity && PU_DURATIONS[pu.type] !== 0) {
        pu.timer -= dt;
        if (pu.timer <= 0) {
          deactivatePowerUp(g, pu.type);
          g.powerUps.splice(i, 1);
        }
      }
    }

    // ── Cannon auto-fire ───────────────────────────────────
    if (g.cannonShots > 0) {
      g.cannonTimer += dt;
      if (g.cannonTimer >= 400) {
        g.cannonTimer = 0;
        g.cannonShots--;
        audioRef.current?.cannonShot();
        g.cannonBullets.push(
          { x: g.paddle.x + 4, y: PADDLE_Y - 8, vy: -7 },
          { x: g.paddle.x + pw - 4, y: PADDLE_Y - 8, vy: -7 }
        );
        if (g.cannonShots <= 0) {
          g.powerUps = g.powerUps.filter(p => p.type !== PU_CANNON);
        }
      }
    }

    // ── Update cannon bullets ──────────────────────────────
    for (let i = g.cannonBullets.length - 1; i >= 0; i--) {
      const b = g.cannonBullets[i];
      b.y += b.vy * dtFactor;
      if (b.y < 0) { g.cannonBullets.splice(i, 1); continue; }

      // Check brick collision
      for (let j = g.bricks.length - 1; j >= 0; j--) {
        const br = g.bricks[j];
        if (b.x >= br.x && b.x <= br.x + br.w && b.y >= br.y && b.y <= br.y + br.h) {
          hitBrick(g, j);
          g.cannonBullets.splice(i, 1);
          break;
        }
      }
    }

    // Check cannon vs enemies
    for (let i = g.cannonBullets.length - 1; i >= 0; i--) {
      const b = g.cannonBullets[i];
      for (let j = g.enemies.length - 1; j >= 0; j--) {
        const e = g.enemies[j];
        if (b.x >= e.x - 10 && b.x <= e.x + 20 && b.y >= e.y - 10 && b.y <= e.y + 20) {
          e.hp--;
          if (e.hp <= 0) {
            g.score += ENEMY_PTS[e.type];
            g.totalEnemiesDestroyed++;
            spawnParticles(g, e.x, e.y, ENEMY_COLORS[e.type], 10);
            audioRef.current?.enemyDestroy();
            g.enemies.splice(j, 1);
          }
          g.cannonBullets.splice(i, 1);
          break;
        }
      }
    }

    // ── Update balls ───────────────────────────────────────
    const ballSpeed = BALL_SPEED * g.speedMult;
    for (let bi = g.balls.length - 1; bi >= 0; bi--) {
      const ball = g.balls[bi];
      if (!ball.active) continue;

      // Ball on paddle (not launched or stuck)
      if (!g.launched) {
        ball.x = g.paddle.x + pw / 2;
        ball.y = PADDLE_Y - BALL_R - 1;
        continue;
      }
      if (ball.stuck) {
        ball.x = g.paddle.x + ball.stickOffset;
        ball.y = PADDLE_Y - BALL_R - 1;
        continue;
      }

      // Move
      ball.x += ball.vx * dtFactor;
      ball.y += ball.vy * dtFactor;

      // Trail
      g.ballTrail.push({ x: ball.x, y: ball.y, life: 1 });
      if (g.ballTrail.length > 48) g.ballTrail.splice(0, g.ballTrail.length - 48); // 8 per ball * 6 balls max

      // Wall bounces
      if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x + BALL_R > CW) { ball.x = CW - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

      // Bottom - ball lost
      if (ball.y + BALL_R > CH) {
        // Shield check
        if (g.shieldActive) {
          g.shieldActive = false;
          ball.vy = -Math.abs(ball.vy);
          ball.y = CH - BALL_R - 2;
          spawnParticles(g, ball.x, CH, "#a855f7", 10);
        } else {
          ball.active = false;
          audioRef.current?.ballLost();
          g.balls.splice(bi, 1);
          continue;
        }
      }

      // Paddle collision
      if (ball.vy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 4 &&
          ball.x >= g.paddle.x - BALL_R && ball.x <= g.paddle.x + pw + BALL_R) {
        audioRef.current?.paddleHit();
        g.combo = 0;

        // Sticky check
        if (g.sticky) {
          ball.stuck = true;
          ball.stickOffset = ball.x - g.paddle.x;
          ball.vx = 0;
          ball.vy = 0;
          g.stickyBall = ball.stickOffset;
          continue;
        }

        // Angle based on hit position
        const hitPos = (ball.x - g.paddle.x) / pw; // 0..1
        const angle = -Math.PI / 2 + (hitPos - 0.5) * Math.PI * 0.7; // -~80 to ~80 deg
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || ballSpeed;
        ball.vx = Math.cos(angle) * speed;
        ball.vy = Math.sin(angle) * speed;
        // Ensure upward
        if (ball.vy > -1) ball.vy = -speed * 0.7;
        ball.y = PADDLE_Y - BALL_R - 1;
      }

      // Brick collision
      for (let j = g.bricks.length - 1; j >= 0; j--) {
        const br = g.bricks[j];
        if (circleRectCollision(ball.x, ball.y, BALL_R, br.x, br.y, br.w, br.h)) {
          // Hit brick
          const destroyed = hitBrick(g, j);

          // Ball vs enemy: pass through
          if (g.fireBall && !destroyed) {
            // fire ball doesn't bounce, just damages
          } else if (!g.fireBall) {
            // Bounce
            const side = ballBrickSide(ball.x, ball.y, BALL_R, br.x, br.y, br.w, br.h);
            if (side === "top" || side === "bottom") ball.vy = -ball.vy;
            else ball.vx = -ball.vx;
          }

          if (g.fireBall) {
            // Fire ball continues through
          } else {
            break; // One brick per frame normally
          }
        }
      }

      // Ball vs enemies - ball kills enemies and passes through
      for (let j = g.enemies.length - 1; j >= 0; j--) {
        const e = g.enemies[j];
        if (circleRectCollision(ball.x, ball.y, BALL_R, e.x - 10, e.y - 10, 20, 20)) {
          e.hp--;
          if (e.hp <= 0) {
            g.score += ENEMY_PTS[e.type];
            g.totalEnemiesDestroyed++;
            spawnParticles(g, e.x, e.y, ENEMY_COLORS[e.type], 10);
            audioRef.current?.enemyDestroy();
            g.enemies.splice(j, 1);
          }
        }
      }

      // Normalize ball speed
      const curSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (curSpeed > 0 && Math.abs(curSpeed - ballSpeed) > 0.5) {
        const ratio = ballSpeed / curSpeed;
        ball.vx *= ratio;
        ball.vy *= ratio;
      }

      // Prevent too-horizontal ball
      if (Math.abs(ball.vy) < 1 && curSpeed > 0) {
        ball.vy = ball.vy >= 0 ? 1.5 : -1.5;
      }
    }

    // All balls lost
    if (g.launched && g.balls.length === 0) {
      if (!loseLife(g)) {
        endGame(g, false);
        return;
      }
    }

    // ── Update capsules ────────────────────────────────────
    for (let i = g.capsules.length - 1; i >= 0; i--) {
      const cap = g.capsules[i];
      cap.y += CAPSULE_SPEED * dtFactor;
      cap.rot += 0.02 * dtFactor;
      if (cap.y > CH) { g.capsules.splice(i, 1); continue; }

      // Catch with paddle
      if (cap.y + cap.h >= PADDLE_Y && cap.y <= PADDLE_Y + PADDLE_H &&
          cap.x + cap.w >= g.paddle.x && cap.x <= g.paddle.x + pw) {
        activatePowerUp(g, cap.type);
        g.capsules.splice(i, 1);
      }
    }

    // ── Spawn enemies (phase 3+) ──────────────────────────
    if (g.phase >= 3) {
      g.enemySpawnTimer += dt;
      const spawnInterval = 8000 + Math.random() * 4000;
      if (g.enemySpawnTimer >= spawnInterval && g.enemies.length < 3) {
        g.enemySpawnTimer = 0;
        spawnEnemy(g);
      }
    }

    // ── Update enemies ─────────────────────────────────────
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      e.time += dt;

      switch (e.type) {
        case ET_DRONE:
          e.x = e.baseX + Math.sin(e.time * 0.003) * 40;
          e.y += 0.3 * dtFactor;
          break;
        case ET_ZIGZAG:
          e.x += (Math.floor(e.time / 500) % 2 === 0 ? 1 : -1) * 1.5 * dtFactor;
          e.y += 0.5 * dtFactor;
          e.x = Math.max(10, Math.min(CW - 10, e.x));
          break;
        case ET_TANK:
          e.y += 0.2 * dtFactor;
          break;
        case ET_KAMIKAZE:
          e.y += 0.4 * dtFactor;
          // Dive at paddle when roughly aligned
          if (Math.abs(e.x - (g.paddle.x + pw / 2)) < 30) {
            e.y += 1.5 * dtFactor;
          }
          break;
      }

      // Off screen bottom
      if (e.y > CH + 20) { g.enemies.splice(i, 1); continue; }

      // Enemy touches paddle
      if (e.y + 10 >= PADDLE_Y && e.y - 10 <= PADDLE_Y + PADDLE_H &&
          e.x + 10 >= g.paddle.x && e.x - 10 <= g.paddle.x + pw) {
        spawnParticles(g, e.x, e.y, ENEMY_COLORS[e.type], 15);
        g.enemies.splice(i, 1);
        audioRef.current?.enemyDestroy();
        if (!loseLife(g)) {
          endGame(g, false);
          return;
        }
      }
    }

    // ── Update particles ───────────────────────────────────
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const p = g.particles[i];
      p.x += p.vx * dtFactor;
      p.y += p.vy * dtFactor;
      p.vy += 0.05 * dtFactor; // gravity
      p.life -= p.decay * dtFactor;
      if (p.life <= 0) g.particles.splice(i, 1);
    }

    // ── Update ball trail ──────────────────────────────────
    for (let i = g.ballTrail.length - 1; i >= 0; i--) {
      g.ballTrail[i].life -= 0.15 * dtFactor;
      if (g.ballTrail[i].life <= 0) g.ballTrail.splice(i, 1);
    }

    // ── Check phase complete ───────────────────────────────
    if (g.launched && checkPhaseComplete(g)) {
      if (g.phase === 24 && g.wave < 3) {
        // Don't complete yet, handled above
      } else {
        const result = advancePhase(g);
        if (result === "victory") return;

        if (result === "worldTransition") {
          setFinalStats({
            score: g.score,
            phase: g.phase,
            world: g.world,
            worldName: WORLD_NAMES[g.world],
            tag: WORLD_TAGS[g.world],
            bonus: 2000 * g.world,
            phaseBonus: 1000 * (g.phase - 1),
          });
          setScreen("worldTransition");
          setTimeout(() => {
            loadPhase(g);
            setScreen("playing");
          }, 4000);
          return;
        }

        // Phase complete screen
        setFinalStats({
          score: g.score,
          phase: g.phase - 1,
          phaseBonus: 1000 * (g.phase - 1),
          perfect: g.livesLostThisPhase === 0,
        });
        setScreen("levelComplete");
        setTimeout(() => {
          loadPhase(g);
          setScreen("playing");
        }, 3000);
        return;
      }
    }

    // ── Draw ───────────────────────────────────────────────
    drawGame(ctx, g);

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [endGame]);

  // ── Hit brick logic ────────────────────────────────────────────
  function hitBrick(g, idx) {
    const br = g.bricks[idx];
    if (br.type === BT_INDESTRUCTIBLE) {
      spawnParticles(g, br.x + BRICK_W / 2, br.y + BRICK_H / 2, "#888", 3, 1);
      audioRef.current?.brickHit(BT_INDESTRUCTIBLE);
      return false;
    }

    br.hp--;
    g.combo++;
    const comboMult = Math.min(4, Math.floor(g.combo / 3) + 1);

    if (br.hp <= 0) {
      // Destroyed
      let pts = 0;
      switch (br.type) {
        case BT_NORMAL: pts = 10; break;
        case BT_SILVER: pts = 25; break;
        case BT_GOLD: pts = 100; audioRef.current?.goldDestroy(); break;
        case BT_POWERUP: pts = 10; dropCapsule(g, br); break;
        case BT_EXPLOSIVE: pts = 30; break;
      }
      g.score += pts * comboMult;
      g.totalBricksDestroyed++;

      const colors = {
        [BT_NORMAL]: ROW_COLORS[br.row % ROW_COLORS.length],
        [BT_SILVER]: "#c0c0c0",
        [BT_GOLD]: "#ffd700",
        [BT_POWERUP]: "#00ff88",
        [BT_EXPLOSIVE]: "#ff4444"
      };
      spawnParticles(g, br.x + BRICK_W / 2, br.y + BRICK_H / 2, colors[br.type] || "#fff", 8);

      if (br.type !== BT_GOLD) audioRef.current?.brickDestroy();

      if (br.type === BT_EXPLOSIVE) {
        g.bricks.splice(idx, 1);
        explodeBrick(g, br);
      } else {
        g.bricks.splice(idx, 1);
      }
      return true;
    } else {
      // Damaged but not destroyed
      if (br.type === BT_SILVER) audioRef.current?.silverHit();
      else if (br.type === BT_GOLD) audioRef.current?.goldHit(br.hp);
      else audioRef.current?.brickHit(br.type);
      spawnParticles(g, br.x + BRICK_W / 2, br.y + BRICK_H / 2, "#fff", 3, 1);
      return false;
    }
  }

  // ── Spawn enemy ────────────────────────────────────────────────
  function spawnEnemy(g) {
    const world = g.world;
    let types = [ET_DRONE];
    if (world >= 1) types.push(ET_ZIGZAG);
    if (world >= 2) types.push(ET_TANK);
    if (world >= 3) types.push(ET_KAMIKAZE);

    const type = types[Math.floor(Math.random() * types.length)];
    g.enemies.push({
      type,
      x: 20 + Math.random() * (CW - 40),
      y: -20,
      baseX: 20 + Math.random() * (CW - 40),
      hp: ENEMY_HP[type],
      time: 0
    });
    audioRef.current?.enemySpawn();
  }

  // ── Draw functions ─────────────────────────────────────────────
  function drawGame(ctx, g) {
    const world = g.world;
    const bg = WORLD_BG[world];
    const shake = g.screenShake;

    ctx.save();
    if (shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * shake * 2,
        (Math.random() - 0.5) * shake * 2
      );
    }

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, bg[0]);
    grad.addColorStop(1, bg[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);

    // Grid lines
    ctx.strokeStyle = bg[2] + "0a";
    ctx.lineWidth = 1;
    for (let x = 0; x < CW; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
    }
    for (let y = 0; y < CH; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
    }

    // Scanlines
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    for (let y = 0; y < CH; y += 4) {
      ctx.fillRect(0, y, CW, 2);
    }

    // Darkness mode (phase 19)
    const darkMode = g.darkMode;

    // Shield
    if (g.shieldActive) {
      ctx.save();
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#a855f7";
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.5 + Math.sin(g.frame * 0.1) * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, CH - 5);
      ctx.lineTo(CW, CH - 5);
      ctx.stroke();
      ctx.restore();
    }

    // Ball trail
    for (const t of g.ballTrail) {
      ctx.save();
      ctx.globalAlpha = t.life * 0.3;
      ctx.fillStyle = g.fireBall ? "#ff6600" : ACCENT;
      ctx.shadowColor = g.fireBall ? "#ff6600" : ACCENT;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, BALL_R * t.life * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Bricks
    for (const br of g.bricks) {
      drawBrick(ctx, br, g.frame);
    }

    // Capsules
    for (const cap of g.capsules) {
      drawCapsule(ctx, cap, g.frame);
    }

    // Balls
    for (const ball of g.balls) {
      if (!ball.active) continue;
      ctx.save();
      ctx.shadowColor = g.fireBall ? "#ff6600" : ACCENT;
      ctx.shadowBlur = 12;
      ctx.fillStyle = g.fireBall ? "#ff6600" : "#fff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      // Inner glow
      ctx.fillStyle = g.fireBall ? "#ffaa00" : ACCENT;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Paddle
    drawPaddle(ctx, g);

    // Cannon bullets
    for (const b of g.cannonBullets) {
      ctx.save();
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 6;
      ctx.fillRect(b.x - 1.5, b.y, 3, 8);
      ctx.restore();
    }

    // Enemies
    for (const e of g.enemies) {
      drawEnemy(ctx, e, g.frame);
    }

    // Particles
    for (const p of g.particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }

    // Darkness overlay
    if (darkMode && g.balls.length > 0) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillRect(0, 0, CW, CH);
      // Clear circles around balls
      ctx.globalCompositeOperation = "destination-out";
      for (const ball of g.balls) {
        if (!ball.active) continue;
        const radGrad = ctx.createRadialGradient(ball.x, ball.y, 10, ball.x, ball.y, 120);
        radGrad.addColorStop(0, "rgba(0,0,0,1)");
        radGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = radGrad;
        ctx.fillRect(ball.x - 120, ball.y - 120, 240, 240);
      }
      // Also around paddle
      const pCx = g.paddle.x + (g.bigPaddle ? 72 : PADDLE_W / 2);
      const radGrad2 = ctx.createRadialGradient(pCx, PADDLE_Y, 10, pCx, PADDLE_Y, 80);
      radGrad2.addColorStop(0, "rgba(0,0,0,1)");
      radGrad2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = radGrad2;
      ctx.fillRect(pCx - 80, PADDLE_Y - 80, 160, 160);
      ctx.restore();
    }

    // HUD
    drawHUD(ctx, g);

    ctx.restore();
  }

  function drawBrick(ctx, br, frame) {
    ctx.save();
    const { x, y, w, h, type, hp, maxHp } = br;

    switch (type) {
      case BT_NORMAL: {
        const color = ROW_COLORS[br.row % ROW_COLORS.length];
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 2);
        ctx.fill();
        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(x + 2, y + 1, w - 4, h / 3);
        break;
      }
      case BT_SILVER: {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "#e0e0e0");
        grad.addColorStop(0.5, "#a0a0a0");
        grad.addColorStop(1, "#808080");
        ctx.fillStyle = grad;
        ctx.shadowColor = "#c0c0c0";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 2);
        ctx.fill();
        // Cracks if damaged
        if (hp < maxHp) {
          ctx.strokeStyle = "#333";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + w * 0.3, y);
          ctx.lineTo(x + w * 0.5, y + h * 0.6);
          ctx.lineTo(x + w * 0.7, y + h);
          ctx.stroke();
        }
        break;
      }
      case BT_GOLD: {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "#ffd700");
        grad.addColorStop(0.5, "#ffaa00");
        grad.addColorStop(1, "#cc8800");
        ctx.fillStyle = grad;
        ctx.shadowColor = "#ffd700";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 2);
        ctx.fill();
        // Damage stages
        const dmg = maxHp - hp;
        if (dmg > 0) {
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.lineWidth = 1;
          for (let k = 0; k < dmg && k < 4; k++) {
            const sx = x + (k + 1) * w / 5;
            ctx.beginPath();
            ctx.moveTo(sx, y);
            ctx.lineTo(sx + (k % 2 === 0 ? 3 : -3), y + h);
            ctx.stroke();
          }
        }
        break;
      }
      case BT_INDESTRUCTIBLE: {
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "#555");
        grad.addColorStop(0.5, "#333");
        grad.addColorStop(1, "#222");
        ctx.fillStyle = grad;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 2);
        ctx.fill();
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 1;
        ctx.stroke();
        // Metal bolts
        ctx.fillStyle = "#777";
        ctx.fillRect(x + 3, y + 3, 3, 3);
        ctx.fillRect(x + w - 6, y + 3, 3, 3);
        break;
      }
      case BT_POWERUP: {
        const pulse = 0.7 + Math.sin(frame * 0.08) * 0.3;
        ctx.fillStyle = `rgba(0,255,136,${pulse})`;
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 8 * pulse;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(x + 2, y + 1, w - 4, h / 3);
        // Star icon
        ctx.fillStyle = "#fff";
        ctx.font = "8px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("\u2605", x + w / 2, y + h / 2);
        break;
      }
      case BT_EXPLOSIVE: {
        const pulse = 0.7 + Math.sin(frame * 0.12) * 0.3;
        ctx.fillStyle = `rgba(255,60,60,${pulse})`;
        ctx.shadowColor = "#ff0000";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 2);
        ctx.fill();
        // Warning stripes
        ctx.strokeStyle = "#ffaa00";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + h - 2);
        ctx.lineTo(x + w / 2, y + 2);
        ctx.lineTo(x + w - 4, y + h - 2);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  function drawPaddle(ctx, g) {
    ctx.save();
    const pw = g.bigPaddle ? 144 : PADDLE_W;
    const px = g.paddle.x;
    const py = PADDLE_Y;

    // Glow
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = 15;

    // Metallic gradient
    const grad = ctx.createLinearGradient(px, py, px, py + PADDLE_H);
    grad.addColorStop(0, "#ddd");
    grad.addColorStop(0.3, ACCENT);
    grad.addColorStop(0.7, "#0088aa");
    grad.addColorStop(1, "#004455");
    ctx.fillStyle = grad;
    ctx.beginPath();
    roundRect(ctx, px, py, pw, PADDLE_H, 4);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(px + 4, py + 1, pw - 8, PADDLE_H / 3);

    // Invulnerable flash
    if (g.invulnerable > 0 && Math.floor(g.frame / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      roundRect(ctx, px, py, pw, PADDLE_H, 4);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawCapsule(ctx, cap, frame) {
    ctx.save();
    const color = PU_COLORS[cap.type];
    const pulse = 0.7 + Math.sin(frame * 0.1 + cap.rot * 10) * 0.3;

    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    roundRect(ctx, cap.x, cap.y, cap.w, cap.h, 6);
    ctx.fill();

    // Letter
    ctx.fillStyle = "#fff";
    ctx.font = "bold 8px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(PU_NAMES[cap.type][0], cap.x + cap.w / 2, cap.y + cap.h / 2 + 1);

    ctx.restore();
  }

  function drawEnemy(ctx, e, frame) {
    ctx.save();
    const color = ENEMY_COLORS[e.type];
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    switch (e.type) {
      case ET_DRONE: {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ctx.fill();
        // Pulse
        ctx.globalAlpha = 0.3 + Math.sin(frame * 0.1) * 0.2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case ET_ZIGZAG: {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - 8);
        ctx.lineTo(e.x + 10, e.y + 8);
        ctx.lineTo(e.x - 10, e.y + 8);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case ET_TANK: {
        ctx.fillStyle = color;
        ctx.fillRect(e.x - 10, e.y - 10, 20, 20);
        ctx.strokeStyle = "#aaa";
        ctx.lineWidth = 2;
        ctx.strokeRect(e.x - 10, e.y - 10, 20, 20);
        // HP bar
        if (e.hp < ENEMY_HP[ET_TANK]) {
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(e.x - 10, e.y - 14, 20 * (e.hp / ENEMY_HP[ET_TANK]), 2);
        }
        break;
      }
      case ET_KAMIKAZE: {
        const glow = 0.5 + Math.sin(frame * 0.15) * 0.5;
        ctx.fillStyle = color;
        ctx.globalAlpha = glow;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
    ctx.restore();
  }

  function drawHUD(ctx, g) {
    ctx.save();

    // Score
    ctx.fillStyle = "#fff";
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = 6;
    ctx.font = "bold 12px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(g.score.toLocaleString(), 12, 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#4a5568";
    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.fillText("PONTOS", 12, 24);

    // Lives
    for (let i = 0; i < g.lives; i++) {
      ctx.fillStyle = "#ef4444";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 4;
      ctx.beginPath();
      const lx = 12 + i * 18;
      const ly = 38;
      // Heart shape
      ctx.arc(lx + 4, ly + 3, 4, Math.PI, 0);
      ctx.arc(lx + 12, ly + 3, 4, Math.PI, 0);
      ctx.lineTo(lx + 16, ly + 6);
      ctx.lineTo(lx + 8, ly + 14);
      ctx.lineTo(lx, ly + 6);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Phase / World
    ctx.fillStyle = WORLD_BG[g.world][2];
    ctx.shadowColor = WORLD_BG[g.world][2];
    ctx.shadowBlur = 4;
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`FASE ${g.phase}`, CW / 2, 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#4a5568";
    ctx.font = "6px 'Press Start 2P', monospace";
    ctx.fillText(WORLD_NAMES[g.world], CW / 2, 20);

    // Combo
    if (g.combo >= 3) {
      const mult = Math.min(4, Math.floor(g.combo / 3) + 1);
      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 6;
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`x${mult} COMBO`, CW / 2, 34);
      ctx.shadowBlur = 0;
    }

    // Active power-ups (right side)
    ctx.textAlign = "right";
    let puY = 8;
    for (const pu of g.powerUps) {
      const dur = PU_DURATIONS[pu.type];
      if (dur === Infinity || dur === 0) continue;
      const secs = Math.ceil(pu.timer / 1000);
      ctx.fillStyle = PU_COLORS[pu.type];
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.fillText(`${PU_NAMES[pu.type]} ${secs}s`, CW - 12, puY);
      puY += 14;
    }

    // Mute indicator
    if (audioRef.current?.muted) {
      ctx.fillStyle = "#666";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.textAlign = "right";
      ctx.fillText("MUTE", CW - 12, CH - 8);
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  // ── Keyboard ───────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      const g = gameRef.current;
      if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
      if (e.key === " ") {
        e.preventDefault();
        if (screenRef.current === "playing" && g) {
          launchBall(g);
        }
      }
      if ((e.key === "p" || e.key === "P" || e.key === "Escape") && screenRef.current === "playing") {
        if (g) {
          g.paused = !g.paused;
          setScreen(g.paused ? "paused" : "playing");
        }
      }
      if (e.key === "m" || e.key === "M") {
        if (audioRef.current) {
          audioRef.current.muted = !audioRef.current.muted;
          setMuted(audioRef.current.muted);
        }
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

  // ── Mouse/Touch ────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getCanvasX = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      return (clientX - rect.left) / gameScale;
    };

    const onMouseMove = (e) => {
      const g = gameRef.current;
      if (!g || screenRef.current !== "playing" || g.paused) return;
      const mx = getCanvasX(e.clientX);
      const pw = g.bigPaddle ? 144 : PADDLE_W;
      g.paddle.x = Math.max(0, Math.min(CW - pw, mx - pw / 2));
    };

    const onMouseDown = () => {
      const g = gameRef.current;
      if (!g || screenRef.current !== "playing") return;
      launchBall(g);
    };

    const onTouchStart = (e) => {
      const g = gameRef.current;
      if (!g || screenRef.current !== "playing") return;
      e.preventDefault();
      const touch = e.touches[0];
      touchRef.current = {
        active: true,
        startX: touch.clientX,
        paddleStart: g.paddle.x
      };
      launchBall(g);
    };

    const onTouchMove = (e) => {
      const g = gameRef.current;
      if (!g || screenRef.current !== "playing" || g.paused) return;
      e.preventDefault();
      const touch = e.touches[0];
      const t = touchRef.current;
      if (!t.active) return;
      const dx = (touch.clientX - t.startX) / gameScale;
      const pw = g.bigPaddle ? 144 : PADDLE_W;
      g.paddle.x = Math.max(0, Math.min(CW - pw, t.paddleStart + dx));
    };

    const onTouchEnd = () => {
      touchRef.current.active = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [gameScale]);

  // ── Cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Start / stop game loop ─────────────────────────────────────
  useEffect(() => {
    if (screen === "playing") {
      lastTimeRef.current = 0;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }
  }, [screen, gameLoop]);

  // ── Menu background animation ─────────────────────────────────
  useEffect(() => {
    if (screen !== "menu" && screen !== "gameover" && screen !== "victory") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let frame = 0;

    const drawMenuBg = () => {
      frame++;
      ctx.fillStyle = "#050520";
      ctx.fillRect(0, 0, CW, CH);

      // Animated grid
      ctx.strokeStyle = "rgba(0,240,255,0.06)";
      ctx.lineWidth = 1;
      const off = (frame * 0.5) % 40;
      for (let x = -40 + off; x < CW + 40; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
      }
      for (let y = -40 + off; y < CH + 40; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
      }

      // Floating particles
      for (let i = 0; i < 20; i++) {
        const px = (Math.sin(frame * 0.01 + i * 1.7) * 0.5 + 0.5) * CW;
        const py = (Math.cos(frame * 0.008 + i * 2.3) * 0.5 + 0.5) * CH;
        ctx.fillStyle = `rgba(0,240,255,${0.1 + Math.sin(frame * 0.02 + i) * 0.05})`;
        ctx.fillRect(px, py, 2, 2);
      }

      // Scanlines
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      for (let y = 0; y < CH; y += 4) ctx.fillRect(0, y, CW, 2);

      animId = requestAnimationFrame(drawMenuBg);
    };

    animId = requestAnimationFrame(drawMenuBg);
    return () => cancelAnimationFrame(animId);
  }, [screen]);

  // ── Screen transitions ─────────────────────────────────────────
  const initAudio = async () => {
    if (!audioRef.current) audioRef.current = new BrickAudio();
    audioRef.current.init();
  };

  const handleRegister = async (userData) => {
    const jogador = await register(userData);
    if (jogador) {
      await initAudio();
      playCountRef.current++;
      initGame(1);
      setScreen("playing");
      window.gtag?.("event", "game_start", { game_name: "brickbreaker" });
    }
  };

  const handleMenuStart = async (startPhase = 1) => {
    if (user) {
      // Check if tutorial has been seen
      let tutorialSeen = false;
      try { tutorialSeen = localStorage.getItem("brickbreaker_tutorial_seen") === "true"; } catch { /* */ }
      if (!tutorialSeen) {
        pendingStartPhaseRef.current = startPhase;
        setShowTutorial(true);
        return;
      }
      await initAudio();
      playCountRef.current++;
      initGame(startPhase);
      setScreen("playing");
      window.gtag?.("event", "game_start", { game_name: "brickbreaker" });
    } else {
      setScreen("register");
    }
  };

  const handleTutorialStart = async () => {
    if (dontShowTutorial) {
      try { localStorage.setItem("brickbreaker_tutorial_seen", "true"); } catch { /* */ }
    }
    setShowTutorial(false);
    setDontShowTutorial(false);
    const startPhase = pendingStartPhaseRef.current;
    await initAudio();
    playCountRef.current++;
    initGame(startPhase);
    setScreen("playing");
    window.gtag?.("event", "game_start", { game_name: "brickbreaker" });
  };

  const handleShowHowToPlay = () => {
    setShowHowTo(true);
  };

  const handleRestart = async () => {
    await initAudio();
    playCountRef.current++;
    initGame(1);
    setScreen("playing");
    window.gtag?.("event", "game_start", { game_name: "brickbreaker" });
  };

  const handleResume = () => {
    const g = gameRef.current;
    if (g) {
      g.paused = false;
      setScreen("playing");
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setMuted(audioRef.current.muted);
    }
  };

  // ── Render ─────────────────────────────────────────────────────
  const isPlaying = screen === "playing" || screen === "paused";

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
        @keyframes bbPulse {
          0%, 100% { text-shadow: 0 0 20px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.2); }
          50% { text-shadow: 0 0 30px rgba(0,240,255,0.8), 0 0 60px rgba(0,240,255,0.3); }
        }
        @keyframes bbFloat {
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
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(-2px, 1px); }
          50% { transform: translate(2px, -1px); }
          75% { transform: translate(-1px, -2px); }
        }
        @keyframes fireworks {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1.5); }
        }
      `}</style>

      {!isPlaying && (
        <AdBanner slot="brickbreaker_top" style={{ marginBottom: 12, maxWidth: CW }} />
      )}

      {screen !== "menu" && !selectWorld && !showHowTo && !showTutorial && (
        <>
          <h1
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 16,
              color: ACCENT,
              textShadow: `0 0 20px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.15)`,
              marginBottom: 6,
              letterSpacing: 3,
              textAlign: "center",
            }}
          >
            BRICK BREAKER
          </h1>
          <p
            style={{
              color: "#4a5568",
              fontSize: 8,
              marginBottom: 10,
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            DESTRUA TODOS OS BLOCOS
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
            boxShadow: "0 0 30px rgba(0,240,255,0.1)",
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

          {/* ── MENU OVERLAY ───────────────────────────── */}
          {screen === "menu" && !showHowTo && !selectWorld && !showTutorial && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,5,16,0.88)",
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
                  fontSize: 20,
                  color: ACCENT,
                  animation: "bbPulse 2s ease-in-out infinite",
                  marginBottom: 4,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                BRICK
                <br />
                BREAKER
              </h1>

              {/* Decorative brick */}
              <div style={{ animation: "bbFloat 2s ease-in-out infinite", marginBottom: 20, marginTop: 8 }}>
                <svg width="60" height="30" viewBox="0 0 60 30">
                  <rect x="2" y="2" width="16" height="10" rx="2" fill="#ef4444" opacity="0.8" />
                  <rect x="22" y="2" width="16" height="10" rx="2" fill="#eab308" opacity="0.8" />
                  <rect x="42" y="2" width="16" height="10" rx="2" fill="#22c55e" opacity="0.8" />
                  <rect x="12" y="16" width="16" height="10" rx="2" fill="#3b82f6" opacity="0.8" />
                  <rect x="32" y="16" width="16" height="10" rx="2" fill="#a855f7" opacity="0.8" />
                </svg>
              </div>

              {getHighScore() > 0 && (
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                  color: "#ffd700",
                  marginBottom: 16,
                }}>
                  RECORDE: {getHighScore().toLocaleString()}
                </div>
              )}

              <button
                onClick={() => handleMenuStart(1)}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12,
                  color: "#050510",
                  background: ACCENT,
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 40px",
                  cursor: "pointer",
                  boxShadow: `0 0 20px rgba(0,240,255,0.4)`,
                  letterSpacing: 2,
                  marginBottom: 10,
                }}
              >
                JOGAR
              </button>

              {getMaxPhase() > 1 && (
                <button
                  onClick={() => setSelectWorld(true)}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 9,
                    color: ACCENT,
                    background: "transparent",
                    border: `1px solid ${ACCENT}44`,
                    borderRadius: 6,
                    padding: "8px 20px",
                    cursor: "pointer",
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  SELECIONAR MUNDO
                </button>
              )}

              <button
                onClick={handleShowHowToPlay}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#8892b0",
                  background: "transparent",
                  border: `1px solid #33335566`,
                  borderRadius: 6,
                  padding: "8px 20px",
                  cursor: "pointer",
                  letterSpacing: 1,
                }}
              >
                {"❓ COMO JOGAR"}
              </button>

              <div
                style={{
                  marginTop: 20,
                  color: "#445",
                  fontSize: 7,
                  fontFamily: "'Press Start 2P', monospace",
                  textAlign: "center",
                  lineHeight: 2.2,
                }}
              >
                <div>MOUSE/TOUCH: MOVER</div>
                <div>ESPACO/TAP: LANCAR</div>
                <div>P/ESC: PAUSAR | M: MUTE</div>
              </div>
            </div>
          )}

          {/* ── SELECT WORLD OVERLAY ──────────────────── */}
          {screen === "menu" && selectWorld && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,5,16,0.95)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                padding: 20,
              }}
            >
              <h2 style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 14,
                color: ACCENT,
                marginBottom: 20,
              }}>
                SELECIONAR MUNDO
              </h2>

              {WORLD_NAMES.map((name, idx) => {
                const startPhase = idx * 5 + 1;
                const unlocked = idx <= getUnlockedWorld();
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (unlocked) {
                        setSelectWorld(false);
                        handleMenuStart(startPhase);
                      }
                    }}
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 10,
                      color: unlocked ? WORLD_BG[idx][2] : "#333",
                      background: unlocked ? "rgba(255,255,255,0.05)" : "transparent",
                      border: `1px solid ${unlocked ? WORLD_BG[idx][2] + "66" : "#222"}`,
                      borderRadius: 8,
                      padding: "10px 24px",
                      cursor: unlocked ? "pointer" : "default",
                      width: "80%",
                      marginBottom: 8,
                      textAlign: "left",
                      opacity: unlocked ? 1 : 0.4,
                    }}
                  >
                    {unlocked ? "" : "🔒 "}{name}
                    <span style={{ fontSize: 7, color: "#666", marginLeft: 8 }}>
                      FASES {startPhase}-{startPhase + 4}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setSelectWorld(false)}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#666",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  padding: "8px 20px",
                  cursor: "pointer",
                  marginTop: 12,
                }}
              >
                VOLTAR
              </button>
            </div>
          )}

          {/* ── HOW TO PLAY (from menu button) ────────── */}
          {screen === "menu" && showHowTo && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,5,16,0.92)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                animation: "fadeSlideIn 0.3s ease-out",
              }}
            >
              <div style={{
                background: "rgba(10,15,30,0.95)",
                border: `1px solid ${ACCENT}33`,
                borderRadius: 16,
                padding: "24px 28px",
                maxWidth: 400,
                width: "90%",
                boxShadow: `0 0 40px rgba(0,240,255,0.1), inset 0 0 30px rgba(0,240,255,0.03)`,
              }}>
                <h2 style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  color: ACCENT,
                  marginBottom: 20,
                  textAlign: "center",
                  textShadow: `0 0 20px rgba(0,240,255,0.5)`,
                }}>
                  COMO JOGAR
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { emoji: "\uD83D\uDDB1\uFE0F", text: "Mova o mouse para controlar o batedor", label: "Desktop" },
                    { emoji: "\uD83D\uDCF1", text: "Arraste o dedo para mover o batedor", label: "Mobile" },
                    { emoji: "\u2328\uFE0F", text: "ESPA\u00C7O ou toque para lan\u00E7ar a bola" },
                    { emoji: "\uD83E\uDDF1", text: "Destrua todos os tijolos para avan\u00E7ar" },
                    { emoji: "\uD83D\uDC8A", text: "Colete power-ups que caem dos tijolos" },
                    { emoji: "\uD83D\uDC7E", text: "Cuidado com os inimigos a partir da Fase 3" },
                    { emoji: "\u2764\uFE0F", text: "Voc\u00EA come\u00E7a com 3 vidas" },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0, width: 28, textAlign: "center" }}>
                        {item.emoji}
                      </span>
                      <span style={{
                        fontFamily: "'Fira Code', monospace",
                        fontSize: 11,
                        color: "#ccd6f6",
                        lineHeight: 1.4,
                      }}>
                        {item.label && (
                          <span style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: 7,
                            color: ACCENT,
                            marginRight: 6,
                          }}>
                            {item.label}:
                          </span>
                        )}
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowHowTo(false)}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 9,
                    color: "#666",
                    background: "transparent",
                    border: "1px solid #333",
                    borderRadius: 6,
                    padding: "8px 20px",
                    cursor: "pointer",
                    marginTop: 20,
                    display: "block",
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  VOLTAR
                </button>
              </div>
            </div>
          )}

          {/* ── TUTORIAL OVERLAY (first-time or pre-game) ── */}
          {showTutorial && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,5,16,0.92)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 110,
                animation: "fadeSlideIn 0.3s ease-out",
              }}
            >
              <div style={{
                background: "rgba(10,15,30,0.95)",
                border: `1px solid ${ACCENT}33`,
                borderRadius: 16,
                padding: "24px 28px",
                maxWidth: 400,
                width: "90%",
                boxShadow: `0 0 40px rgba(0,240,255,0.1), inset 0 0 30px rgba(0,240,255,0.03)`,
              }}>
                <h2 style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  color: ACCENT,
                  marginBottom: 20,
                  textAlign: "center",
                  textShadow: `0 0 20px rgba(0,240,255,0.5)`,
                }}>
                  COMO JOGAR
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { emoji: "\uD83D\uDDB1\uFE0F", text: "Mova o mouse para controlar o batedor", label: "Desktop" },
                    { emoji: "\uD83D\uDCF1", text: "Arraste o dedo para mover o batedor", label: "Mobile" },
                    { emoji: "\u2328\uFE0F", text: "ESPA\u00C7O ou toque para lan\u00E7ar a bola" },
                    { emoji: "\uD83E\uDDF1", text: "Destrua todos os tijolos para avan\u00E7ar" },
                    { emoji: "\uD83D\uDC8A", text: "Colete power-ups que caem dos tijolos" },
                    { emoji: "\uD83D\uDC7E", text: "Cuidado com os inimigos a partir da Fase 3" },
                    { emoji: "\u2764\uFE0F", text: "Voc\u00EA come\u00E7a com 3 vidas" },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}>
                      <span style={{ fontSize: 18, flexShrink: 0, width: 28, textAlign: "center" }}>
                        {item.emoji}
                      </span>
                      <span style={{
                        fontFamily: "'Fira Code', monospace",
                        fontSize: 11,
                        color: "#ccd6f6",
                        lineHeight: 1.4,
                      }}>
                        {item.label && (
                          <span style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: 7,
                            color: ACCENT,
                            marginRight: 6,
                          }}>
                            {item.label}:
                          </span>
                        )}
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>

                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 20,
                  cursor: "pointer",
                  justifyContent: "center",
                }}>
                  <input
                    type="checkbox"
                    checked={dontShowTutorial}
                    onChange={(e) => setDontShowTutorial(e.target.checked)}
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: ACCENT,
                      cursor: "pointer",
                    }}
                  />
                  <span style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 10,
                    color: "#8892b0",
                  }}>
                    {"N\u00E3o mostrar novamente"}
                  </span>
                </label>

                <button
                  onClick={handleTutorialStart}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 12,
                    color: "#050510",
                    background: "#22c55e",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 40px",
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(34,197,94,0.4)",
                    letterSpacing: 2,
                    marginTop: 16,
                    display: "block",
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  {"JOGAR!"}
                </button>
              </div>
            </div>
          )}

          {/* ── REGISTER ──────────────────────────────── */}
          {screen === "register" && (
            <RegisterModal
              onRegister={handleRegister}
              loading={registering}
              jogoNome="BRICK BREAKER"
              accentColor={ACCENT}
            />
          )}

          {/* ── PAUSE OVERLAY ─────────────────────────── */}
          {screen === "paused" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,5,16,0.88)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                animation: "fadeSlideIn 0.2s ease-out",
              }}
            >
              <h2 style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 20,
                color: ACCENT,
                marginBottom: 30,
                textShadow: `0 0 20px rgba(0,240,255,0.5)`,
              }}>
                PAUSADO
              </h2>

              <button
                onClick={handleResume}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12,
                  color: "#050510",
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
                onClick={handleRestart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: ACCENT,
                  background: "transparent",
                  border: `1px solid ${ACCENT}44`,
                  borderRadius: 6,
                  padding: "8px 20px",
                  cursor: "pointer",
                  letterSpacing: 1,
                  marginBottom: 8,
                }}
              >
                REINICIAR
              </button>

              <button
                onClick={() => {
                  if (rafRef.current) cancelAnimationFrame(rafRef.current);
                  setScreen("menu");
                }}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#666",
                  background: "transparent",
                  border: "1px solid #333",
                  borderRadius: 6,
                  padding: "8px 20px",
                  cursor: "pointer",
                  letterSpacing: 1,
                }}
              >
                MENU
              </button>

              <button
                onClick={handleToggleMute}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                  color: muted ? "#ef4444" : "#22c55e",
                  background: "transparent",
                  border: `1px solid ${muted ? "#ef444444" : "#22c55e44"}`,
                  borderRadius: 6,
                  padding: "6px 16px",
                  cursor: "pointer",
                  marginTop: 16,
                }}
              >
                SOM: {muted ? "OFF" : "ON"}
              </button>
            </div>
          )}

          {/* ── Pause button (during gameplay) ────────── */}
          {screen === "playing" && (
            <button
              onClick={() => {
                const g = gameRef.current;
                if (g) {
                  g.paused = true;
                  setScreen("paused");
                }
              }}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 32,
                height: 32,
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                color: "#fff",
                fontSize: 16,
                cursor: "pointer",
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ⏸
            </button>
          )}

          {/* ── LEVEL COMPLETE ─────────────────────────── */}
          {screen === "levelComplete" && finalStats && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,5,16,0.9)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                animation: "fadeSlideIn 0.4s ease-out",
              }}
            >
              <h2 style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 16,
                color: "#22c55e",
                textShadow: "0 0 20px rgba(34,197,94,0.5)",
                marginBottom: 16,
              }}>
                FASE {finalStats.phase} COMPLETA!
              </h2>

              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 10,
                color: ACCENT,
                marginBottom: 8,
              }}>
                BONUS: +{finalStats.phaseBonus?.toLocaleString()}
              </div>

              {finalStats.perfect && (
                <div style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#ffd700",
                  marginBottom: 8,
                }}>
                  PERFEITO! +500
                </div>
              )}

              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 8,
                color: "#4a5568",
                marginTop: 16,
              }}>
                PROXIMA FASE EM 3S...
              </div>
            </div>
          )}

          {/* ── WORLD TRANSITION ───────────────────────── */}
          {screen === "worldTransition" && finalStats && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(5,5,16,0.95)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
                animation: "fadeSlideIn 0.6s ease-out",
              }}
            >
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 8,
                color: "#4a5568",
                marginBottom: 8,
              }}>
                MUNDO {finalStats.world + 1}
              </div>

              <h2 style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 18,
                color: WORLD_BG[finalStats.world]?.[2] || ACCENT,
                textShadow: `0 0 30px ${WORLD_BG[finalStats.world]?.[2] || ACCENT}88`,
                marginBottom: 10,
              }}>
                {finalStats.worldName}
              </h2>

              <div style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 12,
                color: "#8892b0",
                marginBottom: 20,
              }}>
                {finalStats.tag}
              </div>

              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 10,
                color: "#ffd700",
              }}>
                BONUS: +{finalStats.bonus?.toLocaleString()}
              </div>
            </div>
          )}

          {/* ── GAME OVER ──────────────────────────────── */}
          {screen === "gameover" && finalStats && (
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
                  animation: "glitch 0.5s ease-in-out 3",
                }}
              >
                GAME OVER
              </h2>

              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 28,
                alignItems: "center",
              }}>
                <div style={{ textAlign: "center", animation: "scoreCount 0.5s ease-out" }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                    PONTOS
                  </div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: ACCENT, textShadow: `0 0 10px rgba(0,240,255,0.5)` }}>
                    {finalStats.score.toLocaleString()}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 24 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                      FASE
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#39ff14" }}>
                      {finalStats.phase}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                      BLOCOS
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ffaa00" }}>
                      {finalStats.bricks}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                      INIMIGOS
                    </div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ef4444" }}>
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
                  background: ACCENT,
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 32px",
                  cursor: "pointer",
                  boxShadow: `0 0 20px rgba(0,240,255,0.4)`,
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
                  marginTop: 4,
                }}
              >
                MENU
              </button>

              <AdBanner slot="brickbreaker_between" style={{ marginTop: 12, maxWidth: 300 }} />
            </div>
          )}

          {/* ── VICTORY ────────────────────────────────── */}
          {screen === "victory" && finalStats && (
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
                  animation: "bbPulse 1.5s ease-in-out infinite",
                }}
              >
                VITORIA!
              </h2>

              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 9,
                color: "#ffd700",
                marginBottom: 20,
              }}>
                TODAS AS 25 FASES COMPLETAS!
              </div>

              <div style={{ textAlign: "center", animation: "scoreCount 0.5s ease-out" }}>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>
                  PONTUACAO FINAL
                </div>
                <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 24, color: "#ffd700", textShadow: "0 0 15px rgba(255,215,0,0.5)" }}>
                  {finalStats.score.toLocaleString()}
                </div>
              </div>

              <div style={{ display: "flex", gap: 20, marginTop: 16, marginBottom: 24 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>BLOCOS</div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ffaa00" }}>{finalStats.bricks}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#4a5568", marginBottom: 4 }}>INIMIGOS</div>
                  <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ef4444" }}>{finalStats.enemies}</div>
                </div>
              </div>

              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 8,
                color: "#a855f7",
                marginBottom: 20,
              }}>
                +50,000 BONUS FINAL
              </div>

              <button
                onClick={handleRestart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12,
                  color: "#050510",
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

      {user && isPlaying && (
        <div
          style={{
            width: CW * gameScale,
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

      <AdBanner slot="brickbreaker_bottom" style={{ marginTop: 16, maxWidth: CW }} />
    </div>
  );
}
