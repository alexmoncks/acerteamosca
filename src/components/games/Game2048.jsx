"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

const WS_URL = process.env.NEXT_PUBLIC_WS_2048_URL || "ws://localhost:3005";

const GAME_W = 400;
const GAME_H = 580;
const COLOR_BG = "#050510";
const ACCENT = "#edc22e";
const ACCENT2 = "#f2b179";
const NEON_GREEN = "#39ff14";
const ONLINE_ACCENT = "#b026ff";
const GRID_SIZE = 4;

// ---- Tile colors ----
const TILE_COLORS = {
  2:    { bg: "#eee4da", text: "#776e65" },
  4:    { bg: "#ede0c8", text: "#776e65" },
  8:    { bg: "#f2b179", text: "#f9f6f2" },
  16:   { bg: "#f59563", text: "#f9f6f2" },
  32:   { bg: "#f67c5f", text: "#f9f6f2" },
  64:   { bg: "#f65e3b", text: "#f9f6f2" },
  128:  { bg: "#edcf72", text: "#f9f6f2" },
  256:  { bg: "#edcc61", text: "#f9f6f2" },
  512:  { bg: "#edc850", text: "#f9f6f2" },
  1024: { bg: "#edc53f", text: "#f9f6f2" },
  2048: { bg: "#edc22e", text: "#f9f6f2" },
};

function getTileColor(value) {
  return TILE_COLORS[value] || { bg: "#3c3a32", text: "#f9f6f2" };
}

function getTileFontSize(value) {
  if (value >= 1024) return 18;
  if (value >= 128) return 22;
  return 26;
}

// ---- Grid helpers ----
function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

function getEmptyCells(grid) {
  const cells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) cells.push([r, c]);
    }
  }
  return cells;
}

function addRandomTile(grid) {
  const empty = getEmptyCells(grid);
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = cloneGrid(grid);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function initGrid() {
  let grid = createEmptyGrid();
  grid = addRandomTile(grid);
  grid = addRandomTile(grid);
  return grid;
}

// ---- Move logic ----
function slideRow(row) {
  const filtered = row.filter((v) => v !== 0);
  const merged = [];
  let score = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i++;
    }
  }
  while (merged.length < GRID_SIZE) merged.push(0);
  return { row: merged, score };
}

function moveLeft(grid) {
  let totalScore = 0;
  const newGrid = grid.map((row) => {
    const { row: newRow, score } = slideRow(row);
    totalScore += score;
    return newRow;
  });
  return { grid: newGrid, score: totalScore };
}

function rotateClockwise(grid) {
  const n = GRID_SIZE;
  const rotated = createEmptyGrid();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      rotated[c][n - 1 - r] = grid[r][c];
    }
  }
  return rotated;
}

function rotateCounterClockwise(grid) {
  const n = GRID_SIZE;
  const rotated = createEmptyGrid();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      rotated[n - 1 - c][r] = grid[r][c];
    }
  }
  return rotated;
}

function moveRight(grid) {
  let g = rotateClockwise(rotateClockwise(grid));
  const result = moveLeft(g);
  g = rotateClockwise(rotateClockwise(result.grid));
  return { grid: g, score: result.score };
}

function moveUp(grid) {
  let g = rotateCounterClockwise(grid);
  const result = moveLeft(g);
  g = rotateClockwise(result.grid);
  return { grid: g, score: result.score };
}

function moveDown(grid) {
  let g = rotateClockwise(grid);
  const result = moveLeft(g);
  g = rotateCounterClockwise(result.grid);
  return { grid: g, score: result.score };
}

function gridsEqual(a, b) {
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function hasMovesLeft(grid) {
  // Check empty cells
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 0) return true;
    }
  }
  // Check adjacent merges
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const val = grid[r][c];
      if (c + 1 < GRID_SIZE && grid[r][c + 1] === val) return true;
      if (r + 1 < GRID_SIZE && grid[r + 1][c] === val) return true;
    }
  }
  return false;
}

function getMaxTile(grid) {
  let max = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] > max) max = grid[r][c];
    }
  }
  return max;
}

function performMove(grid, direction) {
  const moveFn = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown }[direction];
  if (!moveFn) return null;
  const result = moveFn(grid);
  if (gridsEqual(grid, result.grid)) return null;
  return result;
}

