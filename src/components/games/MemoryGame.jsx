"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

const WS_URL = process.env.NEXT_PUBLIC_WS_MEMORY_URL || "ws://localhost:3004";

const GAME_W = 500;
const COLOR_BG = "#050510";
const ACCENT = "#34d399";
const ACCENT2 = "#059669";
const NEON_GREEN = "#39ff14";
const ONLINE_ACCENT = "#b026ff";
const TIMED_DURATION = 60;

const ALL_EMOJIS = ["\u{1F34E}", "\u{1F680}", "\u26BD", "\u{1F3B5}", "\u{1F31F}", "\u{1F3AF}", "\u{1F431}", "\u{1F308}", "\u{1F525}", "\u{1F48E}", "\u{1F3AA}", "\u{1F3C6}"];

const DIFFICULTIES = {
  easy: { label: "Facil", cols: 4, rows: 3, pairs: 6 },
  medium: { label: "Medio", cols: 4, rows: 4, pairs: 8 },
  hard: { label: "Dificil", cols: 6, rows: 4, pairs: 12 },
};

// ---- Memory Audio Engine ----
class MemoryAudio {
  constructor() { this.ctx = null; }
  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await this.ctx.resume();
  }
  _tone(freq, dur, vol = 0.12, type = "sine") {
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
  flip() {
    this._tone(1200, 0.04, 0.08, "sine");
  }
  match() {
    this._tone(523, 0.1, 0.12, "sine");
    setTimeout(() => this._tone(659, 0.1, 0.12, "sine"), 80);
    setTimeout(() => this._tone(784, 0.12, 0.14, "sine"), 160);
  }
  noMatch() {
    this._tone(250, 0.12, 0.06, "triangle");
  }
  victory() {
    this._tone(523, 0.15, 0.15, "sine");
    setTimeout(() => this._tone(659, 0.15, 0.15, "sine"), 150);
    setTimeout(() => this._tone(784, 0.15, 0.15, "sine"), 300);
    setTimeout(() => {
      this._tone(1047, 0.4, 0.15, "sine");
      this._tone(1319, 0.4, 0.12, "sine");
      this._tone(1568, 0.4, 0.10, "sine");
    }, 450);
  }
}

// ---- Fisher-Yates Shuffle ----
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Generate deck ----
function generateDeck(difficulty) {
  const { pairs } = DIFFICULTIES[difficulty];
  const selected = shuffle(ALL_EMOJIS).slice(0, pairs);
  const deck = shuffle([...selected, ...selected]);
  return deck.map((emoji, i) => ({
    id: i,
    emoji,
    flipped: false,
    matched: false,
  }));
}

// ---- Score calculation ----
function calculateScore(moves, time, totalPairs, timedMode = false, timeRemaining = 0) {
  const perfectMoves = totalPairs;
  const moveRatio = perfectMoves / Math.max(moves, perfectMoves);
  const timeBonus = timedMode
    ? timeRemaining * 10
    : Math.max(0, 1 - time / (totalPairs * 10)) * 200;
  return Math.round(moveRatio * 800 + timeBonus);
}

// ---- Format time MM:SS ----
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---- Stars from move ratio ----
function getStars(moves, totalPairs) {
  const ratio = moves / totalPairs;
  if (ratio <= 1.5) return 3;
  if (ratio <= 2.5) return 2;
  return 1;
}

