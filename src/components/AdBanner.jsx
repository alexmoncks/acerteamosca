"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { isValidAdClient, isValidAdSlot } from "@/lib/ads";

// Unidade manual do AdSense.
//
// O site usa Anúncios Automáticos (só o script no <head>, em
// src/app/[locale]/layout.js). Unidade manual é opcional e só existe com ID
// NUMÉRICO de bloco vindo do ambiente; sem ele, não renderiza nada.
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
};

export function adSlotFor(placement) {
  const slot = SLOTS[placement];
  return isValidAdSlot(slot) ? slot.trim() : null;
}

// Regras de colocação (política do AdSense sobre cliques acidentais):
//   - nunca dentro do jogo nem colado em botão ou controle: a margem mínima
//     de 48px e o rótulo "Publicidade" separam o bloco do resto da página;
//   - o bloco não é escondido nem "colapsado" à mão (nada de opacity 0 ou
//     max-height 0): bloco sem anúncio some pelo CSS suportado pelo Google,
//     ins.adsbygoogle[data-ad-status="unfilled"], em globals.css.
export default function AdBanner({ placement, style }) {
  const t = useTranslations("common");
  const pushed = useRef(false);
  const slot = adSlotFor(placement);
  const enabled = isValidAdClient(CLIENT) && slot !== null;

  useEffect(() => {
    if (!enabled || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {}
  }, [enabled]);

  if (!enabled) return null;

  return (
    <aside
      className="ad-slot"
      aria-label={t("adLabel")}
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
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT.trim()}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
