"use client";

import { useEffect, useState } from "react";

function useMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);
  return mobile;
}

function Btn({ label, onPress, onRelease, color = "#00f0ff", size = 56, fontSize = 20, style }) {
  return (
    <button
      onTouchStart={(e) => { e.preventDefault(); onPress(); }}
      onTouchEnd={(e) => { e.preventDefault(); onRelease(); }}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: size, height: size, borderRadius: size / 2,
        background: `${color}18`, border: `2px solid ${color}55`,
        color, fontSize, fontFamily: "'Press Start 2P', monospace",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", userSelect: "none", WebkitUserSelect: "none",
        touchAction: "none", outline: "none",
        ...style,
      }}
    >
      {label}
    </button>
  );
}

// Pong: left / right / serve
export function PongMobileControls({ keysRef, mode, playerNum }) {
  const mobile = useMobile();
  if (!mobile) return null;

  // Determine which keys to simulate
  const isRemote = mode?.startsWith("remote");
  const leftKey = isRemote ? "ArrowLeft" : "a";
  const rightKey = isRemote ? "ArrowRight" : "d";
  const serveKey = isRemote ? "ArrowUp" : "s";

  const press = (k) => keysRef.current.add(k);
  const release = (k) => keysRef.current.delete(k);

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      gap: 20, marginTop: 16, padding: "0 12px",
    }}>
      <Btn label="◀" onPress={() => press(leftKey)} onRelease={() => release(leftKey)} />
      <Btn label="▲" onPress={() => press(serveKey)} onRelease={() => release(serveKey)}
        color="#39ff14" size={64} fontSize={22} />
      <Btn label="▶" onPress={() => press(rightKey)} onRelease={() => release(rightKey)} />
    </div>
  );
}

// Ships: rotate L/R, forward/back, fire
export function ShipsMobileControls({ keysRef, mode, playerNum }) {
  const mobile = useMobile();
  if (!mobile) return null;

  const isRemote = mode?.startsWith("remote");
  const isP1 = !isRemote || playerNum === 1;
  const fwdKey = isP1 ? "w" : "ArrowUp";
  const backKey = isP1 ? "s" : "ArrowDown";
  const leftKey = isP1 ? "a" : "ArrowLeft";
  const rightKey = isP1 ? "d" : "ArrowRight";
  const fireKey = isP1 ? " " : "Enter";

  const press = (k) => keysRef.current.add(k);
  const release = (k) => keysRef.current.delete(k);

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginTop: 16, padding: "0 8px", width: "100%", maxWidth: 480,
    }}>
      {/* D-pad left side */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Btn label="▲" onPress={() => press(fwdKey)} onRelease={() => release(fwdKey)}
          color="#39ff14" size={50} fontSize={16} />
        <div style={{ display: "flex", gap: 6 }}>
          <Btn label="◀" onPress={() => press(leftKey)} onRelease={() => release(leftKey)}
            size={50} fontSize={16} />
          <Btn label="▼" onPress={() => press(backKey)} onRelease={() => release(backKey)}
            color="#ff2d95" size={50} fontSize={16} />
          <Btn label="▶" onPress={() => press(rightKey)} onRelease={() => release(rightKey)}
            size={50} fontSize={16} />
        </div>
      </div>

      {/* Fire button right side */}
      <Btn label="FIRE" onPress={() => press(fireKey)} onRelease={() => release(fireKey)}
        color="#ff2d95" size={72} fontSize={10}
        style={{ fontWeight: 900, letterSpacing: 1 }} />
    </div>
  );
}
