"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";
import useLockScroll from "@/hooks/useLockScroll";

const CANVAS_W = 400;
const CANVAS_H = 500;
const ACCENT = "#4ade80";
const GRAVITY = 0.12;
const PLATES_PER_ROUND = 10;
const TOTAL_ROUNDS = 3;

// Round configs
const ROUND_CFG = [
  { interval: 1500, hitWindow: 600, speedMult: 1.0 },
  { interval: 1200, hitWindow: 500, speedMult: 1.2 },
  { interval: 900, hitWindow: 400, speedMult: 1.4 },
];

// Scoring
const STREAK_POINTS = [100, 200, 300, 500];
const TIMING_BONUS = 50;
const BIRD_POINTS = [3000, 4000, 6000];

// Reticle configs
const RETICLE_SIZES = [60, 80, 100, 120]; // 0-4, 5-9, 10-14, 15+
const RETICLE_THRESHOLDS = [0, 5, 10, 15];

// Medal thresholds
const MEDAL_GOLD = 8000;
const MEDAL_SILVER = 5000;
const MEDAL_BRONZE = 3000;

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ==================== AUDIO ENGINE ====================
class SkeetAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOsc = null;
    this.musicGain = null;
    this.musicTimer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("AudioContext not available");
    }
  }

  _osc(type, freq, dur, vol = 0.15, startTime = 0) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + dur + 0.01);
  }

  _noise(dur, vol = 0.12) {
    if (!this.ctx || this.muted) return;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    // bandpass for shotgun sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start();
    src.stop(this.ctx.currentTime + dur + 0.01);
  }

  shoot() {
    this._noise(0.04, 0.18);
    this._osc("square", 150, 0.01, 0.1);
  }

  hit() {
    this._osc("sine", 1047, 0.08, 0.15);
  }

  perfectHit() {
    this._osc("sine", 1047, 0.08, 0.15);
    this._osc("sine", 1319, 0.08, 0.12);
  }

  miss() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.21);
  }

  birdAppear() {
    this._osc("sine", 880, 0.1, 0.12);
    this._osc("sine", 1047, 0.1, 0.12, 0.1);
    this._osc("sine", 880, 0.1, 0.1, 0.2);
    this._osc("sine", 1047, 0.1, 0.1, 0.3);
  }

  parrotSquawk() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    // vibrato
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 20;
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.21);
    lfo.stop(this.ctx.currentTime + 0.21);
  }

  medal() {
    // C5-E5-G5 staccato → C6 sustain
    this._osc("triangle", 523, 0.1, 0.15, 0);
    this._osc("triangle", 659, 0.1, 0.15, 0.12);
    this._osc("triangle", 784, 0.1, 0.15, 0.24);
    this._osc("sine", 1047, 0.4, 0.18, 0.4);
  }

  roundComplete() {
    this._osc("triangle", 523, 0.08, 0.12, 0);
    this._osc("triangle", 659, 0.08, 0.12, 0.1);
    this._osc("triangle", 784, 0.08, 0.12, 0.2);
  }

  startMusic(round = 0) {
    if (!this.ctx || this.muted) return;
    this.stopMusic();
    const bpm = 120 + round * 5;
    const beatDur = 60 / bpm;
    // Simple chiptune march
    const melody = [523, 523, 659, 784, 659, 523, 784, 659, 523, 587, 659, 523, 494, 523, 587, 523];
    let noteIndex = 0;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.04;
    this.musicGain.connect(this.ctx.destination);

    const playNote = () => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = melody[noteIndex % melody.length];
      osc.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + beatDur * 0.8);
      noteIndex++;
    };

    playNote();
    this.musicTimer = setInterval(playNote, beatDur * 1000);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain) {
      try { this.musicGain.disconnect(); } catch (e) {}
      this.musicGain = null;
    }
  }

  toggle() {
    this.muted = !this.muted;
    if (this.muted) this.stopMusic();
    return this.muted;
  }
}

// ==================== DRAWING HELPERS ====================
function drawSky(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  grad.addColorStop(0, "#87CEEB");
  grad.addColorStop(0.6, "#6BAED6");
  grad.addColorStop(1, "#4A90D9");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h * 0.65);
}

