"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";
import useMobile from "@/hooks/useMobile";
import useLockScroll from "@/hooks/useLockScroll";

// ============================================================
// CONSTANTS
// ============================================================
const CANVAS_W = 400;
const CANVAS_H = 600;
const COLS = 13;
const ROWS = 13;
const TILE_W = CANVAS_W / COLS;   // ~30.77
const TILE_H = CANVAS_H / ROWS;   // ~46.15
const ACCENT = "#39ff14";
const TIMER_TOTAL = 30; // seconds per life

// Row assignments (bottom=0)
const ROW_SPAWN = 0;
const ROW_ROAD_START = 1;
const ROW_ROAD_END = 5;
const ROW_SIDEWALK = 6;
const ROW_RIVER_START = 7;
const ROW_RIVER_END = 11;
const ROW_HOMES = 12;

// Home positions (column indices for center of each home)
const HOME_COLS = [1, 4, 6, 9, 11];

// ============================================================
// AUDIO ENGINE
// ============================================================
class JacareAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicInterval = null;
    this.musicTimeout = null;
  }

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.08;
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.15;
    this.sfxGain.connect(this.ctx.destination);
  }

  setMuted(m) {
    this.muted = m;
    if (this.musicGain) this.musicGain.gain.value = m ? 0 : 0.08;
    if (this.sfxGain) this.sfxGain.gain.value = m ? 0 : 0.15;
  }

  _sfxTone(freq, dur, type = "square") {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  hop() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  splash() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
    source.stop(this.ctx.currentTime + 0.35);
  }

  honk() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  victory() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.12 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(this.ctx.currentTime + i * 0.12);
      osc.stop(this.ctx.currentTime + i * 0.12 + 0.2);
    });
  }

  powerUp() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + i * 0.07 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.07 + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(this.ctx.currentTime + i * 0.07);
      osc.stop(this.ctx.currentTime + i * 0.07 + 0.12);
    });
  }

  gameOver() {
    if (!this.ctx) return;
    const notes = [261.63, 246.94, 220.00, 196.00]; // C4 B3 A3 G3
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.15 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(this.ctx.currentTime + i * 0.15);
      osc.stop(this.ctx.currentTime + i * 0.15 + 0.2);
    });
  }

  phaseComplete() {
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.1 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(this.ctx.currentTime + i * 0.1);
      osc.stop(this.ctx.currentTime + i * 0.1 + 0.2);
    });
  }

  startMusic(phase = 1) {
    this.stopMusic();
    if (!this.ctx) return;
    const bpm = 140 + (phase - 1) * 5;
    const beatDur = 60 / bpm;
    const melody = [
      261.63, 329.63, 392.00, 523.25, 392.00, 329.63,
      261.63, 293.66, 349.23, 440.00, 349.23, 293.66,
    ]; // C4 E4 G4 C5 G4 E4 C4 D4 F4 A4 F4 D4
    let noteIdx = 0;
    const playNote = () => {
      if (!this.ctx) return;
      const freq = melody[noteIdx % melody.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + beatDur * 0.8);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + beatDur);
      noteIdx++;
    };
    playNote();
    this.musicInterval = setInterval(playNote, beatDur * 1000);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function rowToCanvasY(row) {
  // Row 0 is at the bottom. Canvas Y=0 is top.
  return (ROWS - 1 - row) * TILE_H;
}

