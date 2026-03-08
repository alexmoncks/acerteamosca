"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

const CANVAS_W = 480;
const CANVAS_H = 640;
const BASE_SIZE = 48;
const GAME_DURATION = 30;
const WIN_EVERY_N = 15;

// Color evolution stages: blue -> cyan -> green -> yellow -> orange -> red
const COLOR_STAGES = [
  { r: 30, g: 100, b: 255 },
  { r: 0, g: 200, b: 255 },
  { r: 0, g: 230, b: 140 },
  { r: 80, g: 255, b: 50 },
  { r: 200, g: 255, b: 0 },
  { r: 255, g: 220, b: 0 },
  { r: 255, g: 160, b: 0 },
  { r: 255, g: 80, b: 0 },
  { r: 255, g: 30, b: 30 },
  { r: 255, g: 0, b: 60 },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getColorForProgress(progress) {
  const p = Math.min(progress, 0.99);
  const idx = p * (COLOR_STAGES.length - 1);
  const low = Math.floor(idx);
  const high = Math.min(low + 1, COLOR_STAGES.length - 1);
  const t = idx - low;
  const c1 = COLOR_STAGES[low];
  const c2 = COLOR_STAGES[high];
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
  };
}

function rgbStr(c) { return `rgb(${c.r},${c.g},${c.b})`; }
function rgbaStr(c, a) { return `rgba(${c.r},${c.g},${c.b},${a})`; }

function randomBetween(min, max) { return Math.random() * (max - min) + min; }
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

// ---- Ultra-Realistic Mosquito Audio Engine ----
class FlyAudio {
  constructor() {
    this.ctx = null;
    this.panner = null;
    this.gainNode = null;
    this.sourceNode = null;
    this.running = false;
    this.currentX = 0;
    this.currentY = 0;
    this.currentZ = 0.5;
  }

  _generateMosquitoBuffer(duration = 4) {
    const sr = this.ctx.sampleRate;
    const len = sr * duration;
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);

    let phase1 = 0, phase2 = 0, phase3 = 0, phase4 = 0, phase5 = 0;
    let freqDrift = 0, freqDrift2 = 0, ampDrift = 0;
    const baseFreq = 470;

