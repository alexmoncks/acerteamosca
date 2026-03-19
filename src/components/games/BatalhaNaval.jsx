"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";
import useLockScroll from "@/hooks/useLockScroll";

const WS_URL = process.env.NEXT_PUBLIC_WS_BATALHA_URL || "ws://localhost:3006";

// ============================================================
// CONSTANTS
// ============================================================
const GRID_SIZE = 10;
const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const GAME_W = 400;

const FLEET = [
  { id: "carrier", name: "Porta-avioes", size: 5, count: 1, color: "#6366f1" },
  { id: "battleship", name: "Navio de Guerra", size: 4, count: 1, color: "#8b5cf6" },
  { id: "cruiser", name: "Cruzador", size: 3, count: 2, color: "#06b6d4" },
  { id: "submarine", name: "Submarino", size: 2, count: 3, color: "#22c55e" },
];

const TOTAL_SHIP_CELLS = 24; // 5 + 4 + 3*2 + 2*3
const TOTAL_SHIPS = 7;

// Cell states
const CELL_EMPTY = 0;
const CELL_SHIP = 1;
const CELL_MISS = 2;
const CELL_HIT = 3;
const CELL_SUNK = 4;

const ACCENT = "#3b82f6";
const ONLINE_ACCENT = "#b026ff";
const NEON_GREEN = "#39ff14";

// ============================================================
// AUDIO ENGINE (Web Audio API)
// ============================================================
function createAudioEngine() {
  let ctx = null;
  let volume = 0.3;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function createGain(c, v) {
    const g = c.createGain();
    g.gain.value = v * volume;
    g.connect(c.destination);
    return g;
  }

  function shoot() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const g = createGain(c, 0.15);
      osc.type = "square";
      osc.frequency.value = 400;
      osc.connect(g);
      osc.start(c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.03);
      osc.stop(c.currentTime + 0.04);
    } catch {}
  }

  function splash() {
    try {
      const c = getCtx();
      const bufferSize = c.sampleRate * 0.4;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      const src = c.createBufferSource();
      src.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, c.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.4);
      const g = createGain(c, 0.15);
      src.connect(filter);
      filter.connect(g);
      src.start(c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
      src.stop(c.currentTime + 0.45);
    } catch {}
  }

  function hit() {
    try {
      const c = getCtx();
      // noise burst
      const bufSize = c.sampleRate * 0.3;
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      const src = c.createBufferSource();
      src.buffer = buf;
      const g1 = createGain(c, 0.2);
      src.connect(g1);
      src.start(c.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      src.stop(c.currentTime + 0.35);
      // square tone
      const osc = c.createOscillator();
      const g2 = createGain(c, 0.12);
      osc.type = "square";
      osc.frequency.value = 200;
      osc.connect(g2);
      osc.start(c.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      osc.stop(c.currentTime + 0.35);
    } catch {}
  }

  function sunk() {
    try {
      const c = getCtx();
      // long explosion
      const bufSize = c.sampleRate * 0.6;
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 0.5);
      const src = c.createBufferSource();
      src.buffer = buf;
      const g1 = createGain(c, 0.25);
      src.connect(g1);
      src.start(c.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
      src.stop(c.currentTime + 0.65);
      // sine rumble
      const osc = c.createOscillator();
      const g2 = createGain(c, 0.15);
      osc.type = "sine";
      osc.frequency.value = 50;
      osc.connect(g2);
      osc.start(c.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.6);
      osc.stop(c.currentTime + 0.65);
    } catch {}
  }

  function sonarPing() {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const g = createGain(c, 0.1);
      osc.type = "sine";
      osc.frequency.value = 1200;
      osc.connect(g);
      osc.start(c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
      osc.stop(c.currentTime + 0.25);
    } catch {}
  }

  function victory() {
    try {
      const c = getCtx();
      const notes = [261.63, 329.63, 392.0, 523.25]; // C4 E4 G4 C5
      notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const g = createGain(c, 0.12);
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(g);
        const t = c.currentTime + i * 0.15;
        osc.start(t);
        const dur = i === 3 ? 0.5 : 0.12;
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.stop(t + dur + 0.05);
      });
    } catch {}
  }

  function defeat() {
    try {
      const c = getCtx();
      const notes = [392.0, 349.23, 311.13, 293.66]; // G3 F3 Eb3 D3
      notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const g = createGain(c, 0.12);
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(g);
        const t = c.currentTime + i * 0.2;
        osc.start(t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.stop(t + 0.25);
      });
    } catch {}
  }

  function setVolume(v) { volume = v; }

  return { shoot, splash, hit, sunk, sonarPing, victory, defeat, setVolume };
}

// ============================================================
// GRID HELPER FUNCTIONS
// ============================================================
function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(CELL_EMPTY));
}

function createTrackingGrid() {
  // For tracking attacks on opponent: null = unexplored, 'miss', 'hit', 'sunk'
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

function cellLabel(r, c) {
  return `${ROWS[r]}${COLS[c]}`;
}

// Get cells occupied by a ship placement
function getShipCells(row, col, size, horizontal) {
  const cells = [];
  for (let i = 0; i < size; i++) {
    const r = horizontal ? row : row + i;
    const c = horizontal ? col + i : col;
    cells.push({ r, c });
  }
  return cells;
}

// Check if placement is valid
function isValidPlacement(grid, ships, row, col, size, horizontal, excludeShipId = null) {
  const cells = getShipCells(row, col, size, horizontal);
  // Check bounds
  for (const { r, c } of cells) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
  }
  // Check overlap with existing ships
  for (const ship of ships) {
    if (excludeShipId && ship.id === excludeShipId) continue;
    for (const sc of ship.cells) {
      for (const nc of cells) {
        if (sc.r === nc.r && sc.c === nc.c) return false;
      }
    }
  }
  return true;
}

// Random ship placement for AI
function placeShipsRandomly() {
  const ships = [];
  const allShipDefs = [];
  for (const def of FLEET) {
    for (let i = 0; i < def.count; i++) {
      allShipDefs.push({ ...def, instanceId: `${def.id}_${i}` });
    }
  }

  for (const def of allShipDefs) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      attempts++;
      const horizontal = Math.random() < 0.5;
      const row = Math.floor(Math.random() * GRID_SIZE);
      const col = Math.floor(Math.random() * GRID_SIZE);
      if (isValidPlacement(null, ships, row, col, def.size, horizontal)) {
        const cells = getShipCells(row, col, def.size, horizontal);
        ships.push({
          id: def.instanceId,
          defId: def.id,
          name: def.name,
          size: def.size,
          color: def.color,
          cells,
          horizontal,
          hits: new Set(),
          sunk: false,
        });
        placed = true;
      }
    }
  }
  return ships;
}

// Build grid from ships
function buildGridFromShips(ships) {
  const grid = createEmptyGrid();
  for (const ship of ships) {
    for (const { r, c } of ship.cells) {
      grid[r][c] = CELL_SHIP;
    }
  }
  return grid;
}

// Find which ship is at a cell
function findShipAt(ships, row, col) {
  return ships.find(s => s.cells.some(c => c.r === row && c.c === col));
}

// Check if all ships are sunk
function allShipsSunk(ships) {
  return ships.every(s => s.sunk);
}

// Count remaining ships
function countRemainingShips(ships) {
  return ships.filter(s => !s.sunk).length;
}

// ============================================================
// AI LOGIC
// ============================================================
function createAI(difficulty) {
  // Hunt/Target state
  let mode = "hunt"; // "hunt" or "target"
  let targetQueue = []; // cells to try in target mode
  let hitStack = []; // consecutive hits for direction tracking
  let lastDirection = null;

  // For hard mode: probability density map
  function calcProbabilityMap(trackingGrid, remainingShips) {
    const prob = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
    const sizes = [];
    for (const ship of remainingShips) {
      if (!ship.sunk) sizes.push(ship.size);
    }

    for (const size of sizes) {
      // Horizontal
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c <= GRID_SIZE - size; c++) {
          let valid = true;
          let hasHit = false;
          for (let i = 0; i < size; i++) {
            const cell = trackingGrid[r][c + i];
            if (cell === "miss" || cell === "sunk") { valid = false; break; }
            if (cell === "hit") hasHit = true;
          }
          if (valid) {
            const weight = hasHit ? 20 : 1;
            for (let i = 0; i < size; i++) {
              if (trackingGrid[r][c + i] === null) {
                prob[r][c + i] += weight;
              }
            }
          }
        }
      }
      // Vertical
      for (let r = 0; r <= GRID_SIZE - size; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          let valid = true;
          let hasHit = false;
          for (let i = 0; i < size; i++) {
            const cell = trackingGrid[r + i][c];
            if (cell === "miss" || cell === "sunk") { valid = false; break; }
            if (cell === "hit") hasHit = true;
          }
          if (valid) {
            const weight = hasHit ? 20 : 1;
            for (let i = 0; i < size; i++) {
              if (trackingGrid[r + i][c] === null) {
                prob[r + i][c] += weight;
              }
            }
          }
        }
      }
    }
    return prob;
  }

  function getCheckerboardCells(trackingGrid) {
    const cells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if ((r + c) % 2 === 0 && trackingGrid[r][c] === null) {
          cells.push({ r, c });
        }
      }
    }
    // If checkerboard is exhausted, use remaining cells
    if (cells.length === 0) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (trackingGrid[r][c] === null) cells.push({ r, c });
        }
      }
    }
    return cells;
  }

  function getAdjacentCells(r, c, trackingGrid) {
    const dirs = [
      { r: r - 1, c }, { r: r + 1, c },
      { r, c: c - 1 }, { r, c: c + 1 },
    ];
    return dirs.filter(d =>
      d.r >= 0 && d.r < GRID_SIZE && d.c >= 0 && d.c < GRID_SIZE &&
      trackingGrid[d.r][d.c] === null
    );
  }

  function chooseMove(trackingGrid, opponentShips) {
    if (difficulty === "easy") {
      // Pure random
      const avail = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (trackingGrid[r][c] === null) avail.push({ r, c });
        }
      }
      return avail[Math.floor(Math.random() * avail.length)];
    }

    if (difficulty === "medium") {
      // Clean target queue of already-explored cells
      targetQueue = targetQueue.filter(t => trackingGrid[t.r][t.c] === null);

      if (mode === "target" && targetQueue.length > 0) {
        return targetQueue.shift();
      }

      // Fall back to hunt mode
      mode = "hunt";
      targetQueue = [];
      hitStack = [];
      lastDirection = null;

      const cells = getCheckerboardCells(trackingGrid);
      return cells[Math.floor(Math.random() * cells.length)];
    }

    // Hard mode (Almirante)
    targetQueue = targetQueue.filter(t => trackingGrid[t.r][t.c] === null);

    if (mode === "target" && targetQueue.length > 0) {
      // Use probability to choose best from target queue
      const prob = calcProbabilityMap(trackingGrid, opponentShips);
      targetQueue.sort((a, b) => prob[b.r][b.c] - prob[a.r][a.c]);
      return targetQueue.shift();
    }

    // Hunt with probability density
    mode = "hunt";
    targetQueue = [];
    hitStack = [];
    lastDirection = null;

    const prob = calcProbabilityMap(trackingGrid, opponentShips);
    let maxProb = 0;
    let best = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (trackingGrid[r][c] === null) {
          if (prob[r][c] > maxProb) {
            maxProb = prob[r][c];
            best = [{ r, c }];
          } else if (prob[r][c] === maxProb) {
            best.push({ r, c });
          }
        }
      }
    }
    return best[Math.floor(Math.random() * best.length)];
  }

  function reportHit(r, c, trackingGrid, wasSunk) {
    if (wasSunk) {
      // Ship sunk — return to hunt mode
      mode = "hunt";
      targetQueue = [];
      hitStack = [];
      lastDirection = null;
      return;
    }

    mode = "target";
    hitStack.push({ r, c });

    if (hitStack.length === 1) {
      // First hit — add all adjacent cells
      targetQueue = getAdjacentCells(r, c, trackingGrid);
    } else {
      // Multiple hits — determine direction and continue
      const prev = hitStack[hitStack.length - 2];
      const dr = r - prev.r;
      const dc = c - prev.c;
      lastDirection = { dr, dc };

      // Continue in same direction
      const nextR = r + dr;
      const nextC = c + dc;
      if (nextR >= 0 && nextR < GRID_SIZE && nextC >= 0 && nextC < GRID_SIZE &&
          trackingGrid[nextR][nextC] === null) {
        targetQueue.unshift({ r: nextR, c: nextC });
      } else {
        // Try opposite direction from first hit
        const first = hitStack[0];
        const oppR = first.r - dr;
        const oppC = first.c - dc;
        if (oppR >= 0 && oppR < GRID_SIZE && oppC >= 0 && oppC < GRID_SIZE &&
            trackingGrid[oppR][oppC] === null) {
          targetQueue.unshift({ r: oppR, c: oppC });
        }
      }
    }
  }

  function reportMiss(r, c, trackingGrid) {
    if (mode === "target" && lastDirection && hitStack.length > 0) {
      // Miss in current direction — try opposite from first hit
      const first = hitStack[0];
      const oppR = first.r - lastDirection.dr;
      const oppC = first.c - lastDirection.dc;
      if (oppR >= 0 && oppR < GRID_SIZE && oppC >= 0 && oppC < GRID_SIZE &&
          trackingGrid[oppR][oppC] === null) {
        targetQueue.unshift({ r: oppR, c: oppC });
      }
      lastDirection = null;
    }
  }

  function reset() {
    mode = "hunt";
    targetQueue = [];
    hitStack = [];
    lastDirection = null;
  }

  return { chooseMove, reportHit, reportMiss, reset };
}