// ---- Menu Screen ----
function MenuScreen({ onStart, onOnline }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: COLOR_BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <h1
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 36,
          color: ACCENT,
          textShadow: `0 0 20px ${ACCENT}80, 0 0 40px ${ACCENT}40`,
          marginBottom: 8,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        2048
      </h1>
      <p
        style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: 12,
          color: "#8892b0",
          marginBottom: 36,
          textAlign: "center",
        }}
      >
        Junte os numeros e chegue ao 2048!
      </p>

      {/* Animated tile preview */}
      <div style={{ display: "flex", gap: 8, marginBottom: 36 }}>
        {[2, 8, 64, 2048].map((val, i) => {
          const tc = getTileColor(val);
          return (
            <div
              key={val}
              style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: val >= 1024 ? 12 : 16,
                fontFamily: "'Press Start 2P', monospace",
                fontWeight: "bold",
                background: tc.bg,
                color: tc.text,
                boxShadow: `0 0 15px ${tc.bg}60`,
                animation: `popIn 0.5s ${i * 0.12}s both`,
              }}
            >
              {val}
            </div>
          );
        })}
      </div>

      {/* Solo play button */}
      <button
        onClick={onStart}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 13,
          padding: "14px 36px",
          background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 12,
          boxShadow: `0 0 25px ${ACCENT}40`,
          transition: "all 0.2s",
          letterSpacing: 1,
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.05)";
          e.target.style.boxShadow = `0 0 35px ${ACCENT}60`;
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = `0 0 25px ${ACCENT}40`;
        }}
      >
        Jogar Solo
      </button>

      {/* Online button */}
      <button
        onClick={onOnline}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10,
          padding: "10px 28px",
          background: `linear-gradient(135deg, ${ONLINE_ACCENT}, #5b21b6)`,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          letterSpacing: 1,
          boxShadow: `0 0 20px ${ONLINE_ACCENT}40`,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "scale(1.05)";
          e.target.style.boxShadow = `0 0 30px ${ONLINE_ACCENT}60`;
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
          e.target.style.boxShadow = `0 0 20px ${ONLINE_ACCENT}40`;
        }}
      >
        Jogar Online
      </button>
    </div>
  );
}

// ---- Online Lobby Screen ----
function OnlineLobby({ roomId, lobbyStatus, onCreate, onJoin, onCancel }) {
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
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5,5,16,0.97)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 300,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 16 }}>{"🌐"}</div>

      {lobbyStatus === "idle" && (
        <>
          <p
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 12,
              color: ONLINE_ACCENT,
              textShadow: `0 0 10px ${ONLINE_ACCENT}`,
              marginBottom: 24,
            }}
          >
            ONLINE
          </p>

          {/* Create room */}
          <button
            onClick={onCreate}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 10,
              padding: "12px 28px",
              background: `linear-gradient(135deg, ${ONLINE_ACCENT}, #5b21b6)`,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              marginBottom: 16,
              boxShadow: `0 0 20px ${ONLINE_ACCENT}40`,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; }}
            onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
          >
            Criar Sala
          </button>

          {/* Divider */}
          <div
            style={{
              width: 200,
              height: 1,
              background: "#2a2a4a",
              marginBottom: 16,
            }}
          />

          {/* Join room */}
          <p
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              color: "#8892b0",
              marginBottom: 10,
            }}
          >
            ENTRAR EM SALA
          </p>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="CODIGO"
            maxLength={6}
            style={{
              width: 200,
              padding: "10px 12px",
              background: "#111127",
              border: "1px solid #2a2a4a",
              borderRadius: 6,
              color: "#e0e0ff",
              fontSize: 14,
              fontFamily: "'Press Start 2P', monospace",
              textAlign: "center",
              letterSpacing: 4,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 8,
            }}
            onFocus={(e) => { e.target.style.borderColor = ONLINE_ACCENT; }}
            onBlur={(e) => { e.target.style.borderColor = "#2a2a4a"; }}
          />
          <button
            onClick={() => joinCode.length >= 4 && onJoin(joinCode)}
            disabled={joinCode.length < 4}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
              padding: "10px 24px",
              background: joinCode.length >= 4 ? ONLINE_ACCENT : "#2a2a4a",
              color: joinCode.length >= 4 ? "#fff" : "#555",
              border: "none",
              borderRadius: 6,
              cursor: joinCode.length >= 4 ? "pointer" : "not-allowed",
              marginBottom: 16,
            }}
          >
            ENTRAR
          </button>
        </>
      )}

      {lobbyStatus === "creating" && (
        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            color: ONLINE_ACCENT,
            textShadow: `0 0 10px ${ONLINE_ACCENT}`,
          }}
        >
          CONECTANDO...
        </p>
      )}

      {lobbyStatus === "waiting" && (
        <>
          <p
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 10,
              color: ONLINE_ACCENT,
              marginBottom: 20,
              textShadow: `0 0 10px ${ONLINE_ACCENT}`,
            }}
          >
            AGUARDANDO OPONENTE...
          </p>
          <div
            onClick={handleCopyLink}
            style={{
              background: "#111127",
              border: `2px solid ${copied ? NEON_GREEN : ONLINE_ACCENT}`,
              borderRadius: 10,
              padding: "16px 28px",
              marginBottom: 16,
              cursor: "pointer",
              transition: "border-color 0.3s",
            }}
          >
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 7,
                color: "#555",
                marginBottom: 8,
              }}
            >
              CODIGO DA SALA
            </p>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 28,
                color: ONLINE_ACCENT,
                textShadow: `0 0 15px ${ONLINE_ACCENT}`,
                letterSpacing: 8,
              }}
            >
              {roomId}
            </p>
          </div>
          <p
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 10,
              color: copied ? NEON_GREEN : "#666",
              transition: "color 0.3s",
            }}
          >
            {copied ? "LINK COPIADO!" : "Toque no codigo para copiar o link"}
          </p>
        </>
      )}

      {lobbyStatus === "joining" && (
        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            color: ONLINE_ACCENT,
            textShadow: `0 0 10px ${ONLINE_ACCENT}`,
          }}
        >
          ENTRANDO NA SALA...
        </p>
      )}

      {lobbyStatus === "error" && (
        <p
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 10,
            color: "#ff2d95",
            marginBottom: 12,
          }}
        >
          SALA NAO ENCONTRADA
        </p>
      )}

      <button
        onClick={onCancel}
        style={{
          marginTop: 20,
          padding: "10px 24px",
          background: "transparent",
          border: "1px solid #555",
          borderRadius: 6,
          color: "#555",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 9,
          cursor: "pointer",
        }}
      >
        CANCELAR
      </button>
    </div>
  );
}

