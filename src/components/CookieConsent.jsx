"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CMP_NOTICE_DELAY_MS, shouldShowNotice, watchGdprCmp } from "@/lib/cmp";

// Aviso de cookies: só informa e aponta para a política. NÃO é coleta de
// consentimento. Pela política de privacidade, anúncios e medição usam
// legítimo interesse no Brasil (com opção de recusa) e, no EEE/Reino Unido/
// Suíça, o consentimento é pedido pela mensagem do Google (Privacidade e
// mensagens do AdSense), com o Modo de consentimento negado por padrão
// (src/lib/consent.js). Por isso nada de "ao continuar navegando você
// concorda" nem de botão "aceitar".
//
// Lote 2: onde a mensagem do Google está ativa (a CMP responde
// gdprApplies = true), este aviso não aparece, para não haver dois banners.
// Ele espera a CMP até CMP_NOTICE_DELAY_MS antes de aparecer e some se ela
// responder depois. No celular ele é uma faixa baixa (≤ ~12% da tela em
// 360 px): texto curto, uma linha de botão.
// _v2: quem fechou o aviso antigo (que presumia consentimento) vê o texto
// corrigido uma vez.
const STORAGE_KEY = "acerteamosca_cookie_notice_v2";

export default function CookieConsent() {
  const t = useTranslations("cookieConsent");
  // dismissed: true até ler o localStorage, para o servidor não renderizar
  // o aviso. A decisão é de shouldShowNotice (src/lib/cmp.js, testada).
  const [estado, setEstado] = useState({ dismissed: true, gdprApplies: undefined, delayElapsed: false });

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setEstado((s) => ({ ...s, dismissed: false }));
    let vivo = true;
    const timer = setTimeout(() => {
      if (vivo) setEstado((s) => ({ ...s, delayElapsed: true }));
    }, CMP_NOTICE_DELAY_MS);
    watchGdprCmp(window).then((gdprApplies) => {
      if (vivo) setEstado((s) => ({ ...s, gdprApplies }));
    });
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "dismissed");
    setEstado((s) => ({ ...s, dismissed: true }));
  }

  const visible = shouldShowNotice(estado);
  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t("label")}
      data-cookie-notice=""
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "rgba(10, 10, 26, 0.97)",
        borderTop: "1px solid #1a1a3e",
        padding: "8px 12px calc(8px + env(safe-area-inset-bottom, 0px))",
        display: "flex",
        flexWrap: "nowrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backdropFilter: "blur(10px)",
      }}
    >
      <p
        style={{
          color: "#8892b0",
          fontSize: 11,
          lineHeight: 1.45,
          margin: 0,
          maxWidth: 640,
          flex: "0 1 auto",
          minWidth: 0,
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
          minHeight: 44,
          minWidth: 44,
          padding: "0 14px",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 9,
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontWeight: "bold",
          flex: "0 0 auto",
        }}
      >
        {t("ok")}
      </button>
    </div>
  );
}
