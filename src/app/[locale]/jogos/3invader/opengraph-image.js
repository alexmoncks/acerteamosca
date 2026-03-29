import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "3INVADER - Jogo Shoot em Up Espacial";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0020 0%, #1a0e2e 40%, #0a0020 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120, marginBottom: 20 }}>👾</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#d4a0e8",
            textShadow: "0 0 40px #9a50d080",
            marginBottom: 12,
            letterSpacing: 6,
          }}
        >
          3INVADER
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#ccd6f6",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#8892b0",
            marginBottom: 8,
          }}
        >
          25 fases | 5 mundos | 5 bosses épicos
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#4a5568",
            marginTop: 24,
          }}
        >
          Jogue grátis em acerteamosca.com.br
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
