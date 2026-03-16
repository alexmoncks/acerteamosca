"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import { BubbleShooterMobileControls } from "@/components/MobileControls";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";
import useLockScroll from "@/hooks/useLockScroll";

// ── Constants ──────────────────────────────────────────────────────────
const CANVAS_W = 400;
const CANVAS_H = 560;
const BUBBLE_R = 16;
const COLORS = ["#ff4444", "#4488ff", "#44cc44", "#ffcc00", "#aa44ff", "#ff8844"];
const COLS = 11;
const INITIAL_ROWS = 8;
const CANNON_Y = CANVAS_H - 40;
const SHOOT_SPEED = 10;
const GAME_OVER_LINE = CANVAS_H - 80;
const SHOTS_PER_DESCENT = 5;
const MIN_ANGLE = 10;
const MAX_ANGLE = 170;
const ANGLE_STEP = 3;
const ROTATE_INTERVAL = 30; // ms between angle steps when holding

// ── Hex grid helpers ───────────────────────────────────────────────────
function hexToPixel(row, col) {
  const x = col * BUBBLE_R * 2 + (row % 2) * BUBBLE_R;
  const y = row * BUBBLE_R * 1.73;
  return { x: x + BUBBLE_R, y: y + BUBBLE_R };
}

function getNeighbors(row, col) {
  const even = row % 2 === 0;
  const dirs = even
    ? [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
    : [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]];
  return dirs
    .map(([dr, dc]) => [row + dr, col + dc])
    .filter(([r, c]) => r >= 0 && c >= 0 && c < COLS);
}

function createGrid(rows) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      row.push(Math.floor(Math.random() * COLORS.length));
    }
    grid.push(row);
  }
  return grid;
}

function cloneGrid(grid) {
  return grid.map((row) => [...row]);
}

// BFS: find all connected same-color cells starting from (startRow, startCol)
function findGroup(grid, startRow, startCol) {
  const color = grid[startRow]?.[startCol];
  if (color == null) return [];
  const visited = new Set();
  const queue = [[startRow, startCol]];
  const group = [];
  visited.add(`${startRow},${startCol}`);
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    group.push([r, c]);
    for (const [nr, nc] of getNeighbors(r, c)) {
      const key = `${nr},${nc}`;
      if (!visited.has(key) && nr < grid.length && grid[nr]?.[nc] === color) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return group.length >= 3 ? group : [];
}

// BFS from top row: find all bubbles connected to ceiling
function findFloating(grid) {
  const connected = new Set();
  const queue = [];
  for (let c = 0; c < COLS; c++) {
    if (grid[0]?.[c] != null) {
      queue.push([0, c]);
      connected.add(`0,${c}`);
    }
  }
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    for (const [nr, nc] of getNeighbors(r, c)) {
      const key = `${nr},${nc}`;
      if (!connected.has(key) && nr < grid.length && grid[nr]?.[nc] != null) {
        connected.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  // Any bubble NOT connected is floating
  const floating = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] != null && !connected.has(`${r},${c}`)) {
        floating.push([r, c]);
      }
    }
  }
  return floating;
}

// Find the nearest empty grid cell to a pixel position
// Only considers cells adjacent to existing bubbles (or in row 0)
function snapToGrid(grid, px, py) {
  let bestDist = Infinity;
  let bestR = 0;
  let bestC = 0;
  // Check existing rows + 1 extra to allow expansion
  const maxRow = grid.length + 1;
  for (let r = 0; r < maxRow; r++) {
    for (let c = 0; c < COLS; c++) {
      // Only snap to empty cells
      if (r < grid.length && grid[r][c] != null) continue;

      // Must be adjacent to an existing bubble OR in top row
      let hasNeighbor = r === 0;
      if (!hasNeighbor) {
        for (const [nr, nc] of getNeighbors(r, c)) {
          if (nr < grid.length && grid[nr]?.[nc] != null) {
            hasNeighbor = true;
            break;
          }
        }
      }
      if (!hasNeighbor) continue;

      const { x, y } = hexToPixel(r, c);
      const dx = px - x;
      const dy = py - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestR = r;
        bestC = c;
      }
    }
  }
  return { row: bestR, col: bestC };
}

