"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import AdBanner from "@/components/AdBanner";
import RegisterModal from "@/components/RegisterModal";
import useJogador from "@/hooks/useJogador";
import useGameScale from "@/hooks/useGameScale";

const WS_URL = process.env.NEXT_PUBLIC_WS_MEMORY_URL || "ws://localhost:3004";

const GAME_W = 500;
const COLOR_BG = "#050510";
const ACCENT = "#667eea";
const ACCENT2 = "#764ba2";
const NEON_GREEN = "#39ff14";

const ALL_EMOJIS = ["🍎", "🚀", "⚽", "🎵", "🌟", "🎯", "🐱", "🌈", "🔥", "💎", "🎪", "🏆"];

const DIFFICULTIES = {
  easy: { label: "Fácil", cols: 4, rows: 3, pairs: 6 },
  medium: { label: "Médio", cols: 4, rows: 4, pairs: 8 },
  hard: { label: "Difícil", cols: 6, rows: 4, pairs: 12 },
};

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
function calculateScore(moves, time, totalPairs) {
  const perfectMoves = totalPairs;
  const moveRatio = perfectMoves / Math.max(moves, perfectMoves);
  const timeBonus = Math.max(0, 1 - time / (totalPairs * 10));
  return Math.round(moveRatio * 800 + timeBonus * 200);
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
function MenuScreen({ difficulty, setDifficulty, onStart }) {
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
        {["🍎", "🚀", "⚽", "🎵"].map((emoji, i) => (
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
                ? "0 0 15px rgba(102,126,234,0.3)"
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
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
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

      {/* Online placeholder */}
      <button
        disabled
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10,
          padding: "10px 28px",
          background: "#1a1a2e",
          color: "#444",
          border: "2px solid #2a2a4a",
          borderRadius: 10,
          cursor: "not-allowed",
          opacity: 0.5,
          letterSpacing: 1,
        }}
      >
        Jogar Online
        <span
          style={{
            display: "block",
            fontSize: 7,
            marginTop: 4,
            color: "#333",
          }}
        >
          (em breve)
        </span>
      </button>
    </div>
  );
}

// ---- Playing Header ----
function PlayingHeader({ moves, timer, matchedCount, totalPairs, onBack }) {
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
        ←
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
        <span style={{ color: ACCENT }}>
          ⏱ {formatTime(timer)}
        </span>
        <span>
          🃏 {moves}
        </span>
        <span style={{ color: NEON_GREEN }}>
          ✓ {matchedCount}/{totalPairs}
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
            boxShadow: `0 2px 12px rgba(102,126,234,0.25)`,
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

// ---- Finished Screen ----
function FinishedScreen({ moves, timer, totalPairs, difficulty, onRestart, onChangeDifficulty }) {
  const stars = getStars(moves, totalPairs);
  const score = calculateScore(moves, timer, totalPairs);

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

      <h2
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 18,
          color: NEON_GREEN,
          textShadow: `0 0 20px ${NEON_GREEN}80`,
          marginBottom: 24,
          textAlign: "center",
          animation: "popIn 0.5s ease both",
        }}
      >
        PARABÉNS!
      </h2>

      {/* Stars */}
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
            ⭐
          </span>
        ))}
      </div>

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
            Tempo
          </span>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: 11,
              color: ACCENT,
            }}
          >
            {formatTime(timer)}
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
              color: NEON_GREEN,
            }}
          >
            {totalPairs}/{totalPairs}
          </span>
        </div>
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
    </div>
  );
}