// ============================================================
// CSS ANIMATIONS (injected via style tag)
// ============================================================
const STYLE_ID = "batalha-naval-styles";

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes bn-fire {
      0% { box-shadow: inset 0 0 8px #ff4500, 0 0 4px #ff4500; }
      50% { box-shadow: inset 0 0 14px #ff6600, 0 0 8px #ff4500; }
      100% { box-shadow: inset 0 0 8px #ff4500, 0 0 4px #ff4500; }
    }
    @keyframes bn-splash {
      0% { transform: scale(0); opacity: 1; }
      50% { transform: scale(1.5); opacity: 0.7; }
      100% { transform: scale(2); opacity: 0; }
    }
    @keyframes bn-explode {
      0% { transform: scale(0); opacity: 1; background: #ff6600; }
      40% { transform: scale(1.8); opacity: 0.8; background: #ff4500; }
      100% { transform: scale(2.5); opacity: 0; background: #ff0000; }
    }
    @keyframes bn-sunkFlash {
      0% { opacity: 1; }
      25% { opacity: 0.4; }
      50% { opacity: 1; }
      75% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    @keyframes bn-floatUp {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-40px); opacity: 0; }
    }
    @keyframes bn-shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
      20%, 40%, 60%, 80% { transform: translateX(3px); }
    }
    @keyframes bn-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    @keyframes bn-thinking {
      0% { content: "."; }
      33% { content: ".."; }
      66% { content: "..."; }
    }
    @keyframes bn-thinkingDots {
      0%, 20% { opacity: 0; }
      40%, 100% { opacity: 1; }
    }
    @keyframes bn-confetti {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(200px) rotate(720deg); opacity: 0; }
    }
    @keyframes bn-dropBomb {
      0% { transform: translateY(-30px) scale(0.5); opacity: 0.8; }
      70% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: 0; }
    }
    @keyframes bn-fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes bn-shipGlow {
      0%, 100% { box-shadow: inset 0 0 4px rgba(255,255,255,0.1); }
      50% { box-shadow: inset 0 0 8px rgba(255,255,255,0.2); }
    }
  `;
  document.head.appendChild(style);
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ----------- Menu Screen -----------
function MenuScreen({ onStart, onOnline, difficulty, setDifficulty }) {
  const difficulties = [
    { key: "easy", label: "Marinheiro", icon: "⚓", desc: "Ataques aleatorios", color: "#22c55e" },
    { key: "medium", label: "Capitao", icon: "🎖️", desc: "IA com estrategia", color: "#eab308" },
    { key: "hard", label: "Almirante", icon: "⭐", desc: "IA calculista", color: "#ef4444" },
  ];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "30px 16px", animation: "bn-fadeIn 0.4s ease",
    }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>⚓</div>
      <h1 style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 20,
        color: ACCENT, textShadow: `0 0 20px ${ACCENT}80`,
        marginBottom: 6, textAlign: "center",
      }}>BATALHA NAVAL</h1>
      <p style={{
        fontFamily: "'Fira Code', monospace", fontSize: 11,
        color: "#64748b", marginBottom: 32,
      }}>Posicione seus navios e afunde a frota inimiga!</p>

      <button
        onClick={onStart}
        style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 12,
          padding: "14px 32px", background: "#16a34a", color: "#fff",
          border: "2px solid #22c55e", borderRadius: 8, cursor: "pointer",
          textShadow: "0 0 10px #22c55e80", marginBottom: 12,
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.target.style.background = "#15803d"; e.target.style.transform = "scale(1.05)"; }}
        onMouseLeave={e => { e.target.style.background = "#16a34a"; e.target.style.transform = "scale(1)"; }}
      >VS COMPUTADOR</button>

      <button
        onClick={onOnline}
        style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 10,
          padding: "10px 24px",
          background: `linear-gradient(135deg, ${ONLINE_ACCENT}, #5b21b6)`,
          color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
          marginBottom: 32,
          boxShadow: `0 0 20px ${ONLINE_ACCENT}40`,
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.target.style.transform = "scale(1.05)"; }}
        onMouseLeave={e => { e.target.style.transform = "scale(1)"; }}
      >VS ONLINE</button>

      <p style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 9,
        color: "#94a3b8", marginBottom: 12,
      }}>DIFICULDADE</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {difficulties.map(d => (
          <button
            key={d.key}
            onClick={() => setDifficulty(d.key)}
            style={{
              fontFamily: "'Fira Code', monospace", fontSize: 10,
              padding: "10px 12px", minWidth: 100,
              background: difficulty === d.key ? `${d.color}20` : "#0f172a",
              color: difficulty === d.key ? d.color : "#64748b",
              border: `2px solid ${difficulty === d.key ? d.color : "#1e293b"}`,
              borderRadius: 8, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 20 }}>{d.icon}</span>
            <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 8 }}>{d.label}</span>
            <span style={{ fontSize: 9, color: "#64748b" }}>{d.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ----------- Ship Placement Grid -----------
function PlacementGrid({
  grid, playerShips, selectedShip, horizontal, hoverCell,
  onCellClick, onCellHover, onCellLeave, cellSize,
}) {
  // Compute preview cells
  const previewCells = useMemo(() => {
    if (!selectedShip || !hoverCell) return { valid: [], invalid: false };
    const cells = getShipCells(hoverCell.r, hoverCell.c, selectedShip.size, horizontal);
    const outOfBounds = cells.some(c => c.r < 0 || c.r >= GRID_SIZE || c.c < 0 || c.c >= GRID_SIZE);
    if (outOfBounds) return { valid: cells, invalid: true };
    const overlap = cells.some(nc =>
      playerShips.some(s => s.cells.some(sc => sc.r === nc.r && sc.c === nc.c))
    );
    return { valid: cells, invalid: overlap };
  }, [selectedShip, hoverCell, horizontal, playerShips]);

  function getCellStyle(r, c) {
    const base = {
      width: cellSize, height: cellSize,
      border: "1px solid #1a2332",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", transition: "background 0.15s",
      position: "relative",
      fontSize: Math.max(8, cellSize * 0.35),
    };

    // Check if cell is part of a placed ship
    const ship = findShipAt(playerShips, r, c);
    if (ship) {
      return {
        ...base,
        background: ship.color,
        boxShadow: `inset 0 0 6px rgba(255,255,255,0.2)`,
        animation: "bn-shipGlow 2s infinite",
      };
    }

    // Check preview
    if (previewCells.valid.some(pc => pc.r === r && pc.c === c)) {
      return {
        ...base,
        background: previewCells.invalid ? "#7f1d1d" : "#1e40af",
        border: previewCells.invalid ? "1px solid #ef4444" : "1px solid #3b82f6",
      };
    }

    return { ...base, background: "#1e293b" };
  }

  return (
    <div>
      {/* Column headers */}
      <div style={{ display: "flex", marginLeft: cellSize }}>
        {COLS.map(c => (
          <div key={c} style={{
            width: cellSize, textAlign: "center",
            fontFamily: "'Fira Code', monospace", fontSize: Math.max(7, cellSize * 0.3),
            color: "#64748b", paddingBottom: 2,
          }}>{c}</div>
        ))}
      </div>
      {/* Grid */}
      <div style={{ display: "flex" }}>
        {/* Row headers */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ROWS.map((label, r) => (
            <div key={r} style={{
              width: cellSize, height: cellSize,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Fira Code', monospace", fontSize: Math.max(7, cellSize * 0.3),
              color: "#64748b",
            }}>{label}</div>
          ))}
        </div>
        {/* Cells */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          border: "2px solid #334155",
          borderRadius: 4,
          overflow: "hidden",
        }}>
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
            const r = Math.floor(idx / GRID_SIZE);
            const c = idx % GRID_SIZE;
            return (
              <div
                key={idx}
                style={getCellStyle(r, c)}
                onClick={() => onCellClick(r, c)}
                onMouseEnter={() => onCellHover(r, c)}
                onMouseLeave={onCellLeave}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------- Battle Grid (Opponent) -----------
function BattleGridOpponent({
  trackingGrid, sunkShips, onCellClick, onCellHover, onCellLeave,
  hoverCell, cellSize, disabled, animatingCell, lastSunkShip,
}) {
  function getCellStyle(r, c) {
    const state = trackingGrid[r][c];
    const base = {
      width: cellSize, height: cellSize,
      border: "1px solid #1a2332",
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
      fontSize: Math.max(8, cellSize * 0.4),
      fontWeight: "bold",
      transition: "background 0.15s",
    };

    // Animating cell
    if (animatingCell && animatingCell.r === r && animatingCell.c === c) {
      return {
        ...base,
        background: "#fff",
        animation: animatingCell.type === "hit" ? "bn-explode 0.4s ease" : "bn-splash 0.4s ease",
      };
    }

    // Sunk
    if (state === "sunk") {
      const sunkShip = sunkShips.find(s => s.cells.some(sc => sc.r === r && sc.c === c));
      return {
        ...base,
        background: "#7f1d1d",
        color: sunkShip ? sunkShip.color : "#ef4444",
        border: "1px solid #991b1b",
      };
    }

    // Hit
    if (state === "hit") {
      return {
        ...base,
        background: "#991b1b",
        color: "#ff4444",
        animation: "bn-fire 1.5s infinite",
      };
    }

    // Miss
    if (state === "miss") {
      return {
        ...base,
        background: "#0c4a6e",
        color: "#38bdf8",
      };
    }

    // Unexplored
    const isHover = hoverCell && hoverCell.r === r && hoverCell.c === c && !disabled;
    return {
      ...base,
      background: isHover ? "#1e3a5f" : "#1e293b",
      border: isHover ? "1px solid #4ade80" : "1px solid #1a2332",
      cursor: disabled ? "default" : "pointer",
    };
  }

  function getCellContent(r, c) {
    const state = trackingGrid[r][c];
    if (state === "sunk") return "\u2620"; // skull
    if (state === "hit") return "\u2715"; // X
    if (state === "miss") return "\u2022"; // dot
    return null;
  }

  return (
    <div>
      {/* Column headers */}
      <div style={{ display: "flex", marginLeft: cellSize }}>
        {COLS.map(c => (
          <div key={c} style={{
            width: cellSize, textAlign: "center",
            fontFamily: "'Fira Code', monospace", fontSize: Math.max(7, cellSize * 0.28),
            color: "#64748b", paddingBottom: 2,
          }}>{c}</div>
        ))}
      </div>
      <div style={{ display: "flex" }}>
        {/* Row headers */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ROWS.map((label, r) => (
            <div key={r} style={{
              width: cellSize, height: cellSize,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Fira Code', monospace", fontSize: Math.max(7, cellSize * 0.28),
              color: "#64748b",
            }}>{label}</div>
          ))}
        </div>
        {/* Cells */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          border: "2px solid #334155",
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
        }}>
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
            const r = Math.floor(idx / GRID_SIZE);
            const c = idx % GRID_SIZE;
            return (
              <div
                key={idx}
                style={getCellStyle(r, c)}
                onClick={() => !disabled && trackingGrid[r][c] === null && onCellClick(r, c)}
                onMouseEnter={() => onCellHover(r, c)}
                onMouseLeave={onCellLeave}
              >
                {getCellContent(r, c)}
              </div>
            );
          })}
          {/* AFUNDOU floating text */}
          {lastSunkShip && (
            <div style={{
              position: "absolute", top: "40%", left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "'Press Start 2P', monospace", fontSize: 14,
              color: "#ff4444", textShadow: "0 0 10px #ff0000",
              animation: "bn-floatUp 1.5s ease forwards",
              pointerEvents: "none", whiteSpace: "nowrap", zIndex: 10,
            }}>AFUNDOU!</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------- Battle Grid (Player's own - mini) -----------
function BattleGridPlayer({ playerShips, incomingAttacks, cellSize }) {
  function getCellStyle(r, c) {
    const base = {
      width: cellSize, height: cellSize,
      border: "1px solid #0f1520",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.max(6, cellSize * 0.4),
      fontWeight: "bold",
    };

    const attack = incomingAttacks.find(a => a.r === r && a.c === c);
    const ship = findShipAt(playerShips, r, c);

    if (ship && ship.sunk) {
      return { ...base, background: "#450a0a", color: "#666" };
    }
    if (attack && attack.result === "hit") {
      return { ...base, background: "#991b1b", color: "#ff4444" };
    }
    if (attack && attack.result === "miss") {
      return { ...base, background: "#0c4a6e", color: "#38bdf8" };
    }
    if (ship) {
      return {
        ...base,
        background: ship.color,
        opacity: 0.8,
      };
    }
    return { ...base, background: "#0f172a" };
  }

  function getCellContent(r, c) {
    const attack = incomingAttacks.find(a => a.r === r && a.c === c);
    if (!attack) return null;
    if (attack.result === "hit") return "\u2715";
    if (attack.result === "miss") return "\u2022";
    return null;
  }

  return (
    <div>
      <div style={{ display: "flex", marginLeft: cellSize }}>
        {COLS.map(c => (
          <div key={c} style={{
            width: cellSize, textAlign: "center",
            fontFamily: "'Fira Code', monospace", fontSize: Math.max(5, cellSize * 0.28),
            color: "#475569", paddingBottom: 1,
          }}>{c}</div>
        ))}
      </div>
      <div style={{ display: "flex" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ROWS.map((label, r) => (
            <div key={r} style={{
              width: cellSize, height: cellSize,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Fira Code', monospace", fontSize: Math.max(5, cellSize * 0.28),
              color: "#475569",
            }}>{label}</div>
          ))}
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          border: "1px solid #1e293b",
          borderRadius: 3,
          overflow: "hidden",
        }}>
          {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
            const r = Math.floor(idx / GRID_SIZE);
            const c = idx % GRID_SIZE;
            return (
              <div key={idx} style={getCellStyle(r, c)}>
                {getCellContent(r, c)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ----------- Setup Screen -----------
function SetupScreen({
  playerShips, selectedShipDef, horizontal, onSelectShipDef,
  onToggleRotation, onCellClick, onCellHover, onCellLeave,
  onRandom, onClear, onReady, hoverCell, cellSize,
}) {
  const placedCounts = useMemo(() => {
    const counts = {};
    for (const def of FLEET) counts[def.id] = 0;
    for (const ship of playerShips) counts[ship.defId] = (counts[ship.defId] || 0) + 1;
    return counts;
  }, [playerShips]);

  const allPlaced = playerShips.length === TOTAL_SHIPS;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      animation: "bn-fadeIn 0.4s ease",
    }}>
      <p style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 11,
        color: ACCENT, marginBottom: 12, textAlign: "center",
      }}>POSICIONE SEUS NAVIOS</p>

      <PlacementGrid
        grid={null}
        playerShips={playerShips}
        selectedShip={selectedShipDef}
        horizontal={horizontal}
        hoverCell={hoverCell}
        onCellClick={onCellClick}
        onCellHover={onCellHover}
        onCellLeave={onCellLeave}
        cellSize={cellSize}
      />

      {/* Ship selector */}
      <div style={{
        marginTop: 12, width: "100%", maxWidth: cellSize * GRID_SIZE + cellSize,
      }}>
        {FLEET.map(def => {
          const remaining = def.count - (placedCounts[def.id] || 0);
          const isSelected = selectedShipDef && selectedShipDef.id === def.id;
          const canPlace = remaining > 0;
          return (
            <button
              key={def.id}
              onClick={() => canPlace && onSelectShipDef(def)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", padding: "6px 10px", marginBottom: 4,
                background: isSelected ? `${def.color}25` : "#0f172a",
                border: `1px solid ${isSelected ? def.color : "#1e293b"}`,
                borderRadius: 6, cursor: canPlace ? "pointer" : "default",
                opacity: canPlace ? 1 : 0.4,
                transition: "all 0.15s",
              }}
            >
              {/* Ship blocks visual */}
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from({ length: def.size }, (_, i) => (
                  <div key={i} style={{
                    width: 12, height: 12, borderRadius: 2,
                    background: canPlace ? def.color : "#334155",
                  }} />
                ))}
              </div>
              <span style={{
                fontFamily: "'Fira Code', monospace", fontSize: 10,
                color: canPlace ? "#e2e8f0" : "#475569", flex: 1, textAlign: "left",
              }}>{def.name}</span>
              <span style={{
                fontFamily: "'Fira Code', monospace", fontSize: 10,
                color: remaining > 0 ? def.color : "#334155",
              }}>x{remaining}</span>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{
        display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center",
      }}>
        <button
          onClick={onToggleRotation}
          style={{
            fontFamily: "'Fira Code', monospace", fontSize: 10,
            padding: "8px 14px", background: "#1e293b",
            color: "#94a3b8", border: "1px solid #334155",
            borderRadius: 6, cursor: "pointer",
          }}
        >GIRAR (R) {horizontal ? "↔" : "↕"}</button>
        <button
          onClick={onRandom}
          style={{
            fontFamily: "'Fira Code', monospace", fontSize: 10,
            padding: "8px 14px", background: "#1e293b",
            color: "#94a3b8", border: "1px solid #334155",
            borderRadius: 6, cursor: "pointer",
          }}
        >ALEATORIO</button>
        <button
          onClick={onClear}
          style={{
            fontFamily: "'Fira Code', monospace", fontSize: 10,
            padding: "8px 14px", background: "#1e293b",
            color: "#94a3b8", border: "1px solid #334155",
            borderRadius: 6, cursor: "pointer",
          }}
        >LIMPAR</button>
      </div>

      <button
        onClick={onReady}
        disabled={!allPlaced}
        style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 12,
          padding: "12px 32px", marginTop: 14,
          background: allPlaced ? "#16a34a" : "#1e293b",
          color: allPlaced ? "#fff" : "#475569",
          border: `2px solid ${allPlaced ? "#22c55e" : "#334155"}`,
          borderRadius: 8,
          cursor: allPlaced ? "pointer" : "not-allowed",
          transition: "all 0.2s",
        }}
      >PRONTO!</button>
    </div>
  );
}

// ----------- Game Over Screen -----------
function GameOverScreen({
  won, stats, playerShips, aiShips, playerTracking, aiTracking,
  onRestart, onMenu, cellSize,
}) {
  const miniCell = Math.max(14, Math.floor(cellSize * 0.5));

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "20px 8px",
      animation: won ? "bn-fadeIn 0.6s ease" : "bn-shake 0.5s ease, bn-fadeIn 0.6s ease",
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>
        {won ? "🏆" : "💀"}
      </div>
      <h2 style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 22,
        color: won ? "#22c55e" : "#ef4444",
        textShadow: `0 0 20px ${won ? "#22c55e" : "#ef4444"}80`,
        marginBottom: 16,
      }}>{won ? "VITORIA!" : "DERROTA"}</h2>

      {/* Stats */}
      <div style={{
        background: "#0f172a", border: "1px solid #1e293b",
        borderRadius: 8, padding: "12px 16px", marginBottom: 16,
        width: "100%", maxWidth: 300,
      }}>
        {[
          ["Tiros", stats.totalShots],
          ["Acertos", stats.hits],
          ["Precisao", `${stats.accuracy}%`],
          ["Navios afundados", `${stats.shipsSunk}/${TOTAL_SHIPS}`],
          ["Maior sequencia", stats.maxStreak],
          ["Tempo", `${Math.floor(stats.time / 60)}:${String(stats.time % 60).padStart(2, "0")}`],
        ].map(([label, value]) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between",
            padding: "4px 0",
            fontFamily: "'Fira Code', monospace", fontSize: 10,
          }}>
            <span style={{ color: "#94a3b8" }}>{label}</span>
            <span style={{ color: "#e2e8f0" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Revealed grids side by side */}
      <div style={{
        display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", justifyContent: "center",
      }}>
        <div>
          <p style={{
            fontFamily: "'Fira Code', monospace", fontSize: 9,
            color: "#64748b", textAlign: "center", marginBottom: 4,
          }}>SEU TABULEIRO</p>
          <RevealedGrid ships={playerShips} attacks={aiTracking} cellSize={miniCell} />
        </div>
        <div>
          <p style={{
            fontFamily: "'Fira Code', monospace", fontSize: 9,
            color: "#64748b", textAlign: "center", marginBottom: 4,
          }}>TABULEIRO INIMIGO</p>
          <RevealedGrid ships={aiShips} attacks={playerTracking} cellSize={miniCell} />
        </div>
      </div>

      <AdBanner slot="batalha-naval_between" style={{ marginTop: 4, marginBottom: 12, maxWidth: 300 }} />

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onRestart}
          style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 10,
            padding: "12px 20px", background: "#16a34a", color: "#fff",
            border: "2px solid #22c55e", borderRadius: 8, cursor: "pointer",
          }}
        >JOGAR NOVAMENTE</button>
        <button
          onClick={onMenu}
          style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 10,
            padding: "12px 20px", background: "#1e293b", color: "#94a3b8",
            border: "1px solid #334155", borderRadius: 8, cursor: "pointer",
          }}
        >MENU</button>
      </div>
    </div>
  );
}