function drawClouds(ctx, clouds, w) {
  ctx.save();
  for (const c of clouds) {
    ctx.globalAlpha = c.opacity;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w, c.h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x - c.w * 0.5, c.y + c.h * 0.2, c.w * 0.6, c.h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.5, c.y + c.h * 0.1, c.w * 0.5, c.h * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTreeline(ctx, w, h) {
  const treeY = h * 0.6;
  ctx.fillStyle = "#1a3c1a";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  // Irregular treeline
  for (let x = 0; x <= w; x += 8) {
    const treeH = 20 + Math.sin(x * 0.03) * 15 + Math.sin(x * 0.08) * 8 + Math.sin(x * 0.15) * 5;
    ctx.lineTo(x, treeY + 30 - treeH);
  }
  ctx.lineTo(w, h * 0.72);
  ctx.closePath();
  ctx.fill();

  // Darker bottom
  ctx.fillStyle = "#152e15";
  ctx.fillRect(0, h * 0.65, w, h * 0.07);
}

function drawGround(ctx, w, h) {
  const groundY = h * 0.72;
  const grad = ctx.createLinearGradient(0, groundY, 0, h);
  grad.addColorStop(0, "#3a7c2e");
  grad.addColorStop(0.3, "#2d6623");
  grad.addColorStop(1, "#1a4a15");
  ctx.fillStyle = grad;
  ctx.fillRect(0, groundY, w, h - groundY);
}

function drawLauncher(ctx, x, y, kicked, side) {
  ctx.save();
  const kickY = kicked ? 5 : 0;
  ctx.translate(x, y + kickY);
  // Trapezoid
  ctx.fillStyle = "#555555";
  ctx.beginPath();
  if (side === "left") {
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.lineTo(8, -20);
    ctx.lineTo(-4, -20);
  } else {
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.lineTo(4, -20);
    ctx.lineTo(-8, -20);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawLauncherSmoke(ctx, particles) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = "#cccccc";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPlate(ctx, plate, time) {
  if (plate.hit || plate.offscreen) return;
  ctx.save();
  ctx.translate(plate.x, plate.y);
  // Spin: rotate 360deg / 500ms
  const angle = ((time % 500) / 500) * Math.PI * 2;
  ctx.rotate(angle);
  // Ellipse with spin effect — squash y based on angle
  const squash = Math.abs(Math.cos(angle * 2)) * 0.6 + 0.4;
  ctx.scale(1, squash);

  // Terracotta gradient
  const grad = ctx.createLinearGradient(-15, 0, 15, 0);
  grad.addColorStop(0, "#d4733a");
  grad.addColorStop(0.5, "#e88a4f");
  grad.addColorStop(1, "#b85a2a");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // White highlight
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-4, -2, 6, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawExplosion(ctx, expl) {
  // Fragments
  for (const f of expl.fragments) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.moveTo(0, -f.size);
    ctx.lineTo(f.size * 0.8, f.size * 0.5);
    ctx.lineTo(-f.size * 0.8, f.size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Dust cloud
  for (const d of expl.dust) {
    ctx.save();
    ctx.globalAlpha = d.alpha;
    ctx.strokeStyle = "#d4733a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawReticle(ctx, rx, ry, size, color, flashColor, flashProgress, pulsePhase, streakLevel) {
  ctx.save();
  const scale = flashProgress > 0 ? 1.0 + 0.1 * flashProgress : 1.0;
  ctx.translate(rx, ry);
  ctx.scale(scale, scale);
  const half = size / 2;

  // Glow for streak
  if (streakLevel >= 1) {
    const glowColor = streakLevel >= 2 ? "#fbbf24" : ACCENT;
    const intensity = streakLevel >= 3 ? 0.5 + Math.sin(pulsePhase * 6) * 0.3 : 0.3 + Math.sin(pulsePhase * 4) * 0.15;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15 + streakLevel * 5;
    ctx.globalAlpha = intensity;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Main reticle
  const mainColor = flashProgress > 0 ? flashColor : color;
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 2;
  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, half, 0, Math.PI * 2);
  ctx.stroke();
  // Cross
  ctx.beginPath();
  ctx.moveTo(-half - 5, 0);
  ctx.lineTo(half + 5, 0);
  ctx.moveTo(0, -half - 5);
  ctx.lineTo(0, half + 5);
  ctx.stroke();
  // Small center dot
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBird(ctx, bird, time) {
  if (!bird || bird.hit) return;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  // Flapping V shape
  const flapAngle = Math.sin(time * 0.015) * 0.5;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(0, Math.sin(time * 0.015) * 5);
  ctx.lineTo(12, 0);
  ctx.stroke();
  // Body
  ctx.beginPath();
  ctx.arc(0, Math.sin(time * 0.015) * 5 + 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParrot(ctx, parrot, time) {
  if (!parrot || parrot.dead) return;
  ctx.save();
  ctx.translate(parrot.x, parrot.y);
  // Body
  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(8, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  // Beak
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.moveTo(13, -4);
  ctx.lineTo(18, -3);
  ctx.lineTo(13, -2);
  ctx.closePath();
  ctx.fill();
  // Wing
  ctx.fillStyle = "#3b82f6";
  const wingY = Math.sin(time * 0.012) * 4;
  ctx.beginPath();
  ctx.ellipse(-4, wingY - 3, 8, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Tail
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.lineTo(-18, -3);
  ctx.lineTo(-18, 3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFloatingText(ctx, texts) {
  for (const t of texts) {
    ctx.save();
    ctx.globalAlpha = t.alpha;
    ctx.font = `bold ${t.size}px 'Press Start 2P', monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = t.color;
    if (t.shake) {
      ctx.translate(Math.random() * 4 - 2, Math.random() * 4 - 2);
    }
    if (t.scaleIn && t.alpha > 0.7) {
      const s = 0.5 + (t.alpha - 0.7) / 0.3 * 0.5;
      ctx.translate(t.x, t.y);
      ctx.scale(s, s);
      ctx.fillText(t.text, 0, 0);
    } else {
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }
}

// ==================== MAIN COMPONENT ====================
export default function TiroAoAlvo() {
  const { user, checkedCookie, registering, register } = useJogador("tiroaoalvo");
  const gameScale = useGameScale(CANVAS_W);
  const [screen, setScreen] = useState("menu");
  const [score, setScore] = useState(0);
  const [muted, setMuted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useLockScroll(screen === "playing" || screen === "roundIntro" || screen === "roundEnd");

  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const gameRef = useRef(null);
  const rafRef = useRef(null);
  const scoreSubmittedRef = useRef(false);

  // Detect mobile
  useEffect(() => {
    setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  // Init audio on first interaction
  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new SkeetAudio();
    }
    audioRef.current.init();
  }, []);

  // ==================== GAME STATE INIT ====================
  const initGameState = useCallback(() => {
    return {
      round: 0,
      plateIndex: 0,
      plates: [],
      explosions: [],
      floatingTexts: [],
      clouds: [
        { x: 60, y: 50, w: 40, h: 16, opacity: 0.3, speed: 0.15 },
        { x: 200, y: 30, w: 50, h: 18, opacity: 0.25, speed: 0.1 },
        { x: 320, y: 60, w: 35, h: 14, opacity: 0.35, speed: 0.2 },
        { x: 140, y: 80, w: 45, h: 15, opacity: 0.2, speed: 0.12 },
      ],
      launcherSmoke: [],
      leftKick: 0,
      rightKick: 0,
      score: 0,
      streak: 0,
      maxStreak: 0,
      totalHits: 0,
      totalMisses: 0,
      roundHits: 0,
      roundScores: [0, 0, 0],
      plateStatuses: new Array(PLATES_PER_ROUND).fill("pending"), // pending, hit, miss, current
      lastShotLeft: 0,
      lastShotRight: 0,
      leftFlash: 0,
      rightFlash: 0,
      leftReticleSize: RETICLE_SIZES[0],
      rightReticleSize: RETICLE_SIZES[0],
      targetLeftSize: RETICLE_SIZES[0],
      targetRightSize: RETICLE_SIZES[0],
      currentPlate: null,
      plateActive: false,
      plateTimer: 0,
      plateSpawnTimer: 0,
      roundActive: false,
      bird: null,
      parrot: null,
      paused: false,
      speedMultiplier: 1,
      continueCount: 0,
      // Timing
      lastTime: 0,
      elapsed: 0,
      roundIntroTimer: 0,
      roundEndTimer: 0,
      gamePhase: "idle", // idle, roundIntro, playing, roundEnd, bonusPhase, result
    };
  }, []);

  // ==================== PLATE GENERATION ====================
  const spawnPlate = useCallback((gs, time) => {
    const roundCfg = ROUND_CFG[Math.min(gs.round, TOTAL_ROUNDS - 1)];
    const goesLeft = Math.random() < 0.6; // 60% cross left reticle
    const speedMult = roundCfg.speedMult * gs.speedMultiplier;

    let vx, vy, startX, startY;
    if (goesLeft) {
      // Launch from right launcher toward left reticle
      startX = CANVAS_W - 30;
      startY = CANVAS_H * 0.85;
      vx = -(2.0 + Math.random() * 0.8) * speedMult;
      vy = -(4.5 + Math.random() * 0.5) * speedMult;
    } else {
      // Launch from left launcher toward right reticle
      startX = 30;
      startY = CANVAS_H * 0.85;
      vx = (2.0 + Math.random() * 0.8) * speedMult;
      vy = -(4.5 + Math.random() * 0.5) * speedMult;
    }

    return {
      x: startX,
      y: startY,
      vx,
      vy,
      goesLeft,
      hit: false,
      missed: false,
      offscreen: false,
      spawnTime: time,
      hitWindow: roundCfg.hitWindow,
      shotAttemptedLeft: false,
      shotAttemptedRight: false,
      alpha: 1,
    };
  }, []);

  // ==================== EXPLOSION ====================
  const createExplosion = useCallback((x, y) => {
    const fragCount = 5 + Math.floor(Math.random() * 3);
    const fragments = [];
    for (let i = 0; i < fragCount; i++) {
      const angle = (Math.PI * 2 / fragCount) * i + Math.random() * 0.5;
      const speed = 1.5 + Math.random() * 2.5;
      fragments.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? "#d4733a" : "#b85a2a",
        alpha: 1,
      });
    }
    const dust = [];
    for (let i = 0; i < 3; i++) {
      dust.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        r: 2,
        maxR: 15 + Math.random() * 10,
        alpha: 0.6,
      });
    }
    return { fragments, dust, age: 0 };
  }, []);

  // ==================== FLOATING TEXT ====================
  const addFloatingText = useCallback((gs, text, x, y, color, size = 10, shake = false, scaleIn = false) => {
    gs.floatingTexts.push({
      text, x, y, color, size, shake, scaleIn,
      alpha: 1,
      vy: -1.2,
      age: 0,
      maxAge: 800,
    });
  }, []);

  // ==================== COLLISION CHECK ====================
  const isPlateInReticle = useCallback((plate, reticleX, reticleY, reticleSize) => {
    if (!plate || plate.hit || plate.offscreen) return false;
    const dx = plate.x - reticleX;
    const dy = plate.y - reticleY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < reticleSize / 2 + 15; // plate radius ~15
  }, []);

  // ==================== SHOOT HANDLER ====================
  const handleShoot = useCallback((side) => {
    const gs = gameRef.current;
    if (!gs || gs.paused || gs.gamePhase !== "playing") return;

    const now = performance.now();
    ensureAudio();

    // Check cooldown (300ms)
    if (side === "left" && now - gs.lastShotLeft < 300) return;
    if (side === "right" && now - gs.lastShotRight < 300) return;

    // Mark shot time and flash
    if (side === "left") {
      gs.lastShotLeft = now;
      gs.leftFlash = 1;
    } else {
      gs.lastShotRight = now;
      gs.rightFlash = 1;
    }

    audioRef.current?.shoot();

    // Vibrate on mobile
    if (navigator.vibrate) {
      try { navigator.vibrate(30); } catch (e) {}
    }

    // Check if plate can be shot from this side
    const plate = gs.currentPlate;
    if (!plate || plate.hit || plate.offscreen) return;

    // Prevent double-shot from same side
    if (side === "left" && plate.shotAttemptedLeft) return;
    if (side === "right" && plate.shotAttemptedRight) return;

    if (side === "left") plate.shotAttemptedLeft = true;
    else plate.shotAttemptedRight = true;

    const reticleX = side === "left" ? CANVAS_W * 0.25 : CANVAS_W * 0.75;
    const reticleY = CANVAS_H * 0.4;
    const reticleSize = side === "left" ? gs.leftReticleSize : gs.rightReticleSize;

    if (isPlateInReticle(plate, reticleX, reticleY, reticleSize)) {
      // HIT!
      plate.hit = true;
      gs.streak++;
      if (gs.streak > gs.maxStreak) gs.maxStreak = gs.streak;
      gs.totalHits++;
      gs.roundHits++;

      // Mark plate status
      const plateIdx = gs.plateIndex - 1;
      if (plateIdx >= 0 && plateIdx < PLATES_PER_ROUND) {
        gs.plateStatuses[plateIdx] = "hit";
      }

      // Score calculation
      const streakIdx = Math.min(gs.streak - 1, STREAK_POINTS.length - 1);
      let pts = STREAK_POINTS[streakIdx];

      // Timing bonus: first 1/3 of hit window
      const elapsed = now - plate.spawnTime;
      const windowThird = plate.hitWindow / 3;
      const isPerfect = elapsed < windowThird;
      if (isPerfect) {
        pts += TIMING_BONUS;
        audioRef.current?.perfectHit();
        addFloatingText(gs, "PERFEITO!", plate.x, plate.y - 20, ACCENT, 8, false, false);
      } else {
        audioRef.current?.hit();
      }

      gs.score += pts;
      gs.roundScores[gs.round] += pts;
      setScore(gs.score);

      addFloatingText(gs, `+${pts}`, plate.x, plate.y, "#fbbf24", 11, false, false);

      // Explosion
      gs.explosions.push(createExplosion(plate.x, plate.y));

      // Update reticle size target
      const sizeIdx = gs.streak >= 15 ? 3 : gs.streak >= 10 ? 2 : gs.streak >= 5 ? 1 : 0;
      gs.targetLeftSize = RETICLE_SIZES[sizeIdx];
      gs.targetRightSize = RETICLE_SIZES[sizeIdx];
    }
  }, [ensureAudio, isPlateInReticle, createExplosion, addFloatingText]);

  // ==================== SHOOT BONUS TARGETS ====================
  const handleShootBonus = useCallback((side) => {
    const gs = gameRef.current;
    if (!gs || gs.paused) return;

    const now = performance.now();
    if (side === "left" && now - gs.lastShotLeft < 300) return;
    if (side === "right" && now - gs.lastShotRight < 300) return;

    if (side === "left") {
      gs.lastShotLeft = now;
      gs.leftFlash = 1;
    } else {
      gs.lastShotRight = now;
      gs.rightFlash = 1;
    }

    audioRef.current?.shoot();
    if (navigator.vibrate) {
      try { navigator.vibrate(30); } catch (e) {}
    }

    const reticleX = side === "left" ? CANVAS_W * 0.25 : CANVAS_W * 0.75;
    const reticleY = CANVAS_H * 0.4;
    const reticleSize = side === "left" ? gs.leftReticleSize : gs.rightReticleSize;

    // Check bird
    if (gs.bird && !gs.bird.hit) {
      const dx = gs.bird.x - reticleX;
      const dy = gs.bird.y - reticleY;
      if (Math.sqrt(dx * dx + dy * dy) < reticleSize / 2 + 12) {
        gs.bird.hit = true;
        const birdPts = BIRD_POINTS[Math.min(gs.round, 2)];
        gs.score += birdPts;
        gs.roundScores[gs.round] += birdPts;
        setScore(gs.score);
        addFloatingText(gs, `+${birdPts}`, gs.bird.x, gs.bird.y, "#fbbf24", 14, false, true);
        gs.explosions.push(createExplosion(gs.bird.x, gs.bird.y));
        audioRef.current?.hit();

        // Spawn parrot
        gs.parrot = {
          x: CANVAS_W + 20,
          y: CANVAS_H * 0.3,
          vx: -2.5 * gs.speedMultiplier,
          baseY: CANVAS_H * 0.3,
          hitCount: 0,
          dead: false,
          spawnTime: now,
        };
        audioRef.current?.birdAppear();
        return;
      }
    }

    // Check parrot
    if (gs.parrot && !gs.parrot.dead) {
      const dx = gs.parrot.x - reticleX;
      const dy = gs.parrot.y - reticleY;
      if (Math.sqrt(dx * dx + dy * dy) < reticleSize / 2 + 10) {
        gs.parrot.hitCount++;
        gs.score += 1000;
        gs.roundScores[gs.round] += 1000;
        setScore(gs.score);
        addFloatingText(gs, "+1000", gs.parrot.x, gs.parrot.y - 10, "#fbbf24", 10, false, false);
        audioRef.current?.parrotSquawk();
        if (gs.parrot.hitCount >= 3) {
          gs.parrot.dead = true;
          gs.explosions.push(createExplosion(gs.parrot.x, gs.parrot.y));
        }
      }
    }
  }, [addFloatingText, createExplosion]);

  // ==================== KEYBOARD ====================
  useEffect(() => {
    const handleKeyDown = (e) => {
      const gs = gameRef.current;
      if (!gs) return;

      if (e.key === "p" || e.key === "P") {
        if (gs.gamePhase === "playing" || gs.gamePhase === "bonusPhase") {
          gs.paused = !gs.paused;
          if (gs.paused) {
            audioRef.current?.stopMusic();
          } else {
            audioRef.current?.startMusic(gs.round);
          }
          // Force re-render for pause overlay
          setScreen(gs.paused ? "paused" : "playing");
        }
        return;
      }

      if (gs.paused) return;

      if (gs.gamePhase === "playing") {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          e.preventDefault();
          handleShoot("left");
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          e.preventDefault();
          handleShoot("right");
        }
      } else if (gs.gamePhase === "bonusPhase") {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          e.preventDefault();
          handleShootBonus("left");
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          e.preventDefault();
          handleShootBonus("right");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleShoot, handleShootBonus]);

  // Refs for stable function access from game loop
  const advanceRoundRef = useRef(null);
  const endGameRef = useRef(null);
  const gameLoopRef = useRef(null);

  useEffect(() => {
    gameLoopRef.current = (timestamp) => {
      const gs = gameRef.current;
      const canvas = canvasRef.current;
      if (!gs || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (gs.lastTime === 0) gs.lastTime = timestamp;
      const dt = Math.min(timestamp - gs.lastTime, 50);
      gs.lastTime = timestamp;

      if (!gs.paused) {
        gs.elapsed += dt;

        // Update clouds
        for (const c of gs.clouds) {
          c.x += c.speed;
          if (c.x > CANVAS_W + 60) c.x = -60;
        }

        // Update launcher kicks
        if (gs.leftKick > 0) gs.leftKick = Math.max(0, gs.leftKick - dt * 0.01);
        if (gs.rightKick > 0) gs.rightKick = Math.max(0, gs.rightKick - dt * 0.01);

        // Update launcher smoke
        for (let i = gs.launcherSmoke.length - 1; i >= 0; i--) {
          const p = gs.launcherSmoke[i];
          p.x += p.vx;
          p.y += p.vy;
          p.r += 0.1;
          p.alpha -= 0.015;
          if (p.alpha <= 0) gs.launcherSmoke.splice(i, 1);
        }

        // Update reticle flash
        if (gs.leftFlash > 0) gs.leftFlash = Math.max(0, gs.leftFlash - dt * 0.01);
        if (gs.rightFlash > 0) gs.rightFlash = Math.max(0, gs.rightFlash - dt * 0.01);

        // Smooth reticle size
        gs.leftReticleSize = lerp(gs.leftReticleSize, gs.targetLeftSize, dt * 0.005);
        gs.rightReticleSize = lerp(gs.rightReticleSize, gs.targetRightSize, dt * 0.005);

        // GAME PHASE LOGIC
        if (gs.gamePhase === "roundIntro") {
          gs.roundIntroTimer += dt;
          if (gs.roundIntroTimer >= 2500) {
            gs.gamePhase = "playing";
            gs.roundActive = true;
            gs.plateSpawnTimer = 500;
            gs.roundHits = 0;
            gs.plateIndex = 0;
            gs.plateStatuses = new Array(PLATES_PER_ROUND).fill("pending");
            audioRef.current?.startMusic(gs.round);
            setScreen("playing");
          }
        } else if (gs.gamePhase === "playing") {
          // Spawn plates
          if (gs.plateIndex < PLATES_PER_ROUND && !gs.plateActive) {
            gs.plateSpawnTimer += dt;
            const interval = ROUND_CFG[Math.min(gs.round, TOTAL_ROUNDS - 1)].interval / gs.speedMultiplier;
            if (gs.plateSpawnTimer >= interval) {
              gs.plateSpawnTimer = 0;
              const plate = spawnPlate(gs, timestamp);
              gs.currentPlate = plate;
              gs.plateActive = true;
              gs.plateIndex++;

              const pIdx = gs.plateIndex - 1;
              if (pIdx < PLATES_PER_ROUND) gs.plateStatuses[pIdx] = "current";

              if (plate.goesLeft) {
                gs.rightKick = 1;
                for (let i = 0; i < 3; i++) {
                  gs.launcherSmoke.push({
                    x: CANVAS_W - 30 + (Math.random() - 0.5) * 8,
                    y: CANVAS_H * 0.85 - 20,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -0.5 - Math.random() * 0.5,
                    r: 2 + Math.random() * 2,
                    alpha: 0.5,
                  });
                }
              } else {
                gs.leftKick = 1;
                for (let i = 0; i < 3; i++) {
                  gs.launcherSmoke.push({
                    x: 30 + (Math.random() - 0.5) * 8,
                    y: CANVAS_H * 0.85 - 20,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -0.5 - Math.random() * 0.5,
                    r: 2 + Math.random() * 2,
                    alpha: 0.5,
                  });
                }
              }
            }
          }

          // Update current plate
          if (gs.currentPlate && gs.plateActive) {
            const plate = gs.currentPlate;
            if (!plate.hit && !plate.offscreen) {
              plate.x += plate.vx;
              plate.vy += GRAVITY;
              plate.y += plate.vy;

              if (plate.x < -30 || plate.x > CANVAS_W + 30 || plate.y > CANVAS_H + 30) {
                plate.offscreen = true;
                if (!plate.hit && !plate.missed) {
                  plate.missed = true;
                  gs.totalMisses++;
                  gs.streak = 0;
                  gs.targetLeftSize = RETICLE_SIZES[0];
                  gs.targetRightSize = RETICLE_SIZES[0];

                  const pIdx = gs.plateIndex - 1;
                  if (pIdx >= 0 && pIdx < PLATES_PER_ROUND) {
                    gs.plateStatuses[pIdx] = "miss";
                  }

                  addFloatingText(gs, "MISS!", CANVAS_W / 2, CANVAS_H * 0.35, "#ef4444", 12, true, false);
                  audioRef.current?.miss();
                }
                gs.plateActive = false;
              }
            } else {
              gs.plateActive = false;
            }
          }

          // Check if round complete
          if (gs.plateIndex >= PLATES_PER_ROUND && !gs.plateActive) {
            gs.gamePhase = "roundEnd";
            gs.roundEndTimer = 0;
            audioRef.current?.stopMusic();
            audioRef.current?.roundComplete();

            if (gs.roundHits === PLATES_PER_ROUND) {
              addFloatingText(gs, "PERFECT ROUND!", CANVAS_W / 2, CANVAS_H * 0.3, "#fbbf24", 14, false, true);
            }
            setScreen("roundEnd");
          }
        } else if (gs.gamePhase === "roundEnd") {
          gs.roundEndTimer += dt;

          if (gs.roundHits === PLATES_PER_ROUND && gs.roundEndTimer > 1500 && !gs.bird) {
            gs.bird = {
              x: -20,
              y: CANVAS_H * 0.25 + Math.random() * 50,
              vx: 3.0 * gs.speedMultiplier,
              vy: -0.5,
              hit: false,
              spawnTime: timestamp,
            };
            gs.gamePhase = "bonusPhase";
            audioRef.current?.birdAppear();
            setScreen("playing");
          } else if (gs.roundEndTimer >= 3000 && gs.gamePhase === "roundEnd") {
            advanceRoundRef.current();
          }
        } else if (gs.gamePhase === "bonusPhase") {
          if (gs.bird && !gs.bird.hit) {
            gs.bird.x += gs.bird.vx;
            gs.bird.y += gs.bird.vy;
            if (gs.bird.x > CANVAS_W + 30 || gs.bird.y < -30) {
              gs.bird = null;
              if (!gs.parrot) {
                advanceRoundRef.current();
              }
            }
          }

          if (gs.parrot && !gs.parrot.dead) {
            gs.parrot.x += gs.parrot.vx;
            gs.parrot.y = gs.parrot.baseY + Math.sin((timestamp - gs.parrot.spawnTime) * 0.003) * 30;
            if (gs.parrot.x < -30) {
              gs.parrot = null;
              advanceRoundRef.current();
            }
          } else if (gs.parrot && gs.parrot.dead) {
            if (!gs.parrotDeadTimer) gs.parrotDeadTimer = timestamp;
            if (timestamp - gs.parrotDeadTimer > 1000) {
              gs.parrot = null;
              gs.parrotDeadTimer = null;
              advanceRoundRef.current();
            }
          }

          if (!gs.bird && !gs.parrot) {
            advanceRoundRef.current();
          }
        }

        // Update explosions
        for (let i = gs.explosions.length - 1; i >= 0; i--) {
          const expl = gs.explosions[i];
          expl.age += dt;
          for (const f of expl.fragments) {
            f.x += f.vx;
            f.vy += 0.08;
            f.y += f.vy;
            f.rot += f.rotSpeed;
            f.alpha = Math.max(0, 1 - expl.age / 600);
          }
          for (const d of expl.dust) {
            d.r = lerp(d.r, d.maxR, dt * 0.008);
            d.alpha = Math.max(0, 0.6 - expl.age / 500);
          }
          if (expl.age > 700) gs.explosions.splice(i, 1);
        }

        // Update floating texts
        for (let i = gs.floatingTexts.length - 1; i >= 0; i--) {
          const t = gs.floatingTexts[i];
          t.age += dt;
          t.y += t.vy;
          t.alpha = Math.max(0, 1 - t.age / t.maxAge);
          if (t.age >= t.maxAge) gs.floatingTexts.splice(i, 1);
        }
      }

      // ==================== DRAW ====================
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawSky(ctx, CANVAS_W, CANVAS_H);
      drawClouds(ctx, gs.clouds, CANVAS_W);
      drawTreeline(ctx, CANVAS_W, CANVAS_H);
      drawGround(ctx, CANVAS_W, CANVAS_H);

      drawLauncher(ctx, 30, CANVAS_H * 0.88, gs.leftKick > 0.5, "left");
      drawLauncher(ctx, CANVAS_W - 30, CANVAS_H * 0.88, gs.rightKick > 0.5, "right");
      drawLauncherSmoke(ctx, gs.launcherSmoke);

      if (gs.currentPlate && !gs.currentPlate.hit) {
        drawPlate(ctx, gs.currentPlate, gs.elapsed);
      }

      drawBird(ctx, gs.bird, gs.elapsed);
      drawParrot(ctx, gs.parrot, gs.elapsed);

      for (const expl of gs.explosions) {
        drawExplosion(ctx, expl);
      }

      // Reticles
      const pulsePhase = gs.elapsed * 0.001;
      const leftReticleX = CANVAS_W * 0.25;
      const rightReticleX = CANVAS_W * 0.75;
      const reticleY = CANVAS_H * 0.4;

      const plateInLeft = gs.currentPlate && !gs.currentPlate.hit && !gs.currentPlate.offscreen &&
        isPlateInReticle(gs.currentPlate, leftReticleX, reticleY, gs.leftReticleSize);
      const plateInRight = gs.currentPlate && !gs.currentPlate.hit && !gs.currentPlate.offscreen &&
        isPlateInReticle(gs.currentPlate, rightReticleX, reticleY, gs.rightReticleSize);

      const leftColor = plateInLeft ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)";
      const rightColor = plateInRight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)";

      const streakLevel = gs.streak >= 15 ? 3 : gs.streak >= 10 ? 2 : gs.streak >= 5 ? 1 : 0;

      if (gs.gamePhase === "playing" || gs.gamePhase === "bonusPhase") {
        drawReticle(ctx, leftReticleX, reticleY, gs.leftReticleSize, leftColor, "#ff6b35", gs.leftFlash, pulsePhase, streakLevel);
        drawReticle(ctx, rightReticleX, reticleY, gs.rightReticleSize, rightColor, "#ff6b35", gs.rightFlash, pulsePhase, streakLevel);
      }

      drawFloatingText(ctx, gs.floatingTexts);

      // HUD
      if (gs.gamePhase === "playing" || gs.gamePhase === "bonusPhase") {
        ctx.font = "bold 14px 'Press Start 2P', monospace";
        ctx.fillStyle = "#fbbf24";
        ctx.textAlign = "left";
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 8;
        ctx.fillText(gs.score.toLocaleString(), 10, 22);
        ctx.shadowBlur = 0;

        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(`ROUND ${gs.round + 1}/${TOTAL_ROUNDS}`, CANVAS_W / 2, 22);

        const dotStartX = CANVAS_W - 10 - (PLATES_PER_ROUND - 1) * 14;
        for (let i = 0; i < PLATES_PER_ROUND; i++) {
          const dx = dotStartX + i * 14;
          const status = gs.plateStatuses[i];
          let dotColor;
          if (status === "hit") dotColor = ACCENT;
          else if (status === "miss") dotColor = "#ef4444";
          else if (status === "current") {
            dotColor = "#ffffff";
            ctx.globalAlpha = 0.5 + Math.sin(gs.elapsed * 0.008) * 0.5;
          } else {
            dotColor = "#555555";
          }
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(dx, 40, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        if (gs.streak > 0) {
          ctx.font = "10px 'Press Start 2P', monospace";
          ctx.fillStyle = gs.streak >= 10 ? "#fbbf24" : gs.streak >= 5 ? ACCENT : "#ffffff";
          ctx.textAlign = "center";
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = gs.streak >= 5 ? 10 : 0;
          ctx.fillText(`x${gs.streak}`, CANVAS_W / 2, CANVAS_H - 120);
          ctx.shadowBlur = 0;
        }
      }

      // Round intro overlay
      if (gs.gamePhase === "roundIntro") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const introProgress = Math.min(gs.roundIntroTimer / 800, 1);
        const introScale = 0.3 + introProgress * 0.7;
        ctx.save();
        ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
        ctx.scale(introScale, introScale);
        ctx.font = "bold 28px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(`ROUND ${gs.round + 1}`, 0, 0);
        if (gs.continueCount > 0) {
          ctx.font = "10px 'Press Start 2P', monospace";
          ctx.fillStyle = ACCENT;
          ctx.fillText(`+${gs.continueCount * 20}% VELOCIDADE`, 0, 35);
        }
        ctx.restore();
      }

      // Round end overlay
      if (gs.gamePhase === "roundEnd") {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.font = "12px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(`ROUND ${gs.round + 1} COMPLETO`, CANVAS_W / 2, CANVAS_H / 2 - 20);

        ctx.font = "16px 'Press Start 2P', monospace";
        ctx.fillStyle = "#fbbf24";
        ctx.fillText(`${gs.roundScores[gs.round]} PTS`, CANVAS_W / 2, CANVAS_H / 2 + 15);

        if (gs.roundHits === PLATES_PER_ROUND) {
          ctx.font = "14px 'Press Start 2P', monospace";
          ctx.fillStyle = ACCENT;
          ctx.shadowColor = ACCENT;
          ctx.shadowBlur = 15;
          ctx.fillText("PERFECT!", CANVAS_W / 2, CANVAS_H / 2 + 45);
          ctx.shadowBlur = 0;
        }
      }

      // Paused overlay
      if (gs.paused) {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.font = "18px 'Press Start 2P', monospace";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("PAUSADO", CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.font = "9px 'Press Start 2P', monospace";
        ctx.fillStyle = "#888888";
        ctx.fillText("P para continuar", CANVAS_W / 2, CANVAS_H / 2 + 15);
      }

      rafRef.current = requestAnimationFrame(gameLoopRef.current);
    };
  }, [spawnPlate, isPlateInReticle, addFloatingText]);

  // Actual startGame that uses the ref-based loop
  const startGameActual = useCallback((continueMode = false) => {
    ensureAudio();

    const gs = initGameState();
    if (continueMode && gameRef.current) {
      gs.score = gameRef.current.score;
      gs.totalHits = gameRef.current.totalHits;
      gs.totalMisses = gameRef.current.totalMisses;
      gs.maxStreak = gameRef.current.maxStreak;
      gs.streak = gameRef.current.streak;
      gs.continueCount = gameRef.current.continueCount + 1;
      gs.speedMultiplier = 1 + gs.continueCount * 0.2;
      gs.roundScores = [0, 0, 0];
    }

    gs.gamePhase = "roundIntro";
    gs.roundIntroTimer = 0;
    gameRef.current = gs;
    scoreSubmittedRef.current = false;
    setScore(gs.score);
    setScreen("roundIntro");

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "game_start", { game: "tiroaoalvo" });
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    gs.lastTime = 0;
    rafRef.current = requestAnimationFrame(gameLoopRef.current);
  }, [ensureAudio, initGameState]);

  // advanceRound using ref-based loop
  useEffect(() => {
    advanceRoundRef.current = () => {
      const gs = gameRef.current;
      if (!gs) return;

      gs.bird = null;
      gs.parrot = null;
      gs.parrotDeadTimer = null;

      if (gs.round < TOTAL_ROUNDS - 1) {
        gs.round++;
        gs.gamePhase = "roundIntro";
        gs.roundIntroTimer = 0;
        gs.roundHits = 0;
        gs.plateIndex = 0;
        gs.plateActive = false;
        gs.currentPlate = null;
        gs.plateStatuses = new Array(PLATES_PER_ROUND).fill("pending");
        setScreen("roundIntro");
      } else {
        endGameRef.current();
      }
    };
  }, []);

  useEffect(() => {
    endGameRef.current = () => {
      const gs = gameRef.current;
      if (!gs) return;

      audioRef.current?.stopMusic();
      gs.gamePhase = "result";
      setScreen("result");

      const medalha = gs.score >= MEDAL_GOLD ? "gold" : gs.score >= MEDAL_SILVER ? "silver" : gs.score >= MEDAL_BRONZE ? "bronze" : "none";

      if (medalha !== "none") {
        audioRef.current?.medal();
      }

      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "game_end", { game: "tiroaoalvo", score: gs.score });
      }

      if (!scoreSubmittedRef.current) {
        scoreSubmittedRef.current = true;
        const accuracy = gs.totalHits + gs.totalMisses > 0
          ? Math.round((gs.totalHits / (gs.totalHits + gs.totalMisses)) * 100)
          : 0;
        fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pontos: gs.score,
            acertos: gs.totalHits,
            erros: gs.totalMisses,
            melhorCombo: gs.maxStreak,
            precisao: accuracy,
            jogo: "tiroaoalvo",
            metadata: {
              round: gs.round + 1,
              acertos: gs.totalHits,
              streak_max: gs.maxStreak,
              medalha,
              roundScores: gs.roundScores,
              continueCount: gs.continueCount,
            },
          }),
        }).catch(() => {});
      }
    };
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioRef.current?.stopMusic();
    };
  }, []);

  // ==================== HANDLE REGISTER ====================
  const handleRegister = useCallback(async (userData) => {
    const result = await register(userData);
    if (result && !result.error) {
      startGameActual(false);
    }
    return result;
  }, [register, startGameActual]);

  // ==================== HANDLE PLAY CLICK ====================
  const handlePlay = useCallback(() => {
    ensureAudio();
    if (!user) {
      setScreen("register");
    } else {
      startGameActual(false);
    }
  }, [user, ensureAudio, startGameActual]);

  // ==================== HANDLE CONTINUE ====================
  const handleContinue = useCallback(() => {
    startGameActual(true);
  }, [startGameActual]);

  // ==================== MOBILE SHOT HANDLERS ====================
  const handleMobileShot = useCallback((side) => {
    const gs = gameRef.current;
    if (!gs) return;
    ensureAudio();
    if (gs.gamePhase === "playing") {
      handleShoot(side);
    } else if (gs.gamePhase === "bonusPhase") {
      handleShootBonus(side);
    }
  }, [ensureAudio, handleShoot, handleShootBonus]);

  const handleMobilePause = useCallback(() => {
    const gs = gameRef.current;
    if (!gs) return;
    if (gs.gamePhase === "playing" || gs.gamePhase === "bonusPhase") {
      gs.paused = !gs.paused;
      if (gs.paused) {
        audioRef.current?.stopMusic();
        setScreen("paused");
      } else {
        audioRef.current?.startMusic(gs.round);
        setScreen("playing");
      }
    }
  }, []);

  // ==================== TOGGLE MUTE ====================
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const m = audioRef.current.toggle();
    setMuted(m);
  }, []);

  // ==================== DRAW MENU ON CANVAS ====================
  useEffect(() => {
    if (screen !== "menu") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame;
    let elapsed = 0;
    let lastTime = 0;

    const drawMenu = (timestamp) => {
      if (lastTime === 0) lastTime = timestamp;
      const dt = timestamp - lastTime;
      lastTime = timestamp;
      elapsed += dt;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawSky(ctx, CANVAS_W, CANVAS_H);

      // Animated clouds
      const menuClouds = [
        { x: (60 + elapsed * 0.015) % (CANVAS_W + 120) - 60, y: 50, w: 40, h: 16, opacity: 0.3 },
        { x: (200 + elapsed * 0.01) % (CANVAS_W + 120) - 60, y: 30, w: 50, h: 18, opacity: 0.25 },
        { x: (320 + elapsed * 0.02) % (CANVAS_W + 120) - 60, y: 60, w: 35, h: 14, opacity: 0.35 },
      ];
      drawClouds(ctx, menuClouds, CANVAS_W);
      drawTreeline(ctx, CANVAS_W, CANVAS_H);
      drawGround(ctx, CANVAS_W, CANVAS_H);
      drawLauncher(ctx, 30, CANVAS_H * 0.88, false, "left");
      drawLauncher(ctx, CANVAS_W - 30, CANVAS_H * 0.88, false, "right");

      // Dark overlay
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Title
      ctx.font = "20px 'Press Start 2P', monospace";
      ctx.fillStyle = ACCENT;
      ctx.textAlign = "center";
      ctx.shadowColor = ACCENT;
      ctx.shadowBlur = 20;
      ctx.fillText("TIRO AO ALVO", CANVAS_W / 2, 130);
      ctx.shadowBlur = 0;

      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#8892b0";
      ctx.fillText("SKEET SHOOTING", CANVAS_W / 2, 155);

      // Animated clay plate icon
      const plateAngle = (elapsed * 0.004) % (Math.PI * 2);
      ctx.save();
      ctx.translate(CANVAS_W / 2, 200);
      ctx.rotate(plateAngle);
      const squash = Math.abs(Math.cos(plateAngle * 2)) * 0.6 + 0.4;
      ctx.scale(1.5, squash * 1.5);
      const grad = ctx.createLinearGradient(-15, 0, 15, 0);
      grad.addColorStop(0, "#d4733a");
      grad.addColorStop(0.5, "#e88a4f");
      grad.addColorStop(1, "#b85a2a");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 15, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // High score
      const hs = localStorage.getItem("tiroaoalvo_highscore") || "0";
      ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(`RECORDE: ${parseInt(hs).toLocaleString()}`, CANVAS_W / 2, 250);

      // Controls hint
      if (!isMobile) {
        ctx.font = "7px 'Fira Code', monospace";
        ctx.fillStyle = "#6b7280";
        ctx.fillText("SETA ESQUERDA = Tiro Esquerdo", CANVAS_W / 2, 350);
        ctx.fillText("SETA DIREITA = Tiro Direito", CANVAS_W / 2, 368);
        ctx.fillText("P = Pausar", CANVAS_W / 2, 386);
      } else {
        ctx.font = "7px 'Fira Code', monospace";
        ctx.fillStyle = "#6b7280";
        ctx.fillText("Toque nos botoes para atirar!", CANVAS_W / 2, 365);
      }

      animFrame = requestAnimationFrame(drawMenu);
    };

    animFrame = requestAnimationFrame(drawMenu);
    return () => cancelAnimationFrame(animFrame);
  }, [screen, isMobile]);

  // ==================== RESULT SCREEN STATE ====================
  const gs = gameRef.current;
  const finalScore = gs?.score || 0;
  const finalHits = gs?.totalHits || 0;
  const finalMisses = gs?.totalMisses || 0;
  const finalMaxStreak = gs?.maxStreak || 0;
  const finalMedalha = finalScore >= MEDAL_GOLD ? "gold" : finalScore >= MEDAL_SILVER ? "silver" : finalScore >= MEDAL_BRONZE ? "bronze" : "none";
  const accuracy = finalHits + finalMisses > 0 ? Math.round((finalHits / (finalHits + finalMisses)) * 100) : 0;

  // Save high score
  useEffect(() => {
    if (screen === "result" && finalScore > 0) {
      const prev = parseInt(localStorage.getItem("tiroaoalvo_highscore") || "0");
      if (finalScore > prev) {
        localStorage.setItem("tiroaoalvo_highscore", String(finalScore));
      }
    }
  }, [screen, finalScore]);

  // ==================== RENDER ====================
  const isPlaying = screen === "playing" || screen === "roundIntro" || screen === "roundEnd" || screen === "paused";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minHeight: "100vh",
      background: "#050510",
      padding: "20px 12px",
      fontFamily: "'Fira Code', monospace",
    }}>
      <style>{`
        @keyframes medalPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scoreCount {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Top ad */}
      {!isPlaying && (
        <AdBanner slot="tiroaoalvo_top" style={{ marginBottom: 12, maxWidth: CANVAS_W }} />
      )}

      {/* Title */}
      {screen !== "result" && (
        <>
          <h1 style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 20,
            color: ACCENT,
            textShadow: `0 0 20px ${ACCENT}, 0 0 40px rgba(74,222,128,0.3)`,
            marginBottom: 6,
            letterSpacing: 2,
            textAlign: "center",
          }}>
            TIRO AO ALVO
          </h1>
          <p style={{
            color: "#4a5568",
            fontSize: 9,
            marginBottom: 12,
            fontFamily: "'Press Start 2P', monospace",
            textAlign: "center",
          }}>
            SKEET SHOOTING
          </p>
        </>
      )}

      {/* Mute button */}
      {isPlaying && (
        <button
          onClick={toggleMute}
          style={{
            position: "fixed",
            top: 10,
            right: 10,
            zIndex: 300,
            background: "rgba(0,0,0,0.6)",
            border: `1px solid ${ACCENT}33`,
            borderRadius: 8,
            color: "#fff",
            fontSize: 18,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          {muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
        </button>
      )}

      {/* Canvas area */}
      <div style={{
        width: CANVAS_W * gameScale,
        height: CANVAS_H * gameScale,
        touchAction: isPlaying ? "none" : "auto",
      }}>
        <div style={{
          width: CANVAS_W,
          height: CANVAS_H,
          position: "relative",
          border: `2px solid rgba(74,222,128,0.3)`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: `0 0 25px rgba(74,222,128,0.15)`,
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

          {/* Menu screen overlay buttons */}
          {screen === "menu" && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}>
              <div style={{ marginTop: 80, pointerEvents: "auto" }}>
                <button
                  onClick={handlePlay}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 14,
                    padding: "16px 40px",
                    background: `linear-gradient(135deg, ${ACCENT}, #22c55e)`,
                    border: "none",
                    borderRadius: 10,
                    color: "#000",
                    cursor: "pointer",
                    fontWeight: 900,
                    letterSpacing: 2,
                    boxShadow: `0 0 30px rgba(74,222,128,0.4)`,
                  }}
                >
                  JOGAR
                </button>
              </div>
            </div>
          )}

          {/* Register modal */}
          {screen === "register" && (
            <RegisterModal
              onRegister={handleRegister}
              loading={registering}
              jogoNome="TIRO AO ALVO"
              accentColor={ACCENT}
            />
          )}

          {/* Result screen */}
          {screen === "result" && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(5,5,16,0.95)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
              overflow: "auto",
            }}>
              {/* Medal */}
              {finalMedalha !== "none" && (
                <div style={{
                  fontSize: 50,
                  animation: "medalPulse 1.5s ease-in-out infinite",
                  marginBottom: 10,
                }}>
                  {finalMedalha === "gold" ? "\uD83E\uDD47" : finalMedalha === "silver" ? "\uD83E\uDD48" : "\uD83E\uDD49"}
                </div>
              )}

              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 10,
                color: finalMedalha === "gold" ? "#fbbf24" : finalMedalha === "silver" ? "#c0c0c0" : finalMedalha === "bronze" ? "#cd7f32" : "#888",
                marginBottom: 8,
              }}>
                {finalMedalha === "gold" ? "MEDALHA DE OURO!" : finalMedalha === "silver" ? "MEDALHA DE PRATA!" : finalMedalha === "bronze" ? "MEDALHA DE BRONZE!" : "SEM MEDALHA"}
              </div>

              {/* Score */}
              <div style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 24,
                color: "#fbbf24",
                textShadow: "0 0 15px rgba(251,191,36,0.5)",
                animation: "scoreCount 0.8s ease-out",
                marginBottom: 16,
              }}>
                {finalScore.toLocaleString()}
              </div>

              {/* Stats */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px 20px",
                marginBottom: 16,
                animation: "fadeSlideUp 0.6s ease-out 0.3s both",
              }}>
                {[
                  ["ACERTOS", `${finalHits}/${finalHits + finalMisses}`],
                  ["PRECISAO", `${accuracy}%`],
                  ["MAX STREAK", `${finalMaxStreak}`],
                  ["BONUS", gs?.roundScores ? gs.roundScores.reduce((a, b) => a + b, 0).toLocaleString() : "0"],
                ].map(([label, value]) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: "#6b7280", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11, color: "#e0e0ff" }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Round breakdown */}
              {gs?.roundScores && (
                <div style={{
                  marginBottom: 16,
                  animation: "fadeSlideUp 0.6s ease-out 0.5s both",
                }}>
                  {gs.roundScores.map((rs, i) => (
                    <div key={i} style={{
                      fontFamily: "'Fira Code', monospace",
                      fontSize: 10,
                      color: "#8892b0",
                      marginBottom: 2,
                    }}>
                      Round {i + 1}: {rs.toLocaleString()} pts
                    </div>
                  ))}
                </div>
              )}

              {/* Ad between */}
              <AdBanner slot="tiroaoalvo_between" style={{ marginBottom: 12, maxWidth: 300 }} />

              {/* Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 280 }}>
                <button
                  onClick={() => { startGameActual(false); }}
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 10,
                    padding: "14px 0",
                    background: `linear-gradient(135deg, ${ACCENT}, #22c55e)`,
                    border: "none",
                    borderRadius: 8,
                    color: "#000",
                    cursor: "pointer",
                    fontWeight: 900,
                    letterSpacing: 1,
                  }}
                >
                  JOGAR NOVAMENTE
                </button>

                {finalMedalha !== "none" && (
                  <button
                    onClick={handleContinue}
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 9,
                      padding: "12px 0",
                      background: "transparent",
                      border: `2px solid ${ACCENT}`,
                      borderRadius: 8,
                      color: ACCENT,
                      cursor: "pointer",
                      letterSpacing: 1,
                    }}
                  >
                    CONTINUAR (+20% VEL)
                  </button>
                )}

                <button
                  onClick={() => { setScreen("menu"); gameRef.current = null; }}
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 11,
                    padding: "10px 0",
                    background: "transparent",
                    border: "1px solid #333",
                    borderRadius: 8,
                    color: "#6b7280",
                    cursor: "pointer",
                  }}
                >
                  Menu
                </button>
              </div>
            </div>
          )}

          {/* Paused overlay (interactive buttons for mobile) */}
          {screen === "paused" && isMobile && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              pointerEvents: "auto",
            }}>
              <button
                onClick={() => {
                  const g = gameRef.current;
                  if (g) {
                    g.paused = false;
                    audioRef.current?.startMusic(g.round);
                    setScreen("playing");
                  }
                }}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 10,
                  padding: "14px 30px",
                  background: `linear-gradient(135deg, ${ACCENT}, #22c55e)`,
                  border: "none",
                  borderRadius: 8,
                  color: "#000",
                  cursor: "pointer",
                  fontWeight: 900,
                  marginTop: 50,
                }}
              >
                CONTINUAR
              </button>
              <button
                onClick={() => {
                  audioRef.current?.stopMusic();
                  if (rafRef.current) cancelAnimationFrame(rafRef.current);
                  gameRef.current = null;
                  setScreen("menu");
                }}
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 11,
                  padding: "10px 30px",
                  background: "transparent",
                  border: "1px solid #555",
                  borderRadius: 8,
                  color: "#888",
                  cursor: "pointer",
                  marginTop: 12,
                }}
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile controls */}
      {isMobile && isPlaying && screen !== "paused" && screen !== "result" && (
        <div
          data-allow-touch
          style={{
            display: "flex",
            width: CANVAS_W * gameScale,
            marginTop: 8,
            gap: 4,
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          <button
            onTouchStart={(e) => { e.preventDefault(); handleMobileShot("left"); }}
            style={{
              flex: 1,
              height: 80,
              background: "linear-gradient(180deg, #1a3c1a, #0d200d)",
              border: `2px solid ${ACCENT}44`,
              borderRadius: 10,
              color: ACCENT,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 10,
              cursor: "pointer",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            ESQUERDA
          </button>

          <button
            onTouchStart={(e) => { e.preventDefault(); handleMobilePause(); }}
            style={{
              width: 50,
              height: 80,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #333",
              borderRadius: 10,
              color: "#888",
              fontSize: 18,
              cursor: "pointer",
              touchAction: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {"\u23F8"}
          </button>

          <button
            onTouchStart={(e) => { e.preventDefault(); handleMobileShot("right"); }}
            style={{
              flex: 1,
              height: 80,
              background: "linear-gradient(180deg, #1a3c1a, #0d200d)",
              border: `2px solid ${ACCENT}44`,
              borderRadius: 10,
              color: ACCENT,
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 10,
              cursor: "pointer",
              touchAction: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            DIREITA
          </button>
        </div>
      )}

      {/* User info during play */}
      {user && isPlaying && (
        <div style={{
          width: CANVAS_W * gameScale,
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          padding: "0 4px",
        }}>
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Fira Code', monospace" }}>
            {user.nome}
          </span>
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Fira Code', monospace" }}>
            {finalHits} acertos
          </span>
        </div>
      )}

      {/* Bottom ad */}
      <AdBanner slot="tiroaoalvo_bottom" style={{ marginTop: 16, maxWidth: CANVAS_W }} />
    </div>
  );
}