function colToCanvasX(col) {
  return col * TILE_W;
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ============================================================
// LANE CONFIGURATION
// ============================================================
function createLanes(phase) {
  const speedMult = phase <= 4
    ? [1.0, 1.2, 1.35, 1.5][phase - 1]
    : 1.5 + (phase - 4) * 0.1;

  const vehicles = [
    // row, direction (+1=right, -1=left), speed, tileLength, count, type
    // Base speeds reduced by 30% (×0.7) so Phase 1 isn't too fast
    { row: 1, dir: 1, speed: 0.84 * speedMult, len: 2, count: 3, type: "car" },
    { row: 2, dir: -1, speed: 0.49 * speedMult, len: 3, count: 2, type: "truck" },
    { row: 3, dir: 1, speed: 1.26 * speedMult, len: 1, count: 4, type: "moto" },
    { row: 4, dir: -1, speed: 0.70 * speedMult, len: 2, count: 3, type: "car2" },
    { row: 5, dir: 1, speed: 0.63 * speedMult, len: 4, count: 2, type: "bus" },
  ];

  const riverSpeedMult = phase <= 4
    ? [1.0, 1.15, 1.25, 1.4][phase - 1]
    : 1.4 + (phase - 4) * 0.1;

  let logLen9 = phase >= 3 ? 2 : 3; // shorter logs at phase 3+

  const river = [
    { row: 7, dir: 1, speed: 0.6 * riverSpeedMult, len: 3, count: 3, type: "log" },
    { row: 8, dir: -1, speed: 0.5 * riverSpeedMult, len: 3, count: 3, type: "turtle", sinks: true },
    { row: 9, dir: 1, speed: 0.8 * riverSpeedMult, len: logLen9, count: 3, type: "log" },
    { row: 10, dir: -1, speed: 0.55 * riverSpeedMult, len: 4, count: 2, type: "log", hasEnemyCroc: phase >= 2 },
    { row: 11, dir: 1, speed: 0.65 * riverSpeedMult, len: 2, count: 4, type: "turtle", sinks: false },
  ];

  // Phase 4+: enemy croc in row 9 too
  if (phase >= 4) {
    river[2].hasEnemyCroc = true;
  }

  return { vehicles, river };
}

function spawnLaneObjects(laneDef) {
  const objects = [];
  const spacing = COLS / laneDef.count;
  for (let i = 0; i < laneDef.count; i++) {
    const startCol = i * spacing + Math.random() * (spacing - laneDef.len);
    objects.push({
      x: startCol * TILE_W,
      y: rowToCanvasY(laneDef.row),
      w: laneDef.len * TILE_W,
      h: TILE_H,
      dir: laneDef.dir,
      speed: laneDef.speed,
      type: laneDef.type,
      row: laneDef.row,
      sinks: laneDef.sinks || false,
      sinkPhase: 0, // 0=visible, 1=warning, 2=sunk
      sinkTimer: 0,
      isEnemyCroc: false,
      color: laneDef.type === "car" ? ["#e74c3c", "#3498db", "#f1c40f"][i % 3]
        : laneDef.type === "car2" ? ["#e67e22", "#9b59b6", "#1abc9c"][i % 3]
        : undefined,
    });
  }

  // Add enemy croc to last object in lane
  if (laneDef.hasEnemyCroc && objects.length > 0) {
    objects[objects.length - 1].isEnemyCroc = true;
  }

  return objects;
}

// ============================================================
// DRAWING FUNCTIONS
// ============================================================
function drawGrass(ctx, y, w, h) {
  ctx.fillStyle = "#3a8c2e";
  ctx.fillRect(0, y, w, h);
  // Lighter stripes
  ctx.fillStyle = "#44a035";
  for (let i = 0; i < w; i += 12) {
    ctx.fillRect(i, y + h * 0.3, 4, h * 0.4);
  }
}

function drawRoad(ctx, y, w, h, laneCount) {
  ctx.fillStyle = "#333";
  ctx.fillRect(0, y, w, h);
  // Lane dividers
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  for (let lane = 1; lane < laneCount; lane++) {
    const ly = y + (lane * h) / laneCount;
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(w, ly);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // Edge lines
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(w, y);
  ctx.moveTo(0, y + h);
  ctx.lineTo(w, y + h);
  ctx.stroke();
}

function drawSidewalk(ctx, y, w, h) {
  ctx.fillStyle = "#a0a0a0";
  ctx.fillRect(0, y, w, h);
  ctx.fillStyle = "#b0b0b0";
  for (let i = 0; i < w; i += TILE_W) {
    ctx.fillRect(i + 1, y + 1, TILE_W - 2, h - 2);
  }
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 1;
  for (let i = 0; i <= w; i += TILE_W) {
    ctx.beginPath();
    ctx.moveTo(i, y);
    ctx.lineTo(i, y + h);
    ctx.stroke();
  }
}

function drawRiver(ctx, y, w, h, time) {
  // Gradient background
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, "#1a6b8a");
  grad.addColorStop(1, "#0d4f6e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, h);

  // Animated waves
  ctx.strokeStyle = "rgba(100, 200, 255, 0.15)";
  ctx.lineWidth = 1;
  for (let row = 0; row < 8; row++) {
    ctx.beginPath();
    const wy = y + row * (h / 8);
    for (let x = 0; x < w; x += 2) {
      const yOff = Math.sin((x + time * 60 + row * 40) * 0.03) * 3;
      if (x === 0) ctx.moveTo(x, wy + yOff);
      else ctx.lineTo(x, wy + yOff);
    }
    ctx.stroke();
  }
}

function drawHomes(ctx, y, w, h, filledHomes) {
  // Background: water behind homes
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, "#0d4f6e");
  grad.addColorStop(1, "#1a6b8a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y, w, h);

  // Draw each home
  HOME_COLS.forEach((col, idx) => {
    const hx = col * TILE_W;
    const hw = TILE_W * 1.5;
    const centerX = hx + hw / 2;

    // Bush decorations on sides
    ctx.fillStyle = "#2d6b1e";
    ctx.beginPath();
    ctx.arc(hx - 4, y + h - 4, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hx + hw + 4, y + h - 4, 8, 0, Math.PI * 2);
    ctx.fill();

    // Home opening (semi-circle den)
    ctx.fillStyle = filledHomes[idx] ? "#1a4a1a" : "#0a0a0a";
    ctx.beginPath();
    ctx.arc(centerX, y + h, hw / 2, Math.PI, 0);
    ctx.fill();

    // Border
    ctx.strokeStyle = filledHomes[idx] ? ACCENT : "#555";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, y + h, hw / 2, Math.PI, 0);
    ctx.stroke();

    // If filled, draw small croc
    if (filledHomes[idx]) {
      drawMiniCroc(ctx, centerX, y + h - 14, 0.5);
    }
  });
}

function drawMiniCroc(ctx, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  // Body
  ctx.fillStyle = "#2d5a1e";
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = "#3a7a2a";
  ctx.beginPath();
  ctx.arc(0, -12, 8, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-4, -15, 3, 0, Math.PI * 2);
  ctx.arc(4, -15, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-4, -15, 1.5, 0, Math.PI * 2);
  ctx.arc(4, -15, 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Thumbs up (yellow circle rising)
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.arc(12, -8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCrocodile(ctx, x, y, dir, hopAnim, idle, time) {
  ctx.save();
  ctx.translate(x + TILE_W / 2, y + TILE_H / 2);

  // Rotation based on direction
  const angles = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
  ctx.rotate(angles[dir] || 0);

  // Idle oscillation
  if (idle) {
    ctx.rotate(Math.sin(time * 4) * 0.035);
  }

  // Hop squash-and-stretch
  let sx = 1, sy = 1;
  if (hopAnim > 0) {
    const t = hopAnim; // 0 to 1
    if (t > 0.5) {
      // Squash at start
      sx = 1 + (1 - t) * 0.3;
      sy = 1 - (1 - t) * 0.2;
    } else {
      // Stretch mid-hop
      sx = 1 - t * 0.15;
      sy = 1 + t * 0.25;
    }
  }
  ctx.scale(sx, sy);

  const bw = TILE_W * 0.85;
  const bh = TILE_H * 0.7;

  // Tail (thin triangle)
  ctx.fillStyle = "#2d5a1e";
  ctx.beginPath();
  ctx.moveTo(-3, bh / 2 + 2);
  ctx.lineTo(3, bh / 2 + 2);
  ctx.lineTo(0, bh / 2 + 14);
  ctx.closePath();
  ctx.fill();

  // Paws
  ctx.fillStyle = "#3a7a2a";
  const pawW = 5, pawH = 7;
  // Front paws
  ctx.beginPath();
  ctx.roundRect(-bw / 2 - pawW + 2, -bh / 3, pawW, pawH, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(bw / 2 - 2, -bh / 3, pawW, pawH, 2);
  ctx.fill();
  // Back paws
  ctx.beginPath();
  ctx.roundRect(-bw / 2 - pawW + 2, bh / 4, pawW, pawH, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(bw / 2 - 2, bh / 4, pawW, pawH, 2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#2d5a1e";
  ctx.beginPath();
  ctx.ellipse(0, 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Scale arcs on body
  ctx.strokeStyle = "#245018";
  ctx.lineWidth = 0.8;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(i * 5, 2 + i * 2, 4, 0, Math.PI);
    ctx.stroke();
  }

  // Head
  ctx.fillStyle = "#3a7a2a";
  ctx.beginPath();
  ctx.arc(0, -bh / 2 - 2, bw / 3, 0, Math.PI * 2);
  ctx.fill();

  // Snout
  ctx.fillStyle = "#4a9a3a";
  ctx.beginPath();
  ctx.ellipse(0, -bh / 2 - 9, 5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nostrils
  ctx.fillStyle = "#1a4a0e";
  ctx.beginPath();
  ctx.arc(-2, -bh / 2 - 10, 1, 0, Math.PI * 2);
  ctx.arc(2, -bh / 2 - 10, 1, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-5, -bh / 2 - 4, 4, 0, Math.PI * 2);
  ctx.arc(5, -bh / 2 - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(-5, -bh / 2 - 4, 2, 0, Math.PI * 2);
  ctx.arc(5, -bh / 2 - 4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCar(ctx, obj) {
  ctx.save();
  const { x, y, w, h, dir, color } = obj;
  const carColor = color || "#e74c3c";
  const carH = h * 0.65;
  const carY = y + (h - carH) / 2;

  // Body
  ctx.fillStyle = carColor;
  ctx.beginPath();
  ctx.roundRect(x, carY, w, carH, 4);
  ctx.fill();

  // Roof / windows
  ctx.fillStyle = "#555";
  const winW = w * 0.3;
  const winH = carH * 0.4;
  ctx.fillRect(x + w * 0.25, carY + 3, winW, winH);
  ctx.fillRect(x + w * 0.6, carY + 3, winW, winH);

  // Headlights
  ctx.fillStyle = "#ff0";
  if (dir > 0) {
    ctx.beginPath();
    ctx.arc(x + w - 2, carY + carH * 0.25, 2, 0, Math.PI * 2);
    ctx.arc(x + w - 2, carY + carH * 0.75, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x + 2, carY + carH * 0.25, 2, 0, Math.PI * 2);
    ctx.arc(x + 2, carY + carH * 0.75, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wheels
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + w * 0.2, carY + carH, 4, 0, Math.PI * 2);
  ctx.arc(x + w * 0.8, carY + carH, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTruck(ctx, obj) {
  ctx.save();
  const { x, y, w, h, dir } = obj;
  const tH = h * 0.7;
  const tY = y + (h - tH) / 2;

  // Cargo body
  ctx.fillStyle = "#eee";
  ctx.beginPath();
  ctx.roundRect(x + (dir < 0 ? w * 0.25 : 0), tY, w * 0.75, tH, 3);
  ctx.fill();
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cab
  ctx.fillStyle = "#27ae60";
  const cabX = dir < 0 ? x : x + w * 0.75;
  ctx.beginPath();
  ctx.roundRect(cabX, tY, w * 0.25, tH, 3);
  ctx.fill();

  // Cab window
  ctx.fillStyle = "#555";
  ctx.fillRect(cabX + 3, tY + 3, w * 0.25 - 6, tH * 0.4);

  // Wheels
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + w * 0.15, tY + tH, 5, 0, Math.PI * 2);
  ctx.arc(x + w * 0.5, tY + tH, 5, 0, Math.PI * 2);
  ctx.arc(x + w * 0.85, tY + tH, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMotorcycle(ctx, obj) {
  ctx.save();
  const { x, y, w, h, dir } = obj;
  const mx = x + w / 2;
  const my = y + h / 2;

  // Wheels
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(mx - 8 * dir, my + 8, 6, 0, Math.PI * 2);
  ctx.arc(mx + 8 * dir, my + 8, 5, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(mx - 10 * dir, my + 2);
  ctx.lineTo(mx + 10 * dir, my - 2);
  ctx.lineTo(mx + 6 * dir, my + 6);
  ctx.lineTo(mx - 6 * dir, my + 6);
  ctx.closePath();
  ctx.fill();

  // Rider
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(mx, my - 6, 5, 0, Math.PI * 2);
  ctx.fill();
  // Helmet
  ctx.fillStyle = "#f39c12";
  ctx.beginPath();
  ctx.arc(mx, my - 10, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBus(ctx, obj) {
  ctx.save();
  const { x, y, w, h, dir } = obj;
  const bH = h * 0.75;
  const bY = y + (h - bH) / 2;

  // Body
  ctx.fillStyle = "#f1c40f";
  ctx.beginPath();
  ctx.roundRect(x, bY, w, bH, 4);
  ctx.fill();

  // Stripe
  ctx.fillStyle = "#e67e22";
  ctx.fillRect(x, bY + bH * 0.6, w, 4);

  // Windows
  ctx.fillStyle = "#555";
  const winCount = Math.floor(w / 14);
  for (let i = 0; i < winCount; i++) {
    ctx.fillRect(x + 6 + i * 14, bY + 4, 9, bH * 0.35);
  }

  // Front
  ctx.fillStyle = "#fff";
  if (dir > 0) {
    ctx.fillRect(x + w - 4, bY + 5, 3, bH - 10);
  } else {
    ctx.fillRect(x + 1, bY + 5, 3, bH - 10);
  }

  // Wheels
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(x + w * 0.15, bY + bH, 5, 0, Math.PI * 2);
  ctx.arc(x + w * 0.5, bY + bH, 5, 0, Math.PI * 2);
  ctx.arc(x + w * 0.85, bY + bH, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawLog(ctx, obj, time) {
  ctx.save();
  const { x, y, w, h, isEnemyCroc } = obj;
  const logH = h * 0.55;
  const logY = y + (h - logH) / 2;

  if (isEnemyCroc) {
    // Enemy croc on log: flash red
    const flash = Math.sin(time * 8) > 0;
    ctx.fillStyle = flash ? "#8b0000" : "#5a3510";
  } else {
    ctx.fillStyle = "#5a3510";
  }
  ctx.beginPath();
  ctx.roundRect(x, logY, w, logH, logH / 2);
  ctx.fill();

  // Wood grain lines
  ctx.strokeStyle = "#4a2a0a";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const lx = x + (w * i) / 4;
    ctx.beginPath();
    ctx.moveTo(lx, logY + 3);
    ctx.lineTo(lx, logY + logH - 3);
    ctx.stroke();
  }

  // Horizontal grain
  ctx.strokeStyle = "#6a4520";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(x + 4, logY + logH / 2);
  ctx.lineTo(x + w - 4, logY + logH / 2);
  ctx.stroke();

  if (isEnemyCroc) {
    // Draw enemy croc eyes on the log
    const ex = x + w - 15;
    const ey = logY + logH / 2;
    ctx.fillStyle = "#ff0";
    ctx.beginPath();
    ctx.arc(ex, ey - 4, 3, 0, Math.PI * 2);
    ctx.arc(ex, ey + 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f00";
    ctx.beginPath();
    ctx.arc(ex, ey - 4, 1.5, 0, Math.PI * 2);
    ctx.arc(ex, ey + 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawTurtle(ctx, obj, time) {
  ctx.save();
  const { x, y, w, h, sinkPhase, sinkTimer } = obj;
  const count = Math.round(w / TILE_W);

  let alpha = 1;
  if (sinkPhase === 1) {
    // Warning: blink
    alpha = Math.sin(time * 12) > 0 ? 1 : 0.3;
  } else if (sinkPhase === 2) {
    // Sunk: faded
    alpha = 0.15;
  }

  ctx.globalAlpha = alpha;

  for (let i = 0; i < count; i++) {
    const tx = x + i * TILE_W + TILE_W / 2;
    const ty = y + h / 2;
    const r = Math.min(TILE_W, h) * 0.35;

    // Shell (ellipse)
    ctx.fillStyle = "#1a5a2a";
    ctx.beginPath();
    ctx.ellipse(tx, ty, r, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hex pattern on shell
    ctx.strokeStyle = "#0d3d18";
    ctx.lineWidth = 1;
    for (let a = 0; a < 6; a++) {
      const angle = (a / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + Math.cos(angle) * r * 0.7, ty + Math.sin(angle) * r * 0.5);
      ctx.stroke();
    }

    // Head
    ctx.fillStyle = "#2a7a3a";
    ctx.beginPath();
    ctx.arc(tx, ty - r * 0.7 - 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Tiny eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(tx - 1.5, ty - r * 0.7 - 4, 1, 0, Math.PI * 2);
    ctx.arc(tx + 1.5, ty - r * 0.7 - 4, 1, 0, Math.PI * 2);
    ctx.fill();

    // Flippers
    ctx.fillStyle = "#2a7a3a";
    ctx.beginPath();
    ctx.ellipse(tx - r, ty, 4, 2.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(tx + r, ty, 4, 2.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawVehicle(ctx, obj) {
  switch (obj.type) {
    case "car":
    case "car2":
      drawCar(ctx, obj);
      break;
    case "truck":
      drawTruck(ctx, obj);
      break;
    case "moto":
      drawMotorcycle(ctx, obj);
      break;
    case "bus":
      drawBus(ctx, obj);
      break;
  }
}

function drawSplashEffect(ctx, x, y, progress) {
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const r = 10 + (i + 1) * 15 * progress;
    const alpha = (1 - progress) * (1 - i * 0.25);
    ctx.strokeStyle = `rgba(100, 200, 255, ${Math.max(0, alpha)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Droplets
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dist = 20 * progress;
    const dx = x + Math.cos(angle) * dist;
    const dy = y + Math.sin(angle) * dist - 10 * progress;
    const alpha = 1 - progress;
    ctx.fillStyle = `rgba(100, 200, 255, ${Math.max(0, alpha)})`;
    ctx.beginPath();
    ctx.arc(dx, dy, 3 * (1 - progress), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSquashEffect(ctx, x, y, progress) {
  ctx.save();
  ctx.translate(x, y);
  const scale = 1 + progress * 0.5;
  ctx.scale(scale, 1 / scale);
  ctx.fillStyle = `rgba(255, 50, 50, ${(1 - progress) * 0.6})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, TILE_W * 0.6, TILE_H * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Stars
  ctx.fillStyle = `rgba(255, 255, 0, ${(1 - progress) * 0.8})`;
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + progress * 2;
    const dist = 15 + progress * 20;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 3 * (1 - progress), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTimerBar(ctx, x, y, w, h, pct, phase) {
  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();

  // Fill
  const color = pct > 0.5 ? ACCENT : pct > 0.25 ? "#f1c40f" : "#e74c3c";
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w * pct, h, 3);
  ctx.fill();

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w * pct, h, 3);
  ctx.fill();
  ctx.shadowBlur = 0;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function JogoDoJacare() {
  const t = useTranslations("games.jacare");
  const { user, checkedCookie, registering, register } = useJogador("jacare");
  const gameScale = useGameScale(CANVAS_W);
  const mobile = useMobile();
  const canvasRef = useRef(null);
  const audioRef = useRef(null);

  // Screens: menu, register, playing, paused, phaseComplete, gameOver
  const [screen, setScreen] = useState("menu");
  useLockScroll(screen === "playing");
  const [muted, setMuted] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayPhase, setDisplayPhase] = useState(1);
  const [displayLives, setDisplayLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [phaseCompleteData, setPhaseCompleteData] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);
  const [masterMode, setMasterMode] = useState(false);
  const [masterModeTimer, setMasterModeTimer] = useState(0);

  // Game state ref (not useState for game loop data)
  const gsRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const highScoreRef = useRef(0);
  const masterModeRef = useRef(false);
  const masterModeTimerRef = useRef(0);
  const gameLoopRef = useRef(null);

  // Joystick refs
  const joystickActiveRef = useRef(null);
  const joystickCenterRef = useRef({ x: 0, y: 0 });
  const joystickBaseRef = useRef(null);
  const joystickKnobRef = useRef(null);
  const joystickCooldownRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { highScoreRef.current = highScore; }, [highScore]);
  useEffect(() => { masterModeRef.current = masterMode; }, [masterMode]);
  useEffect(() => { masterModeTimerRef.current = masterModeTimer; }, [masterModeTimer]);

  // Load highscore
  useEffect(() => {
    try {
      const hs = localStorage.getItem("jacare_highscore");
      if (hs) {
        setHighScore(parseInt(hs, 10));
        highScoreRef.current = parseInt(hs, 10);
      }
    } catch {}
  }, []);

  // ============================================================
  // GAME STATE INITIALIZATION
  // ============================================================
  const initGameState = useCallback((phase = 1, score = 0, lives = 3, totalHomesFilled = 0) => {
    const lanes = createLanes(phase);
    const vehicleObjects = lanes.vehicles.flatMap(spawnLaneObjects);
    const riverObjects = lanes.river.flatMap(spawnLaneObjects);

    // Timer for turtle sinking
    const sinkInterval = phase >= 3 ? 8 : 10;
    const sinkDuration = phase >= 3 ? 3 : 2;

    const timerMax = phase >= 4 ? 25 : TIMER_TOTAL;

    return {
      phase,
      score,
      lives,
      timer: timerMax,
      timerMax,
      // Player
      playerCol: 6,
      playerRow: 0,
      playerDir: "up",
      playerAlive: true,
      hopAnim: 0,       // countdown from 1 to 0
      lastMoveTime: 0,
      // Objects
      vehicleObjects,
      riverObjects,
      // Homes
      filledHomes: [false, false, false, false, false],
      totalHomesFilled,
      // Death animation
      deathType: null,    // "splash", "squash", "timeout"
      deathAnim: 0,       // 0 to 1
      deathX: 0,
      deathY: 0,
      // Sink
      sinkInterval,
      sinkDuration,
      globalSinkTimer: 0,
      // Sub-pixel offset for river carrying
      playerPixelOffsetX: 0,
      // Misc
      distanceTraveled: 0,
      maxRowReached: 0,
      cumulativeScore: score,
      extraLifeThreshold: Math.floor(score / 1000) * 1000 + 1000,
      paused: false,
      // Phase complete
      phaseCompleteTimer: 0,
      // Master mode
      masterTriggered: false,
      // Guard flag to prevent double home detection in the same frame
      justEnteredHome: false,
    };
  }, []);

  // ============================================================
  // GAME LOOP
  // ============================================================
  const gameLoop = useCallback((timestamp) => {
    const gs = gsRef.current;
    if (!gs || !canvasRef.current) return;

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;

    if (gs.paused) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    const time = timestamp / 1000;

    // ---- UPDATE ----

    // Hop animation
    if (gs.hopAnim > 0) {
      gs.hopAnim = Math.max(0, gs.hopAnim - dt / 0.15);
    }

    // Death animation
    if (gs.deathType) {
      gs.deathAnim += dt / 0.8; // 800ms death animation
      if (gs.deathAnim >= 1) {
        gs.deathAnim = 0;
        gs.deathType = null;
        gs.lives--;
        setDisplayLives(gs.lives);

        if (gs.lives <= 0) {
          // Game Over
          if (audioRef.current) audioRef.current.gameOver();
          if (audioRef.current) audioRef.current.stopMusic();

          const finalScore = gs.score;
          const currentHigh = highScoreRef.current;
          if (finalScore > currentHigh) {
            setHighScore(finalScore);
            highScoreRef.current = finalScore;
            try { localStorage.setItem("jacare_highscore", String(finalScore)); } catch {}
          }

          setGameOverData({
            score: finalScore,
            phase: gs.phase,
            homesFilled: gs.totalHomesFilled,
            highScore: Math.max(finalScore, currentHigh),
          });

          // Submit score
          try {
            fetch("/api/scores", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jogo: "jacare",
                pontuacao: finalScore,
                metadata: {
                  fase: gs.phase,
                  casinhasPreenchidas: gs.totalHomesFilled,
                  distanciaPercorrida: gs.distanceTraveled,
                },
              }),
            }).catch(() => {});
          } catch {}

          if (typeof window !== "undefined" && window.gtag) {
            window.gtag("event", "game_end", { game: "jacare", score: finalScore });
          }

          setScreen("gameOver");
          gsRef.current = null;
          return;
        }

        // Respawn
        gs.playerCol = 6;
        gs.playerRow = 0;
        gs.playerDir = "up";
        gs.playerAlive = true;
        gs.timer = gs.timerMax;
      }
      // During death, still render but skip player update
    }

    if (gs.playerAlive && !gs.deathType) {
      // Timer countdown
      gs.timer -= dt;
      if (gs.timer <= 0) {
        gs.timer = 0;
        gs.deathType = "timeout";
        gs.deathAnim = 0;
        gs.deathX = colToCanvasX(gs.playerCol) + TILE_W / 2;
        gs.deathY = rowToCanvasY(gs.playerRow) + TILE_H / 2;
        gs.playerAlive = false;
      }
    }

    // Update vehicles
    gs.vehicleObjects.forEach(obj => {
      obj.x += obj.speed * obj.dir * 60 * dt;
      // Wrap around
      if (obj.dir > 0 && obj.x > CANVAS_W) {
        obj.x = -obj.w;
      } else if (obj.dir < 0 && obj.x + obj.w < 0) {
        obj.x = CANVAS_W;
      }
    });

    // Update river objects
    gs.globalSinkTimer += dt;
    gs.riverObjects.forEach(obj => {
      obj.x += obj.speed * obj.dir * 60 * dt;
      // Wrap around
      if (obj.dir > 0 && obj.x > CANVAS_W) {
        obj.x = -obj.w;
      } else if (obj.dir < 0 && obj.x + obj.w < 0) {
        obj.x = CANVAS_W;
      }

      // Turtle sinking logic
      if (obj.type === "turtle" && obj.sinks) {
        const cycleTime = gs.sinkInterval + gs.sinkDuration;
        const phase = gs.globalSinkTimer % cycleTime;
        if (phase > gs.sinkInterval - 1.5 && phase < gs.sinkInterval) {
          obj.sinkPhase = 1; // Warning
        } else if (phase >= gs.sinkInterval) {
          obj.sinkPhase = 2; // Sunk
        } else {
          obj.sinkPhase = 0; // Visible
        }
      }
    });

    // ---- COLLISION DETECTION ----
    // Reset home-entry guard when player is not on the homes row
    if (gs.playerRow !== ROW_HOMES) {
      gs.justEnteredHome = false;
    }

    if (gs.playerAlive && !gs.deathType) {
      const px = colToCanvasX(gs.playerCol) + gs.playerPixelOffsetX;
      const py = rowToCanvasY(gs.playerRow);
      const pw = TILE_W * 0.8;
      const ph = TILE_H * 0.8;
      const pxC = px + (TILE_W - pw) / 2;
      const pyC = py + (TILE_H - ph) / 2;

      // Check vehicle collisions (road zone)
      if (gs.playerRow >= ROW_ROAD_START && gs.playerRow <= ROW_ROAD_END) {
        for (const veh of gs.vehicleObjects) {
          if (veh.row !== gs.playerRow) continue;
          // Check wrap-around collision
          if (rectsOverlap(pxC, pyC, pw, ph, veh.x, veh.y, veh.w, veh.h)) {
            gs.deathType = "squash";
            gs.deathAnim = 0;
            gs.deathX = pxC + pw / 2;
            gs.deathY = pyC + ph / 2;
            gs.playerAlive = false;
            if (audioRef.current) audioRef.current.honk();
            break;
          }
        }
      }

      // Check river zone
      if (gs.playerRow >= ROW_RIVER_START && gs.playerRow <= ROW_RIVER_END) {
        let onPlatform = false;
        let platformObj = null;

        for (const rObj of gs.riverObjects) {
          if (rObj.row !== gs.playerRow) continue;

          // Check if player is on this object
          const objCenterRange = { x: rObj.x, w: rObj.w };
          if (pxC + pw > objCenterRange.x && pxC < objCenterRange.x + objCenterRange.w) {
            // Check if turtle is sunk
            if (rObj.type === "turtle" && rObj.sinkPhase === 2) {
              continue; // sunk turtle doesn't count
            }
            // Check enemy croc
            if (rObj.isEnemyCroc) {
              // Enemy croc zone: last 1.5 tiles of the log
              const enemyZoneX = rObj.x + rObj.w - TILE_W * 1.5;
              if (pxC + pw > enemyZoneX && pxC < rObj.x + rObj.w) {
                gs.deathType = "squash";
                gs.deathAnim = 0;
                gs.deathX = pxC + pw / 2;
                gs.deathY = pyC + ph / 2;
                gs.playerAlive = false;
                if (audioRef.current) audioRef.current.honk();
                break;
              }
            }
            onPlatform = true;
            platformObj = rObj;
            break;
          }
        }

        if (gs.playerAlive && !onPlatform) {
          // In water without platform
          gs.deathType = "splash";
          gs.deathAnim = 0;
          gs.deathX = pxC + pw / 2;
          gs.deathY = pyC + ph / 2;
          gs.playerAlive = false;
          if (audioRef.current) audioRef.current.splash();
        }

        // Move with platform (sub-pixel tracking)
        if (gs.playerAlive && platformObj) {
          const moveAmount = platformObj.speed * platformObj.dir * 60 * dt;
          gs.playerPixelOffsetX += moveAmount;

          // Snap to new column when offset exceeds half a tile
          if (Math.abs(gs.playerPixelOffsetX) >= TILE_W / 2) {
            const colShift = gs.playerPixelOffsetX > 0 ? 1 : -1;
            gs.playerCol += colShift;
            gs.playerPixelOffsetX -= colShift * TILE_W;
          }

          if (gs.playerCol < 0 || gs.playerCol >= COLS) {
            // Carried off screen
            gs.deathType = "splash";
            gs.deathAnim = 0;
            gs.deathX = colToCanvasX(Math.max(0, Math.min(COLS - 1, gs.playerCol))) + TILE_W / 2;
            gs.deathY = rowToCanvasY(gs.playerRow) + TILE_H / 2;
            gs.playerAlive = false;
            gs.playerPixelOffsetX = 0;
            if (audioRef.current) audioRef.current.splash();
          }
        } else {
          gs.playerPixelOffsetX = 0;
        }
      }

      // Check homes (row 12)
      // Guard: skip if we already processed a home entry this frame
      if (gs.playerRow === ROW_HOMES && gs.playerAlive && !gs.justEnteredHome) {
        const playerCenter = colToCanvasX(gs.playerCol) + TILE_W / 2;

        // Find the single closest home whose opening contains the player center
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let idx = 0; idx < HOME_COLS.length; idx++) {
          const col = HOME_COLS[idx];
          const homeLeft = col * TILE_W;
          const homeRight = (col + 1.5) * TILE_W;
          if (playerCenter >= homeLeft && playerCenter <= homeRight) {
            const homeCenter = (homeLeft + homeRight) / 2;
            const dist = Math.abs(playerCenter - homeCenter);
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = idx;
            }
          }
        }

        if (bestIdx >= 0) {
          // Set guard flag to prevent double-processing
          gs.justEnteredHome = true;

          if (gs.filledHomes[bestIdx]) {
            // Already filled - die
            gs.deathType = "splash";
            gs.deathAnim = 0;
            gs.deathX = playerCenter;
            gs.deathY = rowToCanvasY(ROW_HOMES) + TILE_H / 2;
            gs.playerAlive = false;
            if (audioRef.current) audioRef.current.splash();
          } else {
            // Fill home!
            gs.filledHomes[bestIdx] = true;
            gs.totalHomesFilled++;
            const timeBonus = Math.floor(gs.timer);
            gs.score += 25 + timeBonus;
            gs.cumulativeScore = gs.score;
            setDisplayScore(gs.score);

            if (audioRef.current) audioRef.current.victory();

            // Check extra life
            if (gs.score >= gs.extraLifeThreshold && gs.lives < 5) {
              gs.lives++;
              gs.extraLifeThreshold += 1000;
              setDisplayLives(gs.lives);
              if (audioRef.current) audioRef.current.powerUp();
            }

            // Check master mode (5000 points)
            if (gs.score >= 5000 && !gs.masterTriggered) {
              gs.masterTriggered = true;
              setMasterMode(true);
              setMasterModeTimer(2);
              // Reset difficulty but keep score
              const newGs = initGameState(1, gs.score, gs.lives, gs.totalHomesFilled);
              newGs.masterTriggered = true;
              gsRef.current = newGs;
              setDisplayPhase(1);
              rafRef.current = requestAnimationFrame(gameLoop);
              return;
            }

            // Check all homes filled
            if (gs.filledHomes.every(Boolean)) {
              // Phase complete!
              gs.score += 200; // bonus
              setDisplayScore(gs.score);
              if (audioRef.current) audioRef.current.phaseComplete();
              if (audioRef.current) audioRef.current.stopMusic();

              setPhaseCompleteData({
                phase: gs.phase,
                score: gs.score,
                homesFilled: gs.totalHomesFilled,
              });
              setScreen("phaseComplete");

              // Auto-advance after 3s
              setTimeout(() => {
                const nextPhase = gs.phase + 1;
                const newGs = initGameState(nextPhase, gs.score, gs.lives, gs.totalHomesFilled);
                newGs.masterTriggered = gs.masterTriggered;
                newGs.extraLifeThreshold = gs.extraLifeThreshold;
                gsRef.current = newGs;
                setDisplayPhase(nextPhase);
                setScreen("playing");
                if (audioRef.current) audioRef.current.startMusic(nextPhase);
                lastTimeRef.current = performance.now();
                rafRef.current = requestAnimationFrame(gameLoop);
              }, 3000);

              gsRef.current = null; // Stop current loop
              return;
            }

            // Respawn player
            gs.playerCol = 6;
            gs.playerRow = 0;
            gs.playerDir = "up";
            gs.timer = gs.timerMax;
          }
        } else if (gs.playerAlive) {
          // In homes row but not on a home opening -> water -> die
          gs.deathType = "splash";
          gs.deathAnim = 0;
          gs.deathX = colToCanvasX(gs.playerCol) + TILE_W / 2;
          gs.deathY = rowToCanvasY(ROW_HOMES) + TILE_H / 2;
          gs.playerAlive = false;
          if (audioRef.current) audioRef.current.splash();
        }
      }
    }

    // Master mode timer
    if (masterModeRef.current && masterModeTimerRef.current > 0) {
      const newTimer = masterModeTimerRef.current - dt;
      if (newTimer <= 0) {
        setMasterMode(false);
        setMasterModeTimer(0);
        masterModeRef.current = false;
        masterModeTimerRef.current = 0;
      } else {
        setMasterModeTimer(newTimer);
        masterModeTimerRef.current = newTimer;
      }
    }

    // ---- DRAW ----
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background layers (draw from top to bottom in canvas, which is row 12 to row 0)

    // Row 12: Homes
    drawHomes(ctx, rowToCanvasY(ROW_HOMES), CANVAS_W, TILE_H, gs.filledHomes);

    // Rows 7-11: River
    drawRiver(ctx, rowToCanvasY(ROW_RIVER_END), CANVAS_W, TILE_H * 5, time);

    // Row 6: Sidewalk
    drawSidewalk(ctx, rowToCanvasY(ROW_SIDEWALK), CANVAS_W, TILE_H);

    // Rows 1-5: Road
    drawRoad(ctx, rowToCanvasY(ROW_ROAD_END), CANVAS_W, TILE_H * 5, 5);

    // Row 0: Grass
    drawGrass(ctx, rowToCanvasY(ROW_SPAWN), CANVAS_W, TILE_H);

    // Draw river objects
    gs.riverObjects.forEach(obj => {
      if (obj.type === "log") {
        drawLog(ctx, obj, time);
      } else if (obj.type === "turtle") {
        drawTurtle(ctx, obj, time);
      }
    });

    // Draw vehicles
    gs.vehicleObjects.forEach(obj => {
      drawVehicle(ctx, obj);
    });

    // Draw player
    if (gs.playerAlive && !gs.deathType) {
      const px = colToCanvasX(gs.playerCol) + gs.playerPixelOffsetX;
      const py = rowToCanvasY(gs.playerRow);
      drawCrocodile(ctx, px, py, gs.playerDir, gs.hopAnim, gs.hopAnim === 0, time);
    }

    // Draw death effects
    if (gs.deathType) {
      if (gs.deathType === "splash") {
        drawSplashEffect(ctx, gs.deathX, gs.deathY, gs.deathAnim);
      } else if (gs.deathType === "squash") {
        drawSquashEffect(ctx, gs.deathX, gs.deathY, gs.deathAnim);
      } else if (gs.deathType === "timeout") {
        // Blink and disappear
        const px = colToCanvasX(gs.playerCol);
        const py = rowToCanvasY(gs.playerRow);
        if (Math.sin(gs.deathAnim * 20) > 0) {
          drawCrocodile(ctx, px, py, gs.playerDir, 0, false, time);
        }
      }
    }

    // Timer bar at bottom of canvas
    const timerPct = gs.timer / gs.timerMax;
    drawTimerBar(ctx, 10, CANVAS_H - 14, CANVAS_W - 20, 8, timerPct, gs.phase);

    // HUD overlay
    // Score
    ctx.font = "bold 10px 'Press Start 2P', monospace";
    ctx.fillStyle = "#555";
    ctx.fillText(t("hudScore"), 8, 14);
    ctx.font = "bold 14px 'Press Start 2P', monospace";
    ctx.fillStyle = ACCENT;
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = 8;
    ctx.fillText(String(gs.score), 8, 30);
    ctx.shadowBlur = 0;

    // Phase
    ctx.font = "bold 10px 'Press Start 2P', monospace";
    ctx.fillStyle = "#555";
    const phaseText = t("hudPhase", { phase: gs.phase });
    const phaseWidth = ctx.measureText(phaseText).width;
    ctx.fillText(phaseText, CANVAS_W / 2 - phaseWidth / 2, 14);

    // Lives
    ctx.font = "12px 'Press Start 2P', monospace";
    const livesText = "\u2764".repeat(gs.lives);
    const livesWidth = ctx.measureText(livesText).width;
    ctx.fillStyle = "#e74c3c";
    ctx.fillText(livesText, CANVAS_W - livesWidth - 8, 16);

    // Master mode flash
    if (masterModeRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(time * 6) * 0.2;
      ctx.fillStyle = "#f1c40f";
      ctx.font = "bold 18px 'Press Start 2P', monospace";
      const mmText = t("masterMode");
      const mmWidth = ctx.measureText(mmText).width;
      ctx.fillText(mmText, CANVAS_W / 2 - mmWidth / 2, CANVAS_H / 2);
      ctx.restore();
    }

    // Update display
    setDisplayScore(gs.score);

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [initGameState]);

  // Keep gameLoop ref stable for timeouts
  useEffect(() => { gameLoopRef.current = gameLoop; }, [gameLoop]);

  // ============================================================
  // PLAYER MOVEMENT
  // ============================================================
  const movePlayer = useCallback((direction) => {
    const gs = gsRef.current;
    if (!gs || !gs.playerAlive || gs.deathType || gs.paused) return;

    const now = performance.now();
    if (now - gs.lastMoveTime < 150) return; // debounce
    gs.lastMoveTime = now;

    let newCol = gs.playerCol;
    let newRow = gs.playerRow;

    switch (direction) {
      case "up": newRow = Math.min(gs.playerRow + 1, ROWS - 1); break;
      case "down": newRow = Math.max(gs.playerRow - 1, 0); break;
      case "left": newCol = Math.max(gs.playerCol - 1, 0); break;
      case "right": newCol = Math.min(gs.playerCol + 1, COLS - 1); break;
    }

    if (newCol !== gs.playerCol || newRow !== gs.playerRow) {
      gs.playerCol = newCol;
      gs.playerRow = newRow;
      gs.playerDir = direction;
      gs.hopAnim = 1;
      gs.playerPixelOffsetX = 0; // Reset sub-pixel offset on manual move

      // Track distance
      if (direction === "up" && newRow > gs.maxRowReached) {
        gs.distanceTraveled += newRow - gs.maxRowReached;
        gs.maxRowReached = newRow;
      }

      if (audioRef.current) audioRef.current.hop();
    }
  }, []);

  // ============================================================
  // KEYBOARD INPUT
  // ============================================================
  useEffect(() => {
    if (screen !== "playing") return;

    const handleKeyDown = (e) => {
      const gs = gsRef.current;
      if (!gs) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault();
          movePlayer("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault();
          movePlayer("down");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault();
          movePlayer("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault();
          movePlayer("right");
          break;
        case "p":
        case "P":
          gs.paused = !gs.paused;
          if (gs.paused) {
            setScreen("paused");
          } else {
            setScreen("playing");
            lastTimeRef.current = performance.now();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, movePlayer]);

  // ============================================================
  // JOYSTICK HANDLERS
  // ============================================================
  const processJoystick = useCallback((dx, dy) => {
    const RADIUS = 55;
    const DEAD_ZONE = 15;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp knob visual
    let clampedX = dx, clampedY = dy;
    if (dist > RADIUS) {
      clampedX = (dx / dist) * RADIUS;
      clampedY = (dy / dist) * RADIUS;
    }
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }

    // Convert to cardinal direction
    if (dist < DEAD_ZONE) return;

    const now = performance.now();
    if (now - joystickCooldownRef.current < 200) return;
    joystickCooldownRef.current = now;

    const angle = Math.atan2(dy, dx);
    // -PI to PI. Up is -PI/2, Right is 0, Down is PI/2, Left is PI/-PI
    if (angle > -Math.PI * 0.75 && angle <= -Math.PI * 0.25) {
      movePlayer("up");
    } else if (angle > Math.PI * 0.25 && angle <= Math.PI * 0.75) {
      movePlayer("down");
    } else if (angle > -Math.PI * 0.25 && angle <= Math.PI * 0.25) {
      movePlayer("right");
    } else {
      movePlayer("left");
    }
  }, [movePlayer]);

  const handleJoystickStart = useCallback((e) => {
    e.preventDefault();
    if (joystickActiveRef.current !== null) return;
    const touch = e.changedTouches[0];
    joystickActiveRef.current = touch.identifier;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    joystickCenterRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const dx = touch.clientX - joystickCenterRef.current.x;
    const dy = touch.clientY - joystickCenterRef.current.y;
    processJoystick(dx, dy);
  }, [processJoystick]);

  const handleJoystickMove = useCallback((e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickActiveRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;
        processJoystick(dx, dy);
        break;
      }
    }
  }, [processJoystick]);

  const handleJoystickEnd = useCallback((e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickActiveRef.current) {
        joystickActiveRef.current = null;
        if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = "translate(0px, 0px)";
        }
        break;
      }
    }
  }, []);

  // ============================================================
  // START / RESTART
  // ============================================================
  const startGame = useCallback(async () => {
    if (!audioRef.current) {
      audioRef.current = new JacareAudio();
    }
    await audioRef.current.init();
    audioRef.current.setMuted(muted);

    const gs = initGameState(1, 0, 3, 0);
    gsRef.current = gs;
    setDisplayScore(0);
    setDisplayPhase(1);
    setDisplayLives(3);
    setMasterMode(false);
    setMasterModeTimer(0);
    setScreen("playing");

    audioRef.current.startMusic(1);

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "game_start", { game: "jacare" });
    }

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [muted, initGameState, gameLoop]);

  const handlePlay = useCallback(() => {
    if (!user && checkedCookie) {
      setScreen("register");
    } else {
      startGame();
    }
  }, [user, checkedCookie, startGame]);

  const handleRegister = useCallback(async (userData) => {
    const result = await register(userData);
    if (result && !result.error) {
      startGame();
    }
    return result;
  }, [register, startGame]);

  const handleRestart = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startGame();
  }, [startGame]);

  const handleBackToMenu = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (audioRef.current) audioRef.current.stopMusic();
    gsRef.current = null;
    setScreen("menu");
  }, []);

  const handleResume = useCallback(() => {
    const gs = gsRef.current;
    if (gs) {
      gs.paused = false;
      setScreen("playing");
      lastTimeRef.current = performance.now();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      if (audioRef.current) audioRef.current.setMuted(next);
      return next;
    });
  }, []);

  // R to restart when game over
  useEffect(() => {
    if (screen !== "gameOver") return;
    const handleKeyDown = (e) => {
      if (e.key === "r" || e.key === "R") {
        handleRestart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, handleRestart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) audioRef.current.stopMusic();
    };
  }, []);

  // ============================================================
  // RENDER
  // ============================================================
  const isPlaying = screen === "playing" || screen === "paused";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050510",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Fira Code', monospace",
      overflow: "hidden",
      padding: 12,
    }}>
      {/* Top ad - hidden during active play */}
      {!isPlaying && (
        <AdBanner slot="jacare_top" style={{ marginBottom: 12, maxWidth: CANVAS_W }} />
      )}

      <h1 style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: 20,
        color: ACCENT,
        textShadow: `0 0 20px ${ACCENT}, 0 0 40px rgba(57,255,20,0.3)`,
        marginBottom: 8,
        letterSpacing: 3,
        textAlign: "center",
      }}>
        {t("title")}
      </h1>

      {!isPlaying && (
        <p style={{
          color: "#4a5568",
          fontSize: 9,
          marginBottom: 14,
          fontFamily: "'Press Start 2P', monospace",
          textAlign: "center",
        }}>
          {t("subtitle")}
        </p>
      )}

      {/* Canvas container */}
      <div style={{
        width: CANVAS_W * gameScale,
        height: CANVAS_H * gameScale,
        touchAction: isPlaying ? "none" : "auto",
      }}>
        <div style={{
          width: CANVAS_W,
          height: CANVAS_H,
          position: "relative",
          background: "#0a0a1a",
          border: `2px solid rgba(57,255,20,0.3)`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: `0 0 20px rgba(57,255,20,0.15)`,
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: isPlaying ? "none" : "auto",
          transform: `scale(${gameScale})`,
          transformOrigin: "top left",
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ display: "block", width: CANVAS_W, height: CANVAS_H }}
          />

          {/* MENU SCREEN */}
          {screen === "menu" && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(5,5,16,0.95)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              zIndex: 100,
            }}>
              <MenuCrocSprite />
              <div style={{ height: 20 }} />
              <button
                onClick={handlePlay}
                style={{
                  padding: "14px 40px",
                  background: `linear-gradient(135deg, ${ACCENT}, #27ae60)`,
                  border: "none",
                  borderRadius: 8,
                  color: "#000",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  cursor: "pointer",
                  fontWeight: 900,
                  letterSpacing: 2,
                  boxShadow: `0 0 20px rgba(57,255,20,0.4)`,
                }}
              >
                {t("playButton")}
              </button>
              <div style={{ height: 20 }} />
              {!mobile && (
                <div style={{
                  color: "#555",
                  fontSize: 9,
                  fontFamily: "'Press Start 2P', monospace",
                  textAlign: "center",
                  lineHeight: 2,
                }}>
                  <div>{t("keyboardArrows")}</div>
                  <div>{t("keyboardPause")}</div>
                </div>
              )}
              {mobile && (
                <div style={{
                  color: "#555",
                  fontSize: 9,
                  fontFamily: "'Press Start 2P', monospace",
                  textAlign: "center",
                }}>
                  {t("mobileHint")}
                </div>
              )}
            </div>
          )}

          {/* REGISTER SCREEN */}
          {screen === "register" && (
            <RegisterModal
              onRegister={handleRegister}
              loading={registering}
              jogoNome={t("title")}
              accentColor={ACCENT}
            />
          )}

          {/* PAUSED OVERLAY */}
          {screen === "paused" && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(5,5,16,0.85)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              zIndex: 100,
              backdropFilter: "blur(4px)",
            }}>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 22,
                color: ACCENT,
                textShadow: `0 0 20px ${ACCENT}`,
                marginBottom: 30,
              }}>
                {t("paused")}
              </div>
              <button
                onClick={handleResume}
                style={{
                  padding: "12px 30px",
                  background: `linear-gradient(135deg, ${ACCENT}, #27ae60)`,
                  border: "none", borderRadius: 8,
                  color: "#000",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12, cursor: "pointer",
                  fontWeight: 900, marginBottom: 12,
                }}
              >
                {t("resumeButton")}
              </button>
              <button
                onClick={handleBackToMenu}
                style={{
                  padding: "10px 24px",
                  background: "transparent",
                  border: `2px solid ${ACCENT}55`,
                  borderRadius: 8,
                  color: ACCENT,
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 10, cursor: "pointer",
                }}
              >
                {t("quitButton")}
              </button>
            </div>
          )}

          {/* PHASE COMPLETE OVERLAY */}
          {screen === "phaseComplete" && phaseCompleteData && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(5,5,16,0.9)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              zIndex: 100,
            }}>
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 16,
                color: ACCENT,
                textShadow: `0 0 20px ${ACCENT}`,
                marginBottom: 20,
                textAlign: "center",
              }}>
                {t("phaseComplete", { phase: phaseCompleteData.phase })}
              </div>
              {/* 5 mini crocs in homes doing thumbs up */}
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <PhaseCompleteCroc key={i} delay={i * 200} />
                ))}
              </div>
              <div style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 14,
                color: "#ccc",
                marginBottom: 8,
              }}>
                {t("score")}: {phaseCompleteData.score}
              </div>
              <div style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 11,
                color: "#888",
              }}>
                {t("advancing")}
              </div>
            </div>
          )}

          {/* GAME OVER OVERLAY */}
          {screen === "gameOver" && gameOverData && (
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(5,5,16,0.95)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              zIndex: 100,
            }}>
              <GameOverTitle />
              <div style={{ height: 16 }} />
              <div style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 13,
                color: "#ccc",
                textAlign: "center",
                lineHeight: 2,
              }}>
                <div>{t("score")}: <span style={{ color: ACCENT }}>{gameOverData.score}</span></div>
                <div>{t("phase")}: {gameOverData.phase}</div>
                <div>{t("homes")}: {gameOverData.homesFilled}</div>
                <div style={{ color: "#f1c40f" }}>
                  {t("highScore")}: {gameOverData.highScore}
                </div>
              </div>
              <div style={{ height: 20 }} />
              <button
                onClick={handleRestart}
                style={{
                  padding: "12px 30px",
                  background: `linear-gradient(135deg, ${ACCENT}, #27ae60)`,
                  border: "none", borderRadius: 8,
                  color: "#000",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12, cursor: "pointer",
                  fontWeight: 900, marginBottom: 12,
                }}
              >
                {t("playAgainButton")}
              </button>
              <button
                onClick={handleBackToMenu}
                style={{
                  padding: "10px 24px",
                  background: "transparent",
                  border: `2px solid ${ACCENT}55`,
                  borderRadius: 8,
                  color: ACCENT,
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 10, cursor: "pointer",
                }}
              >
                {t("menuButton")}
              </button>

              <AdBanner slot="jacare_between" style={{ marginTop: 16, maxWidth: CANVAS_W - 40 }} />
            </div>
          )}

          {/* Mute button during play */}
          {isPlaying && (
            <button
              onClick={handleToggleMute}
              style={{
                position: "absolute",
                top: 36,
                right: 8,
                width: 28,
                height: 28,
                borderRadius: 14,
                background: "rgba(0,0,0,0.6)",
                border: `1px solid ${ACCENT}44`,
                color: muted ? "#666" : ACCENT,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 80,
                padding: 0,
              }}
              title={muted ? t("unmuteTitle") : t("muteTitle")}
            >
              {muted ? "\u2716" : "\u266B"}
            </button>
          )}
        </div>
      </div>

      {/* Mobile joystick + pause button BELOW the canvas */}
      {mobile && isPlaying && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 16,
          padding: "0 8px",
          width: "100%",
          maxWidth: CANVAS_W * gameScale,
        }}>
          {/* Joystick */}
          <div
            ref={joystickBaseRef}
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            onTouchCancel={handleJoystickEnd}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              width: 130,
              height: 130,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: `2px solid rgba(57,255,20,0.25)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {/* Cross guides */}
            <div style={{
              position: "absolute",
              width: 2,
              height: "60%",
              background: "rgba(57,255,20,0.1)",
              borderRadius: 1,
            }} />
            <div style={{
              position: "absolute",
              width: "60%",
              height: 2,
              background: "rgba(57,255,20,0.1)",
              borderRadius: 1,
            }} />
            {/* Direction labels */}
            <div style={{
              position: "absolute",
              top: 6,
              fontSize: 10,
              color: "rgba(57,255,20,0.3)",
              fontFamily: "'Press Start 2P', monospace",
            }}>{"\u25B2"}</div>
            <div style={{
              position: "absolute",
              bottom: 6,
              fontSize: 10,
              color: "rgba(57,255,20,0.3)",
              fontFamily: "'Press Start 2P', monospace",
            }}>{"\u25BC"}</div>
            <div style={{
              position: "absolute",
              left: 8,
              fontSize: 10,
              color: "rgba(57,255,20,0.3)",
              fontFamily: "'Press Start 2P', monospace",
            }}>{"\u25C0"}</div>
            <div style={{
              position: "absolute",
              right: 8,
              fontSize: 10,
              color: "rgba(57,255,20,0.3)",
              fontFamily: "'Press Start 2P', monospace",
            }}>{"\u25B6"}</div>
            {/* Knob */}
            <div
              ref={joystickKnobRef}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                background: "rgba(57,255,20,0.2)",
                border: "2px solid rgba(57,255,20,0.5)",
                boxShadow: "0 0 12px rgba(57,255,20,0.3)",
                transition: "none",
              }}
            />
          </div>

          {/* Pause button */}
          <button
            onClick={() => {
              const gs = gsRef.current;
              if (!gs) return;
              gs.paused = !gs.paused;
              if (gs.paused) {
                setScreen("paused");
              } else {
                setScreen("playing");
                lastTimeRef.current = performance.now();
              }
            }}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: "rgba(57,255,20,0.06)",
              border: `2px solid rgba(57,255,20,0.25)`,
              color: ACCENT,
              fontSize: 18,
              fontFamily: "'Press Start 2P', monospace",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              userSelect: "none",
              WebkitUserSelect: "none",
              touchAction: "none",
              outline: "none",
            }}
          >
            {"\u23F8"}
          </button>
        </div>
      )}

      {/* Desktop keyboard hints */}
      {!mobile && isPlaying && (
        <div style={{
          color: "#333",
          fontSize: 8,
          fontFamily: "'Press Start 2P', monospace",
          marginTop: 10,
          textAlign: "center",
        }}>
          {t("keyboardHints")}
        </div>
      )}

      {/* User info */}
      {user && isPlaying && (
        <div style={{
          width: CANVAS_W * gameScale,
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          padding: "0 4px",
        }}>
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Fira Code', monospace" }}>
            {user.nome}
          </span>
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Fira Code', monospace" }}>
            {t("userInfo", { phase: displayPhase, lives: displayLives })}
          </span>
        </div>
      )}

      <AdBanner slot="jacare_bottom" style={{ marginTop: 16, maxWidth: CANVAS_W }} />
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function MenuCrocSprite() {
  // Draw a larger croc sprite with thumbs up using a small canvas
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = 120, h = 120;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(60, 70);

    // Body
    ctx.fillStyle = "#2d5a1e";
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scale arcs
    ctx.strokeStyle = "#245018";
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(i * 7, i * 2, 5, 0, Math.PI);
      ctx.stroke();
    }

    // Head
    ctx.fillStyle = "#3a7a2a";
    ctx.beginPath();
    ctx.arc(0, -25, 16, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = "#4a9a3a";
    ctx.beginPath();
    ctx.ellipse(0, -38, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = "#1a4a0e";
    ctx.beginPath();
    ctx.arc(-3, -40, 1.5, 0, Math.PI * 2);
    ctx.arc(3, -40, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-8, -28, 6, 0, Math.PI * 2);
    ctx.arc(8, -28, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(-8, -28, 3, 0, Math.PI * 2);
    ctx.arc(8, -28, 3, 0, Math.PI * 2);
    ctx.fill();
    // Eye highlights
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-6, -30, 1.5, 0, Math.PI * 2);
    ctx.arc(10, -30, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Paws
    ctx.fillStyle = "#3a7a2a";
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.roundRect(side * 28 - 5, -8, 10, 14, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(side * 25 - 5, 8, 10, 14, 3);
      ctx.fill();
    });

    // Tail
    ctx.fillStyle = "#2d5a1e";
    ctx.beginPath();
    ctx.moveTo(-5, 18);
    ctx.lineTo(5, 18);
    ctx.lineTo(0, 40);
    ctx.closePath();
    ctx.fill();

    // Thumbs up
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(26, -20, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e67e22";
    ctx.fillRect(23, -14, 6, 14);
    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.ellipse(26, -26, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = "#1a4a0e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -22, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={120}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function PhaseCompleteCroc({ delay }) {
  const canvasRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 40, 50);
    drawMiniCroc(ctx, 20, 30, 0.8);
  }, [visible]);

  return (
    <canvas
      ref={canvasRef}
      width={40}
      height={50}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.3)",
        transition: "all 0.3s ease-out",
      }}
    />
  );
}

function GameOverTitle() {
  const t = useTranslations("games.jacare");
  const [shake, setShake] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShake(false), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      fontFamily: "'Press Start 2P', monospace",
      fontSize: 28,
      color: "#e74c3c",
      textShadow: "0 0 20px #e74c3c, 0 0 40px rgba(231,76,60,0.3)",
      animation: shake ? "gameOverShake 0.1s ease-in-out 6" : "none",
    }}>
      <style>{`
        @keyframes gameOverShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
      {t("gameOver")}
    </div>
  );
}
