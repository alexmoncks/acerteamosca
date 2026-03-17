"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "acerteamosca_update_dismissed";
const UPDATE_ID = "deep-attack-launch";

export default function UpdateModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed !== UPDATE_ID) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (visible && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [visible]);

  function handleDismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, UPDATE_ID);
    } catch {}
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de atualizacao"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(6px)",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#0a0a1a",
          border: "2px solid #b026ff",
          borderRadius: 14,
          padding: 32,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 0 60px #b026ff22, 0 0 120px #b026ff11",
          textAlign: "center",
          position: "relative",
        }}
      >
        <button
          onClick={handleDismiss}
          aria-label="Fechar"
          style={{
            position: "absolute",
            top: 10,
            right: 14,
            background: "none",
            border: "none",
            color: "#8892b0",
            fontSize: 20,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          &times;
        </button>

        <div style={{ fontSize: 48, marginBottom: 16 }} role="img" aria-hidden="true">
          🚀
        </div>

        <h2
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 13,
            color: "#b026ff",
            marginBottom: 10,
            textShadow: "0 0 10px #b026ff",
          }}
        >
          NOVIDADE!
        </h2>

        <p
          style={{
            color: "#c0c8e0",
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 24,
            fontFamily: "'Fira Code', monospace",
          }}
        >
          Novo jogo disponivel!{" "}
          <strong style={{ color: "#22d3ee" }}>Deep Attack</strong> ja esta no ar
          — pilote sua nave e destrua aliens!
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={handleDismiss}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: 9,
              color: "#8892b0",
              background: "transparent",
              border: "1px solid #2a2a4a",
              padding: "10px 18px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            FECHAR
          </button>
          <Link href="/jogos/deepattack" style={{ textDecoration: "none" }}>
            <button
              onClick={handleDismiss}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: 9,
                color: "#050510",
                background: "linear-gradient(135deg, #b026ff, #22d3ee)",
                border: "none",
                padding: "10px 18px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              JOGAR AGORA
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
