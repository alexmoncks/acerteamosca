"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import { ShipsMobileControls } from "@/components/MobileControls";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

const TILE = 40;
const COLS = 12;
const ROWS = 16;
const CANVAS_W = COLS * TILE;
const CANVAS_H = ROWS * TILE;
const SHIP_R = 10;
const SHIP_SIZE = 24;
const SHIP_SPD = 2.2;
const SHIP_BACK = 1.2;
const ROT_SPD = 4 * (Math.PI / 180);
const BULLET_SPD = 5;
const BULLET_R = 3;
const BULLET_MAX_BOUNCE = 2;
const BULLET_MAX_DIST = SHIP_SIZE * 10;
const WIN_SCORE = 10;
const RESPAWN_FRAMES = 90;

const WS_URL = process.env.NEXT_PUBLIC_WS_SHIPS_URL || "ws://localhost:3003";

const P1_COLOR = { r: 0, g: 240, b: 255 };
const P2_COLOR = { r: 255, g: 45, b: 149 };
const WALL_COLOR = "#151530";
const WALL_BORDER = "#2a2a5a";

const SPAWN = [
  { x: 2.5 * TILE, y: (ROWS - 3) * TILE + TILE / 2, a: -Math.PI / 4 },
  { x: (COLS - 2.5) * TILE, y: 2 * TILE + TILE / 2, a: (Math.PI * 3) / 4 },
];

const CPU_CFG = {
  easy:   { spd: 1.5, rot: 2.5, aimTol: 0.4, shootChance: 0.02, react: 250 },
  medium: { spd: 2.0, rot: 3.5, aimTol: 0.2, shootChance: 0.06, react: 150 },
  hard:   { spd: 2.2, rot: 4.0, aimTol: 0.08, shootChance: 0.15, react: 80  },
};

function rgbStr(c) { return `rgb(${c.r},${c.g},${c.b})`; }
function rgbaStr(c, a) { return `rgba(${c.r},${c.g},${c.b},${a})`; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function isWallTile(grid, x, y) {
  const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
  return grid[r][c] === 1;
}

function collidesWall(grid, x, y, rad) {
  const minC = Math.floor((x - rad) / TILE), maxC = Math.floor((x + rad) / TILE);
  const minR = Math.floor((y - rad) / TILE), maxR = Math.floor((y + rad) / TILE);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
      if (grid[r][c] === 1) {
        const cx = clamp(x, c * TILE, (c + 1) * TILE);
        const cy = clamp(y, r * TILE, (r + 1) * TILE);
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy < rad * rad) return true;
      }
    }
  }
  return false;
}

function hasLOS(grid, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist / 8);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (isWallTile(grid, x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

function bfs(grid, sr, sc, er, ec) {
  if (grid[sr]?.[sc] === 1 || grid[er]?.[ec] === 1) return false;
  const vis = new Set([`${sr},${sc}`]);
  const q = [[sr, sc]];
  while (q.length) {
    const [r, c] = q.shift();
    if (r === er && c === ec) return true;
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr = r + dr, nc = c + dc, k = `${nr},${nc}`;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !vis.has(k) && grid[nr][nc] === 0) {
        vis.add(k); q.push([nr, nc]);
      }
    }
  }
  return false;
}

function generateMaze() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  for (let c = 0; c < COLS; c++) { grid[0][c] = 1; grid[ROWS - 1][c] = 1; }
  for (let r = 0; r < ROWS; r++) { grid[r][0] = 1; grid[r][COLS - 1] = 1; }

  // Place scattered wall segments (shorter, fewer = more open)
  for (let attempt = 0, placed = 0; attempt < 40 && placed < 10; attempt++) {
    const horiz = Math.random() > 0.5;
    const len = 2 + Math.floor(Math.random() * 2); // 2-3 tiles max
    const r = 2 + Math.floor(Math.random() * (ROWS - 5));
    const c = 2 + Math.floor(Math.random() * (COLS - 5));
    if ((r > ROWS - 6 && c < 5) || (r < 5 && c > COLS - 6)) continue;

    const tiles = [];
    for (let j = 0; j < len; j++) {
      const tr = horiz ? r : r + j, tc = horiz ? c + j : c;
      if (tr >= 1 && tr < ROWS - 1 && tc >= 1 && tc < COLS - 1 && grid[tr][tc] === 0) tiles.push([tr, tc]);
    }
    if (tiles.length < 2) continue;
    tiles.forEach(([tr, tc]) => (grid[tr][tc] = 1));
    // Check multiple paths exist (not just one bottleneck)
    if (!bfs(grid, ROWS - 3, 2, 2, COLS - 3) || !bfs(grid, ROWS - 3, COLS - 3, 2, 2)) {
      tiles.forEach(([tr, tc]) => (grid[tr][tc] = 0));
    } else {
      placed++;
    }
  }

  // Add a few single-block obstacles for cover variety
  for (let i = 0; i < 6; i++) {
    const r = 3 + Math.floor(Math.random() * (ROWS - 7));
    const c = 3 + Math.floor(Math.random() * (COLS - 7));
    if (grid[r][c] === 0) {
      grid[r][c] = 1;
      if (!bfs(grid, ROWS - 3, 2, 2, COLS - 3)) grid[r][c] = 0;
    }
  }

  // Clear spawn areas (larger zone)
  for (let dr = -2; dr <= 2; dr++)
    for (let dc = -2; dc <= 2; dc++) {
      const r1 = ROWS - 3 + dr, c1 = 2 + dc, r2 = 2 + dr, c2 = COLS - 3 + dc;
      if (r1 > 0 && r1 < ROWS - 1 && c1 > 0 && c1 < COLS - 1) grid[r1][c1] = 0;
      if (r2 > 0 && r2 < ROWS - 1 && c2 > 0 && c2 < COLS - 1) grid[r2][c2] = 0;
    }
  return grid;
}