// ----------- Revealed Grid (Game Over) -----------
// attacks can be:
// - an array of {r, c, result} objects (aiTracking — flat list)
// - a 2D grid array (playerTracking — grid[r][c] = "hit"/"miss"/"sunk"/null)
function RevealedGrid({ ships, attacks, cellSize }) {
  // Detect format: flat array of attack objects vs 2D grid
  const isFlat = attacks && Array.isArray(attacks) && (attacks.length === 0 || (attacks[0] && typeof attacks[0].r === "number"));

  function getCellStyle(r, c) {
    const base = {
      width: cellSize, height: cellSize,
      border: "1px solid #0f1520",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.max(5, cellSize * 0.35),
      fontWeight: "bold",
    };
    const ship = findShipAt(ships, r, c);

    // Get attack state for this cell
    let state = null;
    if (isFlat) {
      const atk = attacks.find(a => a.r === r && a.c === c);
      if (atk) state = atk.result;
    } else if (attacks && attacks[r]) {
      state = attacks[r][c];
    }

    if (ship && ship.sunk) {
      return { ...base, background: "#450a0a", color: "#666" };
    }
    if (state === "hit" || state === "sunk") {
      return { ...base, background: "#991b1b", color: "#ff4444" };
    }
    if (state === "miss") {
      return { ...base, background: "#0c4a6e", color: "#38bdf8" };
    }
    if (ship) {
      return { ...base, background: ship.color, opacity: 0.6 };
    }
    return { ...base, background: "#0f172a" };
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
      border: "1px solid #1e293b",
      borderRadius: 3,
      overflow: "hidden",
    }}>
      {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, idx) => {
        const r = Math.floor(idx / GRID_SIZE);
        const c = idx % GRID_SIZE;
        return <div key={idx} style={getCellStyle(r, c)} />;
      })}
    </div>
  );
}

