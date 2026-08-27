"use client";

// A tela de abertura: as doze cenas de kungfu-historia.js, desenhadas.
//
// Componente próprio, com a própria Application do PixiJS, porque a do jogo só
// existe depois do buildScene e carrega o elenco inteiro — 60 folhas de sprite
// para mostrar doze quadros parados seria pagar o carregamento da fase 1 antes
// de a fase 1 começar.
//
// O que este arquivo faz é desenhar. A composição, a duração e as chaves de
// texto vivem em kungfu-historia.js, onde podem ser conferidas sem navegador.
//
// Desenhar ficou MENOS trabalho do que era: cada cena agora é um PNG inteiro
// em vez de uma pilha de sprites com escala, tint e espelhamento. O que
// continua aqui é só o que não cabe numa imagem — a legenda escrita letra a
// letra, a tarja do andar e o logotipo, que são compostos por cima para poder
// mudar de idioma sem regerar arte.

import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Sprite, Assets, Text, TextStyle } from "pixi.js";
import {
  CENAS, LARGURA, ALTURA, BASE_CENAS, FADE,
  duracaoTotal, cenaEm, opacidadeDaCena, flashEm, letrasEm, arquivosDaHistoria,
} from "./kungfu-historia";

/** "historia.castelo" → "castelo", que é como `textos` vem chaveado. */
const curta = (chave) => chave.replace("historia.", "");

/** Altura da tarja da legenda. Três linhas de 14px cabem com folga. */
const TARJA = 56;

/** Altura da tarja do andar, no topo. */
const FAIXA = 18;

