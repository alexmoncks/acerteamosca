"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import AdBanner from "@/components/AdBanner";
import AdsTerraPopunder from "@/components/AdsTerraPopunder";
import AdsTerraBanner from "@/components/AdsTerraBanner";
import AdsTerraSocialBar from "@/components/AdsTerraSocialBar";

const slugs = [
  { slug: "acerteamosca", emoji: "🦟", cor: "#00f0ff", destaque: true },
  { slug: "pong", emoji: "🏓", cor: "#b026ff", destaque: false },
  { slug: "ships", emoji: "🚀", cor: "#39ff14", destaque: false },
  { slug: "wordle", emoji: "🔤", cor: "#a3e635", destaque: false },
  { slug: "memory", emoji: "🧠", cor: "#34d399", destaque: false },
  { slug: "2048", emoji: "🔢", cor: "#f59e0b", destaque: false },
  { slug: "bubbleshooter", emoji: "🫧", cor: "#e879f9", destaque: false },
  { slug: "deepattack", emoji: "🚀", cor: "#22d3ee", destaque: false },
  { slug: "jacare", emoji: "🐊", cor: "#39ff14", destaque: false },
  { slug: "tiroaoalvo", emoji: "🎯", cor: "#4ade80", destaque: false },
  { slug: "batalha-naval", emoji: "⚓", cor: "#3b82f6", destaque: false },
  { slug: "brickbreaker", emoji: "🧱", cor: "#00f0ff", destaque: false },
  { slug: "3invader", emoji: "👾", cor: "#9a50d0", destaque: false },
];

export default function Home() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const faqItems = t.raw("faq.items");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050510",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 12px",
      }}
    >
      <AdsTerraPopunder />
      <AdsTerraSocialBar />
      <div style={{ fontSize: 32, marginBottom: 4 }}>🩴</div>
      <h1
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 18,
          color: "#00f0ff",
          textShadow: "0 0 30px #00f0ff, 0 0 60px rgba(0,240,255,0.3)",
          letterSpacing: 4,
          textAlign: "center",
          marginBottom: 4,
        }}
      >
        ACERTE A MOSCA
      </h1>
      <p
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 7,
          color: "#ff2d95",
          letterSpacing: 3,
          textShadow: "0 0 10px #ff2d95",
          marginBottom: 12,
        }}
      >
        {t("subtitle")}
      </p>

      {/* 3INVADER Cinematic Banner */}
      <Link href="/jogos/3invader" style={{ textDecoration: "none", maxWidth: 900, width: "100%", marginBottom: 20 }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 12,
            border: "2px solid #9a50d0",
            boxShadow: "0 0 30px rgba(154,80,208,0.3)",
            background: "#0a0a1a",
            minHeight: 180,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "url(/images/3invader/intro-4.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to right, rgba(5,5,16,0.92), rgba(5,5,16,0.4))",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "24px 32px",
              minHeight: 180,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 22,
                  color: "#d4a0e8",
                  textShadow: "0 0 20px rgba(154,80,208,0.5)",
                  marginBottom: 8,
                  letterSpacing: 3,
                }}
              >
                {t("banner3invader.title")}
              </h2>
              <p
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 12,
                  color: "#ccd6f6",
                  lineHeight: 1.8,
                  marginBottom: 16,
                  maxWidth: 400,
                }}
              >
                {t("banner3invader.line1")}
                <br />
                {t("banner3invader.line2")}
                <br />
                {t("banner3invader.line3")}
              </p>
              <span
                style={{
                  display: "inline-block",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#020824",
                  background: "#9a50d0",
                  borderRadius: 6,
                  padding: "8px 20px",
                  letterSpacing: 2,
                  boxShadow: "0 0 15px rgba(154,80,208,0.4)",
                }}
              >
                {t("banner3invader.cta")} &gt;&gt;
              </span>
            </div>
            <div style={{ marginLeft: 24, flexShrink: 0 }}>
              <img
                src="/images/3invader/ship.png"
                alt="ARROW-7"
                width={96}
                height={72}
                style={{
                  imageRendering: "pixelated",
                  filter: "drop-shadow(0 0 12px rgba(0,240,255,0.5))",
                  animation: "invBannerFloat 3s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>
      </Link>

      <style>{`
        @keyframes invBannerFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <AdBanner slot="home_top" style={{ marginBottom: 20, maxWidth: 900, width: "100%" }} />
      <AdsTerraBanner style={{ marginBottom: 20, maxWidth: 900 }} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
          maxWidth: 900,
          width: "100%",
        }}
      >
        {slugs.map((jogo) => (
          <Link key={jogo.slug} href={`/jogos/${jogo.slug}`} style={{ display: "flex", textDecoration: "none" }}>
            <div
              style={{
                background: "#0a0a1a",
                border: `2px solid ${jogo.destaque ? jogo.cor : "#1a1a2e"}`,
                borderRadius: 12,
                padding: 24,
                cursor: "pointer",
                transition: "all 0.3s",
                boxShadow: jogo.destaque
                  ? `0 0 20px ${jogo.cor}33`
                  : "none",
                display: "flex",
                flexDirection: "column",
                width: "100%",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>
                {jogo.emoji}
              </div>
              <h2
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  color: jogo.cor,
                  marginBottom: 8,
                }}
              >
                {t(`games.${jogo.slug}.name`)}
              </h2>
              <p
                style={{
                  color: "#8892b0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  flex: 1,
                }}
              >
                {t(`games.${jogo.slug}.desc`)}
              </p>
              {jogo.destaque && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    padding: "4px 10px",
                    background: `${jogo.cor}22`,
                    border: `1px solid ${jogo.cor}55`,
                    borderRadius: 4,
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: 7,
                    color: jogo.cor,
                    letterSpacing: 1,
                  }}
                >
                  {tc("mainGame")}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>

      <AdBanner slot="home_bottom" style={{ marginTop: 30, maxWidth: 900, width: "100%" }} />

      {/* FAQ Section */}
      <section style={{ maxWidth: 900, width: "100%", marginTop: 40, padding: "0 16px" }}>
        <h2 style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: "#00f0ff",
          textShadow: "0 0 10px rgba(0,240,255,0.3)", marginBottom: 24, textAlign: "center",
        }}>{t("faq.title")}</h2>

        {faqItems.map((faq, i) => (
          <div key={i} style={{
            marginBottom: 16, padding: "16px 20px", background: "#0a0a1a",
            border: "1px solid #1a1a2e", borderRadius: 8,
          }}>
            <h3 style={{ color: "#ccd6f6", fontSize: 13, marginBottom: 8, fontFamily: "'Fira Code', monospace" }}>
              {faq.q}
            </h3>
            <p style={{ color: "#8892b0", fontSize: 12, lineHeight: 1.6, fontFamily: "'Fira Code', monospace", margin: 0 }}>
              {faq.a}
            </p>
          </div>
        ))}
      </section>

      <AdsTerraBanner style={{ marginTop: 30, maxWidth: 900 }} />

    </div>
  );
}