// Check if any bubble is below game over line
function checkGameOver(grid) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] != null) {
        const { y } = hexToPixel(r, c);
        if (y >= GAME_OVER_LINE) return true;
      }
    }
  }
  return false;
}

// Check if grid is empty (win)
function checkWin(grid) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] != null) return false;
    }
  }
  return true;
}

// Get colors currently present in the grid (for next bubble selection)
function getActiveColors(grid) {
  const set = new Set();
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] != null) set.add(grid[r][c]);
    }
  }
  return Array.from(set);
}

function randomColor(grid) {
  const active = getActiveColors(grid);
  if (active.length === 0) return Math.floor(Math.random() * COLORS.length);
  return active[Math.floor(Math.random() * active.length)];
}

// ── Audio ──────────────────────────────────────────────────────────────
class BubbleShooterAudio {
  constructor() { this.ctx = null; }

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
    this._tone(600, 0.08, 0.1, "sine");
  }

  pop() {
    this._tone(800, 0.06, 0.12, "sine");
    setTimeout(() => this._tone(1200, 0.04, 0.08, "sine"), 30);
  }

  match() {
    this._tone(523, 0.08, 0.1, "sine");
    setTimeout(() => this._tone(659, 0.08, 0.1, "sine"), 60);
    setTimeout(() => this._tone(784, 0.1, 0.12, "sine"), 120);
  }

  fall() {
    this._tone(400, 0.15, 0.08, "triangle");
    setTimeout(() => this._tone(300, 0.15, 0.08, "triangle"), 80);
    setTimeout(() => this._tone(200, 0.2, 0.06, "triangle"), 160);
  }

  bounce() {
    this._tone(440, 0.04, 0.06, "square");
  }

  stick() {
    this._tone(350, 0.06, 0.08, "triangle");
  }

  gameOver() {
    this._tone(440, 0.2, 0.15, "square");
    setTimeout(() => this._tone(349, 0.2, 0.15, "square"), 200);
    setTimeout(() => this._tone(262, 0.4, 0.2, "square"), 400);
  }

  descent() {
    this._tone(200, 0.15, 0.1, "sawtooth");
    setTimeout(() => this._tone(250, 0.15, 0.1, "sawtooth"), 100);
  }
}

