import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Acerte a Mosca - Jogos Online Gratis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #050510 0%, #0a0a2e 50%, #050510 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 100, marginBottom: 20 }}>🩴</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#00f0ff",
            textShadow: "0 0 40px rgba(0,240,255,0.5)",
            marginBottom: 12,
          }}
        >
          ACERTE A MOSCA
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#8892b0",
            marginBottom: 32,
          }}
        >
          Jogos Online Gratis no Navegador
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {["🦟", "🏓", "🚀", "🔤", "🧠", "🔢", "🫧", "🐊", "🎯"].map((e, i) => (
            <div
              key={i}
              style={{
                fontSize: 40,
                background: "rgba(255,255,255,0.05)",
                borderRadius: 12,
                width: 60,
                height: 60,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {e}
            </div>
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 30,
            fontSize: 20,
            color: "#4a5568",
          }}
        >
          acerteamosca.com.br
        </div>
      </div>
    ),
    { ...size }
  );
}
