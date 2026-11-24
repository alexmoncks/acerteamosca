"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AD_PLACEMENTS, adBlockMode, adReserveStyle, adTestValue, isValidAdSlot, watchUnfilled } from "@/lib/ads";
import { whenAdsAllowed } from "@/lib/consent";

// Bloco manual do AdSense (decisão de 24/11/2026, depois da aprovação do
// site: blocos manuais em posições fixas; os Anúncios Automáticos ficam
// desligados no painel, docs/adsense.md).
//
// Consentimento prévio (decisão de 22/11/2026, Brasil incluído):
//   - a caixa .ad-slot fica oculta por CSS até o <html> ter
//     data-aam-ads="on" (globals.css), que só o script do <head> (escolha
//     gravada "granted") e o Aceitar marcam (src/lib/consent.js);
//   - o push para o adsbygoogle acontece uma vez por bloco, e só quando os
//     anúncios estão permitidos: no mount, se a pessoa já aceitou, ou no
//     evento do Aceitar (whenAdsAllowed). Recusou: nenhum push, e o
//     adsbygoogle.js nem entra na página.
//
// As variáveis precisam estar escritas por extenso: o Next só embute no
// bundle do navegador o process.env.NEXT_PUBLIC_* citado literalmente.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_ID;
const SLOTS = {
  // Home: entre o destaque e a grade de jogos, e depois do FAQ.
  home_top: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP,
  home_bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM,
  // Páginas de jogo: depois do texto editorial (GameInfo), longe do canvas,
  // dos controles de toque e dos botões de fim de jogo.
  game_footer: process.env.NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER,
  // Fim das páginas de conteúdo com texto próprio (hoje, só o Sobre).
  content_bottom: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_BOTTOM,
};
// Prévia sem impressão real: "on" põe data-adtest="on" no <ins>.
const ADTEST = adTestValue(process.env.NEXT_PUBLIC_ADSENSE_ADTEST);
// Prévia do layout: "1" mostra caixas tracejadas onde falta o ID do bloco.
const PLACEHOLDERS = process.env.NEXT_PUBLIC_ADSENSE_PLACEHOLDERS;

export function adSlotFor(placement) {
  const slot = SLOTS[placement];
  return isValidAdSlot(slot) ? slot.trim() : null;
}

// Regras de colocação (política do AdSense sobre cliques acidentais):
//   - nunca dentro do jogo nem colado em botão ou controle: a margem mínima
//     de 48px e o rótulo "Publicidade" separam o bloco do resto da página;
//     nada sticky, flutuante ou sobreposto;
//   - o bloco não é escondido nem "colapsado" à mão (nada de opacity 0 ou
//     max-height 0): bloco sem anúncio some pelo CSS suportado pelo Google,
//     ins.adsbygoogle[data-ad-status="unfilled"], em globals.css. O display
//     da caixa é só do CSS (oculta até o aceite), nunca do style daqui;
//   - a caixa inteira (rótulo e reserva) some com o mesmo sinal do Google:
//     o .ad-slot:has(...) do CSS e, para navegador sem :has() (Firefox <
//     121), o data-ad-vazio que o MutationObserver (watchUnfilled) copia do
//     data-ad-status do <ins>. game_footer, home_bottom e content_bottom
//     ficam no fim da página: o colapso não move a área do jogo nem o texto
//     acima. O home_top fica no meio da home: o colapso sobe a grade de
//     jogos (205px desktop / 215px celular). Medido em 24/11/2026,
//     docs/adsense.md.
export default function AdBanner({ placement, style }) {
  const t = useTranslations("common");
  const pushed = useRef(false);
  const caixa = useRef(null);
  const slot = adSlotFor(placement);
  const mode = adBlockMode({ placement, client: CLIENT, slot, placeholders: PLACEHOLDERS });

  useEffect(() => {
    if (mode !== "ad" || !caixa.current) return undefined;
    return watchUnfilled(window, caixa.current.querySelector("ins.adsbygoogle"), caixa.current);
  }, [mode]);

  useEffect(() => {
    if (mode !== "ad" || pushed.current) return undefined;
    return whenAdsAllowed(window, () => {
      if (pushed.current) return;
      pushed.current = true;
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {}
    });
  }, [mode]);

  if (!mode) return null;
  const { format } = AD_PLACEMENTS[placement];

  return (
    <aside
      ref={caixa}
      className="ad-slot"
      aria-label={t("adLabel")}
      data-placement={placement}
      style={{
        width: "100%",
        maxWidth: 900,
        margin: "48px auto",
        textAlign: "center",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: 10,
          letterSpacing: 1,
          color: "#4a5568",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {t("adLabel")}
      </div>
      <div className="ad-reserva" style={adReserveStyle(placement)}>
        {mode === "ad" ? (
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={CLIENT.trim()}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive="true"
            data-adtest={ADTEST ?? undefined}
          />
        ) : (
          <div
            data-ad-placeholder={placement}
            style={{
              boxSizing: "border-box",
              minHeight: "inherit",
              border: "2px dashed #4a5568",
              borderRadius: 6,
              color: "#8892b0",
              fontFamily: "'Fira Code', monospace",
              fontSize: 12,
              padding: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {`${t("adLabel")} — ${placement} (${format})`}
          </div>
        )}
      </div>
    </aside>
  );
}