    for (let i = 0; i < len; i++) {
      const t = i / sr;

      freqDrift += (Math.random() - 0.5) * 1.8;
      freqDrift *= 0.999;
      freqDrift = Math.max(-40, Math.min(40, freqDrift));

      freqDrift2 += (Math.random() - 0.5) * 0.15;
      freqDrift2 *= 0.9998;
      freqDrift2 = Math.max(-25, Math.min(25, freqDrift2));

      ampDrift += (Math.random() - 0.5) * 0.03;
      ampDrift *= 0.998;
      ampDrift = Math.max(-0.3, Math.min(0.3, ampDrift));

      const freq = baseFreq + freqDrift + freqDrift2;
      const dt1 = freq / sr;
      const dt2 = (freq * 2.01) / sr;
      const dt3 = (freq * 3.03) / sr;
      const dt4 = (freq * 5.97) / sr;
      const dt5 = (freq * 0.498) / sr;

      phase1 += dt1; phase2 += dt2; phase3 += dt3; phase4 += dt4; phase5 += dt5;
      if (phase1 > 1) phase1 -= 1;
      if (phase2 > 1) phase2 -= 1;
      if (phase3 > 1) phase3 -= 1;
      if (phase4 > 1) phase4 -= 1;
      if (phase5 > 1) phase5 -= 1;

      const wingBeatRate = freq * 0.98;
      const wingAM = 0.6 + 0.4 * Math.sin(2 * Math.PI * wingBeatRate * t);
      const surgeFreq = 0.7 + Math.sin(t * 1.3) * 0.3;
      const surge = 0.7 + 0.3 * Math.sin(2 * Math.PI * surgeFreq * t);

      const raw1 = Math.sin(2 * Math.PI * phase1);
      const fund = raw1 + 0.3 * Math.sign(raw1) * raw1 * raw1;
      const h2 = Math.sin(2 * Math.PI * phase2) * 0.45;
      const h3 = Math.sin(2 * Math.PI * phase3) * 0.2;
      const h4 = Math.sin(2 * Math.PI * phase4) * 0.08;
      const h5 = Math.sin(2 * Math.PI * phase5) * 0.15;
      const noise = (Math.random() - 0.5) * 0.06;

      const amp = (1.0 + ampDrift) * wingAM * surge;
      const sample = (fund * 0.4 + h2 * 0.25 + h3 * 0.12 + h4 * 0.08 + h5 * 0.08 + noise) * amp;
      data[i] = sample * 0.7;
    }
    return buffer;
  }

  _generateSlapBuffer() {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 0.25);
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const crackEnv = t < 0.003 ? (1 - t / 0.003) : 0;
      const crack = (Math.random() * 2 - 1) * crackEnv * 1.2;
      const slapEnv = Math.exp(-t / 0.012) * (t < 0.05 ? 1 : 0);
      const slapFreq = 800 * Math.exp(-t * 30);
      const slap = Math.sin(2 * Math.PI * slapFreq * t) * slapEnv * 0.8;
      const thudEnv = Math.exp(-t / 0.04);
      const thudFreq = 120 * Math.exp(-t * 15);
      const thud = Math.sin(2 * Math.PI * thudFreq * t) * thudEnv * 0.5;
      const splatEnv = (t > 0.002 && t < 0.06) ? Math.exp(-(t - 0.002) / 0.015) : 0;
      const splat = (Math.random() * 2 - 1) * splatEnv * 0.4;
      const ringEnv = Math.exp(-t / 0.08);
      const ring = Math.sin(2 * Math.PI * 350 * t) * ringEnv * 0.12;
      const snapEnv = t < 0.008 ? Math.exp(-t / 0.002) : 0;
      const snap = (Math.random() * 2 - 1 + Math.sin(2 * Math.PI * 3500 * t) * 0.5) * snapEnv * 0.6;
      data[i] = crack + slap + thud + splat + ring + snap;
    }
    return buffer;
  }

  _generateMissBuffer() {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 0.15);
    const buffer = this.ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const pos = i / len;
      const env = Math.sin(pos * Math.PI) * Math.exp(-pos * 2);
      const raw = Math.random() * 2 - 1;
      const cutoff = 4000 * (1 - pos * 0.7);
      const rc = 1 / (2 * Math.PI * cutoff);
      const alpha = 1 / (1 + sr * rc);
      data[i] = (i > 0 ? data[i - 1] + alpha * (raw * env * 0.5 - data[i - 1]) : raw * env * 0.5);
    }
    return buffer;
  }

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();

    const listener = this.ctx.listener;
    if (listener.positionX) {
      listener.positionX.value = 0; listener.positionY.value = 0; listener.positionZ.value = 0;
    } else {
      listener.setPosition(0, 0, 0);
    }

    this.panner = this.ctx.createPanner();
    this.panner.panningModel = "HRTF";
    this.panner.distanceModel = "inverse";
    this.panner.refDistance = 1;
    this.panner.maxDistance = 20;
    this.panner.rolloffFactor = 2;
    this.panner.coneInnerAngle = 360;
    this.panner.coneOuterAngle = 360;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.22;

    this.hpFilter = this.ctx.createBiquadFilter();
    this.hpFilter.type = "highpass";
    this.hpFilter.frequency.value = 250;
    this.hpFilter.Q.value = 0.7;

    this.peakFilter = this.ctx.createBiquadFilter();
    this.peakFilter.type = "peaking";
    this.peakFilter.frequency.value = 1800;
    this.peakFilter.Q.value = 2;
    this.peakFilter.gain.value = 8;

    this.peakFilter2 = this.ctx.createBiquadFilter();
    this.peakFilter2.type = "peaking";
    this.peakFilter2.frequency.value = 3200;
    this.peakFilter2.Q.value = 3;
    this.peakFilter2.gain.value = 5;

    const buzzBuffer = this._generateMosquitoBuffer(4);
    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = buzzBuffer;
    this.sourceNode.loop = true;
    this.sourceNode.playbackRate.value = 1.0;

    this.sourceNode.connect(this.hpFilter);
    this.hpFilter.connect(this.peakFilter);
    this.peakFilter.connect(this.peakFilter2);
    this.peakFilter2.connect(this.panner);
    this.panner.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    this.slapBuffer = this._generateSlapBuffer();
    this.missBuffer = this._generateMissBuffer();

    this.sourceNode.start();
    this.running = true;

    this._jitterInterval = setInterval(() => {
      if (!this.running || !this.sourceNode) return;
      const jitter = 0.97 + Math.random() * 0.06;
      const t = this.ctx.currentTime;
      this.sourceNode.playbackRate.setTargetAtTime(jitter, t, 0.2);
    }, 300);
  }

  updatePosition(x, y, z, speed) {
    if (!this.panner || !this.running) return;
    this.currentX = x; this.currentY = y; this.currentZ = z;

    const ax = ((x / CANVAS_W) * 2 - 1) * 6;
    const ay = ((y / CANVAS_H) * 2 - 1) * -4;
    const az = 0.5 + z * 6;

    const t = this.ctx.currentTime;
    if (this.panner.positionX) {
      this.panner.positionX.setTargetAtTime(ax, t, 0.015);
      this.panner.positionY.setTargetAtTime(ay, t, 0.015);
      this.panner.positionZ.setTargetAtTime(az, t, 0.015);
    } else {
      this.panner.setPosition(ax, ay, az);
    }

    const rateBoost = 0.95 + speed * 0.04;
    this.sourceNode.playbackRate.setTargetAtTime(rateBoost, t, 0.1);
    this.peakFilter.frequency.setTargetAtTime(1500 + speed * 200, t, 0.1);
    this.peakFilter2.frequency.setTargetAtTime(2800 + speed * 300, t, 0.1);

    const vol = 0.1 + (1 - z) * 0.2;
    this.gainNode.gain.setTargetAtTime(clamp(vol, 0, 0.35), t, 0.03);
  }

  playSlapSound() {
    if (!this.ctx || !this.running) return;
    const t = this.ctx.currentTime;
    const slapSource = this.ctx.createBufferSource();
    slapSource.buffer = this.slapBuffer;
    const slapGain = this.ctx.createGain();
    slapGain.gain.value = 0.7;
    slapSource.connect(slapGain);
    slapGain.connect(this.ctx.destination);
    slapSource.start(t);
    this.gainNode.gain.setValueAtTime(0, t);
    this.gainNode.gain.setTargetAtTime(0.22, t + 0.4, 0.15);
  }

  playMissSound() {
    if (!this.ctx || !this.running) return;
    const t = this.ctx.currentTime;
    const missSource = this.ctx.createBufferSource();
    missSource.buffer = this.missBuffer;
    const missGain = this.ctx.createGain();
    missGain.gain.value = 0.3;
    missSource.connect(missGain);
    missGain.connect(this.ctx.destination);
    missSource.start(t);
    this.sourceNode.playbackRate.setValueAtTime(1.25, t);
    this.sourceNode.playbackRate.setTargetAtTime(1.0, t + 0.2, 0.1);
  }

  setVolume(v) {
    if (this.gainNode && this.running) {
      this.gainNode.gain.setTargetAtTime(clamp(v, 0, 0.35), this.ctx.currentTime, 0.05);
    }
  }

  stop() {
    this.running = false;
    clearInterval(this._jitterInterval);
    try { this.sourceNode?.stop(); this.ctx?.close(); } catch (e) {}
    this.ctx = null;
  }
}

