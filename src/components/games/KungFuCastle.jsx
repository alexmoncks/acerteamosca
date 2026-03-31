"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// ── Asset paths ────────────────────────────────────────────────────────
const ASSET_PATHS = {
  player: {
    idle: "/images/kungfucastle/player/idle.png",
    walk: "/images/kungfucastle/player/walk.png",
    punch: "/images/kungfucastle/player/punch.png",
    kick: "/images/kungfucastle/player/kick.png",
    jump: "/images/kungfucastle/player/jump.png",
    crouch: "/images/kungfucastle/player/crouch.png",
    flyKick: "/images/kungfucastle/player/flying-kick.png",
    sweep: "/images/kungfucastle/player/sweep.png",
    hit: "/images/kungfucastle/player/hit.png",
    special: "/images/kungfucastle/player/special.png",
  },
  tiles: {
    fase1: "/images/kungfucastle/tiles/fase1-jardim.png",
    fase2: "/images/kungfucastle/tiles/fase2-portao.png",
    fase3: "/images/kungfucastle/tiles/fase3-interior.png",
    fase4: "/images/kungfucastle/tiles/fase4-torre.png",
    fase5: "/images/kungfucastle/tiles/fase5-topo.png",
  },
  audio: {
    sfx: {
      punch: "/audio/kungfucastle/sfx/punch.mp3",
      kick: "/audio/kungfucastle/sfx/kick.mp3",
      hit: "/audio/kungfucastle/sfx/hit.mp3",
      jump: "/audio/kungfucastle/sfx/jump.mp3",
      enemyDeath: "/audio/kungfucastle/sfx/enemy-death.mp3",
      powerup: "/audio/kungfucastle/sfx/powerup.mp3",
      bossAppear: "/audio/kungfucastle/sfx/boss-appear.mp3",
      victory: "/audio/kungfucastle/sfx/victory.mp3",
    },
    bgm: {
      fase1: "/audio/kungfucastle/bgm/fase1-jardim.mp3",
      fase2: "/audio/kungfucastle/bgm/fase2-portao.mp3",
      fase3: "/audio/kungfucastle/bgm/fase3-interior.mp3",
      fase4: "/audio/kungfucastle/bgm/fase4-torre.mp3",
      fase5: "/audio/kungfucastle/bgm/fase5-boss.mp3",
      gameover: "/audio/kungfucastle/bgm/gameover.mp3",
    },
  },
};

// ── Constants ──────────────────────────────────────────────────────────
const CW = 480;
const CH = 320;
const GROUND_Y = 260;
const PLAYER_W = 48;
const PLAYER_H = 64;