// ---- Audio ----
class ShipsAudio {
  constructor() { this.ctx = null; }
  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
    this._explosionBuf = this._genExplosion();
  }
  _tone(freq, dur, vol, type = "square") {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  }
  laser() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(500, t);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(300, t + 0.12);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + 0.12);
  }
  ricochet() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(2200, t);
    o.frequency.exponentialRampToValueAtTime(3800, t + 0.025);
    o.frequency.exponentialRampToValueAtTime(1400, t + 0.07);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + 0.07);
  }
  _genExplosion() {
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 0.5);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.exp(-t / 0.07);
      const noise = (Math.random() * 2 - 1) * env * 0.4;
      const boom = Math.sin(2 * Math.PI * 70 * t * Math.exp(-t * 8)) * env * 0.7;
      const crack = (Math.random() * 2 - 1) * Math.exp(-t / 0.015) * 0.3;
      d[i] = (noise + boom + crack) * 0.6;
    }
    return buf;
  }
  explosion() {
    if (!this.ctx || !this._explosionBuf) return;
    const s = this.ctx.createBufferSource();
    s.buffer = this._explosionBuf;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    s.connect(g); g.connect(this.ctx.destination);
    s.start();
  }
  scorePoint() {
    this._tone(523, 0.1, 0.2, "square");
    setTimeout(() => this._tone(659, 0.12, 0.2, "square"), 80);
  }
  winGame() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.12, 0.2, "square"), i * 100)
    );
  }
  stop() { try { this.ctx?.close(); } catch (e) {} this.ctx = null; }
}

// ---- Ship SVG ----
function ShipSVG({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" style={{ display: "block" }}>
      <polygon points="11,0 -8,-7 -4,0 -8,7" fill={rgbStr(color)} opacity={0.9} />
      <polygon points="11,0 -8,-7 -4,0 -8,7" fill="none" stroke={rgbaStr(color, 0.5)} strokeWidth={0.8} />
      <circle cx={0} cy={0} r={2} fill="#fff" opacity={0.5} />
    </svg>
  );
}

// ---- Menu ----
function ShipsMenu({ onSelect }) {
  const [sub, setSub] = useState(null);
  const [joinId, setJoinId] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0); }, []);

  const btn = (label, onClick, accent = "#00f0ff") => (
    <button onClick={onClick} style={{
      width: "100%", padding: "14px 0", background: `${accent}11`,
      border: `1px solid ${accent}44`, borderRadius: 8, color: accent,
      fontFamily: "'Press Start 2P', monospace", fontSize: 10, cursor: "pointer", letterSpacing: 1,
    }}>{label}</button>
  );

  return (
    <div style={{ position: "absolute", inset: 0, background: "#050510", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,240,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,255,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div style={{ fontSize: 50, marginBottom: 10 }}>🚀</div>
      <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 28, color: "#39ff14", textShadow: "0 0 30px #39ff14", letterSpacing: 6, marginBottom: 6, position: "relative" }}>SHIPS</h1>
      <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#ff2d95", letterSpacing: 2, textShadow: "0 0 10px #ff2d95", marginBottom: 40 }}>NAVEGUE, ATIRE, SOBREVIVA!</p>

      <div style={{ width: 280, display: "flex", flexDirection: "column", gap: 12, position: "relative", zIndex: 1 }}>
        {!sub && <>
          {btn("🤖  VS COMPUTADOR", () => setSub("cpu"))}
          {!isMobile && btn("👥  LOCAL (2 JOGADORES)", () => onSelect("local"), "#39ff14")}
          {btn("🌐  ONLINE", () => setSub("online"), "#b026ff")}
        </>}
        {sub === "cpu" && <>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#555", textAlign: "center", marginBottom: 4 }}>DIFICULDADE</p>
          {btn("😌  FACIL", () => onSelect("cpu-easy"), "#39ff14")}
          {btn("😐  MEDIO", () => onSelect("cpu-medium"), "#ffe600")}
          {btn("😈  DIFICIL", () => onSelect("cpu-hard"), "#ff2d95")}
          {btn("← VOLTAR", () => setSub(null), "#555")}
        </>}
        {sub === "online" && <>
          {btn("🏠  CRIAR SALA", () => onSelect("remote-host"), "#b026ff")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={joinId} onChange={e => setJoinId(e.target.value.toUpperCase())} placeholder="CODIGO" maxLength={6}
              style={{ width: "100%", padding: "10px 12px", background: "#111127", border: "1px solid #2a2a4a", borderRadius: 6, color: "#e0e0ff", fontSize: 14, fontFamily: "'Press Start 2P', monospace", textAlign: "center", letterSpacing: 4, outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#b026ff"} onBlur={e => e.target.style.borderColor = "#2a2a4a"} />
            <button onClick={() => joinId.length >= 4 && onSelect("remote-join", joinId)} disabled={joinId.length < 4}
              style={{ width: "100%", padding: "10px 16px", background: joinId.length >= 4 ? "#b026ff" : "#2a2a4a", border: "none", borderRadius: 6, color: joinId.length >= 4 ? "#fff" : "#555", fontFamily: "'Press Start 2P', monospace", fontSize: 9, cursor: joinId.length >= 4 ? "pointer" : "not-allowed" }}>ENTRAR</button>
          </div>
          {btn("← VOLTAR", () => setSub(null), "#555")}
        </>}
      </div>
      {!isMobile && (
        <div style={{ position: "absolute", bottom: 20, textAlign: "center" }}>
          <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 9, color: "#333" }}>P1: WASD + Space &nbsp;|&nbsp; P2: Setas + Enter</p>
        </div>
      )}
    </div>
  );
}