// ---- Tile Component ----
function Tile({ value, isNew, isMerged }) {
  const tc = getTileColor(value);
  const fs = getTileFontSize(value);

  let animation = "";
  if (isNew) animation = "tileAppear 0.2s ease forwards";
  else if (isMerged) animation = "tilePop 0.2s ease forwards";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: tc.bg,
        color: tc.text,
        fontSize: fs,
        fontFamily: "'Press Start 2P', monospace",
        fontWeight: "bold",
        animation,
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {value}
    </div>
  );
}

// ---- Grid Board Component ----
function GridBoard({ grid, newTiles, mergedTiles }) {
  const cellSize = 80;
  const gap = 8;
  const boardSize = cellSize * GRID_SIZE + gap * (GRID_SIZE + 1);

  return (
    <div
      style={{
        width: boardSize,
        height: boardSize,
        background: "#1a1a2e",
        borderRadius: 10,
        padding: gap,
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
        gap: gap,
        position: "relative",
      }}
    >
      {grid.map((row, r) =>
        row.map((val, c) => {
          const key = `${r}-${c}`;
          const isNew = newTiles.has(key);
          const isMerged = mergedTiles.has(key);
          return (
            <div
              key={key}
              style={{
                width: cellSize,
                height: cellSize,
                borderRadius: 6,
                background: val === 0 ? "#0d0d1f" : "transparent",
              }}
            >
              {val !== 0 && (
                <Tile value={val} isNew={isNew} isMerged={isMerged} />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ---- Arrow Pad for Mobile ----
function ArrowPad({ onMove, accent }) {
  const btnStyle = (dir) => ({
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1a1a2e",
    border: `2px solid ${accent}40`,
    borderRadius: 8,
    color: accent,
    fontSize: 22,
    cursor: "pointer",
    userSelect: "none",
    fontFamily: "'Fira Code', monospace",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
  });

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 4, marginTop: 10,
    }}>
      <button onClick={() => onMove("up")} style={btnStyle("up")}>{"▲"}</button>
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={() => onMove("left")} style={btnStyle("left")}>{"◀"}</button>
        <button onClick={() => onMove("down")} style={btnStyle("down")}>{"▼"}</button>
        <button onClick={() => onMove("right")} style={btnStyle("right")}>{"▶"}</button>
      </div>
    </div>
  );
}

// ---- Main Component ----
export default function Game2048() {
  const { user, checkedCookie, registering, register } = useJogador("2048");
  const gameScale = useGameScale(GAME_W);

  // ---- Screen state ----
  const [screen, setScreen] = useState("menu");
  // screens: menu | playing | online-lobby | online-playing | online-finished
  const [showRegister, setShowRegister] = useState(false);

  // ---- Solo state ----
  const [grid, setGrid] = useState(() => initGrid());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [gameLost, setGameLost] = useState(false);
  const [newTiles, setNewTiles] = useState(new Set());
  const [mergedTiles, setMergedTiles] = useState(new Set());

  // ---- Online state ----
  const wsRef = useRef(null);
  const [roomId, setRoomId] = useState("");
  const [lobbyStatus, setLobbyStatus] = useState("idle");
  const [playerNum, setPlayerNum] = useState(-1);
  const [opponentScore, setOpponentScore] = useState(0);
  const [onlineResult, setOnlineResult] = useState(null); // "win" | "lose" | null
  const [onlineGrid, setOnlineGrid] = useState(() => initGrid());
  const [onlineScore, setOnlineScore] = useState(0);
  const [onlineWon, setOnlineWon] = useState(false);
  const [onlineLost, setOnlineLost] = useState(false);
  const [onlineNewTiles, setOnlineNewTiles] = useState(new Set());
  const [onlineMergedTiles, setOnlineMergedTiles] = useState(new Set());

  const pendingOnlineRef = useRef(null);
  const autoJoinRef = useRef(false);
  const touchRef = useRef(null);
  const scoreSubmittedRef = useRef(false);

  // ---- Load best score from localStorage ----
  useEffect(() => {
    try {
      const saved = localStorage.getItem("2048_best");
      if (saved) setBestScore(parseInt(saved, 10) || 0);
    } catch {}
  }, []);

  // ---- Save best score ----
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      try {
        localStorage.setItem("2048_best", String(score));
      } catch {}
    }
  }, [score, bestScore]);

  // ---- Solo: process move ----
  const processMove = useCallback((direction, currentGrid, currentScore, setGridFn, setScoreFn, setNewFn, setMergedFn) => {
    const result = performMove(currentGrid, direction);
    if (!result) return { grid: currentGrid, score: currentScore, moved: false };

    // Determine which tiles merged (cells that changed and have a value > original)
    const merged = new Set();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (result.grid[r][c] !== 0 && result.grid[r][c] !== currentGrid[r][c] && result.grid[r][c] > currentGrid[r][c]) {
          merged.add(`${r}-${c}`);
        }
      }
    }

    // Add new random tile
    const withNewTile = addRandomTile(result.grid);

    // Determine which cell is the new tile
    const newCells = new Set();
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (withNewTile[r][c] !== 0 && result.grid[r][c] === 0) {
          newCells.add(`${r}-${c}`);
        }
      }
    }

    const newScore = currentScore + result.score;
    setGridFn(withNewTile);
    setScoreFn(newScore);
    setNewFn(newCells);
    setMergedFn(merged);

    // Clear animations after delay
    setTimeout(() => {
      setNewFn(new Set());
      setMergedFn(new Set());
    }, 250);

    return { grid: withNewTile, score: newScore, moved: true };
  }, []);

  // ---- Solo: handle move ----
  const handleSoloMove = useCallback((direction) => {
    if (gameWon || gameLost) return;

    setGrid((prevGrid) => {
      const result = performMove(prevGrid, direction);
      if (!result) return prevGrid;

      const merged = new Set();
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (result.grid[r][c] !== 0 && result.grid[r][c] !== prevGrid[r][c] && result.grid[r][c] > prevGrid[r][c]) {
            merged.add(`${r}-${c}`);
          }
        }
      }

      const withNewTile = addRandomTile(result.grid);
      const newCells = new Set();
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (withNewTile[r][c] !== 0 && result.grid[r][c] === 0) {
            newCells.add(`${r}-${c}`);
          }
        }
      }

      setScore((prev) => {
        const newScore = prev + result.score;
        return newScore;
      });
      setNewTiles(newCells);
      setMergedTiles(merged);
      setTimeout(() => {
        setNewTiles(new Set());
        setMergedTiles(new Set());
      }, 250);

      // Check win
      if (getMaxTile(withNewTile) >= 2048) {
        setGameWon(true);
      }
      // Check lose
      if (!hasMovesLeft(withNewTile)) {
        setGameLost(true);
      }

      return withNewTile;
    });
  }, [gameWon, gameLost]);

  // ---- Online: handle move ----
  const handleOnlineMove = useCallback((direction) => {
    if (onlineWon || onlineLost || onlineResult) return;

    setOnlineGrid((prevGrid) => {
      const result = performMove(prevGrid, direction);
      if (!result) return prevGrid;

      const merged = new Set();
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (result.grid[r][c] !== 0 && result.grid[r][c] !== prevGrid[r][c] && result.grid[r][c] > prevGrid[r][c]) {
            merged.add(`${r}-${c}`);
          }
        }
      }

      const withNewTile = addRandomTile(result.grid);
      const newCells = new Set();
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (withNewTile[r][c] !== 0 && result.grid[r][c] === 0) {
            newCells.add(`${r}-${c}`);
          }
        }
      }

      setOnlineScore((prev) => {
        const newScore = prev + result.score;
        // Send score update to server
        const ws = wsRef.current;
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: "score_update", score: newScore }));
        }
        return newScore;
      });
      setOnlineNewTiles(newCells);
      setOnlineMergedTiles(merged);
      setTimeout(() => {
        setOnlineNewTiles(new Set());
        setOnlineMergedTiles(new Set());
      }, 250);

      // Check win (reached 2048)
      if (getMaxTile(withNewTile) >= 2048) {
        setOnlineWon(true);
        const ws = wsRef.current;
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: "reached_2048" }));
        }
      }

      // Check lose (no moves)
      if (!hasMovesLeft(withNewTile)) {
        setOnlineLost(true);
        const ws = wsRef.current;
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: "game_over" }));
        }
      }

      return withNewTile;
    });
  }, [onlineWon, onlineLost, onlineResult]);

  // ---- Key handler ----
  useEffect(() => {
    const handleKeyDown = (e) => {
      const dirMap = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      const direction = dirMap[e.key];
      if (!direction) return;
      e.preventDefault();

      if (screen === "playing") {
        handleSoloMove(direction);
      } else if (screen === "online-playing") {
        handleOnlineMove(direction);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [screen, handleSoloMove, handleOnlineMove]);

  // ---- Touch/swipe handler ----
  useEffect(() => {
    const handleTouchStart = (e) => {
      if (screen !== "playing" && screen !== "online-playing") return;
      const touch = e.touches[0];
      touchRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e) => {
      if (!touchRef.current) return;
      if (screen !== "playing" && screen !== "online-playing") return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchRef.current.x;
      const dy = touch.clientY - touchRef.current.y;
      touchRef.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const threshold = 30;

      if (Math.max(absDx, absDy) < threshold) return;

      let direction;
      if (absDx > absDy) {
        direction = dx > 0 ? "right" : "left";
      } else {
        direction = dy > 0 ? "down" : "up";
      }

      if (screen === "playing") {
        handleSoloMove(direction);
      } else if (screen === "online-playing") {
        handleOnlineMove(direction);
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [screen, handleSoloMove, handleOnlineMove]);

  // ---- Submit solo score ----
  useEffect(() => {
    if ((gameWon || gameLost) && !scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      const maiorTile = getMaxTile(grid);

      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pontos: score,
          jogo: "2048",
          metadata: {
            maiorTile,
            modo: "solo",
          },
        }),
      }).catch(() => {});

      window.gtag?.("event", "game_end", {
        game_name: "2048",
        score,
        max_tile: maiorTile,
        mode: "solo",
        won: gameWon,
      });
    }
  }, [gameWon, gameLost, grid, score]);

  // ---- Submit online score ----
  useEffect(() => {
    if (onlineResult && !scoreSubmittedRef.current) {
      scoreSubmittedRef.current = true;
      const maiorTile = getMaxTile(onlineGrid);

      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pontos: onlineScore,
          jogo: "2048",
          metadata: {
            maiorTile,
            modo: "online",
            resultado: onlineResult,
          },
        }),
      }).catch(() => {});

      window.gtag?.("event", "game_end", {
        game_name: "2048",
        score: onlineScore,
        max_tile: maiorTile,
        mode: "online",
        result: onlineResult,
      });
    }
  }, [onlineResult, onlineGrid, onlineScore]);

  // ---- New solo game ----
  const handleNewSoloGame = useCallback(() => {
    setGrid(initGrid());
    setScore(0);
    setGameWon(false);
    setGameLost(false);
    setNewTiles(new Set());
    setMergedTiles(new Set());
    scoreSubmittedRef.current = false;
  }, []);

  // ---- Start solo ----
  const handleStartSolo = useCallback(() => {
    if (!user) {
      pendingOnlineRef.current = "solo";
      setShowRegister(true);
      return;
    }
    handleNewSoloGame();
    setScreen("playing");
    window.gtag?.("event", "game_start", { game_name: "2048", mode: "solo" });
  }, [user, handleNewSoloGame]);

  // ---- Online: connect WS ----
  const connectWS = useCallback((action, code) => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (action === "create") {
        ws.send(JSON.stringify({ type: "create" }));
      } else if (action === "join") {
        ws.send(JSON.stringify({ type: "join", roomId: code }));
      }
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "created":
          setRoomId(msg.roomId);
          setPlayerNum(msg.playerNum);
          setLobbyStatus("waiting");
          break;

        case "joined":
          setPlayerNum(msg.playerNum);
          setLobbyStatus("joined");
          break;

        case "start":
          // Game starts - initialize online grid
          setOnlineGrid(initGrid());
          setOnlineScore(0);
          setOpponentScore(0);
          setOnlineWon(false);
          setOnlineLost(false);
          setOnlineResult(null);
          setOnlineNewTiles(new Set());
          setOnlineMergedTiles(new Set());
          scoreSubmittedRef.current = false;
          setScreen("online-playing");
          setLobbyStatus("idle");
          window.gtag?.("event", "game_start", { game_name: "2048", mode: "online" });
          break;

        case "opponent_score":
          setOpponentScore(msg.score);
          break;

        case "opponent_lost":
          // Opponent ran out of moves - we win
          if (!onlineResult) {
            setOnlineResult("win");
          }
          break;

        case "opponent_won":
          // Opponent reached 2048 - we lose
          if (!onlineResult) {
            setOnlineResult("lose");
          }
          break;

        case "you_win":
          setOnlineResult("win");
          break;

        case "you_lose":
          setOnlineResult("lose");
          break;

        case "opponent_left":
          if (screen === "online-playing" && !onlineResult) {
            setOnlineResult("win");
          } else {
            handleBackToMenu();
          }
          break;

        case "error":
          setLobbyStatus("error");
          setTimeout(() => setLobbyStatus("idle"), 2000);
          break;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    ws.onerror = () => {
      setLobbyStatus("error");
      setTimeout(() => setLobbyStatus("idle"), 2000);
    };
  }, [screen, onlineResult]);

  // ---- Handle online click ----
  const handleOnlineClick = useCallback(() => {
    if (!user) {
      pendingOnlineRef.current = "lobby";
      setShowRegister(true);
      return;
    }
    setScreen("online-lobby");
    setLobbyStatus("idle");
    setRoomId("");
  }, [user]);

  // ---- Create room ----
  const handleCreateRoom = useCallback(() => {
    setLobbyStatus("creating");
    connectWS("create");
  }, [connectWS]);

  // ---- Join room ----
  const handleJoinRoom = useCallback((code) => {
    setLobbyStatus("joining");
    connectWS("join", code);
  }, [connectWS]);

  // ---- Back to menu ----
  const handleBackToMenu = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setScreen("menu");
    setLobbyStatus("idle");
    setRoomId("");
    setPlayerNum(-1);
    setOpponentScore(0);
    setOnlineResult(null);
    setOnlineWon(false);
    setOnlineLost(false);
    scoreSubmittedRef.current = false;
  }, []);

  // ---- Handle registration ----
  const handleRegister = useCallback(
    async (userData) => {
      const result = await register(userData);
      if (result && !result.error) {
        setShowRegister(false);
        if (pendingOnlineRef.current === "lobby") {
          pendingOnlineRef.current = null;
          setScreen("online-lobby");
          setLobbyStatus("idle");
          setRoomId("");
        } else if (pendingOnlineRef.current === "auto-join") {
          pendingOnlineRef.current = null;
          const code = pendingOnlineRef.current_code;
          pendingOnlineRef.current_code = null;
          setScreen("online-lobby");
          setLobbyStatus("joining");
          connectWS("join", code);
        } else if (pendingOnlineRef.current === "solo") {
          pendingOnlineRef.current = null;
          handleNewSoloGame();
          setScreen("playing");
          window.gtag?.("event", "game_start", { game_name: "2048", mode: "solo" });
        }
      }
    },
    [register, connectWS, handleNewSoloGame]
  );

  // ---- Auto-join from URL ----
  useEffect(() => {
    if (!checkedCookie || autoJoinRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const sala = params.get("sala");
    if (sala) {
      autoJoinRef.current = true;
      window.history.replaceState({}, "", window.location.pathname);
      if (!user) {
        pendingOnlineRef.current = "auto-join";
        pendingOnlineRef.current_code = sala;
        setShowRegister(true);
      } else {
        setScreen("online-lobby");
        setLobbyStatus("joining");
        connectWS("join", sala);
      }
    }
  }, [checkedCookie, user, connectWS]);

  // ---- Cleanup WS on unmount ----
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ---- Loading guard ----
  if (!checkedCookie) return null;

  const cellSize = 80;
  const gap = 8;
  const boardSize = cellSize * GRID_SIZE + gap * (GRID_SIZE + 1);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLOR_BG,
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
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          40% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes tileAppear {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
        @keyframes tilePop {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(176,38,255,0.2); }
          50% { box-shadow: 0 0 25px rgba(176,38,255,0.5); }
        }
      `}</style>

      {/* Register Modal */}
      {showRegister && (
        <RegisterModal
          onRegister={handleRegister}
          loading={registering}
          jogoNome="2048"
          accentColor={ACCENT}
        />
      )}

      {/* Top ad - hidden during active play */}
      {screen !== "playing" && screen !== "online-playing" && (
        <AdBanner slot="2048_top" style={{ marginBottom: 12, maxWidth: GAME_W }} />
      )}

      {/* Game container */}
      <div style={{ width: GAME_W * gameScale, height: GAME_H * gameScale }}>
      <div
        style={{
          width: GAME_W,
          height: GAME_H,
          position: "relative",
          background: "#0a0a1a",
          border: `2px solid ${ACCENT}30`,
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: `0 0 20px ${ACCENT}15`,
          transform: `scale(${gameScale})`,
          transformOrigin: "top left",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "8px 0",
        }}
      >
        {/* Menu Screen */}
        {screen === "menu" && (
          <MenuScreen
            onStart={handleStartSolo}
            onOnline={handleOnlineClick}
          />
        )}

        {/* Online Lobby */}
        {screen === "online-lobby" && (
          <OnlineLobby
            roomId={roomId}
            lobbyStatus={lobbyStatus}
            onCreate={handleCreateRoom}
            onJoin={handleJoinRoom}
            onCancel={handleBackToMenu}
          />
        )}

        {/* Solo Playing Screen */}
        {screen === "playing" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "fadeIn 0.3s ease",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: boardSize,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={handleBackToMenu}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8892b0",
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 18,
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                  title="Voltar ao menu"
                >
                  {"\u2190"}
                </button>
                <h1
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 20,
                    color: ACCENT,
                    textShadow: `0 0 12px ${ACCENT}60`,
                  }}
                >
                  2048
                </h1>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <div
                  style={{
                    background: "#1a1a2e",
                    borderRadius: 6,
                    padding: "6px 14px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 6,
                      color: "#8892b0",
                      marginBottom: 4,
                    }}
                  >
                    SCORE
                  </p>
                  <p
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 12,
                      color: "#e0e0ff",
                    }}
                  >
                    {score}
                  </p>
                </div>
                <div
                  style={{
                    background: "#1a1a2e",
                    borderRadius: 6,
                    padding: "6px 14px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 6,
                      color: "#8892b0",
                      marginBottom: 4,
                    }}
                  >
                    BEST
                  </p>
                  <p
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 12,
                      color: ACCENT,
                    }}
                  >
                    {bestScore}
                  </p>
                </div>
              </div>
            </div>

            {/* New Game button */}
            <div
              style={{
                width: boardSize,
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 10,
              }}
            >
              <button
                onClick={() => {
                  handleNewSoloGame();
                  scoreSubmittedRef.current = false;
                }}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                  padding: "8px 16px",
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; }}
                onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
              >
                Novo Jogo
              </button>
            </div>

            {/* Grid */}
            <div style={{ position: "relative" }}>
              <GridBoard
                grid={grid}
                newTiles={newTiles}
                mergedTiles={mergedTiles}
              />

              {/* Win overlay */}
              {gameWon && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,180,80,0.5)",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "fadeIn 0.3s ease",
                    zIndex: 10,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 14,
                      color: "#fff",
                      textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      marginBottom: 8,
                      textAlign: "center",
                      lineHeight: 1.6,
                    }}
                  >
                    Voce chegou no 2048!
                  </p>
                  <p
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 18,
                      color: ACCENT,
                      textShadow: `0 0 15px ${ACCENT}`,
                      marginBottom: 16,
                    }}
                  >
                    {score}
                  </p>
                  <button
                    onClick={() => {
                      handleNewSoloGame();
                      scoreSubmittedRef.current = false;
                    }}
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 10,
                      padding: "12px 24px",
                      background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Jogar Novamente
                  </button>
                  <AdBanner slot="2048_between" style={{ marginTop: 12, maxWidth: 300 }} />
                </div>
              )}

              {/* Lose overlay */}
              {gameLost && !gameWon && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(180,0,0,0.5)",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "fadeIn 0.3s ease",
                    zIndex: 10,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 14,
                      color: "#fff",
                      textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      marginBottom: 8,
                      textAlign: "center",
                      lineHeight: 1.6,
                    }}
                  >
                    Sem movimentos!
                  </p>
                  <p
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 18,
                      color: ACCENT,
                      textShadow: `0 0 15px ${ACCENT}`,
                      marginBottom: 16,
                    }}
                  >
                    {score}
                  </p>
                  <button
                    onClick={() => {
                      handleNewSoloGame();
                      scoreSubmittedRef.current = false;
                    }}
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 10,
                      padding: "12px 24px",
                      background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Jogar Novamente
                  </button>
                  <AdBanner slot="2048_between" style={{ marginTop: 12, maxWidth: 300 }} />
                </div>
              )}
            </div>

            {/* Mobile Arrow Controls */}
            <ArrowPad onMove={handleSoloMove} accent={ACCENT} />
          </div>
        )}

        {/* Online Playing Screen */}
        {screen === "online-playing" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "fadeIn 0.3s ease",
            }}
          >
            {/* Online header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: boardSize,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={handleBackToMenu}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#8892b0",
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 18,
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                  title="Voltar ao menu"
                >
                  {"\u2190"}
                </button>
                <h1
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 16,
                    color: ONLINE_ACCENT,
                    textShadow: `0 0 12px ${ONLINE_ACCENT}60`,
                  }}
                >
                  2048
                </h1>
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 7,
                  color: ONLINE_ACCENT,
                  padding: "4px 10px",
                  border: `1px solid ${ONLINE_ACCENT}40`,
                  borderRadius: 4,
                  animation: "pulseGlow 2s infinite",
                }}
              >
                ONLINE
              </div>
            </div>

            {/* Score panels */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: boardSize,
                marginBottom: 10,
                gap: 8,
              }}
            >
              {/* My score */}
              <div
                style={{
                  flex: 1,
                  background: "#1a1a2e",
                  borderRadius: 8,
                  padding: "8px 12px",
                  textAlign: "center",
                  border: `2px solid ${ONLINE_ACCENT}40`,
                }}
              >
                <p
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 6,
                    color: ONLINE_ACCENT,
                    marginBottom: 4,
                  }}
                >
                  VOCE
                </p>
                <p
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 14,
                    color: "#e0e0ff",
                  }}
                >
                  {onlineScore}
                </p>
              </div>

              {/* VS */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 8px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 10,
                    color: "#555",
                  }}
                >
                  VS
                </span>
              </div>

              {/* Opponent score */}
              <div
                style={{
                  flex: 1,
                  background: "#1a1a2e",
                  borderRadius: 8,
                  padding: "8px 12px",
                  textAlign: "center",
                  border: "2px solid #2a2a4a",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 6,
                    color: "#8892b0",
                    marginBottom: 4,
                  }}
                >
                  OPONENTE
                </p>
                <p
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 14,
                    color: "#8892b0",
                  }}
                >
                  {opponentScore}
                </p>
              </div>
            </div>

            {/* Grid */}
            <div style={{ position: "relative" }}>
              <GridBoard
                grid={onlineGrid}
                newTiles={onlineNewTiles}
                mergedTiles={onlineMergedTiles}
              />

              {/* Online result overlay */}
              {onlineResult && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: onlineResult === "win"
                      ? "rgba(0,180,80,0.6)"
                      : "rgba(180,0,0,0.6)",
                    borderRadius: 10,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "fadeIn 0.3s ease",
                    zIndex: 10,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 16,
                      color: "#fff",
                      textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      marginBottom: 12,
                      textAlign: "center",
                      lineHeight: 1.6,
                    }}
                  >
                    {onlineResult === "win" ? "Voce venceu!" : "Voce perdeu!"}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 20,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: 7,
                          color: "rgba(255,255,255,0.7)",
                          marginBottom: 4,
                        }}
                      >
                        VOCE
                      </p>
                      <p
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: 16,
                          color: "#fff",
                        }}
                      >
                        {onlineScore}
                      </p>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: 7,
                          color: "rgba(255,255,255,0.7)",
                          marginBottom: 4,
                        }}
                      >
                        OPONENTE
                      </p>
                      <p
                        style={{
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: 16,
                          color: "#fff",
                        }}
                      >
                        {opponentScore}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleBackToMenu}
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 9,
                      padding: "10px 20px",
                      background: `linear-gradient(135deg, ${ONLINE_ACCENT}, #5b21b6)`,
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    Menu
                  </button>
                  <AdBanner slot="2048_between" style={{ marginTop: 12, maxWidth: 300 }} />
                </div>
              )}
            </div>

            {/* Mobile Arrow Controls */}
            <ArrowPad onMove={handleOnlineMove} accent={ONLINE_ACCENT} />
          </div>
        )}
      </div>
      </div>

      {/* Ad Banner */}
      <div style={{ marginTop: 16 }}>
        <AdBanner slot="2048_bottom" />
      </div>
    </div>
  );
}
