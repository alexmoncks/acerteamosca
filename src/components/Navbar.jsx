"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <nav aria-label="Navegacao principal" style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 48,
      background: "rgba(5,5,16,0.85)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid rgba(0,240,255,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      zIndex: 1000,
    }}>
      <Link href="/" aria-label="Pagina inicial - Acerte a Mosca" style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
      }}>
        <span style={{ fontSize: 22 }} role="img" aria-hidden="true">🩴</span>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          color: "#00f0ff",
          textShadow: "0 0 8px rgba(0,240,255,0.4)",
          letterSpacing: 2,
        }}>
          ACERTE A MOSCA
        </span>
      </Link>

      {!isHome && (
        <Link href="/" style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 14px",
          background: "rgba(0,240,255,0.08)",
          border: "1px solid rgba(0,240,255,0.2)",
          borderRadius: 6,
          color: "#00f0ff",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          letterSpacing: 1,
          textDecoration: "none",
          transition: "all 0.2s",
        }}>
          ← JOGOS
        </Link>
      )}

    </nav>
  );
}