// ---- Fly SVG Component ----
function FlySVG({ color, size, wingPhase, zScale, glowIntensity }) {
  const c = rgbStr(color);
  const glow = rgbaStr(color, glowIntensity);
  const wingAngle = Math.sin(wingPhase) * 35;
  const s = size * zScale;

  return (
    <svg width={s} height={s} viewBox="-50 -50 100 100" style={{ overflow: "visible", filter: `drop-shadow(0 0 ${8 + glowIntensity * 20}px ${glow}) drop-shadow(0 0 ${4 + glowIntensity * 12}px ${glow})` }}>
      <ellipse cx={-8} cy={-5} rx={22} ry={10} fill={rgbaStr(color, 0.15 + glowIntensity * 0.1)} stroke={rgbaStr(color, 0.4)} strokeWidth={0.5} transform={`rotate(${-30 + wingAngle}, -8, -5)`} />
      <ellipse cx={8} cy={-5} rx={22} ry={10} fill={rgbaStr(color, 0.15 + glowIntensity * 0.1)} stroke={rgbaStr(color, 0.4)} strokeWidth={0.5} transform={`rotate(${30 - wingAngle}, 8, -5)`} />
      <ellipse cx={0} cy={5} rx={7} ry={size * 0.45 * 0.55} fill={c} opacity={0.9} />
      <circle cx={0} cy={-8} r={6} fill={c} opacity={0.95} />
      <circle cx={-3.5} cy={-10} r={2.8} fill="#fff" opacity={0.9} />
      <circle cx={3.5} cy={-10} r={2.8} fill="#fff" opacity={0.9} />
      <circle cx={-3.5} cy={-10.2} r={1.4} fill="#111" />
      <circle cx={3.5} cy={-10.2} r={1.4} fill="#111" />
      {[-1, 1].map(side => [0, 1, 2].map(i => (
        <line key={`${side}-${i}`} x1={side * 5} y1={2 + i * 5} x2={side * 14} y2={-2 + i * 7} stroke={c} strokeWidth={0.8} opacity={0.5} />
      )))}
      <circle cx={0} cy={0} r={3} fill={glow} opacity={glowIntensity * 0.6} />
    </svg>
  );
}