// ---- Lobby ----
function ShipsLobby({ sessionId, status, onCancel }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!sessionId) return;
    const url = `${window.location.origin}${window.location.pathname}?sala=${sessionId}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(5,5,16,0.95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🌐</div>
      {status === "waiting" && <>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#b026ff", marginBottom: 20 }}>AGUARDANDO OPONENTE</p>
        <div onClick={handleCopyLink} style={{
          background: "#111127", border: `2px solid ${copied ? "#39ff14" : "#b026ff"}`, borderRadius: 10,
          padding: "16px 28px", marginBottom: 16, cursor: "pointer", transition: "border-color 0.3s",
        }}>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, color: "#555", marginBottom: 8 }}>CODIGO DA SALA</p>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 28, color: "#b026ff", textShadow: "0 0 15px #b026ff", letterSpacing: 8 }}>{sessionId}</p>
        </div>
        <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 10, color: copied ? "#39ff14" : "#666", transition: "color 0.3s" }}>
          {copied ? "LINK COPIADO!" : "Toque no codigo para copiar o link"}
        </p>
      </>}
      {status === "joining" && <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#b026ff" }}>ENTRANDO...</p>}
      {status === "creating" && <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#b026ff" }}>CONECTANDO...</p>}
      {status === "error" && <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#ff2d95" }}>SALA NAO ENCONTRADA</p>}
      <button onClick={onCancel} style={{ marginTop: 20, padding: "10px 24px", background: "transparent", border: "1px solid #555", borderRadius: 6, color: "#555", fontFamily: "'Press Start 2P', monospace", fontSize: 9, cursor: "pointer" }}>CANCELAR</button>
    </div>
  );
}

// ---- Game Over ----
function ShipsGameOver({ s1, s2, winner, playerNum, mode, onRestart, onMenu, remoteReq }) {
  const isRemote = mode?.startsWith("remote");
  const youWon = isRemote ? winner === playerNum : null;
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>{isRemote ? (youWon ? "🏆" : "💥") : "🏆"}</div>
        <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18, color: winner === 1 ? rgbStr(P1_COLOR) : rgbStr(P2_COLOR), textShadow: `0 0 15px ${winner === 1 ? rgbStr(P1_COLOR) : rgbStr(P2_COLOR)}`, marginBottom: 8 }}>
          {isRemote ? (youWon ? "VOCE VENCEU!" : "VOCE PERDEU!") : `JOGADOR ${winner} VENCE!`}
        </h2>
        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginBottom: 24 }}>
          {[{ l: isRemote && playerNum === 1 ? "VOCE" : "P1", v: s1, c: P1_COLOR }, { l: isRemote && playerNum === 2 ? "VOCE" : mode?.startsWith("cpu") ? "CPU" : "P2", v: s2, c: P2_COLOR }].map(s => (
            <div key={s.l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8, color: "#555", marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 32, color: rgbStr(s.c), textShadow: `0 0 10px ${rgbStr(s.c)}` }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onRestart} style={{ padding: "12px 28px", background: "linear-gradient(135deg, #00f0ff, #39ff14)", border: "none", borderRadius: 8, color: "#000", fontFamily: "'Press Start 2P', monospace", fontSize: 10, cursor: "pointer", fontWeight: 900 }}>
            {isRemote ? (remoteReq ? "ACEITAR REVANCHE" : "REVANCHE") : "JOGAR DE NOVO"}
          </button>
          <button onClick={onMenu} style={{ padding: "12px 28px", background: "transparent", border: "1px solid #555", borderRadius: 8, color: "#888", fontFamily: "'Press Start 2P', monospace", fontSize: 10, cursor: "pointer" }}>MENU</button>
        </div>
        {isRemote && remoteReq && <p style={{ fontFamily: "'Fira Code', monospace", fontSize: 10, color: "#b026ff", marginTop: 10 }}>Oponente quer revanche!</p>}
        <AdBanner slot="ships_between" style={{ marginTop: 12, maxWidth: 300 }} />
      </div>
    </div>
  );
}

// ---- MAIN GAME ----
export default function Ships() {
  const { user, checkedCookie, registering, register } = useJogador("ships");
  const [screen, setScreen] = useState("menu");
  const [mode, setMode] = useState(null);
  const pendingModeRef = useRef(null);
  const [maze, setMaze] = useState([]);
  const [ship1, setShip1] = useState({ ...SPAWN[0], alive: true });
  const [ship2, setShip2] = useState({ ...SPAWN[1], alive: true });
  const [bullet1, setBullet1] = useState(null);
  const [bullet2, setBullet2] = useState(null);
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const [winner, setWinner] = useState(0);
  const [explosions, setExplosions] = useState([]);
  const [roundState, setRoundState] = useState("playing");
  const [shakeScreen, setShakeScreen] = useState(false);

  // Remote
  const [lobbyStatus, setLobbyStatus] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [playerNum, setPlayerNum] = useState(0);
  const [remoteReq, setRemoteReq] = useState(false);
  const [disconnected, setDisconnected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => { setIsMobile("ontouchstart" in window || navigator.maxTouchPoints > 0); }, []);

  const gameRef = useRef({
    s: [{ ...SPAWN[0], alive: true }, { ...SPAWN[1], alive: true }],
    b: [null, null],
    sc: [0, 0],
    state: "playing",
    timer: 0,
    maze: [],
  });
  const keysRef = useRef(new Set());
  const loopRef = useRef(null);
  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const cpuRef = useRef({ wanderAngle: 0, stuckTimer: 0, shootCooldown: 0 });
  const expIdRef = useRef(0);

  const mazeElements = useMemo(() =>
    maze.map((row, r) => row.map((cell, c) => cell === 1 ? (
      <div key={`w${r}-${c}`} style={{
        position: "absolute", left: c * TILE, top: r * TILE, width: TILE, height: TILE,
        background: WALL_COLOR, border: `1px solid ${WALL_BORDER}`,
        boxShadow: "inset 0 0 6px rgba(0,0,30,0.5)",
      }} />
    ) : null))
  , [maze]);

  const initAudio = useCallback(async () => {
    if (audioRef.current) return;
    const a = new ShipsAudio();
    await a.init();
    audioRef.current = a;
  }, []);

  const spawnExplosion = useCallback((x, y, color) => {
    const id = expIdRef.current++;
    const parts = Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * Math.PI * 2 + (Math.random() - 0.5) * 0.3,
      speed: 25 + Math.random() * 45,
      size: 3 + Math.random() * 5,
    }));
    setExplosions(prev => [...prev, { id, x, y, color, parts }]);
    setTimeout(() => setExplosions(prev => prev.filter(e => e.id !== id)), 900);
  }, []);

  // ---- Reset ----
  const resetGame = useCallback(() => {
    const m = generateMaze();
    setMaze(m);
    gameRef.current.maze = m;
    gameRef.current.s = [{ ...SPAWN[0], alive: true }, { ...SPAWN[1], alive: true }];
    gameRef.current.b = [null, null];
    gameRef.current.sc = [0, 0];
    gameRef.current.state = "playing";
    gameRef.current.timer = 0;
    cpuRef.current = { wanderAngle: 0, stuckTimer: 0, shootCooldown: 0 };

    setShip1({ ...SPAWN[0], alive: true });
    setShip2({ ...SPAWN[1], alive: true });
    setBullet1(null); setBullet2(null);
    setS1(0); setS2(0); setWinner(0);
    setRoundState("playing"); setExplosions([]);
  }, []);

  // ---- Local bullet move ----
  const moveBullet = useCallback((b) => {
    if (!b) return null;
    const m = gameRef.current.maze;
    const nx = b.x + b.vx, ny = b.y + b.vy;
    const hitX = isWallTile(m, nx, b.y);
    const hitY = isWallTile(m, b.x, ny);
    let bounced = false;
    if (hitX && hitY) { b.vx *= -1; b.vy *= -1; bounced = true; }
    else if (hitX) { b.vx *= -1; b.y = ny; bounced = true; }
    else if (hitY) { b.vy *= -1; b.x = nx; bounced = true; }
    else { b.x = nx; b.y = ny; }
    if (bounced) { b.bounces++; audioRef.current?.ricochet(); }
    b.dist += BULLET_SPD;
    if (b.bounces > BULLET_MAX_BOUNCE || b.dist > BULLET_MAX_DIST) return null;
    return b;
  }, []);

  // ---- CPU AI ----
  const cpuTick = useCallback(() => {
    const g = gameRef.current;
    const ship = g.s[1];
    const player = g.s[0];
    const m = g.maze;
    if (!ship.alive || !player.alive) return false;

    const diff = mode?.replace("cpu-", "") || "medium";
    const cfg = CPU_CFG[diff];
    const cpu = cpuRef.current;

    const dx = player.x - ship.x, dy = player.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);

    // Wall avoidance
    const lookDist = 35;
    const lookX = ship.x + Math.cos(ship.a) * lookDist;
    const lookY = ship.y + Math.sin(ship.a) * lookDist;
    const wallAhead = collidesWall(m, lookX, lookY, 4);

    let desiredAngle;
    if (wallAhead) {
      cpu.stuckTimer++;
      desiredAngle = ship.a + (cpu.stuckTimer % 120 < 60 ? 0.12 : -0.12);
    } else {
      cpu.stuckTimer = Math.max(0, cpu.stuckTimer - 1);
      const canSee = hasLOS(m, ship.x, ship.y, player.x, player.y);
      if (canSee && dist < cfg.react * 2) {
        desiredAngle = targetAngle;
      } else {
        // Wander toward player general direction
        cpu.wanderAngle += (Math.random() - 0.5) * 0.1;
        desiredAngle = targetAngle + cpu.wanderAngle * 0.5;
      }
    }

    // Rotate
    let diff2 = desiredAngle - ship.a;
    while (diff2 > Math.PI) diff2 -= 2 * Math.PI;
    while (diff2 < -Math.PI) diff2 += 2 * Math.PI;
    const rotSpd = cfg.rot * (Math.PI / 180);
    if (Math.abs(diff2) > rotSpd) ship.a += Math.sign(diff2) * rotSpd;
    else ship.a = desiredAngle;

    // Move forward (unless stuck)
    if (!wallAhead) {
      const nx = ship.x + Math.cos(ship.a) * cfg.spd;
      const ny = ship.y + Math.sin(ship.a) * cfg.spd;
      if (!collidesWall(m, nx, ship.y, SHIP_R)) ship.x = nx;
      if (!collidesWall(m, ship.x, ny, SHIP_R)) ship.y = ny;
    }

    // Shoot
    cpu.shootCooldown = Math.max(0, cpu.shootCooldown - 1);
    if (!g.b[1] && cpu.shootCooldown === 0) {
      const canSee = hasLOS(m, ship.x, ship.y, player.x, player.y);
      if (canSee && dist < BULLET_MAX_DIST * 0.9 && Math.abs(diff2) < cfg.aimTol) {
        if (Math.random() < cfg.shootChance) {
          cpu.shootCooldown = 30;
          return true; // signal to shoot
        }
      }
    }
    return false;
  }, [mode]);

  // ---- Local game tick ----
  const localTick = useCallback(() => {
    const g = gameRef.current;
    const keys = keysRef.current;
    const m = g.maze;
    const isCpu = mode?.startsWith("cpu");

    if (g.state === "respawning") {
      g.timer--;
      if (g.timer <= 0) {
        const newMaze = generateMaze();
        g.maze = newMaze;
        setMaze(newMaze);
        g.s = [{ ...SPAWN[0], alive: true }, { ...SPAWN[1], alive: true }];
        g.b = [null, null];
        g.state = "playing";
        setRoundState("playing");
      }
      setShip1({ ...g.s[0] }); setShip2({ ...g.s[1] });
      setBullet1(g.b[0]); setBullet2(g.b[1]);
      return;
    }

    const s = g.s;

    // P1 movement
    if (s[0].alive) {
      if (keys.has("a") || keys.has("A")) s[0].a -= ROT_SPD;
      if (keys.has("d") || keys.has("D")) s[0].a += ROT_SPD;
      let spd1 = 0;
      if (keys.has("w") || keys.has("W")) spd1 = SHIP_SPD;
      else if (keys.has("s") || keys.has("S")) spd1 = -SHIP_BACK;
      if (spd1 !== 0) {
        const nx = s[0].x + Math.cos(s[0].a) * spd1;
        const ny = s[0].y + Math.sin(s[0].a) * spd1;
        if (!collidesWall(m, nx, s[0].y, SHIP_R)) s[0].x = nx;
        if (!collidesWall(m, s[0].x, ny, SHIP_R)) s[0].y = ny;
      }
    }

    // P2 movement (local or CPU)
    if (isCpu) {
      const shouldShoot = cpuTick();
      if (shouldShoot && !g.b[1] && s[1].alive) {
        g.b[1] = {
          x: s[1].x + Math.cos(s[1].a) * (SHIP_R + 4),
          y: s[1].y + Math.sin(s[1].a) * (SHIP_R + 4),
          vx: Math.cos(s[1].a) * BULLET_SPD, vy: Math.sin(s[1].a) * BULLET_SPD,
          bounces: 0, dist: 0,
        };
        audioRef.current?.laser();
      }
    } else if (s[1].alive) {
      if (keys.has("ArrowLeft")) s[1].a -= ROT_SPD;
      if (keys.has("ArrowRight")) s[1].a += ROT_SPD;
      let spd2 = 0;
      if (keys.has("ArrowUp")) spd2 = SHIP_SPD;
      else if (keys.has("ArrowDown")) spd2 = -SHIP_BACK;
      if (spd2 !== 0) {
        const nx = s[1].x + Math.cos(s[1].a) * spd2;
        const ny = s[1].y + Math.sin(s[1].a) * spd2;
        if (!collidesWall(m, nx, s[1].y, SHIP_R)) s[1].x = nx;
        if (!collidesWall(m, s[1].x, ny, SHIP_R)) s[1].y = ny;
      }
    }

    // P1 shoot
    if ((keys.has(" ") || keys.has("f") || keys.has("F")) && !g.b[0] && s[0].alive) {
      g.b[0] = {
        x: s[0].x + Math.cos(s[0].a) * (SHIP_R + 4),
        y: s[0].y + Math.sin(s[0].a) * (SHIP_R + 4),
        vx: Math.cos(s[0].a) * BULLET_SPD, vy: Math.sin(s[0].a) * BULLET_SPD,
        bounces: 0, dist: 0,
      };
      keys.delete(" "); keys.delete("f"); keys.delete("F");
      audioRef.current?.laser();
    }

    // P2 shoot (local only)
    if (!isCpu && (keys.has("Enter") || keys.has("/")) && !g.b[1] && s[1].alive) {
      g.b[1] = {
        x: s[1].x + Math.cos(s[1].a) * (SHIP_R + 4),
        y: s[1].y + Math.sin(s[1].a) * (SHIP_R + 4),
        vx: Math.cos(s[1].a) * BULLET_SPD, vy: Math.sin(s[1].a) * BULLET_SPD,
        bounces: 0, dist: 0,
      };
      keys.delete("Enter"); keys.delete("/");
      audioRef.current?.laser();
    }

    // Move bullets
    g.b[0] = moveBullet(g.b[0]);
    g.b[1] = moveBullet(g.b[1]);

    // Hit detection
    for (let i = 0; i < 2; i++) {
      const b = g.b[i];
      const target = g.s[1 - i];
      if (!b || !target.alive) continue;
      const dx2 = b.x - target.x, dy2 = b.y - target.y;
      if (dx2 * dx2 + dy2 * dy2 < (SHIP_R + BULLET_R) * (SHIP_R + BULLET_R)) {
        target.alive = false;
        g.b[i] = null;
        g.sc[i]++;
        audioRef.current?.explosion();
        spawnExplosion(target.x, target.y, rgbStr(i === 0 ? P2_COLOR : P1_COLOR));
        setShakeScreen(true);
        setTimeout(() => setShakeScreen(false), 300);

        setS1(g.sc[0]); setS2(g.sc[1]);

        if (g.sc[i] >= WIN_SCORE) {
          setWinner(i + 1);
          audioRef.current?.winGame();
          window.gtag?.("event", "game_end", { game_name: "ships", score: 0 });
          setTimeout(() => setScreen("gameover"), 800);
          return;
        }

        g.state = "respawning";
        g.timer = RESPAWN_FRAMES;
        setRoundState("respawning");
      }
    }

    setShip1({ ...g.s[0] }); setShip2({ ...g.s[1] });
    setBullet1(g.b[0] ? { ...g.b[0] } : null);
    setBullet2(g.b[1] ? { ...g.b[1] } : null);
  }, [mode, moveBullet, cpuTick, spawnExplosion]);

  // ---- Keyboard ----
  useEffect(() => {
    const down = (e) => {
      keysRef.current.add(e.key);
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
    };
    const up = (e) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // ---- Local game loop ----
  useEffect(() => {
    if (screen !== "playing" || mode?.startsWith("remote")) return;
    let rafId;
    const loop = () => { localTick(); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [screen, mode, localTick]);

  // ---- Remote input sending ----
  useEffect(() => {
    if (screen !== "playing" || !mode?.startsWith("remote")) return;
    let lastKeys = "";
    const interval = setInterval(() => {
      const keys = keysRef.current;
      // Both remote players use the same keys (each on their own device)
      const k = {
        u: keys.has("w") || keys.has("W") || keys.has("ArrowUp") ? 1 : 0,
        d: keys.has("s") || keys.has("S") || keys.has("ArrowDown") ? 1 : 0,
        l: keys.has("a") || keys.has("A") || keys.has("ArrowLeft") ? 1 : 0,
        r: keys.has("d") || keys.has("D") || keys.has("ArrowRight") ? 1 : 0,
        s: keys.has(" ") || keys.has("f") || keys.has("F") || keys.has("Enter") || keys.has("/") ? 1 : 0,
      };
      const ks = JSON.stringify(k);
      if (ks !== lastKeys) {
        lastKeys = ks;
        const ws = wsRef.current;
        if (ws?.readyState === 1) ws.send(JSON.stringify({ t: "k", ...k }));
      }
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [screen, mode, playerNum]);

  // ---- WebSocket ----
  const connectWS = useCallback((action, joinCode) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (action === "create") ws.send(JSON.stringify({ t: "create" }));
      else { ws.send(JSON.stringify({ t: "join", id: joinCode })); setLobbyStatus("joining"); }
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.t) {
        case "created": setSessionId(msg.id); setPlayerNum(1); setLobbyStatus("waiting"); break;
        case "joined": setPlayerNum(msg.player); break;
        case "opponent_joined": break;
        case "start":
          setMaze(msg.maze);
          gameRef.current.maze = msg.maze;
          setScreen("playing");
          setLobbyStatus(null);
          setDisconnected(false);
          setRemoteReq(false);
          setRoundState("playing");
          setS1(0); setS2(0);
          window.gtag?.("event", "game_start", { game_name: "ships" });
          break;
        case "g":
          setShip1({ x: msg.s[0][0], y: msg.s[0][1], a: msg.s[0][2], alive: !!msg.s[0][3] });
          setShip2({ x: msg.s[1][0], y: msg.s[1][1], a: msg.s[1][2], alive: !!msg.s[1][3] });
          setBullet1(msg.b[0] ? { x: msg.b[0][0], y: msg.b[0][1] } : null);
          setBullet2(msg.b[1] ? { x: msg.b[1][0], y: msg.b[1][1] } : null);
          setS1(msg.c[0]); setS2(msg.c[1]);
          setRoundState(msg.st);
          break;
        case "sfx":
          if (msg.s === "laser") audioRef.current?.laser();
          else if (msg.s === "ricochet") audioRef.current?.ricochet();
          else if (msg.s === "explosion") {
            audioRef.current?.explosion();
            setShakeScreen(true);
            setTimeout(() => setShakeScreen(false), 300);
          }
          break;
        case "end":
          setS1(msg.c[0]); setS2(msg.c[1]);
          setWinner(msg.winner);
          audioRef.current?.winGame();
          window.gtag?.("event", "game_end", { game_name: "ships", score: 0 });
          setTimeout(() => setScreen("gameover"), 400);
          break;
        case "maze":
          setMaze(msg.maze);
          gameRef.current.maze = msg.maze;
          break;
        case "restart_req": setRemoteReq(true); break;
        case "left": setDisconnected(true); break;
        case "error": setLobbyStatus("error"); setTimeout(() => { setScreen("menu"); setLobbyStatus(null); }, 2000); break;
      }
    };
    ws.onerror = () => { setLobbyStatus("error"); setTimeout(() => { setScreen("menu"); setLobbyStatus(null); }, 2000); };
  }, []);

  const startMode = useCallback(async (sel, joinCode) => {
    setMode(sel);
    await initAudio();
    if (sel === "remote-host") { setScreen("lobby"); setLobbyStatus("creating"); connectWS("create"); }
    else if (sel === "remote-join") { setScreen("lobby"); setLobbyStatus("joining"); connectWS("join", joinCode); }
    else { resetGame(); setScreen("playing"); window.gtag?.("event", "game_start", { game_name: "ships" }); }
  }, [initAudio, resetGame, connectWS]);

  const handleSelectMode = useCallback(async (sel, joinCode) => {
    if (!user) {
      pendingModeRef.current = { sel, joinCode };
      setScreen("register");
      return;
    }
    startMode(sel, joinCode);
  }, [user, startMode]);

  const handleRegister = useCallback(async (userData) => {
    const jogador = await register(userData);
    if (jogador && pendingModeRef.current) {
      const { sel, joinCode } = pendingModeRef.current;
      pendingModeRef.current = null;
      startMode(sel, joinCode);
    }
  }, [register, startMode]);

  const handleRestart = useCallback(() => {
    if (mode?.startsWith("remote")) {
      const ws = wsRef.current;
      if (ws?.readyState === 1) ws.send(JSON.stringify({ t: "restart" }));
    } else { resetGame(); setScreen("playing"); window.gtag?.("event", "game_start", { game_name: "ships" }); }
  }, [mode, resetGame]);

  const handleMenu = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    clearInterval(loopRef.current);
    setScreen("menu"); setMode(null); setLobbyStatus(null); setDisconnected(false); setRemoteReq(false);
  }, []);

  useEffect(() => () => { audioRef.current?.stop(); clearInterval(loopRef.current); wsRef.current?.close(); }, []);

  // ---- Auto-join from URL param (?sala=XXXX) ----
  const autoJoinRef = useRef(false);
  useEffect(() => {
    if (!checkedCookie || autoJoinRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const sala = params.get("sala");
    if (sala) {
      autoJoinRef.current = true;
      window.history.replaceState({}, "", window.location.pathname);
      handleSelectMode("remote-join", sala);
    }
  }, [checkedCookie, handleSelectMode]);

  const gameScale = useGameScale(CANVAS_W);

  const p1Label = mode?.startsWith("remote") && playerNum === 1 ? "VOCE" : mode?.startsWith("remote") ? "RIVAL" : "P1";
  const p2Label = mode?.startsWith("remote") && playerNum === 2 ? "VOCE" : mode?.startsWith("remote") ? "RIVAL" : mode?.startsWith("cpu") ? "CPU" : "P2";

  return (
    <div style={{ minHeight: "100vh", background: "#050510", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Fira Code', monospace", overflow: "hidden", padding: 12 }}>
      <style>{`
        @keyframes explodePart { 0% { opacity:1; transform:translate(0,0) scale(1); } 100% { opacity:0; transform:translate(var(--ex),var(--ey)) scale(0); } }
        @keyframes screenShake { 0%,100%{transform:translate(0,0)} 25%{transform:translate(-4px,3px)} 50%{transform:translate(3px,-4px)} 75%{transform:translate(-3px,2px)} }
        @keyframes shipBlink { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>

      {/* Top ad - hidden during active play */}
      {screen !== "playing" && (
        <AdBanner slot="ships_top" style={{ marginBottom: 12, maxWidth: CANVAS_W }} />
      )}

      {screen !== "menu" && screen !== "lobby" && <>
        <h1 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22, color: "#39ff14", textShadow: "0 0 20px #39ff14", marginBottom: 2, letterSpacing: 3 }}>SHIPS</h1>
        <p style={{ color: "#4a5568", fontSize: 10, marginBottom: 4, fontFamily: "'Press Start 2P', monospace" }}>
          {mode?.startsWith("cpu") ? `VS CPU (${mode.replace("cpu-", "").toUpperCase()})` : mode === "local" ? "LOCAL - 2 JOGADORES" : mode?.startsWith("remote") ? `ONLINE - ${sessionId}` : ""}
        </p>
      </>}

      <div style={{ width: CANVAS_W * gameScale, height: CANVAS_H * gameScale }}>
      <div style={{
        width: CANVAS_W, height: CANVAS_H, position: "relative",
        background: "#080818", border: "2px solid rgba(57,255,20,0.2)",
        borderRadius: 12, overflow: "hidden", userSelect: "none",
        animation: shakeScreen ? "screenShake 0.3s ease-in-out" : "none",
        transform: `scale(${gameScale})`, transformOrigin: "top left",
      }}>
        {/* Maze */}
        {mazeElements}

        {screen === "playing" && <>
          {/* Score overlay */}
          <div style={{ position: "absolute", top: 8, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30, pointerEvents: "none", zIndex: 80 }}>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: rgbaStr(P1_COLOR, 0.6) }}>{p1Label} {s1}</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10, color: "#333", alignSelf: "center" }}>x</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: rgbaStr(P2_COLOR, 0.6) }}>{s2} {p2Label}</span>
          </div>

          {/* Ship 1 */}
          {ship1.alive && (
            <div style={{
              position: "absolute",
              left: ship1.x - SHIP_SIZE / 2, top: ship1.y - SHIP_SIZE / 2,
              width: SHIP_SIZE, height: SHIP_SIZE,
              transform: `rotate(${ship1.a * 180 / Math.PI}deg)`,
              filter: `drop-shadow(0 0 6px ${rgbaStr(P1_COLOR, 0.6)})`,
              pointerEvents: "none", zIndex: 60,
              animation: roundState === "respawning" ? "shipBlink 0.3s infinite" : "none",
            }}>
              <ShipSVG color={P1_COLOR} size={SHIP_SIZE} />
            </div>
          )}

          {/* Ship 2 */}
          {ship2.alive && (
            <div style={{
              position: "absolute",
              left: ship2.x - SHIP_SIZE / 2, top: ship2.y - SHIP_SIZE / 2,
              width: SHIP_SIZE, height: SHIP_SIZE,
              transform: `rotate(${ship2.a * 180 / Math.PI}deg)`,
              filter: `drop-shadow(0 0 6px ${rgbaStr(P2_COLOR, 0.6)})`,
              pointerEvents: "none", zIndex: 60,
              animation: roundState === "respawning" ? "shipBlink 0.3s infinite" : "none",
            }}>
              <ShipSVG color={P2_COLOR} size={SHIP_SIZE} />
            </div>
          )}

          {/* Bullet 1 */}
          {bullet1 && (
            <div style={{
              position: "absolute", left: bullet1.x - BULLET_R, top: bullet1.y - BULLET_R,
              width: BULLET_R * 2, height: BULLET_R * 2, borderRadius: "50%",
              background: rgbStr(P1_COLOR),
              boxShadow: `0 0 6px ${rgbStr(P1_COLOR)}, 0 0 12px ${rgbaStr(P1_COLOR, 0.4)}`,
              pointerEvents: "none", zIndex: 55,
            }} />
          )}

          {/* Bullet 2 */}
          {bullet2 && (
            <div style={{
              position: "absolute", left: bullet2.x - BULLET_R, top: bullet2.y - BULLET_R,
              width: BULLET_R * 2, height: BULLET_R * 2, borderRadius: "50%",
              background: rgbStr(P2_COLOR),
              boxShadow: `0 0 6px ${rgbStr(P2_COLOR)}, 0 0 12px ${rgbaStr(P2_COLOR, 0.4)}`,
              pointerEvents: "none", zIndex: 55,
            }} />
          )}

          {/* Explosions */}
          {explosions.map(exp => exp.parts.map((p, i) => (
            <div key={`${exp.id}-${i}`} style={{
              position: "absolute", left: exp.x, top: exp.y,
              width: p.size, height: p.size, borderRadius: "50%",
              background: exp.color, boxShadow: `0 0 6px ${exp.color}`,
              pointerEvents: "none", zIndex: 100,
              animation: "explodePart 0.8s ease-out forwards",
              "--ex": `${Math.cos(p.angle) * p.speed}px`,
              "--ey": `${Math.sin(p.angle) * p.speed}px`,
            }} />
          )))}

          {/* Disconnected */}
          {disconnected && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
              <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 12, color: "#ff2d95", marginBottom: 16 }}>OPONENTE DESCONECTOU</p>
              <button onClick={handleMenu} style={{ padding: "10px 24px", background: "transparent", border: "1px solid #555", borderRadius: 6, color: "#888", fontFamily: "'Press Start 2P', monospace", fontSize: 10, cursor: "pointer" }}>MENU</button>
            </div>
          )}
        </>}

        {screen === "menu" && <ShipsMenu onSelect={handleSelectMode} />}
        {screen === "register" && <RegisterModal onRegister={handleRegister} loading={registering} jogoNome="SHIPS" accentColor="#39ff14" />}
        {screen === "lobby" && <ShipsLobby sessionId={sessionId} status={lobbyStatus} onCancel={handleMenu} />}
        {screen === "gameover" && <ShipsGameOver s1={s1} s2={s2} winner={winner} playerNum={playerNum} mode={mode} onRestart={handleRestart} onMenu={handleMenu} remoteReq={remoteReq} />}
      </div>
      </div>

      {screen === "playing" && !isMobile && (
        <div style={{ width: CANVAS_W, display: "flex", justifyContent: "space-between", marginTop: 10, padding: "0 4px" }}>
          <span style={{ color: rgbaStr(P1_COLOR, 0.4), fontSize: 9, fontFamily: "'Fira Code', monospace" }}>
            {mode?.startsWith("remote") ? "WASD ou ←→↑↓ + Space/Enter" : "P1: WASD + Space"}
          </span>
          {mode === "local" && <span style={{ color: rgbaStr(P2_COLOR, 0.4), fontSize: 9, fontFamily: "'Fira Code', monospace" }}>P2: Setas + Enter</span>}
        </div>
      )}
      {screen === "playing" && (
        <ShipsMobileControls keysRef={keysRef} mode={mode} playerNum={playerNum} />
      )}
      <AdBanner slot="ships_bottom" style={{ marginTop: 16, maxWidth: CANVAS_W }} />
    </div>
  );
}
