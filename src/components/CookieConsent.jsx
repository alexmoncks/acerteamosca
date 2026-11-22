"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { grantDecision, grantOnAccept, shouldShowNotice, watchGdprCmp } from "@/lib/cmp";
import {
  CONSENT_REOPEN_EVENT,
  GOOGLE_TAGS_FLAG,
  acceptSiteChoice,
  declineSiteChoice,
  grantConsent,
  markGdprApplies,
  readConsentChoice,
  readGdprFlag,
  readRegion,
} from "@/lib/consent";

// Aviso de cookies que PEDE a escolha, com Aceitar e Recusar do mesmo
// tamanho, em todo lugar (decisão de 22/11/2026: consentimento prévio também
// no Brasil). Até o Aceitar, nenhuma tag do Google entra na página e o Modo
// de consentimento fica "denied" (src/lib/consent.js).
//   - Aceitar: grava a escolha e carrega o adsbygoogle.js e o gtag.js. O
//     "granted" vai para o Google na hora fora do EEE (região do CF-IPCountry,
//     grantOnAccept). Sem região conhecida, quando a CMP diz que o GDPR não se
//     aplica, ou, só nesta página, quando o prazo dela (CMP_WATCH_TIMEOUT_MS)
//     acaba sem CMP nenhuma (grantDecision). No EEE/Reino Unido/Suíça a
//     mensagem do Google, que o adsbygoogle.js traz, pede a escolha e manda
//     no consentimento; o site não concede nada lá (markGdprApplies).
//   - Recusar: grava a recusa, manda "denied" e apaga os cookies do Google do
//     domínio do site. Se as tags já estavam na página (revogação pelo link
//     do rodapé), recarrega, para nenhuma tag do Google continuar rodando.
// O link "Privacidade e cookies" do rodapé reabre este aviso
// (CONSENT_REOPEN_EVENT) fora do EEE.

export default function CookieConsent() {
  const t = useTranslations("cookieConsent");
  // dismissed: true até ler o localStorage, para o servidor não renderizar
  // o aviso. "dismissed" aqui é "já escolheu". A decisão é de
  // shouldShowNotice (src/lib/cmp.js, testada).
  const [estado, setEstado] = useState({ dismissed: true, gdprApplies: undefined });
  // reaberto pelo rodapé: o foco vai para o aviso, para o leitor de tela
  // anunciar e o teclado chegar nele
  const [focar, setFocar] = useState(false);
  const primeiroBotao = useRef(null);
  const vivo = useRef(true);

  // Com as tags na página: pergunta à CMP do Google e decide o "granted".
  function acompanharCmp() {
    watchGdprCmp(window).then((gdprApplies) => {
      decidir(gdprApplies);
      if (vivo.current) setEstado((s) => ({ ...s, gdprApplies }));
    });
  }

  function decidir(gdprApplies) {
    const d = grantDecision({ regiao: readRegion(window), gdprApplies, cmpPresent: typeof window.__tcfapi === "function" });
    if (d === "deny") markGdprApplies(window);
    else if (d === "grant-pagina") grantConsent(window);
    // fora do EEE, ou "não se aplica" explícito: lembra G=0 (apaga um G=1
    // antigo de quem esteve no EEE e voltou)
    else if (d === "grant" || d === "grant-lembrar") grantConsent(window, { lembrar: true });
  }

  useEffect(() => {
    vivo.current = true;
    // reabrir pelo link do rodapé
    const reabrir = () => {
      setEstado((s) => ({ ...s, dismissed: false }));
      setFocar(true);
    };
    window.addEventListener(CONSENT_REOPEN_EVENT, reabrir);
    const escolha = readConsentChoice(window);
    if (!escolha) setEstado((s) => ({ ...s, dismissed: false }));
    // aceitou numa visita anterior: o <head> já carregou as tags
    if (escolha === "granted") acompanharCmp();
    return () => {
      vivo.current = false;
      window.removeEventListener(CONSENT_REOPEN_EVENT, reabrir);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focar && primeiroBotao.current) {
      primeiroBotao.current.focus();
      setFocar(false);
    }
  });

  function escolher(escolha) {
    setEstado((s) => ({ ...s, dismissed: true }));
    if (escolha === "denied") {
      if (declineSiteChoice(window)) window.location.reload();
      return;
    }
    const jaTinhaTags = !!window[GOOGLE_TAGS_FLAG];
    acceptSiteChoice(window);
    // fora do EEE (ou G=0 lembrado): concede logo; se a CMP aparecer e disser
    // que o GDPR se aplica, markGdprApplies desfaz
    if (grantOnAccept({ regiao: readRegion(window), gdprFlag: readGdprFlag(window) })) grantConsent(window);
    if (!jaTinhaTags) acompanharCmp();
    else if (estado.gdprApplies !== undefined) decidir(estado.gdprApplies);
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
