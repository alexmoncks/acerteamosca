"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { ESCALA_MAXIMA, ESCALA_MINIMA, escalaDeEncaixe, variavelVh } from "@/lib/game-fit";

// Encaixe de um jogo na altura (e largura) visível. Substitui o useGameScale,
// que só olhava a largura. Uso, junto com <GameFit> (src/components/GameFit.jsx):
//
//   const fit = useGameFit({ largura: CANVAS_W, altura: CANVAS_H });
//   const gameScale = fit.escala;
//   ...
//   <div className="game-fit-root" ...>   ← raiz do jogo (min-height = altura visível)
//     <h2>título</h2>
//     <GameFit fit={fit}>
//       <div style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${gameScale})`, transformOrigin: "top left" }}>…</div>
//     </GameFit>
//     <controles />
//   </div>
//
// O <GameFit> é um item flex que cresce até ocupar o que sobra da altura
// visível depois do título e dos controles. Este hook mede esse espaço
// (ResizeObserver no slot, mais resize, orientationchange e o resize do
// visualViewport) e devolve a escala que faz a caixa lógica caber nele.
//
// `alturaAutomatica`: para jogo cuja caixa muda de altura conforme a tela
// (Batalha Naval). A altura lógica passa a ser a altura natural (offsetHeight,
// sem o transform) do primeiro filho da área, medida a cada mudança.

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

let vhInstalado = false;

/**
 * Navegador sem dvh: mantém --aam-vh (1% de innerHeight) no <html>, que o
 * CSS da raiz (.game-fit-root, globals.css) usa no lugar de 1vh. Com dvh,
 * não faz nada.
 */
function instalarVhSemDvh() {
  if (vhInstalado || typeof window === "undefined") return;
  vhInstalado = true;
  const suportaDvh = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("height", "100dvh");
  if (suportaDvh) return;
  const aplicar = () => {
    const v = variavelVh({ suportaDvh: false, alturaJanela: window.innerHeight });
    if (v) document.documentElement.style.setProperty("--aam-vh", v);
  };
  aplicar();
  window.addEventListener("resize", aplicar);
  window.addEventListener("orientationchange", aplicar);
  window.visualViewport?.addEventListener("resize", aplicar);
}

const px = (v) => Number.parseFloat(v) || 0;

export default function useGameFit({
  largura,
  altura,
  minima = ESCALA_MINIMA,
  maxima = ESCALA_MAXIMA,
  alturaAutomatica = false,
}) {
  // Refs de callback em estado: o slot só existe depois que o jogo monta
  // (vários retornam null até checar o cookie do jogador), e o efeito precisa
  // rodar de novo quando ele aparece.
  const [slot, setSlot] = useState(null);
  const [area, setArea] = useState(null);
  const [estado, setEstado] = useState({ escala: 1, altura });

  useIsoLayoutEffect(() => {
    if (!slot) return undefined;
    instalarVhSemDvh();

    let raf = 0;
    const medir = () => {
      const cs = getComputedStyle(slot);
      const larguraDisponivel = slot.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
      const alturaDisponivel = slot.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
      const conteudo = alturaAutomatica && area ? area.firstElementChild : null;
      const h = conteudo && conteudo.offsetHeight > 0 ? conteudo.offsetHeight : altura;
      const escala = escalaDeEncaixe({ largura, altura: h, larguraDisponivel, alturaDisponivel, minima, maxima });
      setEstado((a) => (a.escala === escala && a.altura === h ? a : { escala, altura: h }));
    };
    const agendar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(medir);
    };

    medir();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(agendar) : null;
    if (ro) {
      ro.observe(slot);
      const conteudo = alturaAutomatica && area ? area.firstElementChild : null;
      if (conteudo) ro.observe(conteudo);
    }
    window.addEventListener("resize", agendar);
    window.addEventListener("orientationchange", agendar);
    window.visualViewport?.addEventListener("resize", agendar);
    // Fontes chegando mudam a altura do título e, com ela, o espaço do jogo.
    document.fonts?.ready?.then(agendar).catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", agendar);
      window.removeEventListener("orientationchange", agendar);
      window.visualViewport?.removeEventListener("resize", agendar);
    };
  }, [slot, area, largura, altura, minima, maxima, alturaAutomatica]);

  return {
    slotRef: setSlot,
    areaRef: setArea,
    escala: estado.escala,
    largura,
    altura: alturaAutomatica ? estado.altura : altura,
    minima,
  };
}
