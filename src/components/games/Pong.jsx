"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import { PongMobileControls } from "@/components/MobileControls";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

const CANVAS_W = 480;
const CANVAS_H = 640;
const PADDLE_W = 80;
const PADDLE_H = 12;
const BALL_R = 6;
const P1_Y = CANVAS_H - 40;
const P2_Y = 28;
const WIN_SCORE = 10;
const BASE_SPEED = 5;
const PADDLE_SPEED = 6;
const MAX_ANGLE = 0.75;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3002";

const P1_COLOR = { r: 0, g: 240, b: 255 };
const P2_COLOR = { r: 255, g: 45, b: 149 };

function rgbStr(c) { return `rgb(${c.r},${c.g},${c.b})`; }
function rgbaStr(c, a) { return `rgba(${c.r},${c.g},${c.b},${a})`; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const CPU_CONFIG = {
  easy:   { speed: 2.5, reactionDist: 300, imprecision: 45, serveDelay: 90 },
  medium: { speed: 4.5, reactionDist: 500, imprecision: 15, serveDelay: 45 },
  hard:   { speed: 6,   reactionDist: 999, imprecision: 4,  serveDelay: 20 },
};

// ---- Sound Engine ----
class PongAudio {
  constructor() { this.ctx = null; }

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
  }

  _tone(freq, dur, vol = 0.25, type = "square") {
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

  paddleHit()  { this._tone(660, 0.06, 0.3, "square"); }
  wallHit()    { this._tone(440, 0.04, 0.12, "triangle"); }
  scorePoint() {
    this._tone(260, 0.12, 0.2, "square");
    setTimeout(() => this._tone(196, 0.18, 0.15, "square"), 100);
  }
  winGame() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.12, 0.25, "square"), i * 100)
    );
  }
  stop() {
    try { this.ctx?.close(); } catch (e) {}
    this.ctx = null;
  }
}

// ---- Menu ----
function PongMenu({ onSelect }) {
  const [sub, setSub] = useState(null); // null | 'cpu' | 'online'
  const [joinId, setJoinId] = useState("");

  const btn = (label, onClick, accent = "#00f0ff") => (
    <button onClick={onClick} style={{
      width: "100%", padding: "14px 0", background: `${accent}11`,
      border: `1px solid ${accent}44`, borderRadius: 8, color: accent,
      fontFamily: "'Press Start 2P', monospace", fontSize: 10, cursor: "pointer",
      letterSpacing: 1, transition: "all 0.2s",
    }}>{label}</button>
  );

  return (
    <div style={{
      position: "absolute", inset: 0, background: "#050510",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: 300,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div style={{ fontSize: 50, marginBottom: 10 }}>🏓</div>
      <h1 style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 32, color: "#00f0ff",
        textShadow: "0 0 30px #00f0ff, 0 0 60px rgba(0,240,255,0.3)",
        letterSpacing: 6, marginBottom: 6, position: "relative",
      }}>PONG</h1>
      <p style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#ff2d95",
        letterSpacing: 3, textShadow: "0 0 10px #ff2d95", marginBottom: 40,
      }}>PRIMEIRO A 10 VENCE!</p>

      <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>
        {!sub && <>
          {btn("🤖  VS COMPUTADOR", () => setSub("cpu"))}
          {btn("👥  LOCAL (2 JOGADORES)", () => onSelect("local"), "#39ff14")}
          {btn("🌐  ONLINE", () => setSub("online"), "#b026ff")}
        </>}

        {sub === "cpu" && <>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#555", textAlign: "center", marginBottom: 4 }}>DIFICULDADE</p>
          {btn("😌  FACIL",   () => onSelect("cpu-easy"),   "#39ff14")}
          {btn("😐  MEDIO",   () => onSelect("cpu-medium"), "#ffe600")}
          {btn("😈  DIFICIL", () => onSelect("cpu-hard"),   "#ff2d95")}
          {btn("← VOLTAR", () => setSub(null), "#555")}
        </>}

        {sub === "online" && <>
          {btn("🏠  CRIAR SALA", () => onSelect("remote-host"), "#b026ff")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              value={joinId}
              onChange={e => setJoinId(e.target.value.toUpperCase())}
              placeholder="CODIGO"
              maxLength={6}
              style={{
                width: "100%", padding: "10px 12px", background: "#111127",
                border: "1px solid #2a2a4a", borderRadius: 6, color: "#e0e0ff",
                fontSize: 14, fontFamily: "'Press Start 2P', monospace",
                textAlign: "center", letterSpacing: 4, outline: "none", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = "#b026ff"}
              onBlur={e => e.target.style.borderColor = "#2a2a4a"}
            />
            <button
              onClick={() => joinId.length >= 4 && onSelect("remote-join", joinId)}
              disabled={joinId.length < 4}
              style={{
                width: "100%", padding: "10px 16px", background: joinId.length >= 4 ? "#b026ff" : "#2a2a4a",
                border: "none", borderRadius: 6, color: joinId.length >= 4 ? "#fff" : "#555",
                fontFamily: "'Press Start 2P', monospace", fontSize: 9, cursor: joinId.length >= 4 ? "pointer" : "not-allowed",
              }}
            >ENTRAR</button>
          </div>
          {btn("← VOLTAR", () => setSub(null), "#555")}
        </>}
      </div>

      <div style={{
        position: "absolute", bottom: 20, padding: "0 30px",
        textAlign: "center", lineHeight: 2,
      }}>
        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 9, color: "#333" }}>
          P1: A/D + S lancar &nbsp;|&nbsp; P2: ←/→ + ↑ lancar
        </p>
      </div>
    </div>
  );
}

