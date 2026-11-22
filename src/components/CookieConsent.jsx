"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CMP_NOTICE_DELAY_MS, shouldShowNotice, watchGdprCmp } from "@/lib/cmp";
import { CONSENT_REOPEN_EVENT, applyConsentChoice, readConsentChoice } from "@/lib/consent";

// OPÇÃO "denied global" (feat/consent-lote2-br-opcao): aviso de cookies que
// PEDE a escolha, com Aceitar e Recusar do mesmo tamanho. Até a escolha, o
// Modo de consentimento do Google fica negado em todo lugar
// (src/lib/consent.js). Aceitar manda o gtag('consent', 'update', granted);
// Recusar grava a recusa (e manda o update "denied", caso a pessoa tenha
// aceitado antes e esteja revogando pelo link do rodapé).
//
// Onde a mensagem do Google está ativa (a CMP responde gdprApplies = true:
// EEE, Reino Unido, Suíça) este aviso não aparece, para não haver dois
// banners: lá quem pede a escolha é a CMP do Google. Ele espera a CMP até
// CMP_NOTICE_DELAY_MS antes de aparecer e some se ela responder depois.
// O link "Privacidade e cookies" do rodapé reabre este aviso
// (CONSENT_REOPEN_EVENT) fora dessas regiões.

export default function CookieConsent() {
  const t = useTranslations("cookieConsent");
  // dismissed: true até ler o localStorage, para o servidor não renderizar
  // o aviso. "dismissed" aqui é "já escolheu". A decisão é de
  // shouldShowNotice (src/lib/cmp.js, testada).
  const [estado, setEstado] = useState({ dismissed: true, gdprApplies: undefined, delayElapsed: false });

  useEffect(() => {
    let vivo = true;
    // reabrir pelo link do rodapé: aparece na hora, sem esperar a CMP
    const reabrir = () => setEstado((s) => ({ ...s, dismissed: false, delayElapsed: true }));
    window.addEventListener(CONSENT_REOPEN_EVENT, reabrir);
    let timer;
    if (!readConsentChoice(window)) {
      setEstado((s) => ({ ...s, dismissed: false }));
      timer = setTimeout(() => {
        if (vivo) setEstado((s) => ({ ...s, delayElapsed: true }));
      }, CMP_NOTICE_DELAY_MS);
    }
    watchGdprCmp(window).then((gdprApplies) => {
      if (vivo) setEstado((s) => ({ ...s, gdprApplies }));
    });
    return () => {
      vivo = false;
      clearTimeout(timer);
      window.removeEventListener(CONSENT_REOPEN_EVENT, reabrir);
    };
  }, []);

  function escolher(escolha) {
    applyConsentChoice(window, escolha);
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
        flexWrap: "wrap",
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
          flex: "1 1 260px",
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
      <div style={{ display: "flex", gap: 8, flex: "0 0 auto" }}>
        <button type="button" data-consent="denied" onClick={() => escolher("denied")} style={botao(false)}>
          {t("decline")}
        </button>
        <button type="button" data-consent="granted" onClick={() => escolher("granted")} style={botao(true)}>
          {t("accept")}
        </button>
      </div>
    </div>
  );
}

// Os dois botões do mesmo tamanho e peso: recusar tem de ser tão fácil quanto
// aceitar. Só a cor muda (contorno no Recusar).
function botao(principal) {
  return {
    background: principal ? "#00f0ff" : "transparent",
    color: principal ? "#050510" : "#00f0ff",
    border: "1px solid #00f0ff",
    borderRadius: 6,
    minHeight: 44,
    minWidth: 96,
    padding: "0 14px",
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 9,
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: "bold",
  };
}