export default function KungFuCastle() {
  const t = useTranslations("games.kungfucastle");
  const canvasRef = useRef(null);
  const [screen, setScreen] = useState("menu");
  const keysRef = useRef(new Set());
  const gameRef = useRef(null);
  const rafRef = useRef(null);

  // ── Game state init ──────────────────────────────────────────────
  function initGame() {
    return {
      frame: 0,
      player: {
        x: 80,
        y: GROUND_Y - PLAYER_H,
        w: PLAYER_W,
        h: PLAYER_H,
        vx: 0,
        vy: 0,
        hp: 100,
        lives: 3,
        score: 0,
        facing: 1,
        state: "idle",
        stateTimer: 0,
      },
      enemies: [],
      phase: 1,
      scrollX: 0,
    };
  }

  // ── Placeholder renderer (Graphics only, no sprites) ─────────────
  function renderFrame(ctx, g) {
    const { player } = g;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CW, CH);

    // Ground
    ctx.fillStyle = "#2d2d44";
    ctx.fillRect(0, GROUND_Y, CW, CH - GROUND_Y);

    // Ground line
    ctx.strokeStyle = "#4a4a6a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CW, GROUND_Y);
    ctx.stroke();

    // Player placeholder (colored rectangle)
    ctx.fillStyle = "#e74c3c";
    ctx.fillRect(player.x, player.y, player.w, player.h);

    // Player head
    ctx.fillStyle = "#f5c6aa";
    ctx.beginPath();
    ctx.arc(player.x + player.w / 2, player.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();

    // Player headband
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(player.x + player.w / 2 - 12, player.y + 6, 24, 4);

    // HP bar
    ctx.fillStyle = "#333";
    ctx.fillRect(16, 16, 104, 12);
    ctx.fillStyle = player.hp > 30 ? "#22c55e" : "#ef4444";
    ctx.fillRect(18, 18, player.hp, 8);

    // HUD text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px monospace";
    ctx.fillText(`${t("hud.score")}: ${player.score}`, 16, 44);
    ctx.fillText(`${t("hud.phase")}: ${g.phase}`, 16, 58);
    ctx.fillText(`${t("hud.lives")}: ${player.lives}`, CW - 80, 28);

    // Enemy placeholders
    g.enemies.forEach((e) => {
      ctx.fillStyle = e.color || "#8b5cf6";
      ctx.fillRect(e.x, e.y, e.w, e.h);
    });

    // Phase title
    if (g.frame < 120) {
      ctx.globalAlpha = Math.max(0, 1 - g.frame / 120);
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${t("hud.phase")} ${g.phase}`, CW / 2, CH / 2 - 20);
      ctx.font = "12px monospace";
      ctx.fillStyle = "#ccc";
      ctx.fillText(t(`phases.${g.phase}`), CW / 2, CH / 2 + 10);
      ctx.textAlign = "left";
      ctx.globalAlpha = 1;
    }
  }

  // ── Game loop ────────────────────────────────────────────────────
  function gameLoop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const g = gameRef.current;
    if (!g) return;

    g.frame++;

    // Basic movement
    const keys = keysRef.current;
    const spd = 3;
    if (keys.has("ArrowLeft") || keys.has("a")) {
      g.player.x -= spd;
      g.player.facing = -1;
    }
    if (keys.has("ArrowRight") || keys.has("d")) {
      g.player.x += spd;
      g.player.facing = 1;
    }

    // Clamp player
    g.player.x = Math.max(0, Math.min(CW - g.player.w, g.player.x));

    // Spawn placeholder enemies
    if (g.frame % 180 === 0 && g.enemies.length < 4) {
      g.enemies.push({
        x: CW + 20,
        y: GROUND_Y - 56,
        w: 40,
        h: 56,
        vx: -1.5,
        hp: 2,
        color: ["#8b5cf6", "#6366f1", "#a855f7", "#7c3aed"][Math.floor(Math.random() * 4)],
      });
    }

    // Move enemies
    g.enemies.forEach((e) => {
      e.x += e.vx;
    });

    // Remove off-screen
    g.enemies = g.enemies.filter((e) => e.x + e.w > -20);

    renderFrame(ctx, g);
    rafRef.current = requestAnimationFrame(gameLoop);
  }

  // ── Start game ───────────────────────────────────────────────────
  function handleStart() {
    gameRef.current = initGame();
    setScreen("playing");
  }

  useEffect(() => {
    if (screen !== "playing") return;

    const handleKeyDown = (e) => keysRef.current.add(e.key);
    const handleKeyUp = (e) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    rafRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [screen]);

  // ── Render ───────────────────────────────────────────────────────
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
        padding: 12,
      }}
    >
      {screen === "menu" && (
        <div style={{ textAlign: "center" }}>
          <h1
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 24,
              color: "#dc2626",
              textShadow: "0 0 20px rgba(220,38,38,0.5)",
              marginBottom: 8,
              letterSpacing: 3,
            }}
          >
            {t("title")}
          </h1>
          <p
            style={{
              fontSize: 11,
              color: "#8892b0",
              marginBottom: 24,
            }}
          >
            {t("subtitle")}
          </p>

          {/* Placeholder art */}
          <div
            style={{
              width: 120,
              height: 80,
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              border: "2px solid #dc262644",
              borderRadius: 8,
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            🥋
          </div>

          <button
            onClick={handleStart}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 13,
              color: "#050510",
              background: "#dc2626",
              border: "none",
              borderRadius: 8,
              padding: "14px 36px",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(220,38,38,0.4)",
              letterSpacing: 2,
              marginBottom: 12,
            }}
          >
            {t("start")}
          </button>

          <p style={{ fontSize: 9, color: "#4a5568", marginTop: 16 }}>
            {t("controlsHint")}
          </p>
        </div>
      )}

      {screen === "playing" && (
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{
            background: "#000",
            borderRadius: 8,
            border: "2px solid #dc262644",
            imageRendering: "pixelated",
            maxWidth: "100%",
          }}
        />
      )}
    </div>
  );
}
