"use client";

import { useRef, useCallback } from "react";
import useMobile from "@/hooks/useMobile";

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

  // In remote mode both players use arrows (each on their own device)
  // In local/cpu mode P1 uses a/d/s
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

// Analog joystick component for Ships
function AnalogJoystick({ keysRef, fwdKey, backKey, leftKey, rightKey }) {
  const stickRef = useRef(null);
  const knobRef = useRef(null);
  const activeRef = useRef(null); // touch identifier
  const centerRef = useRef({ x: 0, y: 0 });
  const RADIUS = 55;
  const DEAD_ZONE = 0.2;

  const updateKeys = useCallback((dx, dy) => {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normX = dist > 0 ? dx / RADIUS : 0;
    const normY = dist > 0 ? dy / RADIUS : 0;

    // Clamp to radius
    const clampedX = Math.max(-1, Math.min(1, normX));
    const clampedY = Math.max(-1, Math.min(1, normY));

    // Update knob position visually
    if (knobRef.current) {
      const visualX = clampedX * RADIUS;
      const visualY = clampedY * RADIUS;
      knobRef.current.style.transform = `translate(${visualX}px, ${visualY}px)`;
    }

    // Map to keys with dead zone
    if (clampedX < -DEAD_ZONE) {
      keysRef.current.add(leftKey);
      keysRef.current.delete(rightKey);
    } else if (clampedX > DEAD_ZONE) {
      keysRef.current.add(rightKey);
      keysRef.current.delete(leftKey);
    } else {
      keysRef.current.delete(leftKey);
      keysRef.current.delete(rightKey);
    }

    if (clampedY < -DEAD_ZONE) {
      keysRef.current.add(fwdKey);
      keysRef.current.delete(backKey);
    } else if (clampedY > DEAD_ZONE) {
      keysRef.current.add(backKey);
      keysRef.current.delete(fwdKey);
    } else {
      keysRef.current.delete(fwdKey);
      keysRef.current.delete(backKey);
    }
  }, [keysRef, fwdKey, backKey, leftKey, rightKey]);

  const releaseAll = useCallback(() => {
    keysRef.current.delete(fwdKey);
    keysRef.current.delete(backKey);
    keysRef.current.delete(leftKey);
    keysRef.current.delete(rightKey);
    if (knobRef.current) {
      knobRef.current.style.transform = "translate(0px, 0px)";
    }
    activeRef.current = null;
  }, [keysRef, fwdKey, backKey, leftKey, rightKey]);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    if (activeRef.current !== null) return; // already tracking a finger
    const touch = e.changedTouches[0];
    activeRef.current = touch.identifier;
    const rect = stickRef.current.getBoundingClientRect();
    centerRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const dx = touch.clientX - centerRef.current.x;
    const dy = touch.clientY - centerRef.current.y;
    updateKeys(dx, dy);
  }, [updateKeys]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeRef.current) {
        const dx = touch.clientX - centerRef.current.x;
        const dy = touch.clientY - centerRef.current.y;
        updateKeys(dx, dy);
        break;
      }
    }
  }, [updateKeys]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeRef.current) {
        releaseAll();
        break;
      }
    }
  }, [releaseAll]);

  return (
    <div
      ref={stickRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        width: RADIUS * 2 + 20, height: RADIUS * 2 + 20,
        borderRadius: "50%",
        background: "rgba(57,255,20,0.06)",
        border: "2px solid rgba(57,255,20,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
        touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
      }}
    >
      {/* Cross guides */}
      <div style={{ position: "absolute", width: 2, height: "60%", background: "rgba(57,255,20,0.1)", borderRadius: 1 }} />
      <div style={{ position: "absolute", width: "60%", height: 2, background: "rgba(57,255,20,0.1)", borderRadius: 1 }} />
      {/* Knob */}
      <div
        ref={knobRef}
        style={{
          width: 40, height: 40, borderRadius: 20,
          background: "rgba(57,255,20,0.2)",
          border: "2px solid rgba(57,255,20,0.5)",
          boxShadow: "0 0 12px rgba(57,255,20,0.3)",
          transition: "none",
        }}
      />
    </div>
  );
}

// Ships: analog joystick + fire
export function ShipsMobileControls({ keysRef, mode, playerNum }) {
  const mobile = useMobile();
  if (!mobile) return null;

  // Remote: both players use same keys (each on own device, server identifies by connection)
  // Local/CPU: P1 uses WASD + Space
  const fwdKey = "w";
  const backKey = "s";
  const leftKey = "a";
  const rightKey = "d";
  const fireKey = " ";

  const press = (k) => keysRef.current.add(k);
  const release = (k) => keysRef.current.delete(k);

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginTop: 16, padding: "0 8px", width: "100%", maxWidth: 480,
    }}>
      {/* Analog joystick left side */}
      <AnalogJoystick
        keysRef={keysRef}
        fwdKey={fwdKey}
        backKey={backKey}
        leftKey={leftKey}
        rightKey={rightKey}
      />

      {/* Fire button right side */}
      <Btn label="FIRE" onPress={() => press(fireKey)} onRelease={() => release(fireKey)}
        color="#ff2d95" size={72} fontSize={10}
        style={{ fontWeight: 900, letterSpacing: 1 }} />
    </div>
  );
}