// ---- Lobby (waiting for remote opponent) ----
function RemoteLobby({ sessionId, status, onCancel }) {
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(5,5,16,0.95)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: 300,
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🌐</div>
      {status === "creating" && <>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#b026ff", marginBottom: 20, textShadow: "0 0 10px #b026ff" }}>
          CONECTANDO...
        </p>
      </>}
      {status === "waiting" && <>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#b026ff", marginBottom: 20, textShadow: "0 0 10px #b026ff" }}>
          AGUARDANDO OPONENTE
        </p>
        <div style={{
          background: "#111127", border: "2px solid #b026ff", borderRadius: 10,
          padding: "16px 28px", marginBottom: 16,
        }}>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#555", marginBottom: 8 }}>CODIGO DA SALA</p>
          <p style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 28, color: "#b026ff",
            textShadow: "0 0 15px #b026ff", letterSpacing: 8,
          }}>{sessionId}</p>
        </div>
        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 10, color: "#666" }}>
          Envie este codigo para seu oponente
        </p>
      </>}
      {status === "joining" && <>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#b026ff", marginBottom: 12, textShadow: "0 0 10px #b026ff" }}>
          ENTRANDO NA SALA...
        </p>
      </>}
      {status === "error" && <>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#ff2d95", marginBottom: 12 }}>
          SALA NAO ENCONTRADA
        </p>
      </>}
      <button onClick={onCancel} style={{
        marginTop: 20, padding: "10px 24px", background: "transparent",
        border: "1px solid #555", borderRadius: 6, color: "#555",
        fontFamily: "'Press Start 2P', monospace", fontSize: 9, cursor: "pointer",
      }}>CANCELAR</button>
    </div>
  );
}

// ---- Game Over ----
function PongGameOver({ s1, s2, winner, playerNum, mode, onRestart, onMenu, remoteRestartReq }) {
  const isRemote = mode.startsWith("remote");
  const youWon = isRemote ? winner === playerNum : null;

  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, backdropFilter: "blur(8px)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>
          {isRemote ? (youWon ? "🏆" : "😢") : "🏆"}
        </div>
        <h2 style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 18,
          color: winner === 1 ? rgbStr(P1_COLOR) : rgbStr(P2_COLOR),
          textShadow: `0 0 15px ${winner === 1 ? rgbStr(P1_COLOR) : rgbStr(P2_COLOR)}`,
          marginBottom: 8,
        }}>
          {isRemote
            ? (youWon ? "VOCE VENCEU!" : "VOCE PERDEU!")
            : `JOGADOR ${winner} VENCE!`}
        </h2>

        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 24 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#555", marginBottom: 4 }}>
              {isRemote && playerNum === 1 ? "VOCE" : "P1"}
            </div>
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 32, color: rgbStr(P1_COLOR),
              textShadow: `0 0 10px ${rgbStr(P1_COLOR)}`,
            }}>{s1}</div>
          </div>
          <div style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 20, color: "#333",
            alignSelf: "center",
          }}>x</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#555", marginBottom: 4 }}>
              {isRemote && playerNum === 2 ? "VOCE" : mode.startsWith("cpu") ? "CPU" : "P2"}
            </div>
            <div style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 32, color: rgbStr(P2_COLOR),
              textShadow: `0 0 10px ${rgbStr(P2_COLOR)}`,
            }}>{s2}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onRestart} style={{
            padding: "12px 28px", background: "linear-gradient(135deg, #00f0ff, #39ff14)",
            border: "none", borderRadius: 8, color: "#000",
            fontFamily: "'Press Start 2P', monospace", fontSize: 10, cursor: "pointer", fontWeight: 900,
          }}>{isRemote ? (remoteRestartReq ? "ACEITAR REVANCHE" : "REVANCHE") : "JOGAR DE NOVO"}</button>
          <button onClick={onMenu} style={{
            padding: "12px 28px", background: "transparent",
            border: "1px solid #555", borderRadius: 8, color: "#888",
            fontFamily: "'Press Start 2P', monospace", fontSize: 10, cursor: "pointer",
          }}>MENU</button>
        </div>
        {isRemote && remoteRestartReq && (
          <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 10, color: "#b026ff", marginTop: 10 }}>
            Oponente quer revanche!
          </p>
        )}
      </div>
    </div>
  );
}

