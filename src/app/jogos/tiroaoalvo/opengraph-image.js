import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Tiro ao Alvo - Acerte a Mosca";
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
        <div style={{ fontSize: 120, marginBottom: 20 }}>🎯</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "#4ade80",
            textShadow: "0 0 40px #4ade8080",
            marginBottom: 12,
          }}
        >
          TIRO AO ALVO
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#ccd6f6",
            marginBottom: 8,
          }}
        >
          Acerte os pratos de argila!
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#4a5568",
            marginTop: 24,
          }}
        >
          Jogue gratis em acerteamosca.com.br
        </div>
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 36 }}>🩴</span>
          <span style={{ fontSize: 20, color: "#00f0ff", fontWeight: 700 }}>
            ACERTE A MOSCA
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
