"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Aviso de cookies: só informa e aponta para a política. NÃO é coleta de
// consentimento. Pela política de privacidade, anúncios e medição usam
// legítimo interesse no Brasil (com opção de recusa) e, no EEE/Reino Unido/
// Suíça, o consentimento é pedido pela mensagem do Google (Privacidade e
// mensagens do AdSense). Por isso nada de "ao continuar navegando você
// concorda" nem de botão "aceitar". A CMP e o Consent Mode v2 no código são o
// lote 2, que depende de aprovação.
// _v2: quem fechou o aviso antigo (que presumia consentimento) vê o texto
// corrigido uma vez.
const STORAGE_KEY = "acerteamosca_cookie_notice_v2";

export default function CookieConsent() {
  const t = useTranslations("cookieConsent");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t("label")}
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
        {t("text")}{" "}
        <Link href="/politica-de-privacidade" style={{ color: "#ccd6f6", textDecoration: "underline" }}>
          {t("policy")}
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={dismiss}
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
        {t("ok")}
      </button>
    </div>
  );
}