// ---- Confetti Particle ----
function ConfettiParticle({ index }) {
  const colors = ["#ff0", "#0ff", "#f0f", "#0f0", "#f60", "#66f", "#f06", NEON_GREEN, ACCENT];
  const color = colors[index % colors.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 2;
  const duration = 2 + Math.random() * 2;
  const size = 6 + Math.random() * 6;
  const rotation = Math.random() * 360;

  return (
    <div
      style={{
        position: "absolute",
        left: `${left}%`,
        top: -20,
        width: size,
        height: size * 0.6,
        background: color,
        borderRadius: 2,
        transform: `rotate(${rotation}deg)`,
        animation: `confettiFall ${duration}s ${delay}s ease-in forwards`,
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}

// ---- Menu Screen ----
function MenuScreen({ difficulty, setDifficulty, timedMode, setTimedMode, onStart, onOnline }) {
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
          fontSize: 22,
          color: ACCENT,
          textShadow: `0 0 20px ${ACCENT}80, 0 0 40px ${ACCENT}40`,
          marginBottom: 8,
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        MEMORY
      </h1>
      <h2
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 16,
          color: ACCENT2,
          textShadow: `0 0 15px ${ACCENT2}60`,
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        GAME
      </h2>

      {/* Animated card preview */}
      <div style={{ display: "flex", gap: 10, marginBottom: 36 }}>
        {["\u{1F34E}", "\u{1F680}", "\u26BD", "\u{1F3B5}"].map((emoji, i) => (
          <div
            key={i}
            style={{
              width: 52,
              height: 64,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              background: i % 2 === 0
                ? "#fff"
                : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
              boxShadow: i % 2 === 0
                ? `0 0 15px ${ACCENT}30`
                : `0 0 15px ${ACCENT}40`,
              animation: `popIn 0.5s ${i * 0.12}s both`,
            }}
          >
            {i % 2 === 0 ? emoji : "?"}
          </div>
        ))}
      </div>

      {/* Difficulty selector */}
      <p
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 9,
          color: "#8892b0",
          marginBottom: 12,
          letterSpacing: 1,
        }}
      >
        DIFICULDADE
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {Object.entries(DIFFICULTIES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setDifficulty(key)}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
              padding: "10px 16px",
              background: difficulty === key
                ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`
                : "transparent",
              color: difficulty === key ? "#fff" : "#8892b0",
              border: `2px solid ${difficulty === key ? ACCENT : "#2a2a4a"}`,
              borderRadius: 8,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {val.label}
          </button>
        ))}
      </div>

      {/* Timed challenge toggle */}
      <button
        onClick={() => setTimedMode((t) => !t)}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          padding: "8px 18px",
          background: timedMode
            ? "linear-gradient(135deg, #ff6b6b, #ee5a24)"
            : "transparent",
          color: timedMode ? "#fff" : "#8892b0",
          border: `2px solid ${timedMode ? "#ff6b6b" : "#2a2a4a"}`,
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.2s",
          marginBottom: 12,
          letterSpacing: 1,
        }}
      >
        {"\u23F1"} DESAFIO 60s {timedMode ? "ON" : "OFF"}
      </button>

      <p
        style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: 11,
          color: "#555",
          marginBottom: 24,
        }}
      >
        {DIFFICULTIES[difficulty].cols}x{DIFFICULTIES[difficulty].rows} ={" "}
        {DIFFICULTIES[difficulty].pairs * 2} cartas ({DIFFICULTIES[difficulty].pairs} pares)
        {timedMode ? " - 60s" : ""}
      </p>

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
function OnlineLobby({ roomId, lobbyStatus, difficulty, setDifficulty, onCreate, onJoin, onCancel }) {
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
      <div style={{ fontSize: 40, marginBottom: 16 }}>{"\u{1F310}"}</div>

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

          {/* Difficulty selector for host */}
          <p
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 8,
              color: "#8892b0",
              marginBottom: 10,
              letterSpacing: 1,
            }}
          >
            DIFICULDADE
          </p>
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {Object.entries(DIFFICULTIES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setDifficulty(key)}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                  padding: "8px 12px",
                  background: difficulty === key
                    ? `linear-gradient(135deg, ${ONLINE_ACCENT}, #5b21b6)`
                    : "transparent",
                  color: difficulty === key ? "#fff" : "#8892b0",
                  border: `2px solid ${difficulty === key ? ONLINE_ACCENT : "#2a2a4a"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {val.label}
              </button>
            ))}
          </div>

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
            {"\u{1F3E0}"}  Criar Sala
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

// ---- Online Playing Header ----
function OnlinePlayingHeader({ onlineTurn, playerNum, onlineScores, matchedCount, totalPairs, onBack }) {
  const isMyTurn = onlineTurn === playerNum;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: "0 4px",
          marginBottom: 8,
        }}
      >
        <button
          onClick={onBack}
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
        <div
          style={{
            display: "flex",
            gap: 16,
            fontFamily: "'Fira Code', monospace",
            fontSize: 12,
            color: "#ccd6f6",
          }}
        >
          <span style={{ color: ONLINE_ACCENT }}>
            {"\u{1F464}"} {onlineScores[0]}
          </span>
          <span style={{ color: NEON_GREEN }}>
            {"\u2713"} {matchedCount}/{totalPairs}
          </span>
          <span style={{ color: ACCENT }}>
            {"\u{1F464}"} {onlineScores[1]}
          </span>
        </div>
      </div>
      {/* Turn indicator */}
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 9,
          padding: "6px 16px",
          borderRadius: 6,
          background: isMyTurn
            ? `linear-gradient(135deg, ${ONLINE_ACCENT}30, #5b21b620)`
            : "rgba(255,255,255,0.03)",
          border: `1px solid ${isMyTurn ? ONLINE_ACCENT : "#2a2a4a"}`,
          color: isMyTurn ? NEON_GREEN : "#666",
          transition: "all 0.3s",
          animation: isMyTurn ? "pulseGlow 1.5s ease-in-out infinite" : "none",
        }}
      >
        {isMyTurn ? "SUA VEZ!" : "VEZ DO OPONENTE..."}
      </div>
    </div>
  );
}

// ---- Playing Header ----
function PlayingHeader({ moves, timer, matchedCount, totalPairs, onBack, timedMode }) {
  const isLowTime = timedMode && timer <= 10;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        padding: "0 4px",
        marginBottom: 12,
      }}
    >
      <button
        onClick={onBack}
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
      <div
        style={{
          display: "flex",
          gap: 16,
          fontFamily: "'Fira Code', monospace",
          fontSize: 12,
          color: "#ccd6f6",
        }}
      >
        <span style={{
          color: isLowTime ? "#ff2d55" : (timedMode ? "#ff6b6b" : ACCENT),
          animation: isLowTime ? "timerFlash 0.5s ease-in-out infinite" : "none",
          fontWeight: isLowTime ? "bold" : "normal",
        }}>
          {"\u23F1"} {formatTime(timer)}
        </span>
        <span>
          {"\u{1F0CF}"} {moves}
        </span>
        <span style={{ color: NEON_GREEN }}>
          {"\u2713"} {matchedCount}/{totalPairs}
        </span>
      </div>
    </div>
  );
}

