"use client";

// A vitrine da tela inicial: o jogador alternando os golpes, no lugar onde
// antes havia um emoji de quimono.
//
// Sem PixiJS. A partida sobe uma Application com o elenco inteiro; para um
// enfeite de 120×80 no menu isso seria um segundo canvas e um segundo laço de
// render para desenhar um sprite. Aqui é uma div com background-position
// andando pela folha — o mesmo recorte de 48px que o cutSpriteSheet faz, só que
// em CSS.
//
// O que este arquivo faz é desenhar. A ordem dos golpes e a conta do tempo
// vivem em kungfu-vitrine.js, onde podem ser conferidas sem navegador.

import { useEffect, useRef, useState } from "react";
import { PLAYER_ANIMS, PLAYER_FRAME_H } from "./kungfu-assets";
import { SEQUENCIA, montarPlano, quadroEm } from "./kungfu-vitrine";

/** 48px de folha viram 72px na tela — cabe nos 80 de altura da caixa do menu. */
const ESCALA = 1.5;

const NOMES = [...new Set(SEQUENCIA)];

export default function KungFuVitrine() {
  const alvo = useRef(null);
  const [plano, setPlano] = useState(null);

  // Quantos quadros tem cada folha? A própria largura do PNG responde, como o
  // cutSpriteSheet já faz com texture.width. Digitar a contagem aqui envelhece
  // calado: quem regerar uma folha com outro número de quadros deixaria a
  // animação picotada, sem erro em lugar nenhum.
  useEffect(() => {
    let vivo = true;

    Promise.all(
      NOMES.map(
        (anim) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () =>
              resolve([anim, Math.round(img.naturalWidth / PLAYER_FRAME_H)]);
            img.onerror = () => resolve([anim, 0]);
            img.src = PLAYER_ANIMS[anim].src;
          }),
      ),
    ).then((pares) => {
      if (!vivo) return;
      // Uma folha que não carregou tem 0 quadros, e 0 quadros divide por zero na
      // duração. Sem plano, fica o primeiro quadro do idle parado — que é a
      // degradação certa para um enfeite: nada pisca, nada estoura.
      if (pares.some(([, quadros]) => quadros < 1)) return;

      setPlano(
        montarPlano(
          Object.fromEntries(pares),
          Object.fromEntries(NOMES.map((a) => [a, PLAYER_ANIMS[a].speed])),
        ),
      );
    });

    return () => {
      vivo = false;
    };
  }, []);

  // O laço escreve direto no style, sem passar por estado do React: são 60
  // quadros por segundo, e 60 re-renders por segundo para mover uma imagem de
  // fundo seria pagar caro por nada.
  useEffect(() => {
    if (!plano) return;

    // Um laço de animação que não para é exatamente o que esta preferência
    // existe para desligar. Quem a marcou fica com o primeiro quadro do idle.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf;
    let inicio;

    const passo = (agora) => {
      if (inicio === undefined) inicio = agora;
      const { anim, quadro } = quadroEm(plano, agora - inicio);
      const el = alvo.current;
      if (el) {
        el.style.backgroundImage = `url(${PLAYER_ANIMS[anim].src})`;
        el.style.backgroundPosition = `${-quadro * PLAYER_FRAME_H * ESCALA}px 0`;
      }
      raf = requestAnimationFrame(passo);
    };

    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [plano]);

  const lado = PLAYER_FRAME_H * ESCALA;

  return (
    <div
      ref={alvo}
      aria-hidden="true"
      style={{
        width: lado,
        height: lado,
        // `auto 100%` faz a folha caber pela altura, e como os quadros são
        // quadrados cada um passa a medir exatamente `lado` de largura. É o que
        // permite andar de quadro em quadro sem saber quantos são.
        backgroundImage: `url(${PLAYER_ANIMS[SEQUENCIA[0]].src})`,
        backgroundSize: "auto 100%",
        backgroundPosition: "0 0",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    />
  );
}
