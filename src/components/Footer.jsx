import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function Footer() {
  const t = await getTranslations("footer");

  const linkStyle = {
    color: "#8892b0",
    fontSize: 11,
    fontFamily: "'Fira Code', monospace",
    textDecoration: "none",
    padding: "4px 8px",
    transition: "color 0.2s",
  };

  return (
    <footer
      style={{
        background: "rgba(5,5,16,0.95)",
        borderTop: "1px solid rgba(0,240,255,0.1)",
        padding: "30px 20px 80px",
        marginTop: 40,
        textAlign: "center",
      }}
    >
      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <Link href="/sobre" style={linkStyle}>
          {t("about")}
        </Link>
        <Link href="/contato" style={linkStyle}>
          {t("contact")}
        </Link>
        <Link href="/politica-de-privacidade" style={linkStyle}>
          {t("privacy")}
        </Link>
        <Link href="/termos-de-uso" style={linkStyle}>
          {t("terms")}
        </Link>
      </nav>
      <p
        style={{
          color: "#2a2a4a",
          fontSize: 10,
          fontFamily: "'Fira Code', monospace",
          margin: 0,
        }}
      >
        {t("tagline")}
      </p>
    </footer>
  );
}