// ---- Card Component ----
function Card({ card, index, isFlipped, isMatched, onClick, cols, shakeId, matchAnimId }) {
  const cardWidth = cols === 6 ? 68 : 80;
  const cardHeight = cols === 6 ? 84 : 100;
  const emojiSize = cols === 6 ? 30 : 36;

  const isShaking = shakeId === card.id;
  const isMatchAnim = matchAnimId === card.emoji && isMatched;

  return (
    <div
      onClick={() => onClick(index)}
      style={{
        width: cardWidth,
        height: cardHeight,
        perspective: 1000,
        cursor: isFlipped || isMatched ? "default" : "pointer",
        opacity: isMatched && !isMatchAnim ? 0.15 : 1,
        transition: "opacity 0.5s ease 0.4s",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transition: "transform 0.4s ease-in-out",
          transform: isFlipped || isMatched ? "rotateY(180deg)" : "rotateY(0deg)",
          animation: isShaking
            ? "cardShake 0.5s ease-in-out"
            : isMatchAnim
              ? "cardMatch 0.6s ease-in-out"
              : "none",
        }}
      >
        {/* Back face (shown when not flipped) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            borderRadius: 10,
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            boxShadow: `0 2px 12px ${ACCENT}25`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              width: "70%",
              height: "70%",
              borderRadius: 6,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 16,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            ?
          </div>
        </div>

        {/* Front face (shown when flipped) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: 10,
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: emojiSize,
            boxShadow: isMatchAnim
              ? `0 0 20px ${NEON_GREEN}80, 0 0 40px ${NEON_GREEN}40`
              : "0 2px 12px rgba(0,0,0,0.2)",
            border: isMatchAnim
              ? `2px solid ${NEON_GREEN}`
              : "2px solid rgba(200,200,220,0.3)",
            transition: "box-shadow 0.3s, border-color 0.3s",
          }}
        >
          {card.emoji}
        </div>
      </div>
    </div>
  );
}

// ---- Finished Screen (Solo) ----
function FinishedScreen({ moves, timer, totalPairs, difficulty, timedMode, timedWin, matchedPairs, onRestart, onChangeDifficulty }) {
  const won = timedMode ? timedWin : true;
  const stars = won ? getStars(moves, totalPairs) : 0;
  const timeRemaining = timedMode ? timer : 0;
  const timeElapsed = timedMode ? (TIMED_DURATION - timer) : timer;
  const score = won
    ? calculateScore(moves, timeElapsed, totalPairs, timedMode, timeRemaining)
    : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5,5,16,0.95)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
    >
      {/* Confetti */}
      {won && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: 40 }, (_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      <h2
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 18,
          color: won ? NEON_GREEN : "#ff2d55",
          textShadow: `0 0 20px ${won ? NEON_GREEN : "#ff2d55"}80`,
          marginBottom: 24,
          textAlign: "center",
          animation: "popIn 0.5s ease both",
        }}
      >
        {won ? "PARABENS!" : "TEMPO ESGOTADO!"}
      </h2>

      {/* Stars (only when won) */}
      {won && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              style={{
                fontSize: 36,
                filter: s <= stars ? "none" : "grayscale(1) opacity(0.3)",
                animation: s <= stars ? `popIn 0.4s ${s * 0.2}s both` : "none",
              }}
            >
              {"\u2B50"}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          background: "#0a0a1a",
          border: `1px solid ${ACCENT}40`,
          borderRadius: 12,
          padding: "20px 32px",
          marginBottom: 28,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: 240,
          animation: "popIn 0.5s 0.3s both",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 11,
              color: "#8892b0",
            }}
          >
            Dificuldade
          </span>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 11,
              color: "#ccd6f6",
            }}
          >
            {DIFFICULTIES[difficulty].label}
            {timedMode ? " (60s)" : ""}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 11,
              color: "#8892b0",
            }}
          >
            {timedMode ? (won ? "Tempo restante" : "Tempo") : "Tempo"}
          </span>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 11,
              color: won ? ACCENT : "#ff2d55",
            }}
          >
            {timedMode
              ? (won ? formatTime(timer) : "00:00")
              : formatTime(timer)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 11,
              color: "#8892b0",
            }}
          >
            Movimentos
          </span>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 11,
              color: "#ccd6f6",
            }}
          >
            {moves}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 11,
              color: "#8892b0",
            }}
          >
            Pares
          </span>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 11,
              color: won ? NEON_GREEN : "#ccd6f6",
            }}
          >
            {won ? `${totalPairs}/${totalPairs}` : `${matchedPairs}/${totalPairs}`}
          </span>
        </div>
        {timedMode && won && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 11,
                color: "#8892b0",
              }}
            >
              Bonus tempo
            </span>
            <span
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: 11,
                color: "#ff6b6b",
              }}
            >
              +{timer * 10}
            </span>
          </div>
        )}
        <div
          style={{
            borderTop: "1px solid #2a2a4a",
            paddingTop: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 10,
              color: "#8892b0",
            }}
          >
            SCORE
          </span>
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 14,
              color: ACCENT,
              textShadow: `0 0 10px ${ACCENT}60`,
            }}
          >
            {score}
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          animation: "popIn 0.5s 0.5s both",
        }}
      >
        <button
          onClick={onRestart}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 11,
            padding: "12px 28px",
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            letterSpacing: 1,
            boxShadow: `0 0 20px ${ACCENT}40`,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
          }}
        >
          Jogar Novamente
        </button>
        <button
          onClick={onChangeDifficulty}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            padding: "10px 20px",
            background: "transparent",
            color: "#8892b0",
            border: "2px solid #2a2a4a",
            borderRadius: 8,
            cursor: "pointer",
            letterSpacing: 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = ACCENT;
            e.target.style.color = ACCENT;
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#2a2a4a";
            e.target.style.color = "#8892b0";
          }}
        >
          Mudar Dificuldade
        </button>
      </div>
      <AdBanner slot="memory_between" style={{ marginTop: 12, maxWidth: 300 }} />
    </div>
  );
}