// ---- MAIN GAME ----
export default function Pong() {
  const { user, checkedCookie, registering, register } = useJogador("pong");
  const [screen, setScreen] = useState("menu"); // menu | register | lobby | playing | gameover
  const [mode, setMode] = useState(null);
  const pendingModeRef = useRef(null);
  const [p1x, setP1x] = useState(CANVAS_W / 2);
  const [p2x, setP2x] = useState(CANVAS_W / 2);
  const [ballX, setBallX] = useState(CANVAS_W / 2);
  const [ballY, setBallY] = useState(CANVAS_H / 2);
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const [serving, setServing] = useState(0);
  const [launched, setLaunched] = useState(false);
  const [winner, setWinner] = useState(0);
  const [scoreFlash, setScoreFlash] = useState(null); // 1 or 2

  // Remote state
  const [lobbyStatus, setLobbyStatus] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [playerNum, setPlayerNum] = useState(0); // 1 or 2
  const [remoteRestartReq, setRemoteRestartReq] = useState(false);
  const [disconnected, setDisconnected] = useState(false);

  // Refs
  const gameRef = useRef({
    p1x: CANVAS_W / 2, p2x: CANVAS_W / 2,
    ball: { x: CANVAS_W / 2, y: P1_Y - PADDLE_H / 2 - BALL_R - 2, vx: 0, vy: 0 },
    s1: 0, s2: 0, serving: 0, launched: false,
    speed: BASE_SPEED, rallyCount: 0,
  });
  const keysRef = useRef(new Set());
  const loopRef = useRef(null);
  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const cpuRef = useRef({ targetX: CANVAS_W / 2, impOffset: 0, ticksSinceUpdate: 0, serveTimer: 0 });
  const trailRef = useRef([]);
  const [trail, setTrail] = useState([]);

  // ---- Audio ----
  const initAudio = useCallback(async () => {
    if (audioRef.current) return;
    const audio = new PongAudio();
    await audio.init();
    audioRef.current = audio;
  }, []);

  // ---- Reset local game ----
  const resetLocalGame = useCallback(() => {
    const g = gameRef.current;
    g.p1x = CANVAS_W / 2; g.p2x = CANVAS_W / 2;
    g.ball = { x: CANVAS_W / 2, y: P1_Y - PADDLE_H / 2 - BALL_R - 2, vx: 0, vy: 0 };
    g.s1 = 0; g.s2 = 0; g.serving = 0; g.launched = false;
    g.speed = BASE_SPEED; g.rallyCount = 0;
    cpuRef.current = { targetX: CANVAS_W / 2, impOffset: 0, ticksSinceUpdate: 0, serveTimer: 0 };
    trailRef.current = [];

    setP1x(CANVAS_W / 2); setP2x(CANVAS_W / 2);
    setBallX(CANVAS_W / 2); setBallY(P1_Y - PADDLE_H / 2 - BALL_R - 2);
    setS1(0); setS2(0); setServing(0); setLaunched(false);
    setWinner(0); setScoreFlash(null); setTrail([]);
  }, []);

  // ---- Local launch ball ----
  const launchBall = useCallback((servingPlayer) => {
    const g = gameRef.current;
    if (g.launched) return;
    g.launched = true;
    const dir = servingPlayer === 0 ? -1 : 1;
    const angle = (Math.random() - 0.5) * 0.5;
    g.ball.vx = angle * g.speed;
    g.ball.vy = dir * g.speed;
  }, []);

  // ---- Score handler ----
  const handleScore = useCallback((scorer) => {
    const g = gameRef.current;
    if (scorer === 1) g.s1++; else g.s2++;
    g.serving = scorer === 1 ? 1 : 0; // scored-upon player serves
    g.launched = false;
    g.rallyCount = 0;
    g.speed = BASE_SPEED;
    g.ball.vx = 0; g.ball.vy = 0;

    audioRef.current?.scorePoint();
    setS1(g.s1); setS2(g.s2);
    setServing(g.serving);
    setLaunched(false);
    setScoreFlash(scorer);
    setTimeout(() => setScoreFlash(null), 500);

    if (g.s1 >= WIN_SCORE || g.s2 >= WIN_SCORE) {
      const w = g.s1 >= WIN_SCORE ? 1 : 2;
      setWinner(w);
      audioRef.current?.winGame();
      setTimeout(() => setScreen("gameover"), 600);
      return true;
    }

    // Reset ball position
    if (g.serving === 0) {
      g.ball.x = g.p1x;
      g.ball.y = P1_Y - PADDLE_H / 2 - BALL_R - 2;
    } else {
      g.ball.x = g.p2x;
      g.ball.y = P2_Y + PADDLE_H / 2 + BALL_R + 2;
    }

    cpuRef.current.serveTimer = 0;
    return false;
  }, []);

  // ---- Local game tick ----
  const localTick = useCallback(() => {
    const g = gameRef.current;
    const keys = keysRef.current;
    const isCpu = mode?.startsWith("cpu");

    // P1 input
    if (keys.has("a") || keys.has("A")) g.p1x -= PADDLE_SPEED;
    if (keys.has("d") || keys.has("D")) g.p1x += PADDLE_SPEED;
    g.p1x = clamp(g.p1x, PADDLE_W / 2, CANVAS_W - PADDLE_W / 2);

    // P1 launch
    if ((keys.has("s") || keys.has("S")) && g.serving === 0 && !g.launched) {
      launchBall(0);
      setLaunched(true);
    }

    // P2 input (local) or CPU
    if (!isCpu) {
      if (keys.has("ArrowLeft")) g.p2x -= PADDLE_SPEED;
      if (keys.has("ArrowRight")) g.p2x += PADDLE_SPEED;
      g.p2x = clamp(g.p2x, PADDLE_W / 2, CANVAS_W - PADDLE_W / 2);

      if (keys.has("ArrowUp") && g.serving === 1 && !g.launched) {
        launchBall(1);
        setLaunched(true);
      }
    } else {
      // CPU AI
      const diff = mode.replace("cpu-", "");
      const cfg = CPU_CONFIG[diff];
      const cpu = cpuRef.current;

      // CPU serve
      if (g.serving === 1 && !g.launched) {
        cpu.serveTimer++;
        if (cpu.serveTimer > cfg.serveDelay) {
          launchBall(1);
          setLaunched(true);
        }
      }

      // Track ball
      cpu.ticksSinceUpdate++;
      if (cpu.ticksSinceUpdate > 30) {
        cpu.impOffset = (Math.random() - 0.5) * cfg.imprecision * 2;
        cpu.ticksSinceUpdate = 0;
      }

      const ballDist = Math.abs(g.ball.y - P2_Y);
      if (ballDist < cfg.reactionDist || !g.launched) {
        cpu.targetX = g.ball.x + cpu.impOffset;
      }

      const dx = cpu.targetX - g.p2x;
      if (Math.abs(dx) > 2) {
        g.p2x += Math.sign(dx) * Math.min(Math.abs(dx), cfg.speed);
      }
      g.p2x = clamp(g.p2x, PADDLE_W / 2, CANVAS_W - PADDLE_W / 2);
    }

    // Ball physics
    if (!g.launched) {
      if (g.serving === 0) {
        g.ball.x = g.p1x;
        g.ball.y = P1_Y - PADDLE_H / 2 - BALL_R - 2;
      } else {
        g.ball.x = g.p2x;
        g.ball.y = P2_Y + PADDLE_H / 2 + BALL_R + 2;
      }
    } else {
      g.ball.x += g.ball.vx;
      g.ball.y += g.ball.vy;

      // Wall collision
      if (g.ball.x - BALL_R <= 0) {
        g.ball.x = BALL_R;
        g.ball.vx = Math.abs(g.ball.vx);
        audioRef.current?.wallHit();
      }
      if (g.ball.x + BALL_R >= CANVAS_W) {
        g.ball.x = CANVAS_W - BALL_R;
        g.ball.vx = -Math.abs(g.ball.vx);
        audioRef.current?.wallHit();
      }

      // Paddle 1 (bottom)
      if (
        g.ball.vy > 0 &&
        g.ball.y + BALL_R >= P1_Y - PADDLE_H / 2 &&
        g.ball.y + BALL_R <= P1_Y + PADDLE_H / 2 + 6
      ) {
        if (g.ball.x >= g.p1x - PADDLE_W / 2 - BALL_R && g.ball.x <= g.p1x + PADDLE_W / 2 + BALL_R) {
          const hitPos = (g.ball.x - g.p1x) / (PADDLE_W / 2);
          g.rallyCount++;
          g.speed = BASE_SPEED + g.rallyCount * 0.15;
          g.ball.vy = -g.speed;
          g.ball.vx = hitPos * g.speed * MAX_ANGLE;
          g.ball.y = P1_Y - PADDLE_H / 2 - BALL_R;
          audioRef.current?.paddleHit();
        }
      }

      // Paddle 2 (top)
      if (
        g.ball.vy < 0 &&
        g.ball.y - BALL_R <= P2_Y + PADDLE_H / 2 &&
        g.ball.y - BALL_R >= P2_Y - PADDLE_H / 2 - 6
      ) {
        if (g.ball.x >= g.p2x - PADDLE_W / 2 - BALL_R && g.ball.x <= g.p2x + PADDLE_W / 2 + BALL_R) {
          const hitPos = (g.ball.x - g.p2x) / (PADDLE_W / 2);
          g.rallyCount++;
          g.speed = BASE_SPEED + g.rallyCount * 0.15;
          g.ball.vy = g.speed;
          g.ball.vx = hitPos * g.speed * MAX_ANGLE;
          g.ball.y = P2_Y + PADDLE_H / 2 + BALL_R;
          audioRef.current?.paddleHit();
        }
      }

      // Scoring
      if (g.ball.y - BALL_R > CANVAS_H) {
        if (handleScore(2)) return;
      }
      if (g.ball.y + BALL_R < 0) {
        if (handleScore(1)) return;
      }
    }

    // Trail
    if (g.launched) {
      trailRef.current.push({ x: g.ball.x, y: g.ball.y });
      if (trailRef.current.length > 8) trailRef.current.shift();
    } else {
      trailRef.current = [];
    }

    // Update React state
    setP1x(g.p1x); setP2x(g.p2x);
    setBallX(g.ball.x); setBallY(g.ball.y);
    setTrail([...trailRef.current]);
  }, [mode, launchBall, handleScore]);

  // ---- Keyboard ----
  useEffect(() => {
    const down = (e) => {
      keysRef.current.add(e.key);
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
      }
    };
    const up = (e) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ---- Local game loop ----
  useEffect(() => {
    if (screen !== "playing") return;
    if (mode?.startsWith("remote")) return;

    loopRef.current = setInterval(localTick, 1000 / 60);
    return () => clearInterval(loopRef.current);
  }, [screen, mode, localTick]);

  // ---- Remote: paddle sending + input loop ----
  useEffect(() => {
    if (screen !== "playing" || !mode?.startsWith("remote")) return;

    const interval = setInterval(() => {
      const keys = keysRef.current;
      const g = gameRef.current;
      const myPaddle = playerNum === 1 ? "p1x" : "p2x";

      if (keys.has("ArrowLeft")) g[myPaddle] -= PADDLE_SPEED;
      if (keys.has("ArrowRight")) g[myPaddle] += PADDLE_SPEED;
      g[myPaddle] = clamp(g[myPaddle], PADDLE_W / 2, CANVAS_W - PADDLE_W / 2);

      // Send paddle position
      const ws = wsRef.current;
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ t: "paddle", x: g[myPaddle] }));
      }

      // Launch
      if (keys.has("ArrowUp")) {
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({ t: "launch" }));
        }
      }
    }, 1000 / 60);

    return () => clearInterval(interval);
  }, [screen, mode, playerNum]);

  // ---- WebSocket ----
  const connectWS = useCallback((action, joinCode) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (action === "create") {
        ws.send(JSON.stringify({ t: "create" }));
      } else {
        ws.send(JSON.stringify({ t: "join", id: joinCode }));
        setLobbyStatus("joining");
      }
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      switch (msg.t) {
        case "created":
          setSessionId(msg.id);
          setPlayerNum(1);
          setLobbyStatus("waiting");
          break;

        case "joined":
          setPlayerNum(msg.player);
          break;

        case "opponent_joined":
          // Host: opponent joined, game will start
          break;

        case "start":
          resetLocalGame();
          setScreen("playing");
          setLobbyStatus(null);
          setDisconnected(false);
          setRemoteRestartReq(false);
          break;

        case "gs": // game state
          setBallX(msg.bx);
          setBallY(msg.by);
          setP1x(msg.p1);
          setP2x(msg.p2);
          setS1(msg.s1);
          setS2(msg.s2);
          setServing(msg.sv);
          setLaunched(msg.l);
          // Update trail
          trailRef.current.push({ x: msg.bx, y: msg.by });
          if (trailRef.current.length > 8) trailRef.current.shift();
          setTrail([...trailRef.current]);
          // Sync gameRef for paddle input
          gameRef.current.p1x = msg.p1;
          gameRef.current.p2x = msg.p2;
          break;

        case "sfx":
          if (msg.s === "paddle") audioRef.current?.paddleHit();
          else if (msg.s === "wall") audioRef.current?.wallHit();
          else if (msg.s === "score") audioRef.current?.scorePoint();
          break;

        case "end":
          setS1(msg.s1);
          setS2(msg.s2);
          setWinner(msg.winner);
          audioRef.current?.winGame();
          setTimeout(() => setScreen("gameover"), 400);
          break;

        case "restart_req":
          setRemoteRestartReq(true);
          break;

        case "left":
          setDisconnected(true);
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
          break;

        case "error":
          setLobbyStatus("error");
          setTimeout(() => {
            setScreen("menu");
            setLobbyStatus(null);
          }, 2000);
          break;
      }
    };

    ws.onclose = () => {};
    ws.onerror = () => {
      setLobbyStatus("error");
      setTimeout(() => {
        setScreen("menu");
        setLobbyStatus(null);
      }, 2000);
    };
  }, [resetLocalGame]);

  // ---- Mode selection ----
  const startMode = useCallback(async (selectedMode, joinCode) => {
    setMode(selectedMode);
    await initAudio();

    if (selectedMode === "remote-host") {
      setScreen("lobby");
      setLobbyStatus("creating");
      connectWS("create");
    } else if (selectedMode === "remote-join") {
      setScreen("lobby");
      setLobbyStatus("joining");
      connectWS("join", joinCode);
    } else {
      resetLocalGame();
      setScreen("playing");
    }
  }, [initAudio, resetLocalGame, connectWS]);

  const handleSelectMode = useCallback(async (selectedMode, joinCode) => {
    if (!user) {
      pendingModeRef.current = { selectedMode, joinCode };
      setScreen("register");
      return;
    }
    startMode(selectedMode, joinCode);
  }, [user, startMode]);

  const handleRegister = useCallback(async (userData) => {
    const jogador = await register(userData);
    if (jogador && pendingModeRef.current) {
      const { selectedMode, joinCode } = pendingModeRef.current;
      pendingModeRef.current = null;
      startMode(selectedMode, joinCode);
    }
  }, [register, startMode]);

  // ---- Restart ----
  const handleRestart = useCallback(() => {
    if (mode?.startsWith("remote")) {
      const ws = wsRef.current;
      if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ t: "restart" }));
      }
    } else {
      resetLocalGame();
      setScreen("playing");
    }
  }, [mode, resetLocalGame]);

  // ---- Back to menu ----
  const handleMenu = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    clearInterval(loopRef.current);
    setScreen("menu");
    setMode(null);
    setLobbyStatus(null);
    setDisconnected(false);
    setRemoteRestartReq(false);
  }, []);

  // Cleanup
  useEffect(() => () => {
    audioRef.current?.stop();
    clearInterval(loopRef.current);
    if (wsRef.current) wsRef.current.close();
  }, []);

  // ---- Serve hint text ----
  const serveHint = (() => {
    if (launched || screen !== "playing") return null;
    if (mode?.startsWith("remote")) {
      const isMyServe = serving === (playerNum - 1);
      return isMyServe ? "Pressione ↑ para lancar" : "Oponente saca...";
    }
    if (mode?.startsWith("cpu")) {
      return serving === 0 ? "Pressione S para lancar" : "";
    }
    // local
    return serving === 0 ? "P1: Pressione S" : "P2: Pressione ↑";
  })();

  const gameScale = useGameScale(CANVAS_W);

  const p1Label = mode?.startsWith("remote") && playerNum === 1 ? "VOCE" : mode?.startsWith("remote") && playerNum === 2 ? "RIVAL" : "P1";
  const p2Label = mode?.startsWith("remote") && playerNum === 2 ? "VOCE" : mode?.startsWith("remote") && playerNum === 1 ? "RIVAL" : mode?.startsWith("cpu") ? "CPU" : "P2";

  return (
    <div style={{
      minHeight: "100vh", background: "#050510",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "'Fira Code', monospace", overflow: "hidden", padding: 12,
      touchAction: "manipulation",
    }}>
      <style>{`
        @keyframes scoreFlash {
          0% { transform: scale(1); }
          50% { transform: scale(1.5); }
          100% { transform: scale(1); }
        }
        @keyframes pulseServe {
          0%,100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
      `}</style>

      {screen !== "menu" && screen !== "lobby" && (
        <>
          <h1 style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: "#00f0ff",
            textShadow: "0 0 20px #00f0ff", marginBottom: 8, letterSpacing: 3,
          }}>PONG</h1>
          <p style={{
            color: "#4a5568", fontSize: 10, marginBottom: 14,
            fontFamily: "'Press Start 2P', monospace",
          }}>
            {mode?.startsWith("cpu") ? `VS CPU (${mode.replace("cpu-", "").toUpperCase()})` :
             mode === "local" ? "LOCAL - 2 JOGADORES" :
             mode?.startsWith("remote") ? `ONLINE - SALA ${sessionId}` : ""}
          </p>
        </>
      )}

      {/* Game container */}
      <div style={{
        width: CANVAS_W * gameScale, height: CANVAS_H * gameScale,
      }}>
      <div style={{
        width: CANVAS_W, height: CANVAS_H, position: "relative",
        background: "#0a0a1a",
        border: "2px solid rgba(0,240,255,0.2)",
        borderRadius: 12, overflow: "hidden", userSelect: "none",
        transform: `scale(${gameScale})`, transformOrigin: "top left",
      }}>
        {/* Grid bg */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(0,240,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.015) 1px, transparent 1px)",
          backgroundSize: "40px 40px", pointerEvents: "none",
        }} />

        {screen === "playing" && (
          <>
            {/* Center line */}
            <div style={{
              position: "absolute", top: CANVAS_H / 2 - 1, left: 20, right: 20, height: 2,
              background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 10px, transparent 10px, transparent 20px)",
              pointerEvents: "none",
            }} />

            {/* Scores */}
            <div style={{
              position: "absolute", top: CANVAS_H / 2 - 80, left: 0, right: 0,
              display: "flex", justifyContent: "center", gap: 60, pointerEvents: "none", zIndex: 5,
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: rgbaStr(P1_COLOR, 0.5),
                  marginBottom: 4,
                }}>{p1Label}</div>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 48, color: rgbaStr(P1_COLOR, 0.2),
                  textShadow: `0 0 20px ${rgbaStr(P1_COLOR, 0.1)}`,
                  animation: scoreFlash === 1 ? "scoreFlash 0.3s ease-out" : "none",
                }}>{s1}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: rgbaStr(P2_COLOR, 0.5),
                  marginBottom: 4,
                }}>{p2Label}</div>
                <div style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 48, color: rgbaStr(P2_COLOR, 0.2),
                  textShadow: `0 0 20px ${rgbaStr(P2_COLOR, 0.1)}`,
                  animation: scoreFlash === 2 ? "scoreFlash 0.3s ease-out" : "none",
                }}>{s2}</div>
              </div>
            </div>

            {/* Serve hint */}
            {serveHint && (
              <div style={{
                position: "absolute",
                top: serving === 0 ? CANVAS_H - 80 : 55,
                left: 0, right: 0, textAlign: "center",
                fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                color: serving === 0 ? rgbStr(P1_COLOR) : rgbStr(P2_COLOR),
                animation: "pulseServe 1s infinite", pointerEvents: "none", zIndex: 10,
              }}>{serveHint}</div>
            )}

            {/* Ball trail */}
            {trail.map((t, i) => (
              <div key={i} style={{
                position: "absolute",
                left: t.x - BALL_R * (i / trail.length),
                top: t.y - BALL_R * (i / trail.length),
                width: BALL_R * 2 * (i / trail.length),
                height: BALL_R * 2 * (i / trail.length),
                borderRadius: "50%",
                background: `rgba(255,255,255,${0.04 * (i / trail.length)})`,
                pointerEvents: "none", zIndex: 30,
              }} />
            ))}

            {/* Ball */}
            <div style={{
              position: "absolute",
              left: ballX - BALL_R,
              top: ballY - BALL_R,
              width: BALL_R * 2,
              height: BALL_R * 2,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 0 8px #fff, 0 0 16px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.15)",
              pointerEvents: "none",
              zIndex: 40,
            }} />

            {/* Paddle 1 (bottom - cyan) */}
            <div style={{
              position: "absolute",
              left: p1x - PADDLE_W / 2,
              top: P1_Y - PADDLE_H / 2,
              width: PADDLE_W,
              height: PADDLE_H,
              borderRadius: 6,
              background: `linear-gradient(180deg, ${rgbStr(P1_COLOR)}, ${rgbaStr(P1_COLOR, 0.7)})`,
              boxShadow: `0 0 10px ${rgbaStr(P1_COLOR, 0.5)}, 0 0 20px ${rgbaStr(P1_COLOR, 0.2)}`,
              pointerEvents: "none",
              zIndex: 50,
            }} />

            {/* Paddle 2 (top - magenta) */}
            <div style={{
              position: "absolute",
              left: p2x - PADDLE_W / 2,
              top: P2_Y - PADDLE_H / 2,
              width: PADDLE_W,
              height: PADDLE_H,
              borderRadius: 6,
              background: `linear-gradient(0deg, ${rgbStr(P2_COLOR)}, ${rgbaStr(P2_COLOR, 0.7)})`,
              boxShadow: `0 0 10px ${rgbaStr(P2_COLOR, 0.5)}, 0 0 20px ${rgbaStr(P2_COLOR, 0.2)}`,
              pointerEvents: "none",
              zIndex: 50,
            }} />

            {/* Side glow lines */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
              background: "linear-gradient(180deg, transparent, rgba(0,240,255,0.1), transparent)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: 2,
              background: "linear-gradient(180deg, transparent, rgba(0,240,255,0.1), transparent)",
              pointerEvents: "none",
            }} />

            {/* Disconnected overlay */}
            {disconnected && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                zIndex: 200,
              }}>
                <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ff2d95", marginBottom: 16 }}>
                  OPONENTE DESCONECTOU
                </p>
                <button onClick={handleMenu} style={{
                  padding: "10px 24px", background: "transparent",
                  border: "1px solid #555", borderRadius: 6, color: "#888",
                  fontFamily: "'Press Start 2P', monospace", fontSize: 10, cursor: "pointer",
                }}>MENU</button>
              </div>
            )}
          </>
        )}

        {/* Screens */}
        {screen === "menu" && <PongMenu onSelect={handleSelectMode} />}
        {screen === "register" && <RegisterModal onRegister={handleRegister} loading={registering} jogoNome="PONG" accentColor="#00f0ff" />}
        {screen === "lobby" && (
          <RemoteLobby sessionId={sessionId} status={lobbyStatus} onCancel={handleMenu} />
        )}
        {screen === "gameover" && (
          <PongGameOver
            s1={s1} s2={s2} winner={winner} playerNum={playerNum}
            mode={mode} onRestart={handleRestart} onMenu={handleMenu}
            remoteRestartReq={remoteRestartReq}
          />
        )}
      </div>
      </div>

      {/* Controls hint */}
      {screen === "playing" && !mode?.startsWith("remote") && (
        <div style={{
          width: CANVAS_W, display: "flex", justifyContent: "space-between",
          marginTop: 10, padding: "0 4px",
        }}>
          <span style={{ color: rgbaStr(P1_COLOR, 0.4), fontSize: 9, fontFamily: "'Fira Code', monospace" }}>
            P1: A/D + S
          </span>
          {mode === "local" && (
            <span style={{ color: rgbaStr(P2_COLOR, 0.4), fontSize: 9, fontFamily: "'Fira Code', monospace" }}>
              P2: ←/→ + ↑
            </span>
          )}
        </div>
      )}
      {screen === "playing" && mode?.startsWith("remote") && (
        <div style={{ marginTop: 10 }}>
          <span style={{ color: "#4a5568", fontSize: 9, fontFamily: "'Fira Code', monospace" }}>
            ←/→ mover &nbsp;|&nbsp; ↑ lancar
          </span>
        </div>
      )}
      {screen === "playing" && (
        <PongMobileControls keysRef={keysRef} mode={mode} playerNum={playerNum} />
      )}
      <AdBanner slot="pong_bottom" style={{ marginTop: 16, maxWidth: CANVAS_W }} />
    </div>
  );
}