// ====== MAIN COMPONENT ======
export default function MemoryGame() {
  const { user, checkedCookie, registering, register } = useJogador("memory");
  const gameScale = useGameScale(GAME_W);

  // ---- State ----
  const [screen, setScreen] = useState("menu"); // menu | playing | finished
  const [difficulty, setDifficulty] = useState("medium");
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]); // indices of currently flipped (max 2)
  const [matched, setMatched] = useState([]); // emoji strings that have been matched
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [shakeId, setShakeId] = useState(null);
  const [matchAnimEmoji, setMatchAnimEmoji] = useState(null);

  const timerRef = useRef(null);
  const gameStartedRef = useRef(false);

  // ---- Derived ----
  const totalPairs = DIFFICULTIES[difficulty].pairs;
  const matchedCount = matched.length;
  const cols = DIFFICULTIES[difficulty].cols;
  const rows = DIFFICULTIES[difficulty].rows;

  // ---- Timer effect ----
  useEffect(() => {
    if (screen === "playing") {
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen]);

  // ---- Check win condition ----
  useEffect(() => {
    if (screen !== "playing") return;
    if (matchedCount === totalPairs && matchedCount > 0) {
      // Delay slightly so the match animation completes
      const timeout = setTimeout(() => {
        clearInterval(timerRef.current);
        const finalScore = calculateScore(moves, timer, totalPairs);

        // Submit score
        fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pontos: finalScore,
            jogo: "memory",
            metadata: {
              pares: totalPairs,
              movimentos: moves,
              tempo: timer,
              dificuldade: difficulty,
            },
          }),
        }).catch(() => {});

        // gtag event
        window.gtag?.("event", "game_end", {
          game_name: "memory",
          score: finalScore,
          difficulty,
          moves,
          time: timer,
        });

        setScreen("finished");
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [matchedCount, totalPairs, screen, moves, timer, difficulty]);

  // ---- Start game ----
  const startGame = useCallback(() => {
    const deck = generateDeck(difficulty);
    setCards(deck);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTimer(0);
    setLocked(false);
    setShakeId(null);
    setMatchAnimEmoji(null);
    gameStartedRef.current = false;
    setScreen("playing");
  }, [difficulty]);

  // ---- Handle start button (with registration check) ----
  const handleStartClick = useCallback(() => {
    if (!user) {
      setShowRegister(true);
    } else {
      startGame();
    }
  }, [user, startGame]);

  // ---- Handle registration ----
  const handleRegister = useCallback(
    async (userData) => {
      const result = await register(userData);
      if (result && !result.error) {
        setShowRegister(false);
        startGame();
      }
      return result;
    },
    [register, startGame]
  );

  // ---- Handle card click ----
  const handleCardClick = useCallback(
    (index) => {
      if (locked) return;
      if (screen !== "playing") return;

      const card = cards[index];
      if (!card) return;

      // Ignore if already flipped or already matched
      if (flipped.includes(index)) return;
      if (matched.includes(card.emoji)) return;

      // Fire game_start on first flip
      if (!gameStartedRef.current) {
        gameStartedRef.current = true;
        window.gtag?.("event", "game_start", { game_name: "memory", difficulty });
      }

      const newFlipped = [...flipped, index];

      if (newFlipped.length === 1) {
        // First card of the pair
        setFlipped(newFlipped);
      } else if (newFlipped.length === 2) {
        // Second card of the pair
        setFlipped(newFlipped);
        setMoves((m) => m + 1);
        setLocked(true);

        const firstCard = cards[newFlipped[0]];
        const secondCard = cards[newFlipped[1]];

        if (firstCard.emoji === secondCard.emoji) {
          // Match found
          setMatchAnimEmoji(firstCard.emoji);
          setTimeout(() => {
            setMatched((prev) => [...prev, firstCard.emoji]);
            setFlipped([]);
            setLocked(false);
            setMatchAnimEmoji(null);
          }, 600);
        } else {
          // No match - shake then flip back
          setTimeout(() => {
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
    [locked, screen, cards, flipped, matched, difficulty]
  );

  // ---- Go back to menu ----
  const handleBackToMenu = useCallback(() => {
    clearInterval(timerRef.current);
    setScreen("menu");
  }, []);

  // ---- Restart with same difficulty ----
  const handleRestart = useCallback(() => {
    startGame();
  }, [startGame]);

  // ---- Change difficulty (back to menu) ----
  const handleChangeDifficulty = useCallback(() => {
    setScreen("menu");
  }, []);

  // ---- Loading guard ----
  if (!checkedCookie) return null;

  // ---- Card grid dimensions ----
  const cardWidth = cols === 6 ? 68 : 80;
  const cardHeight = cols === 6 ? 84 : 100;
  const gridGap = cols === 6 ? 6 : 8;
  const gridWidth = cols * cardWidth + (cols - 1) * gridGap;
  const containerWidth = Math.max(GAME_W, gridWidth + 24);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLOR_BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
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
          0%, 100% { box-shadow: 0 0 10px rgba(102,126,234,0.2); }
          50% { box-shadow: 0 0 25px rgba(102,126,234,0.4); }
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

      {/* Game container */}
      <div
        style={{
          width: containerWidth,
          maxWidth: GAME_W,
          transform: `scale(${gameScale})`,
          transformOrigin: "top center",
          position: "relative",
          minHeight: 500,
        }}
      >
        {/* Menu Screen */}
        {screen === "menu" && (
          <MenuScreen
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            onStart={handleStartClick}
          />
        )}

        {/* Playing Screen */}
        {screen === "playing" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "fadeIn 0.3s ease",
            }}
          >
            {/* Title */}
            <h1
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 14,
                color: ACCENT,
                textShadow: `0 0 12px ${ACCENT}60`,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              MEMORY GAME
            </h1>

            {/* Header Stats */}
            <PlayingHeader
              moves={moves}
              timer={timer}
              matchedCount={matchedCount}
              totalPairs={totalPairs}
              onBack={handleBackToMenu}
            />

            {/* Card Grid */}
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

            {/* User info */}
            {user && (
              <div
                style={{
                  marginTop: 12,
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 10,
                  color: "#4a5568",
                }}
              >
                👤 {user.nome}
              </div>
            )}
          </div>
        )}

        {/* Finished Screen */}
        {screen === "finished" && (
          <FinishedScreen
            moves={moves}
            timer={timer}
            totalPairs={totalPairs}
            difficulty={difficulty}
            onRestart={handleRestart}
            onChangeDifficulty={handleChangeDifficulty}
          />
        )}
      </div>

      {/* Ad Banner */}
      <AdBanner slot="memory_bottom" style={{ marginTop: 16, maxWidth: GAME_W }} />
    </div>
  );
}