// ---- Online Finished Screen ----
function OnlineFinishedScreen({ onlineScores, winner, playerNum, onPlayAgain, onMenu }) {
  const youWon = winner === playerNum;
  const isDraw = winner === -1;

  let title, titleColor;
  if (isDraw) {
    title = "EMPATE!";
    titleColor = "#ffe600";
  } else if (youWon) {
    title = "VOCE VENCEU!";
    titleColor = NEON_GREEN;
  } else {
    title = "VOCE PERDEU";
    titleColor = "#ff2d95";
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5,5,16,0.95)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
      }}
    >
      {/* Confetti for winner */}
      {(youWon || isDraw) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          {Array.from({ length: 40 }, (_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      <h2
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 18,
          color: titleColor,
          textShadow: `0 0 20px ${titleColor}80`,
          marginBottom: 28,
          textAlign: "center",
          animation: "popIn 0.5s ease both",
        }}
      >
        {title}
      </h2>

      {/* Scores */}
      <div
        style={{
          background: "#0a0a1a",
          border: `1px solid ${ONLINE_ACCENT}40`,
          borderRadius: 12,
          padding: "20px 36px",
          marginBottom: 28,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          minWidth: 240,
          animation: "popIn 0.5s 0.2s both",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 10,
              color: playerNum === 0 ? NEON_GREEN : "#8892b0",
            }}
          >
            {playerNum === 0 ? "VOCE" : "OPONENTE"}
          </span>
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 14,
              color: ONLINE_ACCENT,
              textShadow: `0 0 10px ${ONLINE_ACCENT}60`,
            }}
          >
            {onlineScores[0]} pares
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 1,
            background: "#2a2a4a",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 10,
              color: playerNum === 1 ? NEON_GREEN : "#8892b0",
            }}
          >
            {playerNum === 1 ? "VOCE" : "OPONENTE"}
          </span>
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 14,
              color: ACCENT,
              textShadow: `0 0 10px ${ACCENT}60`,
            }}
          >
            {onlineScores[1]} pares
          </span>
        </div>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          animation: "popIn 0.5s 0.4s both",
        }}
      >
        <button
          onClick={onPlayAgain}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 11,
            padding: "12px 28px",
            background: `linear-gradient(135deg, ${ONLINE_ACCENT}, #5b21b6)`,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            letterSpacing: 1,
            boxShadow: `0 0 20px ${ONLINE_ACCENT}40`,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.target.style.transform = "scale(1.05)"; }}
          onMouseLeave={(e) => { e.target.style.transform = "scale(1)"; }}
        >
          Jogar Novamente
        </button>
        <button
          onClick={onMenu}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 9,
            padding: "10px 20px",
            background: "transparent",
            color: "#8892b0",
            border: "2px solid #2a2a4a",
            borderRadius: 8,
            cursor: "pointer",
            letterSpacing: 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = ONLINE_ACCENT;
            e.target.style.color = ONLINE_ACCENT;
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#2a2a4a";
            e.target.style.color = "#8892b0";
          }}
        >
          Menu Principal
        </button>
      </div>
      <AdBanner slot="memory_between" style={{ marginTop: 12, maxWidth: 300 }} />
    </div>
  );
}

