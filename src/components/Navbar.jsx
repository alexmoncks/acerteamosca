"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

export default function Navbar() {
  const t = useTranslations("navbar");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  const switchLocale = () => {
    const next = locale === "pt" ? "en" : "pt";
    router.replace(pathname, { locale: next });
  };

  return (
    <nav style={{
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
      <Link href="/" style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
      }}>
        <span style={{ fontSize: 22 }}>🩴</span>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          color: "#00f0ff",
          textShadow: "0 0 8px rgba(0,240,255,0.4)",
          letterSpacing: 2,
        }}>
          {t("brand")}
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            ← {t("games")}
          </Link>
        )}

        <button
          onClick={switchLocale}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            color: "#ccd6f6",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 7,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {locale === "pt" ? "EN" : "PT"}
        </button>
      </div>
    </nav>
  );
}
