"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "acerteamosca_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "rgba(10, 10, 26, 0.97)",
        borderTop: "1px solid #1a1a3e",
        padding: "16px 20px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        backdropFilter: "blur(10px)",
      }}
    >
      <p
        style={{
          color: "#8892b0",
          fontSize: 12,
          lineHeight: 1.6,
          margin: 0,
          maxWidth: 700,
          fontFamily: "'Fira Code', monospace",
        }}
      >
        Este site utiliza cookies e tecnologias semelhantes para melhorar sua
        {" "}experiência, personalizar publicidade e analisar o tráfego, conforme a{" "}
        <strong style={{ color: "#ccd6f6" }}>
          Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)
        </strong>
        . Ao continuar navegando, você concorda com o uso de cookies.
      </p>
      <button
        onClick={accept}
        style={{
          background: "#00f0ff",
          color: "#050510",
          border: "none",
          borderRadius: 6,
          padding: "10px 24px",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10,
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontWeight: "bold",
        }}
      >
        ACEITAR
      </button>
    </div>
  );
}