// ── Main component ─────────────────────────────────────────────────────
export default function BubbleShooter() {
  const { user, checkedCookie, registering, register } = useJogador("bubbleshooter");
  const gameScale = useGameScale(CANVAS_W);
  useLockScroll();

  const [screen, setScreen] = useState("menu"); // menu | register | playing | paused | gameover
  const [score, setScore] = useState(0);
  const [bubblesPopped, setBubblesPopped] = useState(0);

  const canvasRef = useRef(null);
  const gridRef = useRef([]);
  const angleRef = useRef(90);
  const shotRef = useRef(null); // { x, y, vx, vy, color }
  const nextColorRef = useRef(0);
  const currentColorRef = useRef(0);
  const scoreRef = useRef(0);
  const poppedRef = useRef(0);
  const shotCountRef = useRef(0);
  const particlesRef = useRef([]);
  const fallingRef = useRef([]);
  const rafRef = useRef(null);
  const rotateIntervalRef = useRef(null);
  const screenRef = useRef("menu");
  const playCountRef = useRef(0);
  const audioRef = useRef(null);

  // Keep screenRef in sync
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // ── Grid initialization ──────────────────────────────────────────────
  const initGame = useCallback(() => {
    const grid = createGrid(INITIAL_ROWS);
    gridRef.current = grid;
    angleRef.current = 90;
    shotRef.current = null;
    shotCountRef.current = 0;
    scoreRef.current = 0;
    poppedRef.current = 0;
    particlesRef.current = [];
    fallingRef.current = [];
    currentColorRef.current = randomColor(grid);
    nextColorRef.current = randomColor(grid);
    setScore(0);
    setBubblesPopped(0);
  }, []);

  // ── Cannon rotation ──────────────────────────────────────────────────
  const startRotate = useCallback((dir) => {
    // Stop any existing rotation
    if (rotateIntervalRef.current) {
      clearInterval(rotateIntervalRef.current);
    }
    // Immediate first step
    angleRef.current = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angleRef.current + dir * ANGLE_STEP));
    rotateIntervalRef.current = setInterval(() => {
      angleRef.current = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angleRef.current + dir * ANGLE_STEP));
    }, ROTATE_INTERVAL);
  }, []);

  const stopRotate = useCallback(() => {
    if (rotateIntervalRef.current) {
      clearInterval(rotateIntervalRef.current);
      rotateIntervalRef.current = null;
    }
  }, []);

  // ── Shoot ────────────────────────────────────────────────────────────
  const shoot = useCallback(() => {
    if (shotRef.current) return; // already shooting
    if (screenRef.current !== "playing") return;
    const rad = (angleRef.current * Math.PI) / 180;
    const vx = -Math.cos(rad) * SHOOT_SPEED;
    const vy = -Math.sin(rad) * SHOOT_SPEED;
    shotRef.current = {
      x: CANVAS_W / 2,
      y: CANNON_Y,
      vx,
      vy,
      color: currentColorRef.current,
    };
    audioRef.current?.shoot();
    // Advance colors
    currentColorRef.current = nextColorRef.current;
    nextColorRef.current = randomColor(gridRef.current);
  }, []);

  // ── Spawn particles ──────────────────────────────────────────────────
  const spawnExplosion = useCallback((px, py, colorIdx, count) => {
    const color = COLORS[colorIdx] || "#ffffff";
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }, []);

  const spawnFalling = useCallback((row, col, colorIdx) => {
    const { x, y } = hexToPixel(row, col);
    fallingRef.current.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random() * 2,
      gravity: 0.15,
      life: 1,
      decay: 0.012,
      color: colorIdx,
    });
  }, []);

  // ── Place bubble, check matches, handle descent ──────────────────────
  const placeBubble = useCallback(
    (row, col, colorIdx) => {
      const grid = gridRef.current;
      // Expand grid if needed
      while (grid.length <= row) {
        grid.push(new Array(COLS).fill(null));
      }
      grid[row][col] = colorIdx;

      // Check group
      const group = findGroup(grid, row, col);
      let points = 0;
      let popped = 0;
      if (group.length > 0) {
        // Sound: match found
        audioRef.current?.match();
        // Remove matched bubbles
        for (const [gr, gc] of group) {
          const { x, y } = hexToPixel(gr, gc);
          spawnExplosion(x, y, grid[gr][gc], 6);
          grid[gr][gc] = null;
          points += 10;
          popped++;
        }
        // Bonus for larger groups
        if (group.length > 3) {
          points += (group.length - 3) * 20;
        }

        // Find and remove floating bubbles
        const floating = findFloating(grid);
        if (floating.length > 0) {
          audioRef.current?.fall();
        }
        for (const [fr, fc] of floating) {
          spawnFalling(fr, fc, grid[fr][fc]);
          grid[fr][fc] = null;
          points += 15;
          popped++;
        }
      } else {
        // No match — bubble just stuck to the grid
        audioRef.current?.stick();
      }

      scoreRef.current += points;
      poppedRef.current += popped;
      setScore(scoreRef.current);
      setBubblesPopped(poppedRef.current);

      // Trim empty rows from the bottom
      while (grid.length > 0) {
        const last = grid[grid.length - 1];
        if (last.every((c) => c == null)) {
          grid.pop();
        } else {
          break;
        }
      }

      // Increment shot counter
      shotCountRef.current++;

      // Check win
      if (checkWin(grid)) {
        // Bonus for clearing all
        scoreRef.current += 500;
        setScore(scoreRef.current);
        // Add new rows so game continues
        const newGrid = createGrid(INITIAL_ROWS);
        gridRef.current = newGrid;
        shotCountRef.current = 0;
        return;
      }

      // Descent: every N shots, shift down and add row at top
      if (shotCountRef.current >= SHOTS_PER_DESCENT) {
        shotCountRef.current = 0;
        // Shift all rows down by 1 (use active colors only)
        const activeColors = getActiveColors(grid);
        const newRow = [];
        for (let c = 0; c < COLS; c++) {
          if (activeColors.length > 0) {
            newRow.push(activeColors[Math.floor(Math.random() * activeColors.length)]);
          } else {
            newRow.push(Math.floor(Math.random() * COLORS.length));
          }
        }
        grid.unshift(newRow);
        audioRef.current?.descent();

        // Check game over after descent
        if (checkGameOver(grid)) {
          audioRef.current?.gameOver();
          // Submit score
          const finalScore = scoreRef.current;
          const finalPopped = poppedRef.current;
          fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pontos: finalScore,
              jogo: "bubbleshooter",
              metadata: { bolhasEstouradas: finalPopped },
            }),
          }).catch(() => {});
          window.gtag?.("event", "game_end", {
            game_name: "bubbleshooter",
            score: finalScore,
          });
          setScreen("gameover");
          return;
        }
      }

      // Check game over (non-descent)
      if (checkGameOver(grid)) {
        audioRef.current?.gameOver();
        const finalScore = scoreRef.current;
        const finalPopped = poppedRef.current;
        fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pontos: finalScore,
            jogo: "bubbleshooter",
            metadata: { bolhasEstouradas: finalPopped },
          }),
        }).catch(() => {});
        window.gtag?.("event", "game_end", {
          game_name: "bubbleshooter",
          score: finalScore,
        });
        setScreen("gameover");
      }
    },
    [spawnExplosion, spawnFalling]
  );

  // ── Game loop ────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    if (screenRef.current !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const grid = gridRef.current;

    // ── Update shot ────────────────────────────────────────────────────
    const shot = shotRef.current;
    if (shot) {
      shot.x += shot.vx;
      shot.y += shot.vy;

      // Wall ricochet
      if (shot.x - BUBBLE_R < 0) {
        shot.x = BUBBLE_R;
        if (shot.vx < 0) audioRef.current?.bounce();
        shot.vx = Math.abs(shot.vx);
      }
      if (shot.x + BUBBLE_R > CANVAS_W) {
        shot.x = CANVAS_W - BUBBLE_R;
        if (shot.vx > 0) audioRef.current?.bounce();
        shot.vx = -Math.abs(shot.vx);
      }

      // Top boundary
      if (shot.y - BUBBLE_R <= 0) {
        shot.y = BUBBLE_R;
        const { row, col } = snapToGrid(grid, shot.x, shot.y);
        placeBubble(row, col, shot.color);
        shotRef.current = null;
      } else {
        // Collision with grid bubbles
        let collided = false;
        for (let r = 0; r < grid.length && !collided; r++) {
          for (let c = 0; c < COLS && !collided; c++) {
            if (grid[r][c] == null) continue;
            const { x: gx, y: gy } = hexToPixel(r, c);
            const dx = shot.x - gx;
            const dy = shot.y - gy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < BUBBLE_R * 2) {
              const { row, col } = snapToGrid(grid, shot.x, shot.y);
              placeBubble(row, col, shot.color);
              shotRef.current = null;
              collided = true;
            }
          }
        }
      }

      // Safety: if shot goes off screen below, discard
      if (shot && shot.y > CANVAS_H + 50) {
        shotRef.current = null;
      }
    }

    // ── Update particles ───────────────────────────────────────────────
    particlesRef.current = particlesRef.current.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= p.decay;
      return p.life > 0;
    });

    // ── Update falling bubbles ─────────────────────────────────────────
    fallingRef.current = fallingRef.current.filter((f) => {
      f.x += f.vx;
      f.y += f.vy;
      f.vy += f.gravity;
      f.life -= f.decay;
      return f.life > 0 && f.y < CANVAS_H + 50;
    });

    // ── Draw ───────────────────────────────────────────────────────────
    // Background
    ctx.fillStyle = "#0a0e27";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle grid pattern
    ctx.strokeStyle = "rgba(255,255,255,0.02)";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_H);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_W, y);
      ctx.stroke();
    }

    // Game over line (subtle dashed)
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(255, 45, 80, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GAME_OVER_LINE);
    ctx.lineTo(CANVAS_W, GAME_OVER_LINE);
    ctx.stroke();
    ctx.restore();

    // ── Draw grid bubbles ──────────────────────────────────────────────
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] == null) continue;
        const { x, y } = hexToPixel(r, c);
        drawBubble(ctx, x, y, BUBBLE_R, grid[r][c]);
      }
    }

    // ── Draw falling bubbles ───────────────────────────────────────────
    for (const f of fallingRef.current) {
      ctx.globalAlpha = f.life;
      drawBubble(ctx, f.x, f.y, BUBBLE_R, f.color);
      ctx.globalAlpha = 1;
    }

    // ── Draw aim line ──────────────────────────────────────────────────
    drawAimLine(ctx, angleRef.current);

    // ── Draw cannon ────────────────────────────────────────────────────
    drawCannon(ctx, angleRef.current, currentColorRef.current);

    // ── Draw next bubble preview ───────────────────────────────────────
    // Small bubble to the left of cannon
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(14, CANNON_Y - 28, 36, 36);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(14, CANNON_Y - 28, 36, 36);
    ctx.fillStyle = "#667";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("NEXT", 32, CANNON_Y - 30);
    drawBubble(ctx, 32, CANNON_Y - 10, 10, nextColorRef.current);

    // ── Draw shot bubble ───────────────────────────────────────────────
    if (shotRef.current) {
      drawBubble(ctx, shotRef.current.x, shotRef.current.y, BUBBLE_R, shotRef.current.color);
    }

    // ── Draw particles ─────────────────────────────────────────────────
    for (const p of particlesRef.current) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── HUD: score ─────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, CANVAS_W, 28);
    ctx.fillStyle = "#e879f9";
    ctx.font = "bold 10px 'Press Start 2P', monospace";
    ctx.textAlign = "left";
    ctx.fillText("PONTOS " + scoreRef.current.toLocaleString(), 10, 18);

    // Shots until descent counter
    const shotsLeft = SHOTS_PER_DESCENT - shotCountRef.current;
    ctx.fillStyle = "#667";
    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textAlign = "right";
    ctx.fillText("Descida: " + shotsLeft, CANVAS_W - 10, 18);

    // ── Schedule next frame ────────────────────────────────────────────
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [placeBubble]);

  // ── Draw helpers ─────────────────────────────────────────────────────
  function drawBubble(ctx, x, y, r, colorIdx) {
    const color = COLORS[colorIdx] || "#888";
    // Radial gradient for glossy look
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, lighten(color, 60));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, darken(color, 40));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r - 1, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = darken(color, 60);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAimLine(ctx, angle) {
    const rad = (angle * Math.PI) / 180;
    const startX = CANVAS_W / 2;
    const startY = CANNON_Y;
    const dirX = -Math.cos(rad);
    const dirY = -Math.sin(rad);

    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // Trace line with 1 ricochet off walls
    let cx = startX;
    let cy = startY;
    let dx = dirX;
    let dy = dirY;
    const step = 4;
    const maxSteps = 300;
    let bounced = false;

    for (let i = 0; i < maxSteps; i++) {
      const nx = cx + dx * step;
      const ny = cy + dy * step;

      // Check wall bounce
      if (nx - BUBBLE_R < 0 || nx + BUBBLE_R > CANVAS_W) {
        if (!bounced) {
          ctx.lineTo(cx, cy);
          dx = -dx;
          bounced = true;
        } else {
          break;
        }
      }

      // Stop at top
      if (ny <= BUBBLE_R) {
        ctx.lineTo(nx, BUBBLE_R);
        break;
      }

      // Stop if hits a grid bubble
      let hitGrid = false;
      const grid = gridRef.current;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] == null) continue;
          const { x: gx, y: gy } = hexToPixel(r, c);
          const gdx = nx - gx;
          const gdy = ny - gy;
          if (Math.sqrt(gdx * gdx + gdy * gdy) < BUBBLE_R * 2) {
            hitGrid = true;
            break;
          }
        }
        if (hitGrid) break;
      }
      if (hitGrid) {
        ctx.lineTo(cx, cy);
        break;
      }

      cx = nx;
      cy = ny;
    }
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.restore();
  }

  function drawCannon(ctx, angle, colorIdx) {
    const baseX = CANVAS_W / 2;
    const baseY = CANNON_Y;
    const rad = (angle * Math.PI) / 180;
    const barrelLen = 30;
    const barrelW = 12;

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(rad - Math.PI);

    // Barrel
    const grad = ctx.createLinearGradient(0, -barrelW / 2, 0, barrelW / 2);
    grad.addColorStop(0, "#555");
    grad.addColorStop(0.5, "#888");
    grad.addColorStop(1, "#444");
    ctx.fillStyle = grad;
    ctx.fillRect(0, -barrelW / 2, barrelLen, barrelW);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, -barrelW / 2, barrelLen, barrelW);

    // Muzzle highlight
    ctx.fillStyle = COLORS[colorIdx] || "#e879f9";
    ctx.beginPath();
    ctx.arc(barrelLen, 0, barrelW / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Base circle
    const baseGrad = ctx.createRadialGradient(baseX, baseY, 4, baseX, baseY, 18);
    baseGrad.addColorStop(0, "#777");
    baseGrad.addColorStop(1, "#333");
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(baseX, baseY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current bubble in cannon center
    drawBubble(ctx, baseX, baseY, 10, colorIdx);
  }

  // Color utils
  function lighten(hex, amt) {
    const num = parseInt(hex.slice(1), 16);
    let r = Math.min(255, ((num >> 16) & 0xff) + amt);
    let g = Math.min(255, ((num >> 8) & 0xff) + amt);
    let b = Math.min(255, (num & 0xff) + amt);
    return `rgb(${r},${g},${b})`;
  }

  function darken(hex, amt) {
    const num = parseInt(hex.slice(1), 16);
    let r = Math.max(0, ((num >> 16) & 0xff) - amt);
    let g = Math.max(0, ((num >> 8) & 0xff) - amt);
    let b = Math.max(0, (num & 0xff) - amt);
    return `rgb(${r},${g},${b})`;
  }

  // ── Start / stop game loop ───────────────────────────────────────────
  useEffect(() => {
    if (screen === "playing") {
      rafRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [screen, gameLoop]);

  // ── Draw static canvas for non-playing screens ──────────────────────
  useEffect(() => {
    if (screen === "paused" || screen === "gameover") {
      // Draw one last frame so the canvas isn't blank
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const grid = gridRef.current;

      ctx.fillStyle = "#0a0e27";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid pattern
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_W; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_H);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_H; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }

      // Draw bubbles
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c] == null) continue;
          const { x, y } = hexToPixel(r, c);
          drawBubble(ctx, x, y, BUBBLE_R, grid[r][c]);
        }
      }

      // Dim overlay
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (screen === "paused") {
        ctx.fillStyle = "#e879f9";
        ctx.font = "bold 20px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSADO", CANVAS_W / 2, CANVAS_H / 2 - 10);
        ctx.fillStyle = "#aaa";
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillText("Pressione P para continuar", CANVAS_W / 2, CANVAS_H / 2 + 20);
      }

      if (screen === "gameover") {
        // Game over text
        ctx.fillStyle = "#ff2d95";
        ctx.font = "bold 18px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("FIM DE JOGO", CANVAS_W / 2, CANVAS_H / 2 - 50);

        ctx.fillStyle = "#e879f9";
        ctx.font = "14px 'Press Start 2P', monospace";
        ctx.fillText("Pontos: " + scoreRef.current.toLocaleString(), CANVAS_W / 2, CANVAS_H / 2 - 10);

        ctx.fillStyle = "#aaa";
        ctx.font = "10px 'Press Start 2P', monospace";
        ctx.fillText("Bolhas: " + poppedRef.current, CANVAS_W / 2, CANVAS_H / 2 + 20);
      }
    }
  }, [screen]);

  // ── Keyboard controls ────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (screenRef.current !== "playing" && screenRef.current !== "paused") return;

      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (screenRef.current === "playing") {
          setScreen("paused");
        } else if (screenRef.current === "paused") {
          setScreen("playing");
        }
        return;
      }

      if (screenRef.current !== "playing") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (!rotateIntervalRef.current) startRotate(1);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (!rotateIntervalRef.current) startRotate(-1);
      }
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        shoot();
      }
    }

    function onKeyUp(e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        stopRotate();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      stopRotate();
    };
  }, [startRotate, stopRotate, shoot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRotate();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stopRotate]);

  // ── Screen transitions ───────────────────────────────────────────────
  const initAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new BubbleShooterAudio();
    audioRef.current.init();
  }, []);

  const handleRegister = async (userData) => {
    const jogador = await register(userData);
    if (jogador) {
      playCountRef.current++;
      initAudio();
      initGame();
      setScreen("playing");
      window.gtag?.("event", "game_start", { game_name: "bubbleshooter" });
    }
  };

  const handleMenuStart = () => {
    if (user) {
      playCountRef.current++;
      initAudio();
      initGame();
      setScreen("playing");
      window.gtag?.("event", "game_start", { game_name: "bubbleshooter" });
    } else {
      setScreen("register");
    }
  };

  const handleRestart = () => {
    playCountRef.current++;
    initAudio();
    initGame();
    setScreen("playing");
    window.gtag?.("event", "game_start", { game_name: "bubbleshooter" });
  };

  // ── Mobile control callbacks ─────────────────────────────────────────
  const onRotateLeft = useCallback(() => startRotate(1), [startRotate]);
  const onRotateRight = useCallback(() => startRotate(-1), [startRotate]);
  const onStopRotate = useCallback(() => stopRotate(), [stopRotate]);
  const onFire = useCallback(() => shoot(), [shoot]);

  if (!checkedCookie) return null;

  // ── Render ───────────────────────────────────────────────────────────
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
      {/* Top ad - hidden during active play */}
      {screen !== "playing" && (
        <AdBanner slot="bubbleshooter_top" style={{ marginBottom: 12, maxWidth: CANVAS_W }} />
      )}

      {screen !== "menu" && (
        <>
          <h1
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 18,
              color: "#e879f9",
              textShadow: "0 0 20px rgba(232,121,249,0.4), 0 0 40px rgba(232,121,249,0.15)",
              marginBottom: 8,
              letterSpacing: 3,
              textAlign: "center",
            }}
          >
            BUBBLE SHOOTER
          </h1>
          <p
            style={{
              color: "#4a5568",
              fontSize: 10,
              marginBottom: 14,
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            ESTOURE AS BOLHAS COLORIDAS
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
            border: "2px solid rgba(232,121,249,0.3)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 0 30px rgba(232,121,249,0.1)",
            transform: `scale(${gameScale})`,
            transformOrigin: "top left",
          }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              display: "block",
              width: CANVAS_W,
              height: CANVAS_H,
            }}
          />

          {/* Menu overlay */}
          {screen === "menu" && (
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
              }}
            >
              <h1
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 20,
                  color: "#e879f9",
                  textShadow: "0 0 20px rgba(232,121,249,0.5)",
                  marginBottom: 8,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                BUBBLE
                <br />
                SHOOTER
              </h1>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginBottom: 30,
                  marginTop: 10,
                }}
              >
                {COLORS.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: c,
                      boxShadow: `0 0 8px ${c}55`,
                      animation: `menuBubbleBounce 1.2s ease-in-out ${i * 0.1}s infinite alternate`,
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleMenuStart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  color: "#0a0e27",
                  background: "#e879f9",
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 40px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(232,121,249,0.4)",
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
                <div>SETAS: MIRAR</div>
                <div>ESPACO: ATIRAR</div>
                <div>P: PAUSAR</div>
              </div>
            </div>
          )}

          {/* Register overlay */}
          {screen === "register" && (
            <RegisterModal
              onRegister={handleRegister}
              loading={registering}
              jogoNome="BUBBLE SHOOTER"
              accentColor="#e879f9"
            />
          )}

          {/* Game over overlay */}
          {screen === "gameover" && (
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
              }}
            >
              <h2
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 18,
                  color: "#ff2d95",
                  textShadow: "0 0 15px rgba(255,45,149,0.4)",
                  marginBottom: 20,
                }}
              >
                FIM DE JOGO
              </h2>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12,
                  color: "#e879f9",
                  marginBottom: 8,
                }}
              >
                PONTOS
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 28,
                  color: "#fff",
                  textShadow: "0 0 15px rgba(232,121,249,0.5)",
                  marginBottom: 20,
                }}
              >
                {score.toLocaleString()}
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 10,
                  color: "#aaa",
                  marginBottom: 30,
                }}
              >
                BOLHAS: {bubblesPopped}
              </div>
              <button
                onClick={handleRestart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12,
                  color: "#0a0e27",
                  background: "#e879f9",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 30px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(232,121,249,0.4)",
                  letterSpacing: 1,
                }}
              >
                JOGAR NOVAMENTE
              </button>
              <AdBanner slot="bubbleshooter_between" style={{ marginTop: 12, maxWidth: 300 }} />
            </div>
          )}

          {/* Pause / restart buttons during play */}
          {screen === "playing" && (
            <div
              style={{
                position: "absolute",
                bottom: 6,
                right: 6,
                display: "flex",
                gap: 6,
                zIndex: 80,
              }}
            >
              <button
                onClick={() => setScreen("paused")}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                  color: "#aaa",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                PAUSE
              </button>
              <button
                onClick={handleRestart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                  color: "#aaa",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                RESET
              </button>
            </div>
          )}

          {/* Paused overlay */}
          {screen === "paused" && (
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
              <h2
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 20,
                  color: "#e879f9",
                  textShadow: "0 0 15px rgba(232,121,249,0.4)",
                  marginBottom: 20,
                }}
              >
                PAUSADO
              </h2>
              <button
                onClick={() => setScreen("playing")}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 12,
                  color: "#0a0e27",
                  background: "#e879f9",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 30px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(232,121,249,0.4)",
                  marginBottom: 16,
                }}
              >
                CONTINUAR
              </button>
              <button
                onClick={handleRestart}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 10,
                  color: "#aaa",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 6,
                  padding: "8px 20px",
                  cursor: "pointer",
                }}
              >
                REINICIAR
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile controls */}
      {screen === "playing" && (
        <BubbleShooterMobileControls
          onRotateLeft={onRotateLeft}
          onRotateRight={onRotateRight}
          onFire={onFire}
          onStopRotate={onStopRotate}
        />
      )}

      {/* User info */}
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
          <span
            style={{
              color: "#4a5568",
              fontSize: 10,
              fontFamily: "'Fira Code', monospace",
            }}
          >
            {user.nome}
          </span>
          <span
            style={{
              color: "#4a5568",
              fontSize: 10,
              fontFamily: "'Fira Code', monospace",
            }}
          >
            Bolhas: {bubblesPopped}
          </span>
        </div>
      )}

      <AdBanner slot="bubbleshooter_bottom" style={{ marginTop: 16, maxWidth: CANVAS_W }} />

      <style>{`
        @keyframes menuBubbleBounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