// ---- Particle ----
function Particle({ x, y, color, delay }) {
  const angle = Math.random() * Math.PI * 2;
  const dist = randomBetween(20, 80);
  const tx = Math.cos(angle) * dist;
  const ty = Math.sin(angle) * dist;
  const size = randomBetween(3, 8);
  return (
    <div style={{
      position: "absolute", left: x, top: y, width: size, height: size,
      borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`,
      pointerEvents: "none", zIndex: 100,
      animation: `particleBurst 0.6s ${delay}s ease-out forwards`,
      "--tx": `${tx}px`, "--ty": `${ty}px`,
    }} />
  );
}

function ScorePopup({ x, y, points, color }) {
  return (
    <div style={{
      position: "absolute", left: x, top: y, color, zIndex: 90,
      fontFamily: "'Press Start 2P', monospace", fontSize: points === 0 ? 10 : 16, fontWeight: 900,
      textShadow: `0 0 10px ${color}`, pointerEvents: "none",
      animation: "floatUp 0.8s ease-out forwards",
    }}>{points === 0 ? "QUASE!" : `+${points}`}</div>
  );
}

function ComboMeter({ combo, color }) {
  if (combo < 2) return null;
  return (
    <div style={{
      position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)",
      fontFamily: "'Press Start 2P', monospace", fontSize: combo > 5 ? 20 : 14,
      color, textShadow: `0 0 15px ${color}, 0 0 30px ${color}`,
      animation: "comboShake 0.2s ease-in-out", zIndex: 80, letterSpacing: 2,
    }}>{combo}x COMBO!</div>
  );
}

function SponsorBanner({ sponsor }) {
  return (
    <div style={{
      width: "100%", padding: "10px 16px", background: "rgba(0,0,0,0.6)",
      borderTop: "1px solid rgba(0,240,255,0.1)",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    }}>
      <span style={{ color: "#555", fontSize: 10, fontFamily: "'Press Start 2P', monospace", letterSpacing: 1 }}>PATROCINADO POR</span>
      <span style={{ color: "#00f0ff", fontSize: 13, fontFamily: "'Press Start 2P', monospace", textShadow: "0 0 8px #00f0ff" }}>{sponsor}</span>
    </div>
  );
}

// ---- Splash Screen ----
function SplashScreen({ onStart }) {
  const [phase, setPhase] = useState(0);
  const [wingP, setWingP] = useState(0);
  const [flyPos, setFlyPos] = useState({ x: -60, y: 200 });
  const [tipIdx, setTipIdx] = useState(0);

  const tips = [
    "🩴 Arma letal: o chinelo da vovo",
    "🦟 Nenhum mosquito foi poupado nesta producao",
    "📱 Melhor jogado com raiva acumulada",
    "🎧 Use fones pra sentir o mosquito NA ORELHA",
    "⚠️ Pode causar vicio e tapas na mesa",
    "🏆 Patrocinado pelo seu odio a insetos",
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    let frame;
    let tick = 0;
    const animate = () => {
      tick++;
      setWingP(tick * 0.4);
      if (phase === 2) {
        const p = Math.min(tick / 80, 1);
        const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const cx = -60 + ease * (CANVAS_W / 2 + 60);
        const cy = 200 + Math.sin(p * Math.PI * 3) * 60 * (1 - p);
        setFlyPos({ x: cx, y: cy });
      } else {
        setFlyPos({
          x: CANVAS_W / 2 + Math.sin(tick * 0.03) * 20,
          y: 195 + Math.sin(tick * 0.05) * 10 + Math.cos(tick * 0.02) * 5,
        });
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (phase < 3) return;
    const iv = setInterval(() => setTipIdx(i => (i + 1) % tips.length), 2000);
    return () => clearInterval(iv);
  }, [phase, tips.length]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#050510", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 300, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px", animation: "gridMove 8s linear infinite" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 40%, rgba(0,240,255,0.06) 0%, transparent 60%)" }} />

      <div style={{ fontSize: 50, opacity: phase >= 0 ? 1 : 0, transform: phase >= 1 ? "translateY(0) rotate(-15deg)" : "translateY(-40px) rotate(0deg)", transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)", marginBottom: 8, filter: "drop-shadow(0 0 20px rgba(255,100,50,0.3))" }}>🩴</div>

      <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 26, color: "#00f0ff", textShadow: "0 0 30px #00f0ff, 0 0 60px rgba(0,240,255,0.3)", letterSpacing: 4, opacity: phase >= 0 ? 1 : 0, transform: phase >= 0 ? "scale(1)" : "scale(0.5)", transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)", textAlign: "center", marginBottom: 4 }}>
        ACERTE A MOSCA
      </h1>

      <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#ff2d95", letterSpacing: 3, opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "translateY(0)" : "translateY(15px)", transition: "all 0.5s ease-out", textShadow: "0 0 10px #ff2d95", marginBottom: 30 }}>
        A VINGANCA E DOCE... E ESTALA
      </p>

      <div style={{ position: "relative", width: CANVAS_W, height: 80, opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.3s" }}>
        <div style={{ position: "absolute", left: flyPos.x - 35, top: flyPos.y - 200, pointerEvents: "none" }}>
          <FlySVG color={{ r: 30, g: 100, b: 255 }} size={70} wingPhase={wingP} zScale={1.0} glowIntensity={0.6} />
        </div>
      </div>

      <div style={{ minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 15 }}>
        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 12, color: "#ffe600", textAlign: "center", opacity: phase >= 3 ? 1 : 0, transition: "opacity 0.4s", textShadow: "0 0 8px rgba(255,230,0,0.3)", padding: "0 30px", maxWidth: 400, lineHeight: 1.6 }}>
          {tips[tipIdx]}
        </p>
      </div>

      <div style={{ opacity: phase >= 3 ? 1 : 0, transition: "opacity 0.5s", marginTop: 10, textAlign: "center" }}>
        <div style={{ fontSize: 14, letterSpacing: 2 }}>⭐⭐⭐⭐⭐</div>
        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 9, color: "#555", fontStyle: "italic", marginTop: 4 }}>
          "Melhor que raquete eletrica" - Maria, 67 anos
        </p>
      </div>

      <button onClick={onStart} style={{
        marginTop: 28, padding: "16px 44px",
        background: phase >= 4 ? "linear-gradient(135deg, #00f0ff, #39ff14)" : "transparent",
        border: phase >= 4 ? "none" : "2px solid #333", borderRadius: 10,
        color: phase >= 4 ? "#000" : "#333",
        fontFamily: "'Press Start 2P', monospace", fontSize: 14,
        cursor: phase >= 4 ? "pointer" : "default", fontWeight: 900, letterSpacing: 2,
        opacity: phase >= 4 ? 1 : 0.3, transform: phase >= 4 ? "scale(1)" : "scale(0.9)",
        transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        boxShadow: phase >= 4 ? "0 0 30px rgba(0,240,255,0.3), 0 0 60px rgba(57,255,20,0.15)" : "none",
        position: "relative", zIndex: 10,
      }}>
        🩴 ENTRAR
      </button>

      <p style={{ position: "absolute", bottom: 16, fontFamily: "'Fira Code', monospace", fontSize: 9, color: "#2a2a4a", opacity: phase >= 3 ? 1 : 0, transition: "opacity 0.5s" }}>
        v1.0 - powered by chineladas
      </p>
    </div>
  );
}

// ---- Registration Modal ----

// ---- Game Over Screen ----
function GameOverScreen({ score, hits, misses, bestCombo, onRestart }) {
  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
  const stats = [
    { label: "PONTOS", value: score, color: "#00f0ff" },
    { label: "ACERTOS", value: hits, color: "#39ff14" },
    { label: "PRECISAO", value: `${accuracy}%`, color: "#ffe600" },
    { label: "MAX COMBO", value: `${bestCombo}x`, color: "#b026ff" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)" }}>
      <div style={{ textAlign: "center", animation: "winBounce 0.6s ease-out" }}>
        <div style={{ fontSize: 60, marginBottom: 10 }}>⏰</div>
        <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: "#ff2d95", textShadow: "0 0 15px #ff2d95", marginBottom: 20 }}>TEMPO ESGOTADO!</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24, padding: "0 20px" }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: "#111127", border: `1px solid ${s.color}33`, borderRadius: 8, padding: "12px 8px" }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#666", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: s.color, textShadow: `0 0 10px ${s.color}` }}>{s.value}</div>
            </div>
          ))}
        </div>
        <button onClick={onRestart} style={{ padding: "14px 36px", background: "linear-gradient(135deg, #00f0ff, #39ff14)", border: "none", borderRadius: 8, color: "#000", fontFamily: "'Press Start 2P', monospace", fontSize: 12, cursor: "pointer", fontWeight: 900, letterSpacing: 1 }}>TENTAR DE NOVO</button>
      </div>
    </div>
  );
}

function WinModal({ prize, onClose }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)" }}>
      <div style={{ textAlign: "center", animation: "winBounce 0.6s ease-out" }}>
        <div style={{ fontSize: 80, marginBottom: 16, animation: "winSpin 1s ease-out" }}>🏆</div>
        <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: "#ffe600", textShadow: "0 0 20px #ffe600, 0 0 40px #ff6b35", marginBottom: 12 }}>VOCE GANHOU!</h2>
        <p style={{ color: "#00f0ff", fontFamily: "'Fira Code', monospace", fontSize: 16, marginBottom: 8 }}>{prize}</p>
        <p style={{ color: "#8892b0", fontFamily: "'Fira Code', monospace", fontSize: 12, marginBottom: 24 }}>Verifique seu email para resgatar!</p>
        <button onClick={onClose} style={{ padding: "12px 32px", background: "linear-gradient(135deg, #ffe600, #ff6b35)", border: "none", borderRadius: 8, color: "#000", fontFamily: "'Press Start 2P', monospace", fontSize: 11, cursor: "pointer", fontWeight: 900 }}>JOGAR DE NOVO</button>
      </div>
    </div>
  );
}

// ---- MAIN GAME ----
export default function AcerteAMosca() {
  const { user, checkedCookie, registering, register } = useJogador("acerteamosca");
  const [screen, setScreen] = useState("splash");
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [progress, setProgress] = useState(0);

  const [flyX, setFlyX] = useState(CANVAS_W / 2);
  const [flyY, setFlyY] = useState(CANVAS_H / 2);
  const [flyZ, setFlyZ] = useState(0.5);
  const [wingPhase, setWingPhase] = useState(0);

  const [particles, setParticles] = useState([]);
  const [scorePopups, setScorePopups] = useState([]);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  const flyRef = useRef({ x: CANVAS_W / 2, y: CANVAS_H / 2, z: 0.2 });
  const velRef = useRef({ vx: 1.5, vy: 1, vz: 0.008 });
  const fleeRef = useRef({ active: false, timer: 0, fromX: 0, fromY: 0 });
  const gameLoopRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const particleIdRef = useRef(0);
  const patternRef = useRef(0);
  const tickRef = useRef(0);
  const progressRef = useRef(0);
  const playCountRef = useRef(0);
  const wingRef = useRef(0);
  const gameStateRef = useRef({ score: 0, hits: 0, misses: 0, bestCombo: 0 });

  const currentColor = getColorForProgress(progress);
  const currentColorStr = rgbStr(currentColor);
  const glowIntensity = 0.3 + progress * 0.7;
  const zScale = 1.3 - flyZ * 0.7;

  // ---- Audio ----
  const initAudio = useCallback(async () => {
    if (audioRef.current) return;
    const audio = new FlyAudio();
    await audio.init();
    audioRef.current = audio;
    setAudioStarted(true);
  }, []);

  // ---- Movement ----
  const moveFly = useCallback(() => {
    const f = flyRef.current;
    const v = velRef.current;
    const spd = 1.5 + progressRef.current * 5;
    tickRef.current++;

    const flee = fleeRef.current;

    if (flee.active) {
      flee.timer--;
      const fleeSpd = spd * 3.2;
      const fdx = f.x - flee.fromX;
      const fdy = f.y - flee.fromY;
      const fDist = Math.sqrt(fdx * fdx + fdy * fdy) || 1;
      let nx = f.x + (fdx / fDist) * fleeSpd;
      let ny = f.y + (fdy / fDist) * fleeSpd;
      let nz = f.z + 0.02;
      if (nx < 35 || nx > CANVAS_W - 35) { flee.fromX = 2 * f.x - flee.fromX; nx = clamp(nx, 36, CANVAS_W - 36); }
      if (ny < 85 || ny > CANVAS_H - 75) { flee.fromY = 2 * f.y - flee.fromY; ny = clamp(ny, 86, CANVAS_H - 76); }
      nz = clamp(nz, 0, 0.8);
      if (flee.timer <= 0) {
        flee.active = false;
        v.vz = -0.015;
        const a = Math.random() * Math.PI * 2;
        v.vx = Math.cos(a) * spd; v.vy = Math.sin(a) * spd;
      }
      flyRef.current = { x: nx, y: ny, z: nz };
      setFlyX(nx); setFlyY(ny); setFlyZ(nz);
      wingRef.current += 0.6 + progressRef.current * 0.8;
      setWingPhase(wingRef.current);
      audioRef.current?.updatePosition(nx, ny, nz, spd * 2);
      return;
    }

    if (tickRef.current % 180 === 0) {
      patternRef.current = Math.floor(Math.random() * 6);
      const angle = Math.random() * Math.PI * 2;
      v.vx = Math.cos(angle) * spd; v.vy = Math.sin(angle) * spd;
      v.vz = (Math.random() - 0.5) * 0.012;
    }

    let nx = f.x, ny = f.y, nz = f.z;
    const t = tickRef.current;

    nz += v.vz;
    nz += (0.06 - nz) * 0.004;

    switch (patternRef.current) {
      case 0:
        nx += v.vx; ny += v.vy;
        if (nx < 40 || nx > CANVAS_W - 40) v.vx *= -1;
        if (ny < 90 || ny > CANVAS_H - 80) v.vy *= -1;
        if (nz < 0 || nz > 0.55) v.vz *= -1;
        break;
      case 1:
        nx = CANVAS_W / 2 + Math.sin(t * 0.025) * (CANVAS_W * 0.35);
        ny = CANVAS_H / 2 + Math.sin(t * 0.05) * (CANVAS_H * 0.25);
        nz = 0.08 + Math.sin(t * 0.015) * 0.1;
        break;
      case 2:
        nx += v.vx * 1.3;
        ny += Math.sin(t * 0.12) * spd * 2.5;
        nz = 0.03 + Math.abs(Math.sin(t * 0.02)) * 0.18;
        if (nx < 40 || nx > CANVAS_W - 40) v.vx *= -1;
        break;
      case 3: {
        const ph = (t % 400) / 400;
        const r = (ph < 0.5 ? ph * 2 : (1 - ph) * 2) * Math.min(CANVAS_W, CANVAS_H) * 0.35;
        nx = CANVAS_W / 2 + Math.cos(t * 0.04) * r;
        ny = CANVAS_H / 2 + Math.sin(t * 0.04) * r;
        nz = 0.04 + ph * 0.22;
        break;
      }
      case 4:
        if (t % 90 < 60) { nx += v.vx * 1.8; ny += v.vy * 1.8; }
        nz = 0.01 + Math.sin(t * 0.08) * 0.05;
        if (nx < 40 || nx > CANVAS_W - 40) v.vx *= -1;
        if (ny < 90 || ny > CANVAS_H - 80) v.vy *= -1;
        break;
      case 5: {
        const ap = (t % 300) / 300;
        if (ap < 0.7) {
          const cr = (1 - ap / 0.7) * CANVAS_W * 0.3 + 30;
          nx = CANVAS_W / 2 + Math.cos(t * 0.05) * cr;
          ny = CANVAS_H / 2 + Math.sin(t * 0.05) * cr;
          nz = 0.22 * (1 - ap / 0.7);
        } else {
          nx += v.vx * 2.5; ny += v.vy * 2.5;
          nz = 0.03 + (ap - 0.7) / 0.3 * 0.35;
          if (nx < 40 || nx > CANVAS_W - 40) v.vx *= -1;
          if (ny < 90 || ny > CANVAS_H - 80) v.vy *= -1;
        }
        break;
      }
    }

    nx = clamp(nx, 35, CANVAS_W - 35);
    ny = clamp(ny, 85, CANVAS_H - 75);
    nz = clamp(nz, 0, 0.85);

    flyRef.current = { x: nx, y: ny, z: nz };
    setFlyX(nx); setFlyY(ny); setFlyZ(nz);
    wingRef.current += 0.3 + progressRef.current * 0.5;
    setWingPhase(wingRef.current);
    audioRef.current?.updatePosition(nx, ny, nz, spd);
  }, []);

  // ---- Game loop ----
  useEffect(() => {
    if (screen !== "playing") return;
    gameLoopRef.current = setInterval(moveFly, 1000 / 60);
    return () => clearInterval(gameLoopRef.current);
  }, [screen, moveFly]);

  // ---- Timer ----
  useEffect(() => {
    if (screen !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          audioRef.current?.setVolume(0);
          // Save score to DB
          const gs = gameStateRef.current;
          const accuracy = gs.hits + gs.misses > 0 ? Math.round((gs.hits / (gs.hits + gs.misses)) * 100) : 0;
          fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pontos: gs.score,
              acertos: gs.hits,
              erros: gs.misses,
              melhorCombo: gs.bestCombo,
              precisao: accuracy,
              jogo: "acerteamosca",
            }),
          }).catch(() => {});
          setScreen("gameover");
          return 0;
        }
        const elapsed = GAME_DURATION - (t - 1);
        const p = Math.min(elapsed / GAME_DURATION, 1);
        const curved = p < 0.5 ? p * 1.2 : 0.6 + (p - 0.5) * 0.8;
        progressRef.current = Math.min(curved, 1);
        setProgress(Math.min(curved, 1));
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen]);

  const spawnParticles = (x, y, color, count = 10) => {
    const ps = Array.from({ length: count }, () => ({
      id: particleIdRef.current++, x, y, color, delay: Math.random() * 0.1,
    }));
    setParticles(p => [...p, ...ps]);
    setTimeout(() => setParticles(p => p.filter(pp => !ps.find(np => np.id === pp.id))), 800);
  };

  const spawnScorePopup = (x, y, points, color) => {
    const id = particleIdRef.current++;
    setScorePopups(s => [...s, { id, x, y, points, color }]);
    setTimeout(() => setScorePopups(s => s.filter(p => p.id !== id)), 900);
  };

  const handleClick = (e) => {
    if (screen !== "playing") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dx = cx - flyX;
    const dy = cy - flyY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitR = (BASE_SIZE * 0.7) * zScale;
    const nearR = hitR * 2.5;

    if (dist < hitR) {
      const c = combo + 1;
      const pts = Math.round(100 * Math.min(c, 10) * (1 + flyZ * 0.5));
      setScore(s => { const ns = s + pts; gameStateRef.current.score = ns; return ns; });
      setHits(h => { const nh = h + 1; gameStateRef.current.hits = nh; return nh; });
      setCombo(c);
      setBestCombo(b => { const nb = Math.max(b, c); gameStateRef.current.bestCombo = nb; return nb; });
      audioRef.current?.playSlapSound();
      spawnParticles(cx, cy, currentColorStr, 14);
      spawnScorePopup(cx - 20, cy - 30, pts, currentColorStr);

      fleeRef.current = {
        active: true,
        timer: 30 + Math.floor(Math.random() * 20),
        fromX: cx,
        fromY: cy,
      };
      patternRef.current = Math.floor(Math.random() * 6);

      if (playCountRef.current % WIN_EVERY_N === 0 && hits > 5) {
        setTimeout(() => { audioRef.current?.setVolume(0); setScreen("winner"); }, 500);
      }
    } else if (dist < nearR) {
      const dodgeAngle = Math.atan2(flyY - cy, flyX - cx);
      const dodgeSpd = (1.5 + progress * 5) * 2;
      velRef.current = {
        vx: Math.cos(dodgeAngle) * dodgeSpd,
        vy: Math.sin(dodgeAngle) * dodgeSpd,
        vz: (Math.random() - 0.3) * 0.02,
      };
      patternRef.current = 0;
      setMisses(m => { const nm = m + 1; gameStateRef.current.misses = nm; return nm; });
      setCombo(0);
      audioRef.current?.playMissSound();
      spawnParticles(cx, cy, "#ffaa00", 6);
      spawnScorePopup(cx - 30, cy - 30, 0, "#ffaa00");
    } else {
      setMisses(m => { const nm = m + 1; gameStateRef.current.misses = nm; return nm; });
      setCombo(0);
      audioRef.current?.playMissSound();
      spawnParticles(cx, cy, "#ff2d95", 5);
      setShakeScreen(true);
      setTimeout(() => setShakeScreen(false), 200);
    }
  };

  const handleRegister = async (userData) => {
    const jogador = await register(userData);
    if (jogador) {
      playCountRef.current++;
      await initAudio();
      resetGame();
      setScreen("playing");
    }
  };

  const handleSplashStart = () => {
    // If user already registered (cookie), skip registration
    if (user) {
      playCountRef.current++;
      initAudio().then(() => {
        resetGame();
        setScreen("playing");
      });
    } else {
      setScreen("register");
    }
  };

  const resetGame = () => {
    setScore(0); setHits(0); setMisses(0); setCombo(0); setBestCombo(0);
    setTimeLeft(GAME_DURATION); setProgress(0); progressRef.current = 0;
    setParticles([]); setScorePopups([]);
    tickRef.current = 0; patternRef.current = 0; wingRef.current = 0;
    fleeRef.current = { active: false, timer: 0, fromX: 0, fromY: 0 };
    flyRef.current = { x: CANVAS_W / 2, y: CANVAS_H / 2, z: 0.15 };
    setFlyX(CANVAS_W / 2); setFlyY(CANVAS_H / 2); setFlyZ(0.15);
    gameStateRef.current = { score: 0, hits: 0, misses: 0, bestCombo: 0 };
    audioRef.current?.setVolume(0.15);
  };

  const restartGame = () => {
    playCountRef.current++;
    resetGame();
    setScreen("playing");
  };

  useEffect(() => () => audioRef.current?.stop(), []);

  const gameScale = useGameScale(CANVAS_W);
  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const timerColor = timeLeft > 10 ? "#39ff14" : timeLeft > 5 ? "#ffe600" : "#ff2d95";

  if (!checkedCookie) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#050510", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Fira Code', monospace", overflow: "hidden", padding: 12, touchAction: "manipulation" }}>
      <style>{`
        @keyframes particleBurst {
          0% { opacity: 1; transform: translate(0,0) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) scale(0); }
        }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-50px) scale(1.3); }
        }
        @keyframes comboShake {
          0%,100% { transform: translateX(-50%) rotate(0deg); }
          25% { transform: translateX(-50%) rotate(-3deg); }
          75% { transform: translateX(-50%) rotate(3deg); }
        }
        @keyframes screenShake {
          0%,100% { transform: translate(0,0); }
          25% { transform: translate(-3px,2px); }
          50% { transform: translate(2px,-3px); }
          75% { transform: translate(-2px,1px); }
        }
        @keyframes winBounce {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes winSpin {
          0% { transform: rotate(0deg) scale(0.5); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes scanline {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes pulseGlow {
          0%,100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {screen !== "splash" && <>
        <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: currentColorStr, textShadow: `0 0 20px ${currentColorStr}, 0 0 40px ${rgbaStr(currentColor, 0.3)}`, marginBottom: 8, letterSpacing: 3, textAlign: "center", transition: "color 1s, text-shadow 1s" }}>
          ACERTE A MOSCA
        </h1>
        <p style={{ color: "#4a5568", fontSize: 10, marginBottom: 14, fontFamily: "'Press Start 2P', monospace" }}>
          {audioStarted ? "🎧 AUDIO 3D ATIVADO - USE FONES!" : "MATE O MOSQUITO - GANHE PREMIOS"}
        </p>
      </>}

      <div style={{ width: CANVAS_W * gameScale, height: CANVAS_H * gameScale }}>
      <div
        style={{
          width: CANVAS_W, height: CANVAS_H, position: "relative",
          background: `radial-gradient(ellipse at 30% 20%, ${rgbaStr(currentColor, 0.04)} 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, ${rgbaStr(currentColor, 0.03)} 0%, transparent 50%), #0a0a1a`,
          border: `2px solid ${rgbaStr(currentColor, 0.3)}`,
          borderRadius: 12, overflow: "hidden",
          cursor: screen === "playing" ? "crosshair" : "default",
          animation: shakeScreen ? "screenShake 0.2s ease-in-out" : "none",
          boxShadow: `0 0 ${20 + progress * 30}px ${rgbaStr(currentColor, 0.15)}`,
          transition: "border-color 1s, box-shadow 1s",
          userSelect: "none",
          transform: `scale(${gameScale})`, transformOrigin: "top center",
        }}
        onClick={handleClick}
      >
        <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${rgbaStr(currentColor, 0.02)} 1px, transparent 1px), linear-gradient(90deg, ${rgbaStr(currentColor, 0.02)} 1px, transparent 1px)`, backgroundSize: "40px 40px", animation: "gridMove 8s linear infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, width: "100%", height: 2, background: `linear-gradient(90deg, transparent, ${rgbaStr(currentColor, 0.06)}, transparent)`, animation: "scanline 4s linear infinite", pointerEvents: "none", zIndex: 60 }} />

        {screen === "playing" && (
          <div style={{
            position: "absolute", left: flyX - 15 * zScale, top: flyY + 30 + flyZ * 20,
            width: 30 * zScale, height: 8 * zScale, borderRadius: "50%",
            background: rgbaStr(currentColor, 0.15 * (1 - flyZ * 0.5)),
            filter: `blur(${4 + flyZ * 6}px)`, pointerEvents: "none", zIndex: 20,
          }} />
        )}

        {screen === "playing" && (
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 48,
            background: "rgba(0,0,0,0.75)", borderBottom: `1px solid ${rgbaStr(currentColor, 0.15)}`,
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 70,
          }}>
            <div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#555", marginBottom: 2 }}>PONTOS</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: currentColorStr, textShadow: `0 0 8px ${currentColorStr}`, transition: "color 1s" }}>{score.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#555", marginBottom: 2 }}>VELOC.</div>
              <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{ width: 4, height: 12, borderRadius: 1, background: i < Math.ceil(progress * 10) ? currentColorStr : "#1a1a2e", boxShadow: i < Math.ceil(progress * 10) ? `0 0 4px ${currentColorStr}` : "none", transition: "background 0.5s" }} />
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right", minWidth: 90 }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#555", marginBottom: 4 }}>TEMPO</div>
              <div style={{ width: 90, height: 8, background: "#1a1a2e", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${timerPct}%`, height: "100%", background: timerColor, boxShadow: `0 0 8px ${timerColor}`, borderRadius: 4, transition: "width 1s linear, background 0.5s" }} />
              </div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: timerColor, marginTop: 2, textShadow: `0 0 5px ${timerColor}` }}>{timeLeft}s</div>
            </div>
          </div>
        )}

        {screen === "playing" && <ComboMeter combo={combo} color={currentColorStr} />}

        {screen === "playing" && (
          <div style={{ position: "absolute", left: 10, top: 60, bottom: 60, width: 6, background: "#111127", borderRadius: 3, zIndex: 70, overflow: "hidden" }}>
            <div style={{
              position: "absolute", bottom: `${(1 - flyZ) * 100}%`, width: 6, height: 12,
              background: currentColorStr, borderRadius: 3, boxShadow: `0 0 8px ${currentColorStr}`,
            }} />
            <div style={{ position: "absolute", top: -14, left: -3, fontFamily: "'Press Start 2P', monospace", fontSize: 6, color: "#444" }}>Z</div>
          </div>
        )}

        {screen === "playing" && (
          <>
            {fleeRef.current.active && [0.15, 0.08].map((op, i) => (
              <div key={`trail${i}`} style={{
                position: "absolute",
                left: flyX - (BASE_SIZE * zScale) / 2 - velRef.current.vx * (i + 1) * 3,
                top: flyY - (BASE_SIZE * zScale) / 2 - velRef.current.vy * (i + 1) * 3,
                zIndex: 40, pointerEvents: "none", opacity: op, filter: `blur(${(i + 1) * 2}px)`,
              }}>
                <FlySVG color={currentColor} size={BASE_SIZE} wingPhase={wingPhase - (i + 1) * 0.5} zScale={zScale} glowIntensity={glowIntensity * 0.3} />
              </div>
            ))}
            <div style={{
              position: "absolute",
              left: flyX - (BASE_SIZE * zScale) / 2,
              top: flyY - (BASE_SIZE * zScale) / 2,
              zIndex: 50, pointerEvents: "none",
            }}>
              <FlySVG color={currentColor} size={BASE_SIZE} wingPhase={wingPhase} zScale={zScale} glowIntensity={glowIntensity} />
            </div>
          </>
        )}

        {particles.map(p => <Particle key={p.id} {...p} />)}
        {scorePopups.map(p => <ScorePopup key={p.id} {...p} />)}

        {screen === "splash" && <SplashScreen onStart={handleSplashStart} />}
        {screen === "register" && <RegisterModal onRegister={handleRegister} loading={registering} jogoNome="ACERTE A MOSCA" accentColor="#00f0ff" />}
        {screen === "gameover" && <GameOverScreen score={score} hits={hits} misses={misses} bestCombo={bestCombo} onRestart={restartGame} />}
        {screen === "winner" && <WinModal prize="🎉 Cupom de 20% de desconto na Loja XYZ!" onClose={restartGame} />}
      </div>
      </div>

      {screen !== "splash" && <div style={{ width: CANVAS_W * gameScale, borderRadius: "0 0 12px 12px", overflow: "hidden", marginTop: -2 }}>
        <SponsorBanner sponsor="SUA MARCA AQUI" />
      </div>}

      {user && screen === "playing" && (
        <div style={{ width: CANVAS_W, display: "flex", justifyContent: "space-between", marginTop: 10, padding: "0 4px" }}>
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Fira Code', monospace" }}>👤 {user.nome}</span>
          <span style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Fira Code', monospace" }}>🎯 {hits} - 💨 {misses}</span>
        </div>
      )}
      <AdBanner slot="mosca_bottom" style={{ marginTop: 16, maxWidth: CANVAS_W }} />
    </div>
  );
}