// ====== MAIN COMPONENT ======
export default function MemoryGame() {
  const { user, checkedCookie, registering, register } = useJogador("memory");
  const gameScale = useGameScale(GAME_W);

  // ---- Solo State ----
  const [screen, setScreen] = useState("menu");
  // screens: menu | playing | finished | online-lobby | online-playing | online-finished
  const [difficulty, setDifficulty] = useState("medium");
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]); // indices of currently flipped (max 2)
  const [matched, setMatched] = useState([]); // emoji strings that have been matched (solo) or indices (online)
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [shakeId, setShakeId] = useState(null);
  const [matchAnimEmoji, setMatchAnimEmoji] = useState(null);
  const [timedMode, setTimedMode] = useState(false);
  const [timedWin, setTimedWin] = useState(false);

  const timerRef = useRef(null);
  const gameStartedRef = useRef(false);
  const audioRef = useRef(null);

  // ---- Online State ----
  const wsRef = useRef(null);
  const [roomId, setRoomId] = useState("");
  const [lobbyStatus, setLobbyStatus] = useState("idle"); // idle | creating | waiting | joining | error
  const [playerNum, setPlayerNum] = useState(null);
  const [onlineTurn, setOnlineTurn] = useState(0);
  const [onlineScores, setOnlineScores] = useState([0, 0]);
  const [onlineResult, setOnlineResult] = useState(null); // { scores, winner }
  const [onlineMatchedIndices, setOnlineMatchedIndices] = useState([]); // track matched card indices for online
  const pendingOnlineRef = useRef(null);
  const autoJoinRef = useRef(false);

  // ---- Derived ----
  const totalPairs = DIFFICULTIES[difficulty]?.pairs || 8;
  const matchedCount = screen.startsWith("online")
    ? Math.floor(onlineMatchedIndices.length / 2)
    : matched.length;
  const cols = DIFFICULTIES[difficulty]?.cols || 4;
  const rows = DIFFICULTIES[difficulty]?.rows || 4;

  // ---- Timer effect (solo only) ----
  useEffect(() => {
    if (screen === "playing") {
      if (timedMode) {
        timerRef.current = setInterval(() => {
          setTimer((t) => {
            if (t <= 1) {
              clearInterval(timerRef.current);
              return 0;
            }
            return t - 1;
          });
        }, 1000);
      } else {
        timerRef.current = setInterval(() => {
          setTimer((t) => t + 1);
        }, 1000);
      }
      return () => clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, timedMode]);

  // ---- Timed mode: check for time out ----
  useEffect(() => {
    if (screen !== "playing" || !timedMode) return;
    if (timer <= 0 && gameStartedRef.current) {
      clearInterval(timerRef.current);
      setTimedWin(false);
      setLocked(true);
      setScreen("finished");
    }
  }, [timer, screen, timedMode]);

  // ---- Check win condition (solo only) ----
  useEffect(() => {
    if (screen !== "playing") return;
    if (matchedCount === totalPairs && matchedCount > 0) {
      const timeout = setTimeout(() => {
        clearInterval(timerRef.current);

        if (timedMode) {
          setTimedWin(true);
        }

        audioRef.current?.victory();

        const timeElapsed = timedMode ? (TIMED_DURATION - timer) : timer;
        const timeRemaining = timedMode ? timer : 0;
        const finalScore = calculateScore(moves, timeElapsed, totalPairs, timedMode, timeRemaining);

        fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pontos: finalScore,
            jogo: "memory",
            metadata: {
              pares: totalPairs,
              movimentos: moves,
              tempo: timedMode ? (TIMED_DURATION - timer) : timer,
              dificuldade: difficulty,
              timedMode,
            },
          }),
        }).catch(() => {});

        window.gtag?.("event", "game_end", {
          game_name: "memory",
          score: finalScore,
          difficulty,
          moves,
          time: timedMode ? (TIMED_DURATION - timer) : timer,
          timedMode,
        });

        setScreen("finished");
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [matchedCount, totalPairs, screen, moves, timer, difficulty, timedMode]);

  // ---- Close WS helper ----
  const closeWS = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      closeWS();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [closeWS]);

  // ---- Connect WebSocket ----
  const connectWS = useCallback((action, joinCode) => {
    closeWS();

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (action === "create") {
        ws.send(JSON.stringify({ type: "create", difficulty }));
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
          setLobbyStatus("waiting");
          break;

        case "joined":
          setPlayerNum(msg.playerNum);
          break;

        case "start": {
          // Build card objects from server deck
          const serverCards = msg.deck.map((emoji, i) => ({
            id: i,
            emoji,
            flipped: false,
            matched: false,
          }));
          setCards(serverCards);
          setDifficulty(msg.difficulty);
          setOnlineTurn(msg.turn);
          setOnlineScores([0, 0]);
          setOnlineMatchedIndices([]);
          setFlipped([]);
          setLocked(false);
          setShakeId(null);
          setMatchAnimEmoji(null);
          setOnlineResult(null);
          setScreen("online-playing");
          setLobbyStatus("idle");
          // Init audio for online
          if (!audioRef.current) {
            audioRef.current = new MemoryAudio();
          }
          audioRef.current.init().catch(() => {});
          window.gtag?.("event", "game_start", { game_name: "memory", mode: "online" });
          break;
        }

        case "flipped":
          setFlipped((prev) => [...prev, msg.index]);
          audioRef.current?.flip();
          break;

        case "match":
          setMatchAnimEmoji(null);
          audioRef.current?.match();
          // Brief delay so both flipped cards are visible before marking matched
          setTimeout(() => {
            setOnlineMatchedIndices((prev) => [...prev, ...msg.indices]);
            setOnlineScores([...msg.scores]);
            setFlipped([]);
            setLocked(false);
          }, 500);
          break;

        case "nomatch":
          // Cards stay flipped briefly then flip back
          setLocked(true);
          audioRef.current?.noMatch();
          setTimeout(() => {
            setFlipped([]);
            setLocked(false);
          }, 800);
          break;

        case "turn":
          setOnlineTurn(msg.playerNum);
          break;

        case "gameover":
          setOnlineScores([...msg.scores]);
          setOnlineResult({ scores: msg.scores, winner: msg.winner });
          if (msg.winner === playerNum) {
            audioRef.current?.victory();
          }
          setTimeout(() => {
            setScreen("online-finished");
          }, 600);
          break;

        case "opponent_left":
          // Opponent disconnected - you win
          setOnlineResult({
            scores: onlineScores,
            winner: playerNum,
          });
          setScreen("online-finished");
          closeWS();
          break;

        case "error":
          if (screen === "online-lobby") {
            setLobbyStatus("error");
            setTimeout(() => {
              setLobbyStatus("idle");
            }, 2000);
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
  }, [closeWS, difficulty, onlineScores, playerNum, screen]);

  // ---- Start solo game ----
  const startGame = useCallback(() => {
    const deck = generateDeck(difficulty);
    setCards(deck);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTimer(timedMode ? TIMED_DURATION : 0);
    setLocked(false);
    setShakeId(null);
    setMatchAnimEmoji(null);
    setTimedWin(false);
    gameStartedRef.current = false;
    // Init audio
    if (!audioRef.current) {
      audioRef.current = new MemoryAudio();
    }
    audioRef.current.init().catch(() => {});
    setScreen("playing");
  }, [difficulty, timedMode]);

  // ---- Handle start button (with registration check) ----
  const handleStartClick = useCallback(() => {
    if (!user) {
      pendingOnlineRef.current = null;
      setShowRegister(true);
    } else {
      startGame();
    }
  }, [user, startGame]);

  // ---- Handle online button ----
  const handleOnlineClick = useCallback(() => {
    if (!user) {
      pendingOnlineRef.current = "lobby";
      setShowRegister(true);
    } else {
      setScreen("online-lobby");
      setLobbyStatus("idle");
      setRoomId("");
    }
  }, [user]);

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
          const code = pendingOnlineRef.current_code;
          pendingOnlineRef.current = null;
          pendingOnlineRef.current_code = null;
          setScreen("online-lobby");
          setLobbyStatus("joining");
          connectWS("join", code);
        } else {
          startGame();
        }
      }
      return result;
    },
    [register, startGame, connectWS]
  );

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

  // ---- Handle card click (solo) ----
  const handleCardClick = useCallback(
    (index) => {
      if (locked) return;
      if (screen !== "playing") return;

      const card = cards[index];
      if (!card) return;

      if (flipped.includes(index)) return;
      if (matched.includes(card.emoji)) return;

      // Play flip sound
      audioRef.current?.flip();

      if (!gameStartedRef.current) {
        gameStartedRef.current = true;
        window.gtag?.("event", "game_start", { game_name: "memory", difficulty, timedMode });
      }

      const newFlipped = [...flipped, index];

      if (newFlipped.length === 1) {
        setFlipped(newFlipped);
      } else if (newFlipped.length === 2) {
        setFlipped(newFlipped);
        setMoves((m) => m + 1);
        setLocked(true);

        const firstCard = cards[newFlipped[0]];
        const secondCard = cards[newFlipped[1]];

        if (firstCard.emoji === secondCard.emoji) {
          // Match found
          audioRef.current?.match();
          setMatchAnimEmoji(firstCard.emoji);
          setTimeout(() => {
            setMatched((prev) => [...prev, firstCard.emoji]);
            setFlipped([]);
            setLocked(false);
            setMatchAnimEmoji(null);
          }, 600);
        } else {
          // No match
          setTimeout(() => {
            audioRef.current?.noMatch();
            setShakeId(firstCard.id);
            setTimeout(() => setShakeId(null), 500);
          }, 400);
          setTimeout(() => {
            setShakeId(secondCard.id);
          }, 400);
          setTimeout(() => {
            setFlipped([]);
            setLocked(false);
            setShakeId(null);
          }, 800);
        }
      }
    },
    [locked, screen, cards, flipped, matched, difficulty, timedMode]
  );

  // ---- Handle card click (online) ----
  const handleOnlineCardClick = useCallback(
    (index) => {
      if (locked) return;
      if (screen !== "online-playing") return;
      if (onlineTurn !== playerNum) return;

      const card = cards[index];
      if (!card) return;

      if (flipped.includes(index)) return;
      if (onlineMatchedIndices.includes(index)) return;

      // Send flip to server
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: "flip", index }));
      }
    },
    [locked, screen, onlineTurn, playerNum, cards, flipped, onlineMatchedIndices]
  );

  // ---- Go back to menu ----
  const handleBackToMenu = useCallback(() => {
    clearInterval(timerRef.current);
    closeWS();
    setScreen("menu");
    setLobbyStatus("idle");
    setRoomId("");
    setPlayerNum(null);
    setOnlineResult(null);
    setOnlineMatchedIndices([]);
  }, [closeWS]);

  // ---- Restart solo ----
  const handleRestart = useCallback(() => {
    startGame();
  }, [startGame]);

  // ---- Change difficulty (back to menu) ----
  const handleChangeDifficulty = useCallback(() => {
    setScreen("menu");
  }, []);

  // ---- Online play again (create new room) ----
  const handleOnlinePlayAgain = useCallback(() => {
    closeWS();
    setScreen("online-lobby");
    setLobbyStatus("idle");
    setRoomId("");
    setOnlineResult(null);
    setOnlineMatchedIndices([]);
  }, [closeWS]);

  // ---- Auto-join from URL param (?sala=XXXX) ----
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

  // ---- Loading guard ----
  if (!checkedCookie) return null;

  // ---- Card grid dimensions ----
  const cardWidth = cols === 6 ? 68 : 80;
  const cardHeight = cols === 6 ? 84 : 100;
  const gridGap = cols === 6 ? 6 : 8;
  const gridWidth = cols * cardWidth + (cols - 1) * gridGap;
  const containerWidth = Math.max(GAME_W, gridWidth + 24);
  const GAME_H = 620;

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
        @keyframes cardShake {
          0%, 100% { transform: translateX(0) rotateY(180deg); }
          15%, 45%, 75% { transform: translateX(-4px) rotateY(180deg); }
          30%, 60%, 90% { transform: translateX(4px) rotateY(180deg); }
        }
        @keyframes cardMatch {
          0% { transform: scale(1) rotateY(180deg); }
          50% { transform: scale(1.15) rotateY(180deg); }
          100% { transform: scale(1) rotateY(180deg); }
        }
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(600px) rotate(720deg); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(176,38,255,0.2); }
          50% { box-shadow: 0 0 25px rgba(176,38,255,0.5); }
        }
        @keyframes timerFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Register Modal */}
      {showRegister && (
        <RegisterModal
          onRegister={handleRegister}
          loading={registering}
          jogoNome="MEMORY GAME"
          accentColor={ACCENT}
        />
      )}

      {/* Top ad - hidden during active play */}
      {screen !== "playing" && screen !== "online-playing" && (
        <AdBanner slot="memory_top" style={{ marginBottom: 12, maxWidth: GAME_W }} />
      )}

      {/* Title H1 above game area */}
      {screen !== "menu" && (
        <>
          <h1
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 22,
              color: ACCENT,
              textShadow: `0 0 20px ${ACCENT}80, 0 0 40px ${ACCENT}40`,
              marginBottom: 8,
              letterSpacing: 3,
              textAlign: "center",
            }}
          >
            MEMORY GAME
          </h1>
          <p
            style={{
              color: "#4a5568",
              fontSize: 10,
              marginBottom: 14,
              fontFamily: "'Press Start 2P', monospace",
            }}
          >
            {timedMode && screen === "playing" ? "\u23F1 DESAFIO POR TEMPO" : "ENCONTRE TODOS OS PARES"}
          </p>
        </>
      )}

      {/* Bordered container + scaling wrapper */}
      <div style={{ width: GAME_W * gameScale, height: GAME_H * gameScale }}>
        <div
          style={{
            width: GAME_W,
            height: GAME_H,
            position: "relative",
            background: "#0a0a1a",
            border: `2px solid ${ACCENT}33`,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: `0 0 30px ${ACCENT}11`,
            transform: `scale(${gameScale})`,
            transformOrigin: "top left",
          }}
        >
          {/* Menu Screen */}
          {screen === "menu" && (
            <MenuScreen
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              timedMode={timedMode}
              setTimedMode={setTimedMode}
              onStart={handleStartClick}
              onOnline={handleOnlineClick}
            />
          )}

          {/* Online Lobby */}
          {screen === "online-lobby" && (
            <OnlineLobby
              roomId={roomId}
              lobbyStatus={lobbyStatus}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
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
                padding: "12px 0",
              }}
            >
              <PlayingHeader
                moves={moves}
                timer={timer}
                matchedCount={matchedCount}
                totalPairs={totalPairs}
                onBack={handleBackToMenu}
                timedMode={timedMode}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, ${cardWidth}px)`,
                  gap: gridGap,
                  padding: 8,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {cards.map((card, index) => {
                  const isFlipped = flipped.includes(index);
                  const isMatched = matched.includes(card.emoji);
                  return (
                    <Card
                      key={card.id}
                      card={card}
                      index={index}
                      isFlipped={isFlipped}
                      isMatched={isMatched}
                      onClick={handleCardClick}
                      cols={cols}
                      shakeId={shakeId}
                      matchAnimId={matchAnimEmoji}
                    />
                  );
                })}
              </div>

              {user && (
                <div
                  style={{
                    marginTop: 12,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 10,
                    color: "#4a5568",
                  }}
                >
                  {"\u{1F464}"} {user.nome}
                </div>
              )}
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
                padding: "12px 0",
              }}
            >
              <OnlinePlayingHeader
                onlineTurn={onlineTurn}
                playerNum={playerNum}
                onlineScores={onlineScores}
                matchedCount={matchedCount}
                totalPairs={totalPairs}
                onBack={handleBackToMenu}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, ${cardWidth}px)`,
                  gap: gridGap,
                  padding: 8,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${onlineTurn === playerNum ? ONLINE_ACCENT + "20" : "rgba(255,255,255,0.05)"}`,
                  transition: "border-color 0.3s",
                }}
              >
                {cards.map((card, index) => {
                  const isFlipped = flipped.includes(index);
                  const isMatched = onlineMatchedIndices.includes(index);
                  return (
                    <Card
                      key={card.id}
                      card={card}
                      index={index}
                      isFlipped={isFlipped}
                      isMatched={isMatched}
                      onClick={handleOnlineCardClick}
                      cols={cols}
                      shakeId={shakeId}
                      matchAnimId={matchAnimEmoji}
                    />
                  );
                })}
              </div>

              {user && (
                <div
                  style={{
                    marginTop: 12,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 10,
                    color: "#4a5568",
                  }}
                >
                  {"\u{1F464}"} {user.nome} (Jogador {playerNum + 1})
                </div>
              )}
            </div>
          )}

          {/* Solo Finished Screen */}
          {screen === "finished" && (
            <FinishedScreen
              moves={moves}
              timer={timer}
              totalPairs={totalPairs}
              difficulty={difficulty}
              timedMode={timedMode}
              timedWin={timedWin}
              matchedPairs={matchedCount}
              onRestart={handleRestart}
              onChangeDifficulty={handleChangeDifficulty}
            />
          )}

          {/* Online Finished Screen */}
          {screen === "online-finished" && onlineResult && (
            <OnlineFinishedScreen
              onlineScores={onlineResult.scores}
              winner={onlineResult.winner}
              playerNum={playerNum}
              onPlayAgain={handleOnlinePlayAgain}
              onMenu={handleBackToMenu}
            />
          )}
        </div>
      </div>

      {/* Ad Banner */}
      <AdBanner slot="memory_bottom" style={{ marginTop: 16, maxWidth: GAME_W }} />
    </div>
  );
}