// ----------- Pause Overlay -----------
function PauseOverlay({ onContinue, onExit }) {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(5,5,16,0.92)", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: 100, borderRadius: 12,
    }}>
      <p style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 18,
        color: ACCENT, marginBottom: 24,
      }}>PAUSADO</p>
      <button
        onClick={onContinue}
        style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 11,
          padding: "12px 28px", background: "#16a34a", color: "#fff",
          border: "2px solid #22c55e", borderRadius: 8, cursor: "pointer",
          marginBottom: 10,
        }}
      >CONTINUAR</button>
      <button
        onClick={onExit}
        style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 10,
          padding: "10px 24px", background: "#1e293b", color: "#94a3b8",
          border: "1px solid #334155", borderRadius: 8, cursor: "pointer",
        }}
      >SAIR</button>
    </div>
  );
}

// ----------- Confetti -----------
function ConfettiOverlay() {
  const pieces = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 1.5 + Math.random() * 1.5,
      color: ["#22c55e", "#3b82f6", "#eab308", "#ef4444", "#a855f7", "#06b6d4"][Math.floor(Math.random() * 6)],
      size: 4 + Math.random() * 6,
    }));
  }, []);

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: "none", overflow: "hidden", zIndex: 50,
    }}>
      {pieces.map(p => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: -10,
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "0",
            animation: `bn-confetti ${p.duration}s ${p.delay}s ease forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ----------- Online Lobby -----------
function OnlineLobby({ roomId, lobbyStatus, opponentReady, onCreate, onJoin, onCancel }) {
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const handleCopyLink = async () => {
    if (!roomId) return;
    const url = `${window.location.origin}${window.location.pathname}?sala=${roomId}`;
    try { await navigator.clipboard.writeText(url); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "30px 16px", animation: "bn-fadeIn 0.4s ease",
    }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>{"\u{1F310}"}</div>

      {lobbyStatus === "idle" && (
        <>
          <p style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 12,
            color: ONLINE_ACCENT, textShadow: `0 0 10px ${ONLINE_ACCENT}`,
            marginBottom: 24,
          }}>ONLINE</p>

          <button
            onClick={onCreate}
            style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 10,
              padding: "12px 28px",
              background: `linear-gradient(135deg, ${ONLINE_ACCENT}, #5b21b6)`,
              color: "#fff", border: "none", borderRadius: 8, cursor: "pointer",
              marginBottom: 16,
              boxShadow: `0 0 20px ${ONLINE_ACCENT}40`,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
          >{"\u{1F3E0}"}  Criar Sala</button>

          <div style={{ width: 200, height: 1, background: "#2a2a4a", marginBottom: 16 }} />

          <p style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 8,
            color: "#8892b0", marginBottom: 10,
          }}>ENTRAR EM SALA</p>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="CODIGO"
            maxLength={6}
            style={{
              width: 200, padding: "10px 12px",
              background: "#111127", border: "1px solid #2a2a4a",
              borderRadius: 6, color: "#e0e0ff", fontSize: 14,
              fontFamily: "'Press Start 2P', monospace",
              textAlign: "center", letterSpacing: 4, outline: "none",
              boxSizing: "border-box", marginBottom: 8,
            }}
            onFocus={(e) => { e.target.style.borderColor = ONLINE_ACCENT; }}
            onBlur={(e) => { e.target.style.borderColor = "#2a2a4a"; }}
          />
          <button
            onClick={() => joinCode.length >= 4 && onJoin(joinCode)}
            disabled={joinCode.length < 4}
            style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 9,
              padding: "10px 24px",
              background: joinCode.length >= 4 ? ONLINE_ACCENT : "#2a2a4a",
              color: joinCode.length >= 4 ? "#fff" : "#555",
              border: "none", borderRadius: 6,
              cursor: joinCode.length >= 4 ? "pointer" : "not-allowed",
              marginBottom: 16,
            }}
          >ENTRAR</button>
        </>
      )}

      {lobbyStatus === "creating" && (
        <p style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 10,
          color: ONLINE_ACCENT, textShadow: `0 0 10px ${ONLINE_ACCENT}`,
        }}>CONECTANDO...</p>
      )}

      {lobbyStatus === "waiting" && (
        <>
          <p style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 10,
            color: ONLINE_ACCENT, marginBottom: 20,
            textShadow: `0 0 10px ${ONLINE_ACCENT}`,
          }}>AGUARDANDO OPONENTE...</p>
          <div
            onClick={handleCopyLink}
            style={{
              background: "#111127",
              border: `2px solid ${copied ? NEON_GREEN : ONLINE_ACCENT}`,
              borderRadius: 10, padding: "16px 28px",
              marginBottom: 16, cursor: "pointer",
              transition: "border-color 0.3s",
            }}
          >
            <p style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 7,
              color: "#555", marginBottom: 8,
            }}>CODIGO DA SALA</p>
            <p style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 28,
              color: ONLINE_ACCENT,
              textShadow: `0 0 15px ${ONLINE_ACCENT}`,
              letterSpacing: 8,
            }}>{roomId}</p>
          </div>
          <p style={{
            fontFamily: "'Fira Code', monospace", fontSize: 10,
            color: copied ? NEON_GREEN : "#666",
            transition: "color 0.3s",
          }}>{copied ? "LINK COPIADO!" : "Toque no codigo para copiar o link"}</p>
        </>
      )}

      {lobbyStatus === "joining" && (
        <p style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 10,
          color: ONLINE_ACCENT, textShadow: `0 0 10px ${ONLINE_ACCENT}`,
        }}>ENTRANDO NA SALA...</p>
      )}

      {lobbyStatus === "error" && (
        <p style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 10,
          color: "#ff2d95", marginBottom: 12,
        }}>SALA NAO ENCONTRADA</p>
      )}

      <button
        onClick={onCancel}
        style={{
          marginTop: 20, padding: "10px 24px",
          background: "transparent", border: "1px solid #555",
          borderRadius: 6, color: "#555",
          fontFamily: "'Press Start 2P', monospace", fontSize: 9,
          cursor: "pointer",
        }}
      >CANCELAR</button>
    </div>
  );
}

