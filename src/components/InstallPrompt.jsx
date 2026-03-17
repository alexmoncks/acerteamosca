"use client";

import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Only show on mobile
    if (!("ontouchstart" in window)) return;
    // Check if already dismissed
    if (localStorage.getItem("install_dismissed")) return;
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after 30 seconds of usage
      setTimeout(() => setShow(true), 30000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For iOS (no beforeinstallprompt), show manual instructions after 30s
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      setTimeout(() => setShow(true), 30000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setShow(false);
      }
    }
    dismiss();
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("install_dismissed", "1");
  };

  if (!show) return null;

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      background: "#0a0a1a",
      border: "1px solid #00f0ff33",
      borderBottom: "none",
      borderRadius: "12px 12px 0 0",
      padding: "16px 20px",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: "0 -4px 20px rgba(0,240,255,0.1)",
      animation: "slideUp 0.3s ease-out",
    }}>
      <style>{`
        @keyframes slideUp {
          0% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
      `}</style>
      <span style={{ fontSize: 28 }}>🩴</span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          color: "#00f0ff",
          marginBottom: 4,
        }}>INSTALAR APP</div>
        <div style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: 11,
          color: "#8892b0",
          lineHeight: 1.4,
        }}>
          {isIOS
            ? "Toque em Compartilhar e depois \"Adicionar a Tela de Inicio\""
            : "Adicione Acerte a Mosca na sua tela inicial!"
          }
        </div>
      </div>
      {!isIOS && deferredPrompt && (
        <button onClick={handleInstall} style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          padding: "8px 14px",
          background: "#00f0ff",
          color: "#050510",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}>INSTALAR</button>
      )}
      <button onClick={dismiss} style={{
        background: "none",
        border: "none",
        color: "#4a5568",
        fontSize: 18,
        cursor: "pointer",
        padding: "4px 8px",
      }}>✕</button>
    </div>
  );
}
