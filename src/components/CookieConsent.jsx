"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  CMP_NOTICE_DELAY_MS,
  CMP_WATCH_TIMEOUT_MS,
  acceptDecision,
  grantAfterWait,
  pingGdprAppliesNow,
  shouldShowNotice,
  watchGdprCmp,
} from "@/lib/cmp";
import { CONSENT_REOPEN_EVENT, applyConsentChoice, dropSiteChoiceForGdpr, readConsentChoice } from "@/lib/consent";

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
// E não concede nada por lá, nem com a CMP lenta: o Aceitar só concede
// quando a CMP disse que o GDPR não se aplica, ou quando o prazo dela
// (CMP_WATCH_TIMEOUT_MS desde a carga) acaba sem CMP nenhuma (acceptDecision,
// grantAfterWait). Até lá, espera. Se a CMP disser depois que o GDPR
// se aplica, a escolha do site é descartada (dropSiteChoiceForGdpr).
// O link "Privacidade e cookies" do rodapé reabre este aviso
// (CONSENT_REOPEN_EVENT) fora dessas regiões.

export default function CookieConsent() {
  const t = useTranslations("cookieConsent");
  // dismissed: true até ler o localStorage, para o servidor não renderizar
  // o aviso. "dismissed" aqui é "já escolheu". A decisão é de
  // shouldShowNotice (src/lib/cmp.js, testada).
  const [estado, setEstado] = useState({ dismissed: true, gdprApplies: undefined, delayElapsed: false });
  // reaberto pelo rodapé: o foco vai para o aviso, para o leitor de tela
  // anunciar e o teclado chegar nele
  const [focar, setFocar] = useState(false);
  const primeiroBotao = useRef(null);
  // o prazo da CMP conta da carga da página, não do clique
  const inicio = useRef(Date.now());

  useEffect(() => {
    let vivo = true;
    // reabrir pelo link do rodapé: aparece na hora, sem esperar a CMP
    const reabrir = () => {
      setEstado((s) => ({ ...s, dismissed: false, delayElapsed: true }));
      setFocar(true);
    };
    window.addEventListener(CONSENT_REOPEN_EVENT, reabrir);
    let timer;
    if (!readConsentChoice(window)) {
      setEstado((s) => ({ ...s, dismissed: false }));
      timer = setTimeout(() => {
        if (vivo) setEstado((s) => ({ ...s, delayElapsed: true }));
      }, CMP_NOTICE_DELAY_MS);
    }
    watchGdprCmp(window).then((gdprApplies) => {
      // a CMP do Google manda no EEE: a escolha do site não vale ali
      if (gdprApplies === true) dropSiteChoiceForGdpr(window);
      if (vivo) setEstado((s) => ({ ...s, gdprApplies }));
    });
    return () => {
      vivo = false;
      clearTimeout(timer);
      window.removeEventListener(CONSENT_REOPEN_EVENT, reabrir);
    };
  }, []);

  useEffect(() => {
    if (focar && primeiroBotao.current) {
      primeiroBotao.current.focus();
      setFocar(false);
    }
  });

  function escolher(escolha) {
    setEstado((s) => ({ ...s, dismissed: true }));
    if (escolha === "denied") {
      applyConsentChoice(window, "denied");
      return;
    }
    const decisao = acceptDecision({
      gdprApplies: estado.gdprApplies,
      pingNow: pingGdprAppliesNow(window),
      cmpPresent: typeof window.__tcfapi === "function",
    });
    if (decisao === "grant") applyConsentChoice(window, "granted");
    else if (decisao === "wait") {
      // espera a CMP pelo que resta do prazo; só concede com "não se aplica"
      // explícito ou sem CMP nenhuma no fim (grantAfterWait)
      const resta = Math.max(0, CMP_WATCH_TIMEOUT_MS - (Date.now() - inicio.current));
      watchGdprCmp(window, { timeoutMs: resta }).then((gdprApplies) => {
        if (grantAfterWait(gdprApplies, typeof window.__tcfapi === "function")) applyConsentChoice(window, "granted");
      });
    }
    // "cmp": nada; a mensagem do Google pede a escolha
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
        <button ref={primeiroBotao} type="button" data-consent="denied" onClick={() => escolher("denied")} style={botao(false)}>
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