// ----------- Online Game Over Screen -----------
function OnlineGameOverScreen({
  won, stats, playerShips, opponentShips, playerTracking, opponentTracking,
  onRematch, onMenu, waitingRematch, cellSize, disconnected,
}) {
  const miniCell = Math.max(14, Math.floor(cellSize * 0.5));

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "20px 8px",
      animation: won ? "bn-fadeIn 0.6s ease" : "bn-shake 0.5s ease, bn-fadeIn 0.6s ease",
    }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>
        {won ? "\u{1F3C6}" : "\u{1F480}"}
      </div>
      <h2 style={{
        fontFamily: "'Press Start 2P', monospace", fontSize: 22,
        color: won ? "#22c55e" : "#ef4444",
        textShadow: `0 0 20px ${won ? "#22c55e" : "#ef4444"}80`,
        marginBottom: 8,
      }}>{won ? "VITORIA!" : disconnected ? "OPONENTE SAIU" : "DERROTA"}</h2>

      {disconnected && (
        <p style={{
          fontFamily: "'Fira Code', monospace", fontSize: 10,
          color: "#94a3b8", marginBottom: 16,
        }}>O oponente desconectou. Voce venceu!</p>
      )}

      {/* Stats */}
      {stats && (
        <div style={{
          background: "#0f172a", border: "1px solid #1e293b",
          borderRadius: 8, padding: "12px 16px", marginBottom: 16,
          width: "100%", maxWidth: 300,
        }}>
          {[
            ["Tiros", stats.totalShots],
            ["Acertos", stats.hits],
            ["Precisao", `${stats.accuracy}%`],
            ["Navios afundados", `${stats.shipsSunk}/${TOTAL_SHIPS}`],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "4px 0",
              fontFamily: "'Fira Code', monospace", fontSize: 10,
            }}>
              <span style={{ color: "#94a3b8" }}>{label}</span>
              <span style={{ color: "#e2e8f0" }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Revealed grids */}
      {opponentShips && opponentShips.length > 0 && (
        <div style={{
          display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", justifyContent: "center",
        }}>
          <div>
            <p style={{
              fontFamily: "'Fira Code', monospace", fontSize: 9,
              color: "#64748b", textAlign: "center", marginBottom: 4,
            }}>SEU TABULEIRO</p>
            <RevealedGrid ships={playerShips} attacks={opponentTracking || []} cellSize={miniCell} />
          </div>
          <div>
            <p style={{
              fontFamily: "'Fira Code', monospace", fontSize: 9,
              color: "#64748b", textAlign: "center", marginBottom: 4,
            }}>TABULEIRO INIMIGO</p>
            <RevealedGrid ships={opponentShips} attacks={playerTracking} cellSize={miniCell} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        {!disconnected && (
          <button
            onClick={onRematch}
            disabled={waitingRematch}
            style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 10,
              padding: "12px 20px",
              background: waitingRematch ? "#1e293b" : `linear-gradient(135deg, ${ONLINE_ACCENT}, #5b21b6)`,
              color: waitingRematch ? "#94a3b8" : "#fff",
              border: waitingRematch ? "1px solid #334155" : "none",
              borderRadius: 8,
              cursor: waitingRematch ? "default" : "pointer",
            }}
          >{waitingRematch ? "AGUARDANDO..." : "REVANCHE"}</button>
        )}
        <button
          onClick={onMenu}
          style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 10,
            padding: "12px 20px", background: "#1e293b", color: "#94a3b8",
            border: "1px solid #334155", borderRadius: 8, cursor: "pointer",
          }}
        >MENU</button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function BatalhaNaval() {
  // ---- Hooks ----
  const { user, checkedCookie, registering, register } = useJogador("batalha-naval");
  const gameScale = useGameScale(GAME_W);
  const [screen, setScreen] = useState("menu");
  // screens: menu, register, setup, battle, gameover, paused,
  //          online-lobby, online-setup, online-waiting, online-battle, online-gameover
  useLockScroll(screen === "battle" || screen === "online-battle");

  // ---- State ----
  const [difficulty, setDifficulty] = useState("medium");
  const [horizontal, setHorizontal] = useState(true);
  const [selectedShipDef, setSelectedShipDef] = useState(null);
  const [playerShips, setPlayerShips] = useState([]);
  const [hoverCell, setHoverCell] = useState(null);

  // Battle state
  const [aiShips, setAiShips] = useState([]);
  const [playerTracking, setPlayerTracking] = useState(createTrackingGrid);
  const [aiTracking, setAiTracking] = useState([]); // array of {r, c, result}
  const [turn, setTurn] = useState("player"); // "player" or "ai"
  const [animatingCell, setAnimatingCell] = useState(null);
  const [lastSunkShip, setLastSunkShip] = useState(null);
  const [gameResult, setGameResult] = useState(null); // "win" or "lose"
  const [mobileConfirm, setMobileConfirm] = useState(null); // {r, c} for mobile tap confirm
  const [battleShake, setBattleShake] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [sunkShipsOpponent, setSunkShipsOpponent] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [swappedGrids, setSwappedGrids] = useState(false);
  const [lastMoveLog, setLastMoveLog] = useState("");
  const [aiTurnTrigger, setAiTurnTrigger] = useState(0); // incremented to trigger AI turn

  // Refs
  const audioRef = useRef(null);
  const aiRef = useRef(null);
  const statsRef = useRef({ totalShots: 0, hits: 0, shipsSunk: 0, maxStreak: 0, currentStreak: 0, startTime: 0 });
  const pendingModeRef = useRef(null);
  const prevScreenRef = useRef("menu");
  const scoreSubmittedRef = useRef(false);
  const isMobileRef = useRef(false);
  const turnLockRef = useRef(false);
  const playerShipsRef = useRef(playerShips);
  const aiTrackingRef = useRef(aiTracking);

  // Keep refs in sync
  useEffect(() => { playerShipsRef.current = playerShips; }, [playerShips]);
  useEffect(() => { aiTrackingRef.current = aiTracking; }, [aiTracking]);

  // ---- Online State ----
  const wsRef = useRef(null);
  const [roomId, setRoomId] = useState("");
  const [lobbyStatus, setLobbyStatus] = useState("idle"); // idle | creating | waiting | joining | error
  const [playerNum, setPlayerNum] = useState(null);
  const playerNumRef = useRef(null);
  const [onlineTurn, setOnlineTurn] = useState(null); // 0 or 1
  const [onlineOpponentReady, setOnlineOpponentReady] = useState(false);
  const [onlinePlayerReady, setOnlinePlayerReady] = useState(false);
  const [onlineTracking, setOnlineTracking] = useState(createTrackingGrid); // attacks sent by us on opponent
  const [onlineIncoming, setOnlineIncoming] = useState([]); // attacks received from opponent on us: {r, c, result}
  const [onlineSunkOpponent, setOnlineSunkOpponent] = useState([]); // sunk ships revealed from opponent
  const [onlineGameResult, setOnlineGameResult] = useState(null); // "win" or "lose"
  const [onlineOpponentShips, setOnlineOpponentShips] = useState([]); // revealed on game_over
  const [waitingRematch, setWaitingRematch] = useState(false);
  const [onlineDisconnected, setOnlineDisconnected] = useState(false);
  const autoJoinRef = useRef(false);
  const onlineStatsRef = useRef({ totalShots: 0, hits: 0, shipsSunk: 0 });

  // ---- Detect mobile ----
  useEffect(() => {
    isMobileRef.current = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  // ---- Inject CSS animations ----
  useEffect(() => { injectStyles(); }, []);

  // ---- Init audio on first interaction ----
  const initAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createAudioEngine();
    }
  }, []);

  // ---- Cell sizes ----
  const mainCellSize = useMemo(() => {
    const maxGrid = Math.min(GAME_W * gameScale - 40, 360);
    return Math.floor(maxGrid / (GRID_SIZE + 1)); // +1 for labels
  }, [gameScale]);

  const miniCellSize = useMemo(() => Math.max(12, Math.floor(mainCellSize * 0.5)), [mainCellSize]);

  // ---- Start game flow ----
  const handleStartGame = useCallback(() => {
    initAudio();
    if (!user) {
      pendingModeRef.current = true;
      setScreen("register");
      return;
    }
    // Go to setup
    setScreen("setup");
    setPlayerShips([]);
    setSelectedShipDef(FLEET[0]);
    setHorizontal(true);
    window.gtag?.("event", "game_start", { game_name: "batalha-naval", difficulty });
  }, [user, initAudio, difficulty]);

  // ---- Close WS helper ----
  const closeWS = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => { closeWS(); };
  }, [closeWS]);

  // ---- Connect WebSocket ----
  const connectWS = useCallback((action, joinCode) => {
    closeWS();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (action === "create") {
        ws.send(JSON.stringify({ type: "create" }));
      } else {
        ws.send(JSON.stringify({ type: "join", roomId: joinCode }));
        setLobbyStatus("joining");
      }
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);

      switch (msg.type) {
        case "created":
          setRoomId(msg.roomId);
          setPlayerNum(msg.playerNum);
          playerNumRef.current = msg.playerNum;
          setLobbyStatus("waiting");
          break;

        case "joined":
          setPlayerNum(msg.playerNum);
          playerNumRef.current = msg.playerNum;
          // Go to setup (place ships)
          setScreen("online-setup");
          setLobbyStatus("idle");
          setPlayerShips([]);
          setSelectedShipDef(FLEET[0]);
          setHorizontal(true);
          setOnlinePlayerReady(false);
          setOnlineOpponentReady(false);
          break;

        case "opponent_joined":
          // Player 1 also goes to setup
          setScreen("online-setup");
          setLobbyStatus("idle");
          setPlayerShips([]);
          setSelectedShipDef(FLEET[0]);
          setHorizontal(true);
          setOnlinePlayerReady(false);
          setOnlineOpponentReady(false);
          break;

        case "opponent_ready":
          setOnlineOpponentReady(true);
          break;

        case "start": {
          // Both players ready, battle begins
          setOnlineTurn(msg.firstPlayer);
          setOnlineTracking(createTrackingGrid());
          setOnlineIncoming([]);
          setOnlineSunkOpponent([]);
          setOnlineGameResult(null);
          setOnlineOpponentShips([]);
          setOnlineDisconnected(false);
          setWaitingRematch(false);
          setAnimatingCell(null);
          setLastSunkShip(null);
          setMobileConfirm(null);
          setBattleShake(false);
          setSwappedGrids(false);
          setLastMoveLog("");
          onlineStatsRef.current = { totalShots: 0, hits: 0, shipsSunk: 0 };
          setScreen("online-battle");
          if (!audioRef.current) audioRef.current = createAudioEngine();
          audioRef.current?.sonarPing();
          window.gtag?.("event", "game_start", { game_name: "batalha-naval", mode: "online" });
          break;
        }

        case "turn":
          setOnlineTurn(msg.playerNum);
          break;

        case "attack_result": {
          const { row, col, result, shipName, shipCells, attacker } = msg;
          const isMyAttack = attacker === playerNumRef.current;

          if (isMyAttack) {
            // Update our tracking grid
            setOnlineTracking(prev => {
              const g = prev.map(r => [...r]);
              if (result === "sunk" && shipCells) {
                for (const cell of shipCells) {
                  g[cell.r][cell.c] = "sunk";
                }
              } else {
                g[row][col] = result === "miss" ? "miss" : "hit";
              }
              return g;
            });

            if (result === "miss") {
              audioRef.current?.splash();
              setLastMoveLog(`Agua em ${cellLabel(row, col)}`);
            } else if (result === "hit") {
              audioRef.current?.hit();
              onlineStatsRef.current.hits++;
              setLastMoveLog(`Acertou em ${cellLabel(row, col)}!`);
            } else if (result === "sunk") {
              audioRef.current?.sunk();
              onlineStatsRef.current.hits++;
              onlineStatsRef.current.shipsSunk++;
              setBattleShake(true);
              setTimeout(() => setBattleShake(false), 1500);
              setLastSunkShip({ name: shipName });
              setTimeout(() => setLastSunkShip(null), 1500);
              if (shipCells) {
                setOnlineSunkOpponent(prev => [...prev, {
                  name: shipName,
                  cells: shipCells,
                  color: "#ef4444",
                }]);
              }
              setLastMoveLog(`Voce afundou o ${shipName}!`);
            }
            onlineStatsRef.current.totalShots++;
          } else {
            // Opponent attacked us
            const attackResult = result === "sunk" ? "hit" : result;
            setOnlineIncoming(prev => {
              if (result === "sunk" && shipCells) {
                const newIncoming = [...prev];
                for (const cell of shipCells) {
                  const existing = newIncoming.findIndex(a => a.r === cell.r && a.c === cell.c);
                  if (existing >= 0) {
                    newIncoming[existing] = { r: cell.r, c: cell.c, result: "hit" };
                  } else {
                    newIncoming.push({ r: cell.r, c: cell.c, result: "hit" });
                  }
                }
                return newIncoming;
              }
              return [...prev, { r: row, c: col, result: attackResult }];
            });

            if (result === "miss") {
              audioRef.current?.splash();
              setLastMoveLog(`Inimigo errou em ${cellLabel(row, col)}`);
            } else if (result === "hit") {
              audioRef.current?.hit();
              setBattleShake(true);
              setTimeout(() => setBattleShake(false), 500);
              setLastMoveLog(`Inimigo acertou em ${cellLabel(row, col)}!`);
            } else if (result === "sunk") {
              audioRef.current?.sunk();
              setBattleShake(true);
              setTimeout(() => setBattleShake(false), 500);
              setLastMoveLog(`Inimigo afundou seu ${shipName}!`);
              // Mark the ship as sunk in playerShips
              setPlayerShips(prev => prev.map(s => {
                if (s.name === shipName && !s.sunk) {
                  return { ...s, sunk: true };
                }
                return s;
              }));
            }
          }

          // Animation
          setAnimatingCell({ r: row, c: col, type: result === "miss" ? "miss" : "hit", isAi: !isMyAttack });
          setTimeout(() => setAnimatingCell(null), 400);
          break;
        }

        case "game_over": {
          const won = msg.winner === playerNumRef.current;
          setOnlineGameResult(won ? "win" : "lose");
          if (won) {
            audioRef.current?.victory();
            setShowConfetti(true);
          } else {
            audioRef.current?.defeat();
          }
          // Reveal loser's ships
          if (msg.loserShips) {
            if (won) {
              setOnlineOpponentShips(msg.loserShips);
            } else {
              // We lost, opponent's ships are already tracked
              setOnlineOpponentShips(msg.loserShips);
            }
          }
          setTimeout(() => setScreen("online-gameover"), 1200);
          break;
        }

        case "rematch_waiting":
          break;

        case "rematch_start":
          // New game setup phase
          setScreen("online-setup");
          setPlayerShips([]);
          setSelectedShipDef(FLEET[0]);
          setHorizontal(true);
          setOnlinePlayerReady(false);
          setOnlineOpponentReady(false);
          setShowConfetti(false);
          setWaitingRematch(false);
          break;

        case "opponent_left":
          setOnlineDisconnected(true);
          setOnlineGameResult("win");
          setWaitingRematch(false);
          if (screen === "online-battle" || screen === "online-setup" || screen === "online-waiting") {
            audioRef.current?.victory();
            setScreen("online-gameover");
          }
          closeWS();
          break;

        case "error":
          if (screen === "online-lobby") {
            setLobbyStatus("error");
            setTimeout(() => setLobbyStatus("idle"), 2000);
          }
          break;
      }
    };

    ws.onclose = () => {};
    ws.onerror = () => {
      setLobbyStatus("error");
      setTimeout(() => {
        if (screen === "online-lobby") setLobbyStatus("idle");
      }, 2000);
    };
  }, [closeWS, playerNum, screen]);

  // ---- Handle online button ----
  const handleOnlineClick = useCallback(() => {
    initAudio();
    if (!user) {
      pendingModeRef.current = "online";
      setScreen("register");
      return;
    }
    setScreen("online-lobby");
    setLobbyStatus("idle");
    setRoomId("");
  }, [user, initAudio]);

  // ---- Handle create room ----
  const handleCreateRoom = useCallback(() => {
    setLobbyStatus("creating");
    connectWS("create");
  }, [connectWS]);

  // ---- Handle join room ----
  const handleJoinRoom = useCallback((code) => {
    setLobbyStatus("joining");
    connectWS("join", code);
  }, [connectWS]);

  // ---- Auto-join from URL param (?sala=XXXX) ----
  useEffect(() => {
    if (!checkedCookie || autoJoinRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const sala = params.get("sala");
    if (sala) {
      autoJoinRef.current = true;
      window.history.replaceState({}, "", window.location.pathname);
      if (!user) {
        pendingModeRef.current = "auto-join";
        pendingModeRef.current_code = sala;
        setScreen("register");
      } else {
        initAudio();
        setScreen("online-lobby");
        setLobbyStatus("joining");
        connectWS("join", sala);
      }
    }
  }, [checkedCookie, user, connectWS, initAudio]);

  // ---- Online ready (send ships to server) ----
  const handleOnlineReady = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    if (playerShips.length !== TOTAL_SHIPS) return;

    // Build grid from ships
    const grid = buildGridFromShips(playerShips);

    // Send ships in a serializable format (no Sets)
    const shipsData = playerShips.map(s => ({
      id: s.id,
      defId: s.defId,
      name: s.name,
      size: s.size,
      color: s.color,
      cells: s.cells,
      horizontal: s.horizontal,
    }));

    wsRef.current.send(JSON.stringify({
      type: "ready",
      grid,
      ships: shipsData,
    }));

    setOnlinePlayerReady(true);
    if (onlineOpponentReady) {
      // Will transition once server sends "start"
    } else {
      setScreen("online-waiting");
    }
  }, [playerShips, onlineOpponentReady]);

  // ---- Online attack ----
  const handleOnlineAttack = useCallback((r, c) => {
    if (onlineTurn !== playerNum) return;
    if (onlineTracking[r][c] !== null) return;
    if (!wsRef.current || wsRef.current.readyState !== 1) return;

    // Mobile confirmation
    if (isMobileRef.current && (!mobileConfirm || mobileConfirm.r !== r || mobileConfirm.c !== c)) {
      setMobileConfirm({ r, c });
      return;
    }
    setMobileConfirm(null);

    audioRef.current?.shoot();
    wsRef.current.send(JSON.stringify({ type: "attack", row: r, col: c }));
  }, [onlineTurn, playerNum, onlineTracking, mobileConfirm]);

  // ---- Online rematch ----
  const handleOnlineRematch = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: "rematch" }));
    setWaitingRematch(true);
  }, []);

  // ---- Online menu (go back) ----
  const handleOnlineMenu = useCallback(() => {
    closeWS();
    setScreen("menu");
    setShowConfetti(false);
    setOnlineGameResult(null);
    setOnlineDisconnected(false);
    setWaitingRematch(false);
  }, [closeWS]);

  const handleRegister = useCallback(async (userData) => {
    const jogador = await register(userData);
    if (jogador && !jogador.error && pendingModeRef.current) {
      if (pendingModeRef.current === "online") {
        pendingModeRef.current = null;
        setScreen("online-lobby");
        setLobbyStatus("idle");
        setRoomId("");
      } else if (pendingModeRef.current === "auto-join") {
        const code = pendingModeRef.current_code;
        pendingModeRef.current = null;
        pendingModeRef.current_code = null;
        initAudio();
        setScreen("online-lobby");
        setLobbyStatus("joining");
        connectWS("join", code);
      } else {
        pendingModeRef.current = null;
        setScreen("setup");
        setPlayerShips([]);
        setSelectedShipDef(FLEET[0]);
        setHorizontal(true);
        window.gtag?.("event", "game_start", { game_name: "batalha-naval", difficulty });
      }
    }
  }, [register, difficulty, connectWS, initAudio]);

  // ---- Ship placement ----
  const handleSelectShipDef = useCallback((def) => {
    setSelectedShipDef(def);
  }, []);

  const handleToggleRotation = useCallback(() => {
    setHorizontal(h => !h);
  }, []);

  const handlePlacementCellClick = useCallback((r, c) => {
    // Check if clicking on an existing ship to remove it
    const existingShip = findShipAt(playerShips, r, c);
    if (existingShip) {
      setPlayerShips(prev => prev.filter(s => s.id !== existingShip.id));
      // Re-select that ship type if needed
      const def = FLEET.find(f => f.id === existingShip.defId);
      if (def) setSelectedShipDef(def);
      return;
    }

    if (!selectedShipDef) return;

    // Check remaining count
    const placedCount = playerShips.filter(s => s.defId === selectedShipDef.id).length;
    if (placedCount >= selectedShipDef.count) return;

    // Validate placement
    if (!isValidPlacement(null, playerShips, r, c, selectedShipDef.size, horizontal)) return;

    const cells = getShipCells(r, c, selectedShipDef.size, horizontal);
    const instanceId = `${selectedShipDef.id}_${placedCount}`;
    const newShip = {
      id: instanceId,
      defId: selectedShipDef.id,
      name: selectedShipDef.name,
      size: selectedShipDef.size,
      color: selectedShipDef.color,
      cells,
      horizontal,
      hits: new Set(),
      sunk: false,
    };

    const nextShips = [...playerShips, newShip];
    setPlayerShips(nextShips);

    // Auto-select next available ship
    const newPlacedCount = placedCount + 1;
    if (newPlacedCount >= selectedShipDef.count) {
      // Find next ship type that still needs placing
      const nextDef = FLEET.find(def => {
        const count = nextShips.filter(s => s.defId === def.id).length;
        return count < def.count;
      });
      setSelectedShipDef(nextDef || null);
    }

    audioRef.current?.sonarPing();
  }, [playerShips, selectedShipDef, horizontal]);

  const handleRandomPlacement = useCallback(() => {
    const ships = placeShipsRandomly();
    // Assign proper IDs
    const named = ships.map(s => ({
      ...s,
      hits: new Set(),
      sunk: false,
    }));
    setPlayerShips(named);
    setSelectedShipDef(null);
    audioRef.current?.sonarPing();
  }, []);

  const handleClearPlacement = useCallback(() => {
    setPlayerShips([]);
    setSelectedShipDef(FLEET[0]);
  }, []);

  const handleReady = useCallback(() => {
    // AI places ships
    const aiFleet = placeShipsRandomly();
    setAiShips(aiFleet);
    setPlayerTracking(createTrackingGrid());
    setAiTracking([]);
    setTurn("player");
    setGameResult(null);
    setMobileConfirm(null);
    setLastSunkShip(null);
    setAnimatingCell(null);
    setSunkShipsOpponent([]);
    setSwappedGrids(false);
    setShowConfetti(false);
    setLastMoveLog("");
    turnLockRef.current = false;
    scoreSubmittedRef.current = false;

    // Create AI
    aiRef.current = createAI(difficulty);

    // Stats
    statsRef.current = {
      totalShots: 0, hits: 0, shipsSunk: 0,
      maxStreak: 0, currentStreak: 0, startTime: Math.floor(Date.now() / 1000),
    };

    setScreen("battle");
    audioRef.current?.sonarPing();
  }, [difficulty]);

  // ---- R key for rotation ----
  useEffect(() => {
    if (screen !== "setup" && screen !== "online-setup") return;
    const handler = (e) => {
      if (e.key === "r" || e.key === "R") {
        setHorizontal(h => !h);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen]);

  // ---- ESC for pause ----
  useEffect(() => {
    if (screen !== "battle" && screen !== "paused") return;
    const handler = (e) => {
      if (e.key === "Escape") {
        setScreen(prev => prev === "paused" ? "battle" : "paused");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen]);

  // ---- Player attack ----
  const handlePlayerAttack = useCallback((r, c) => {
    if (turn !== "player" || turnLockRef.current) return;
    if (playerTracking[r][c] !== null) return;

    // Mobile confirmation
    if (isMobileRef.current && (!mobileConfirm || mobileConfirm.r !== r || mobileConfirm.c !== c)) {
      setMobileConfirm({ r, c });
      return;
    }
    setMobileConfirm(null);
    turnLockRef.current = true;

    audioRef.current?.shoot();
    statsRef.current.totalShots++;

    // Check hit
    const targetShip = findShipAt(aiShips, r, c);
    const isHit = !!targetShip;

    // Animate
    setAnimatingCell({ r, c, type: isHit ? "hit" : "miss" });

    setTimeout(() => {
      setAnimatingCell(null);

      const newTracking = playerTracking.map(row => [...row]);

      if (isHit) {
        audioRef.current?.hit();
        targetShip.hits.add(`${r},${c}`);
        statsRef.current.hits++;
        statsRef.current.currentStreak++;
        if (statsRef.current.currentStreak > statsRef.current.maxStreak) {
          statsRef.current.maxStreak = statsRef.current.currentStreak;
        }

        // Check sunk
        if (targetShip.hits.size === targetShip.size) {
          targetShip.sunk = true;
          statsRef.current.shipsSunk++;
          audioRef.current?.sunk();

          // Mark all cells as sunk
          for (const cell of targetShip.cells) {
            newTracking[cell.r][cell.c] = "sunk";
          }
          setSunkShipsOpponent(prev => [...prev, targetShip]);
          setLastSunkShip(targetShip);
          setBattleShake(true);
          setTimeout(() => { setBattleShake(false); setLastSunkShip(null); }, 1500);
          setLastMoveLog(`Voce afundou o ${targetShip.name}!`);

          // Check win
          if (allShipsSunk(aiShips)) {
            setPlayerTracking(newTracking);
            setAiShips([...aiShips]);
            handleGameEnd("win");
            return;
          }
        } else {
          newTracking[r][c] = "hit";
          setLastMoveLog(`Acertou em ${cellLabel(r, c)}!`);
        }

        setPlayerTracking(newTracking);
        setAiShips([...aiShips]);
        turnLockRef.current = false;
        // Player goes again on hit
      } else {
        audioRef.current?.splash();
        newTracking[r][c] = "miss";
        statsRef.current.currentStreak = 0;
        setPlayerTracking(newTracking);
        setLastMoveLog(`Agua em ${cellLabel(r, c)}`);

        // AI's turn
        setTurn("ai");
        turnLockRef.current = false;
      }
    }, 400);
  }, [turn, playerTracking, aiShips, mobileConfirm]);

  // ---- AI turn ----
  useEffect(() => {
    if (screen !== "battle" || turn !== "ai" || gameResult) return;

    setAiThinking(true);
    const delay = 800 + Math.random() * 400;

    const timeout = setTimeout(() => {
      setAiThinking(false);

      const curAiTracking = aiTrackingRef.current;
      const curPlayerShips = playerShipsRef.current;

      const move = aiRef.current?.chooseMove(
        // Build AI's tracking view from aiTracking array
        (() => {
          const grid = createTrackingGrid();
          for (const atk of curAiTracking) {
            grid[atk.r][atk.c] = atk.result === "hit" ? "hit" : atk.result === "sunk" ? "sunk" : "miss";
          }
          return grid;
        })(),
        curPlayerShips
      );

      if (!move) {
        // No moves left (shouldn't happen)
        setTurn("player");
        return;
      }

      executeAiAttack(move.r, move.c);
    }, delay);

    return () => clearTimeout(timeout);
  }, [turn, screen, gameResult, aiTurnTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const executeAiAttack = useCallback((r, c) => {
    audioRef.current?.shoot();

    const ships = playerShipsRef.current;
    const tracking = aiTrackingRef.current;
    const targetShip = findShipAt(ships, r, c);
    const isHit = !!targetShip;

    setAnimatingCell({ r, c, type: isHit ? "hit" : "miss", isAi: true });

    setTimeout(() => {
      setAnimatingCell(null);

      // Re-read refs for freshest data
      const curTracking = aiTrackingRef.current;
      const curShips = playerShipsRef.current;

      if (isHit) {
        audioRef.current?.hit();
        targetShip.hits.add(`${r},${c}`);

        if (targetShip.hits.size === targetShip.size) {
          targetShip.sunk = true;
          audioRef.current?.sunk();
          setBattleShake(true);
          setTimeout(() => setBattleShake(false), 500);
          setLastMoveLog(`Inimigo afundou seu ${targetShip.name}!`);

          // Build tracking grid for AI report
          const tGrid = createTrackingGrid();
          for (const atk of [...curTracking, { r, c, result: "sunk" }]) {
            tGrid[atk.r][atk.c] = atk.result;
          }
          aiRef.current?.reportHit(r, c, tGrid, true);

          // Mark all sunk cells
          const newTracking = [...curTracking];
          for (const cell of targetShip.cells) {
            const idx = newTracking.findIndex(a => a.r === cell.r && a.c === cell.c);
            if (idx >= 0) newTracking[idx] = { r: cell.r, c: cell.c, result: "sunk" };
            else newTracking.push({ r: cell.r, c: cell.c, result: "sunk" });
          }
          setAiTracking(newTracking);
          setPlayerShips([...curShips]);

          // Check lose
          if (allShipsSunk(curShips)) {
            handleGameEnd("lose");
            return;
          }
        } else {
          const tGrid = createTrackingGrid();
          for (const atk of [...curTracking, { r, c, result: "hit" }]) {
            tGrid[atk.r][atk.c] = atk.result;
          }
          aiRef.current?.reportHit(r, c, tGrid, false);
          setAiTracking(prev => [...prev, { r, c, result: "hit" }]);
          setPlayerShips([...curShips]);
          setLastMoveLog(`Inimigo acertou em ${cellLabel(r, c)}!`);
        }

        // AI goes again on hit — use trigger to re-fire effect
        setAiTurnTrigger(t => t + 1);
      } else {
        audioRef.current?.splash();
        const tGrid = createTrackingGrid();
        for (const atk of [...curTracking, { r, c, result: "miss" }]) {
          tGrid[atk.r][atk.c] = atk.result;
        }
        aiRef.current?.reportMiss(r, c, tGrid);
        setAiTracking(prev => [...prev, { r, c, result: "miss" }]);
        setLastMoveLog(`Inimigo errou em ${cellLabel(r, c)}`);

        // Player's turn
        setTurn("player");
        audioRef.current?.sonarPing();
      }
    }, 400);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Game End ----
  const handleGameEnd = useCallback((result) => {
    setGameResult(result);
    const elapsed = Math.floor(Date.now() / 1000) - statsRef.current.startTime;
    statsRef.current.time = elapsed;

    if (result === "win") {
      audioRef.current?.victory();
      setShowConfetti(true);
    } else {
      audioRef.current?.defeat();
    }

    // Submit score
    if (!scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      const s = statsRef.current;
      const accuracy = s.totalShots > 0 ? Math.round((s.hits / s.totalShots) * 100) : 0;
      const score = result === "win"
        ? Math.max(100, 1000 - s.totalShots * 10 + accuracy * 5 + s.maxStreak * 20 - elapsed)
        : Math.max(0, s.shipsSunk * 50 + accuracy * 2);

      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pontos: score,
          jogo: "batalha-naval",
          metadata: {
            dificuldade: difficulty,
            tiros: s.totalShots,
            acuracia: accuracy,
            naviosAfundados: s.shipsSunk,
            resultado: result,
            tempo: elapsed,
            maiorSequencia: s.maxStreak,
          },
        }),
      }).catch(() => {});

      window.gtag?.("event", "game_end", {
        game_name: "batalha-naval",
        result,
        difficulty,
        shots: s.totalShots,
        accuracy,
      });
    }

    setTimeout(() => setScreen("gameover"), 1200);
  }, [difficulty]);

  // ---- Restart / Menu ----
  const handleRestart = useCallback(() => {
    setScreen("setup");
    setPlayerShips([]);
    setSelectedShipDef(FLEET[0]);
    setHorizontal(true);
    setGameResult(null);
    setShowConfetti(false);
    scoreSubmittedRef.current = false;
  }, []);

  const handleMenu = useCallback(() => {
    setScreen("menu");
    setGameResult(null);
    setShowConfetti(false);
    scoreSubmittedRef.current = false;
  }, []);

  const handlePause = useCallback(() => {
    prevScreenRef.current = screen;
    setScreen("paused");
  }, [screen]);

  const handleContinue = useCallback(() => {
    setScreen("battle");
  }, []);

  // ---- Compute stats for game over ----
  const gameStats = useMemo(() => {
    const s = statsRef.current;
    return {
      totalShots: s.totalShots,
      hits: s.hits,
      accuracy: s.totalShots > 0 ? Math.round((s.hits / s.totalShots) * 100) : 0,
      shipsSunk: s.shipsSunk,
      maxStreak: s.maxStreak,
      time: s.time || 0,
    };
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Build aiTracking as 2D grid for GameOver RevealedGrid ----
  const aiTrackingGrid = useMemo(() => {
    const grid = createTrackingGrid();
    for (const atk of aiTracking) {
      grid[atk.r][atk.c] = atk.result;
    }
    return grid;
  }, [aiTracking]);

  // ---- Remaining ship counts for HUD ----
  const playerRemaining = useMemo(() => countRemainingShips(playerShips), [playerShips]);
  const aiRemaining = useMemo(() => {
    return TOTAL_SHIPS - sunkShipsOpponent.length;
  }, [sunkShipsOpponent]);

  // ---- Online remaining ships ----
  const onlinePlayerRemaining = useMemo(() => playerShips.filter(s => !s.sunk).length, [playerShips]);
  const onlineAiRemaining = useMemo(() => TOTAL_SHIPS - onlineSunkOpponent.length, [onlineSunkOpponent]);

  // ---- Render ----
  const isBattleScreen = screen === "battle" || screen === "online-battle";
  const isOnlineScreen = screen.startsWith("online");

  return (
    <div style={{
      minHeight: "100vh", background: "#050510",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      padding: "12px 0",
    }}>
      {/* Top ad - hidden during battle */}
      {!isBattleScreen && screen !== "paused" && (
        <AdBanner slot="batalha-naval_top" style={{ marginBottom: 12, maxWidth: GAME_W }} />
      )}

      {/* Game container */}
      <div style={{
        width: GAME_W,
        maxWidth: "100vw",
        transform: `scale(${gameScale})`,
        transformOrigin: "top center",
        position: "relative",
        border: "2px solid #3b82f633",
        borderRadius: 12,
        boxShadow: "0 0 40px rgba(59,130,246,0.08)",
        background: "#050510",
        overflow: "hidden",
      }}>
        {/* ============ MENU ============ */}
        {screen === "menu" && (
          <MenuScreen
            onStart={handleStartGame}
            onOnline={handleOnlineClick}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
          />
        )}

        {/* ============ REGISTER ============ */}
        {screen === "register" && (
          <RegisterModal
            onRegister={handleRegister}
            loading={registering}
            jogoNome="BATALHA NAVAL"
            accentColor={ACCENT}
          />
        )}

        {/* ============ SETUP ============ */}
        {screen === "setup" && (
          <SetupScreen
            playerShips={playerShips}
            selectedShipDef={selectedShipDef}
            horizontal={horizontal}
            onSelectShipDef={handleSelectShipDef}
            onToggleRotation={handleToggleRotation}
            onCellClick={handlePlacementCellClick}
            onCellHover={(r, c) => setHoverCell({ r, c })}
            onCellLeave={() => setHoverCell(null)}
            onRandom={handleRandomPlacement}
            onClear={handleClearPlacement}
            onReady={handleReady}
            hoverCell={hoverCell}
            cellSize={mainCellSize}
          />
        )}

        {/* ============ BATTLE ============ */}
        {screen === "battle" && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            animation: battleShake ? "bn-shake 0.3s" : "none",
            position: "relative",
          }}>
            {/* HUD */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "0 8px", marginBottom: 8,
            }}>
              {/* Turn indicator */}
              <div style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                color: turn === "player" ? "#4ade80" : "#94a3b8",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: turn === "player" ? "#4ade80" : "#94a3b8",
                  display: "inline-block",
                  animation: turn === "player" ? "bn-pulse 1s infinite" : "none",
                }} />
                {turn === "player" ? "SUA VEZ" : "VEZ DO OPONENTE"}
              </div>

              {/* Pause button */}
              <button
                onClick={handlePause}
                style={{
                  fontFamily: "'Fira Code', monospace", fontSize: 10,
                  padding: "4px 10px", background: "#0f172a",
                  color: "#64748b", border: "1px solid #1e293b",
                  borderRadius: 4, cursor: "pointer",
                }}
              >II</button>
            </div>

            {/* Ships remaining */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              width: "100%", padding: "0 8px", marginBottom: 6,
            }}>
              <span style={{
                fontFamily: "'Fira Code', monospace", fontSize: 9,
                color: "#64748b",
              }}>Seus: <span style={{ color: "#22c55e" }}>{playerRemaining}/{TOTAL_SHIPS}</span></span>
              <span style={{
                fontFamily: "'Fira Code', monospace", fontSize: 9,
                color: "#64748b",
              }}>Inimigo: <span style={{ color: "#ef4444" }}>{aiRemaining}/{TOTAL_SHIPS}</span></span>
            </div>

            {/* AI thinking indicator */}
            {aiThinking && (
              <div style={{
                fontFamily: "'Fira Code', monospace", fontSize: 10,
                color: "#94a3b8", marginBottom: 6,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>Oponente pensando</span>
                <span style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: "#94a3b8",
                      animation: `bn-thinkingDots 1s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </span>
              </div>
            )}

            {/* Main grid (opponent) and Mini grid (player) */}
            {!swappedGrids ? (
              <>
                {/* Opponent grid (main) */}
                <div style={{ marginBottom: 4 }}>
                  <p style={{
                    fontFamily: "'Fira Code', monospace", fontSize: 9,
                    color: "#ef4444", textAlign: "center", marginBottom: 4,
                  }}>TABULEIRO INIMIGO</p>
                  <BattleGridOpponent
                    trackingGrid={playerTracking}
                    sunkShips={sunkShipsOpponent}
                    onCellClick={handlePlayerAttack}
                    onCellHover={(r, c) => setHoverCell({ r, c })}
                    onCellLeave={() => setHoverCell(null)}
                    hoverCell={hoverCell}
                    cellSize={mainCellSize}
                    disabled={turn !== "player" || !!gameResult}
                    animatingCell={animatingCell && !animatingCell.isAi ? animatingCell : null}
                    lastSunkShip={lastSunkShip}
                  />
                </div>

                {/* Mobile confirm */}
                {mobileConfirm && turn === "player" && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    marginBottom: 6, padding: "6px 12px",
                    background: "#0f172a", border: "1px solid #334155",
                    borderRadius: 6,
                  }}>
                    <span style={{
                      fontFamily: "'Fira Code', monospace", fontSize: 10,
                      color: "#e2e8f0",
                    }}>{cellLabel(mobileConfirm.r, mobileConfirm.c)} — Atacar?</span>
                    <button
                      onClick={() => handlePlayerAttack(mobileConfirm.r, mobileConfirm.c)}
                      style={{
                        fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                        padding: "6px 14px", background: "#dc2626",
                        color: "#fff", border: "none", borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >FOGO!</button>
                  </div>
                )}

                {/* Player grid (mini) */}
                <div>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 4,
                  }}>
                    <p style={{
                      fontFamily: "'Fira Code', monospace", fontSize: 8,
                      color: "#64748b",
                    }}>SEU TABULEIRO</p>
                    <button
                      onClick={() => setSwappedGrids(true)}
                      style={{
                        fontFamily: "'Fira Code', monospace", fontSize: 8,
                        padding: "3px 8px", background: "#0f172a",
                        color: "#64748b", border: "1px solid #1e293b",
                        borderRadius: 3, cursor: "pointer",
                      }}
                    >AMPLIAR</button>
                  </div>
                  <BattleGridPlayer
                    playerShips={playerShips}
                    incomingAttacks={aiTracking}
                    cellSize={miniCellSize}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Player grid (main) */}
                <div style={{ marginBottom: 4 }}>
                  <p style={{
                    fontFamily: "'Fira Code', monospace", fontSize: 9,
                    color: "#22c55e", textAlign: "center", marginBottom: 4,
                  }}>SEU TABULEIRO</p>
                  <BattleGridPlayer
                    playerShips={playerShips}
                    incomingAttacks={aiTracking}
                    cellSize={mainCellSize}
                  />
                </div>

                {/* Opponent grid (mini) */}
                <div>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 4,
                  }}>
                    <p style={{
                      fontFamily: "'Fira Code', monospace", fontSize: 8,
                      color: "#64748b",
                    }}>TABULEIRO INIMIGO</p>
                    <button
                      onClick={() => setSwappedGrids(false)}
                      style={{
                        fontFamily: "'Fira Code', monospace", fontSize: 8,
                        padding: "3px 8px", background: "#0f172a",
                        color: "#64748b", border: "1px solid #1e293b",
                        borderRadius: 3, cursor: "pointer",
                      }}
                    >AMPLIAR</button>
                  </div>
                  <BattleGridOpponent
                    trackingGrid={playerTracking}
                    sunkShips={sunkShipsOpponent}
                    onCellClick={handlePlayerAttack}
                    onCellHover={(r, c) => setHoverCell({ r, c })}
                    onCellLeave={() => setHoverCell(null)}
                    hoverCell={hoverCell}
                    cellSize={miniCellSize}
                    disabled={turn !== "player" || !!gameResult}
                    animatingCell={null}
                    lastSunkShip={null}
                  />
                </div>
              </>
            )}

            {/* Last move log */}
            {lastMoveLog && (
              <p style={{
                fontFamily: "'Fira Code', monospace", fontSize: 9,
                color: lastMoveLog.includes("afundou") ? "#ef4444"
                  : lastMoveLog.includes("Acertou") || lastMoveLog.includes("acertou") ? "#f59e0b"
                  : "#64748b",
                marginTop: 8, textAlign: "center",
              }}>{lastMoveLog}</p>
            )}

            {/* Confetti on pending win */}
            {showConfetti && <ConfettiOverlay />}
          </div>
        )}

        {/* ============ PAUSED ============ */}
        {screen === "paused" && (
          <div style={{ position: "relative", minHeight: 300 }}>
            <PauseOverlay onContinue={handleContinue} onExit={handleMenu} />
          </div>
        )}

        {/* ============ GAME OVER ============ */}
        {screen === "gameover" && (
          <>
            {showConfetti && <ConfettiOverlay />}
            <GameOverScreen
              won={gameResult === "win"}
              stats={gameStats}
              playerShips={playerShips}
              aiShips={aiShips}
              playerTracking={playerTracking}
              aiTracking={aiTracking}
              onRestart={handleRestart}
              onMenu={handleMenu}
              cellSize={mainCellSize}
            />
          </>
        )}

        {/* ============ ONLINE LOBBY ============ */}
        {screen === "online-lobby" && (
          <OnlineLobby
            roomId={roomId}
            lobbyStatus={lobbyStatus}
            opponentReady={onlineOpponentReady}
            onCreate={handleCreateRoom}
            onJoin={handleJoinRoom}
            onCancel={handleOnlineMenu}
          />
        )}

        {/* ============ ONLINE SETUP ============ */}
        {screen === "online-setup" && (
          <SetupScreen
            playerShips={playerShips}
            selectedShipDef={selectedShipDef}
            horizontal={horizontal}
            onSelectShipDef={handleSelectShipDef}
            onToggleRotation={handleToggleRotation}
            onCellClick={handlePlacementCellClick}
            onCellHover={(r, c) => setHoverCell({ r, c })}
            onCellLeave={() => setHoverCell(null)}
            onRandom={handleRandomPlacement}
            onClear={handleClearPlacement}
            onReady={handleOnlineReady}
            hoverCell={hoverCell}
            cellSize={mainCellSize}
          />
        )}

        {/* ============ ONLINE WAITING ============ */}
        {screen === "online-waiting" && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "40px 16px", animation: "bn-fadeIn 0.4s ease",
          }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>{"\u2693"}</div>
            <p style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 11,
              color: ONLINE_ACCENT, textShadow: `0 0 10px ${ONLINE_ACCENT}`,
              marginBottom: 16, textAlign: "center",
            }}>NAVIOS POSICIONADOS!</p>
            <p style={{
              fontFamily: "'Fira Code', monospace", fontSize: 10,
              color: "#94a3b8", textAlign: "center",
              animation: "bn-pulse 1.5s infinite",
            }}>Aguardando oponente posicionar...</p>
          </div>
        )}

        {/* ============ ONLINE BATTLE ============ */}
        {screen === "online-battle" && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            animation: battleShake ? "bn-shake 0.3s" : "none",
            position: "relative",
          }}>
            {/* HUD */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              width: "100%", padding: "0 8px", marginBottom: 8,
            }}>
              <div style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                color: onlineTurn === playerNum ? "#4ade80" : "#94a3b8",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: onlineTurn === playerNum ? "#4ade80" : "#94a3b8",
                  display: "inline-block",
                  animation: onlineTurn === playerNum ? "bn-pulse 1s infinite" : "none",
                }} />
                {onlineTurn === playerNum ? "SUA VEZ" : "VEZ DO OPONENTE"}
              </div>
              <span style={{
                fontFamily: "'Press Start 2P', monospace", fontSize: 7,
                color: ONLINE_ACCENT, textShadow: `0 0 6px ${ONLINE_ACCENT}`,
              }}>ONLINE</span>
            </div>

            {/* Ships remaining */}
            <div style={{
              display: "flex", justifyContent: "space-between",
              width: "100%", padding: "0 8px", marginBottom: 6,
            }}>
              <span style={{
                fontFamily: "'Fira Code', monospace", fontSize: 9,
                color: "#64748b",
              }}>Seus: <span style={{ color: "#22c55e" }}>{playerShips.filter(s => !s.sunk).length}/{TOTAL_SHIPS}</span></span>
              <span style={{
                fontFamily: "'Fira Code', monospace", fontSize: 9,
                color: "#64748b",
              }}>Inimigo: <span style={{ color: "#ef4444" }}>{TOTAL_SHIPS - onlineSunkOpponent.length}/{TOTAL_SHIPS}</span></span>
            </div>

            {/* Waiting for opponent indicator */}
            {onlineTurn !== playerNum && (
              <div style={{
                fontFamily: "'Fira Code', monospace", fontSize: 10,
                color: "#94a3b8", marginBottom: 6,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>Oponente pensando</span>
                <span style={{ display: "flex", gap: 3 }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: "#94a3b8",
                      animation: `bn-thinkingDots 1s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </span>
              </div>
            )}

            {/* Main grid (opponent) and Mini grid (player) */}
            {!swappedGrids ? (
              <>
                <div style={{ marginBottom: 4 }}>
                  <p style={{
                    fontFamily: "'Fira Code', monospace", fontSize: 9,
                    color: "#ef4444", textAlign: "center", marginBottom: 4,
                  }}>TABULEIRO INIMIGO</p>
                  <BattleGridOpponent
                    trackingGrid={onlineTracking}
                    sunkShips={onlineSunkOpponent}
                    onCellClick={handleOnlineAttack}
                    onCellHover={(r, c) => setHoverCell({ r, c })}
                    onCellLeave={() => setHoverCell(null)}
                    hoverCell={hoverCell}
                    cellSize={mainCellSize}
                    disabled={onlineTurn !== playerNum || !!onlineGameResult}
                    animatingCell={animatingCell && !animatingCell.isAi ? animatingCell : null}
                    lastSunkShip={lastSunkShip}
                  />
                </div>

                {/* Mobile confirm */}
                {mobileConfirm && onlineTurn === playerNum && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    marginBottom: 6, padding: "6px 12px",
                    background: "#0f172a", border: "1px solid #334155",
                    borderRadius: 6,
                  }}>
                    <span style={{
                      fontFamily: "'Fira Code', monospace", fontSize: 10,
                      color: "#e2e8f0",
                    }}>{cellLabel(mobileConfirm.r, mobileConfirm.c)} — Atacar?</span>
                    <button
                      onClick={() => handleOnlineAttack(mobileConfirm.r, mobileConfirm.c)}
                      style={{
                        fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                        padding: "6px 14px", background: "#dc2626",
                        color: "#fff", border: "none", borderRadius: 4,
                        cursor: "pointer",
                      }}
                    >FOGO!</button>
                  </div>
                )}

                <div>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 4,
                  }}>
                    <p style={{
                      fontFamily: "'Fira Code', monospace", fontSize: 8,
                      color: "#64748b",
                    }}>SEU TABULEIRO</p>
                    <button
                      onClick={() => setSwappedGrids(true)}
                      style={{
                        fontFamily: "'Fira Code', monospace", fontSize: 8,
                        padding: "3px 8px", background: "#0f172a",
                        color: "#64748b", border: "1px solid #1e293b",
                        borderRadius: 3, cursor: "pointer",
                      }}
                    >AMPLIAR</button>
                  </div>
                  <BattleGridPlayer
                    playerShips={playerShips}
                    incomingAttacks={onlineIncoming}
                    cellSize={miniCellSize}
                  />
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 4 }}>
                  <p style={{
                    fontFamily: "'Fira Code', monospace", fontSize: 9,
                    color: "#22c55e", textAlign: "center", marginBottom: 4,
                  }}>SEU TABULEIRO</p>
                  <BattleGridPlayer
                    playerShips={playerShips}
                    incomingAttacks={onlineIncoming}
                    cellSize={mainCellSize}
                  />
                </div>

                <div>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: 4,
                  }}>
                    <p style={{
                      fontFamily: "'Fira Code', monospace", fontSize: 8,
                      color: "#64748b",
                    }}>TABULEIRO INIMIGO</p>
                    <button
                      onClick={() => setSwappedGrids(false)}
                      style={{
                        fontFamily: "'Fira Code', monospace", fontSize: 8,
                        padding: "3px 8px", background: "#0f172a",
                        color: "#64748b", border: "1px solid #1e293b",
                        borderRadius: 3, cursor: "pointer",
                      }}
                    >AMPLIAR</button>
                  </div>
                  <BattleGridOpponent
                    trackingGrid={onlineTracking}
                    sunkShips={onlineSunkOpponent}
                    onCellClick={handleOnlineAttack}
                    onCellHover={(r, c) => setHoverCell({ r, c })}
                    onCellLeave={() => setHoverCell(null)}
                    hoverCell={hoverCell}
                    cellSize={miniCellSize}
                    disabled={onlineTurn !== playerNum || !!onlineGameResult}
                    animatingCell={null}
                    lastSunkShip={null}
                  />
                </div>
              </>
            )}

            {/* Last move log */}
            {lastMoveLog && (
              <p style={{
                fontFamily: "'Fira Code', monospace", fontSize: 9,
                color: lastMoveLog.includes("afundou") ? "#ef4444"
                  : lastMoveLog.includes("Acertou") || lastMoveLog.includes("acertou") ? "#f59e0b"
                  : "#64748b",
                marginTop: 8, textAlign: "center",
              }}>{lastMoveLog}</p>
            )}

            {showConfetti && <ConfettiOverlay />}
          </div>
        )}

        {/* ============ ONLINE GAME OVER ============ */}
        {screen === "online-gameover" && (
          <>
            {showConfetti && <ConfettiOverlay />}
            <OnlineGameOverScreen
              won={onlineGameResult === "win"}
              stats={{
                totalShots: onlineStatsRef.current.totalShots,
                hits: onlineStatsRef.current.hits,
                accuracy: onlineStatsRef.current.totalShots > 0
                  ? Math.round((onlineStatsRef.current.hits / onlineStatsRef.current.totalShots) * 100) : 0,
                shipsSunk: onlineStatsRef.current.shipsSunk,
              }}
              playerShips={playerShips}
              opponentShips={onlineOpponentShips}
              playerTracking={onlineTracking}
              opponentTracking={onlineIncoming}
              onRematch={handleOnlineRematch}
              onMenu={handleOnlineMenu}
              waitingRematch={waitingRematch}
              cellSize={mainCellSize}
              disconnected={onlineDisconnected}
            />
          </>
        )}
      </div>

      {/* Bottom ad */}
      <AdBanner slot="batalha-naval_bottom" style={{ marginTop: 16, maxWidth: GAME_W }} />
    </div>
  );
}