export default function KungFuHistoria({ textos, onFim }) {
  const boxRef = useRef(null);
  const fimRef = useRef(onFim);
  fimRef.current = onFim;

  useEffect(() => {
    let morto = false;
    const app = new Application();

    (async () => {
      try {
        await app.init({
          width: LARGURA, height: ALTURA,
          backgroundColor: 0x000000,
          antialias: false,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          preference: "webgl",
        });
        if (morto) { app.destroy(); return; }

        boxRef.current?.appendChild(app.canvas);
        Object.assign(app.canvas.style, {
          imageRendering: "pixelated",
          width: "100%", height: "auto",
          maxHeight: "calc(100vh - 80px)",
          objectFit: "contain",
          borderRadius: "8px",
          border: "2px solid rgba(220,38,38,0.27)",
          display: "block",
        });

        // Sem worker. A CSP do site não libera `blob:` em script-src, e o
        // carregador do PixiJS decodifica imagem num worker de blob por padrão —
        // barrado, ele não falha: fica PENDURADO. O sintoma é uma tela preta sem
        // erro nenhum no console e zero pedidos de PNG na rede. O carregador do
        // jogo já tinha esta linha; esta tela nasceu sem ela e repetiu o defeito.
        Assets.setPreferences({ preferWorkers: false });

        // Carrega tudo ANTES do primeiro quadro: uma cena dura cinco segundos, e
        // um PNG chegando atrasado ocuparia um quinto do tempo dela em branco.
        const caminhos = arquivosDaHistoria();
        const texturas = await Assets.load(caminhos);
        if (morto) { app.destroy(true, { children: true }); return; }

        // Um contêiner por cena, todos montados de uma vez e revelados pela
        // opacidade. Montar sob demanda daria um engasgo na troca.
        const palcos = CENAS.map((cena) => {
          const c = new Container();
          c.alpha = 0;
          const tex = texturas[`${BASE_CENAS}/${cena.arquivo}`];
          if (tex) {
            const s = new Sprite(tex);
            // As cenas são 960×540 e a moldura é 480×270: escala fixa de 1/2,
            // não `fit`, para a grade de pixel cair em múltiplo inteiro e o
            // dithering do MSX2 não virar sujeira na redução.
            s.width = LARGURA;
            s.height = ALTURA;
            c.addChild(s);
          }
          app.stage.addChild(c);
          return c;
        });

        // ── Sobreposições, por cima de tudo e fixas: o olho não deve procurar
        // onde a legenda foi parar a cada cena. ─────────────────────────────

        const faixaFundo = new Graphics()
          .rect(0, 0, LARGURA, FAIXA).fill({ color: 0x000000, alpha: 0.85 });
        app.stage.addChild(faixaFundo);

        const faixaTexto = new Text({
          text: "",
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xffff92, letterSpacing: 1 }),
        });
        faixaTexto.x = 10;
        faixaTexto.y = 4;
        app.stage.addChild(faixaTexto);

        const logo = new Text({
          text: "KUNG FU CASTLE",
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 30, fontWeight: "bold",
            fill: 0xffffff, letterSpacing: 2, align: "center",
            dropShadow: { color: 0xb62424, blur: 0, distance: 3, angle: Math.PI / 4, alpha: 1 },
          }),
        });
        logo.anchor.set(0.5, 0);
        logo.x = LARGURA / 2;
        logo.y = 30;
        app.stage.addChild(logo);

        const tarja = new Graphics()
          .rect(0, ALTURA - TARJA, LARGURA, TARJA).fill({ color: 0x000000, alpha: 0.78 });
        app.stage.addChild(tarja);

        const legenda = new Text({
          text: "",
          style: new TextStyle({
            fontFamily: "monospace", fontSize: 12, fill: 0xffffff,
            wordWrap: true, wordWrapWidth: LARGURA - 48, lineHeight: 16,
          }),
        });
        legenda.x = 24;
        legenda.y = ALTURA - TARJA + 10;
        app.stage.addChild(legenda);

        const aviso = new Text({
          text: textos.skip,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x9ca3af }),
        });
        aviso.x = LARGURA - aviso.width - 10;
        aviso.y = FAIXA + 6;
        app.stage.addChild(aviso);

        // O estouro branco do corte seco, por cima de absolutamente tudo.
        const flash = new Graphics().rect(0, 0, LARGURA, ALTURA).fill(0xffffff);
        flash.alpha = 0;
        app.stage.addChild(flash);

        let t = 0;
        const TOTAL = duracaoTotal();

        app.ticker.add((tk) => {
          t += tk.deltaTime / 60;

          const agora = cenaEm(t);
          if (!agora) { fimRef.current?.(); return; }
          const { indice, cena, local } = agora;

          palcos.forEach((c, i) => {
            c.alpha = i === indice ? opacidadeDaCena(cena, local) : 0;
          });

          const opac = opacidadeDaCena(cena, local);
          flash.alpha = flashEm(cena, local);

          const frase = cena.chave ? (textos[curta(cena.chave)] ?? "") : "";
          legenda.text = frase.slice(0, letrasEm(local, frase.length));
          // A tarja acompanha a cena: no fade ela some junto, senão fica uma
          // faixa preta pairando sobre o corte.
          tarja.alpha = frase ? 0.78 * opac : 0;
          legenda.alpha = opac;

          const faixa = cena.faixa ? (textos[curta(cena.faixa)] ?? "") : "";
          faixaTexto.text = faixa;
          faixaFundo.alpha = faixa ? 0.85 * opac : 0;
          faixaTexto.alpha = faixa ? opac : 0;

          logo.alpha = cena.logo ? opac : 0;

          // O aviso de pular fica o tempo todo, menos no último segundo: no fim
          // ela acaba sozinha e oferecer "pular" ali é oferecer nada.
          aviso.alpha = t > TOTAL - 1 ? 0 : 0.9;
        });
      } catch (err) {
        // A abertura é enfeite; o jogo não é. Se ela não montar — WebGL negado,
        // um PNG que sumiu, CSP barrando algo — o jogador tem de cair no jogo,
        // não ficar preso numa tela preta sem saber que a culpa não é dele.
        if (typeof console !== "undefined") console.error("[historia]", err);
        if (!morto) fimRef.current?.();
      }
    })();

    return () => {
      morto = true;
      try { app.destroy(true, { children: true }); } catch { /* nunca chegou a iniciar */ }
    };
  }, [textos]);

  // Pular: qualquer tecla ou toque. Quem está rejogando não paga de novo por
  // uma história que já viu — e com um minuto de abertura isso deixou de ser
  // cortesia e virou requisito.
  useEffect(() => {
    const pularHistoria = () => fimRef.current?.();
    window.addEventListener("keydown", pularHistoria);
    window.addEventListener("pointerdown", pularHistoria);
    return () => {
      window.removeEventListener("keydown", pularHistoria);
      window.removeEventListener("pointerdown", pularHistoria);
    };
  }, []);

  return <div ref={boxRef} style={{ width: "100%", display: "flex", justifyContent: "center" }} />;
}
