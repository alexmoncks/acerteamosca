"use client";

// A tela de abertura: os cinco painéis de kungfu-historia.js, desenhados.
//
// Componente próprio, com a própria Application do PixiJS, porque a do jogo só
// existe depois do buildScene e carrega o elenco inteiro — 60 folhas de sprite
// para mostrar cinco quadros parados seria pagar o carregamento da fase 1 antes
// de a fase 1 começar.
//
// O que este arquivo faz é desenhar. A composição, a duração e o texto vivem em
// kungfu-historia.js, onde podem ser conferidos sem navegador.

import { useEffect, useRef } from "react";
import { Application, Container, Graphics, Sprite, Texture, Rectangle, Assets, Text, TextStyle } from "pixi.js";
import { ANIMATED_PROPS } from "./kungfu-assets";
import {
  PAINEIS, LARGURA, ALTURA, duracaoTotal, painelEm, opacidadeEm, letrasEm,
  assetsDaHistoria, espelhamentoDe,
} from "./kungfu-historia";

const BASE = "/images/kungfucastle";

/** "prop:lanterna-papel" → o PNG dele. */
function caminhoDe(asset) {
  const [tipo, nome] = asset.split(":");
  if (tipo === "prop") return `${BASE}/props/${nome}.png`;
  if (tipo === "player") return `${BASE}/player/${nome}.png`;
  return `${BASE}/bosses/${nome}/idle.png`;
}

/**
 * Os quadros de uma folha.
 *
 * Personagem e prop de fogo vêm como tira horizontal — o herói são oito quadros
 * de 48px numa imagem de 384; desenhar a textura inteira deitaria a tira toda no
 * painel. Prop comum é um quadro só e volta como está.
 *
 * Quais props são tiras vem de ANIMATED_PROPS, não de palpite. O carregador do
 * jogo avisa, com todas as letras, que a contagem NÃO se infere da proporção —
 * e a primeira versão desta tela inferiu assim mesmo: `parallax-montanhas` é
 * 256×64, largura múltipla da altura, e virou um recorte de 64px do canto
 * esquerdo. O fundo da montanha sumiu do primeiro painel.
 */
function quadrosDe(tex, asset) {
  const [tipo, nome] = asset.split(":");
  let n = 1, largura = tex.width;
  if (tipo === "player") { largura = 48; n = Math.round(tex.width / 48); }
  else if (tipo === "boss") { largura = tex.height; n = Math.round(tex.width / tex.height); }
  else if (ANIMATED_PROPS[nome]) {
    n = ANIMATED_PROPS[nome].frames;
    largura = Math.round(tex.width / n);
  }
  if (n <= 1) return { frames: [tex], speed: 0 };
  const frames = [];
  for (let i = 0; i < n; i++) {
    frames.push(new Texture({
      source: tex.source,
      frame: new Rectangle(i * largura, 0, largura, tex.height),
    }));
  }
  // Só o fogo anima. Personagem entra parado: um herói fazendo o ciclo de idle
  // num painel de história rouba a atenção do que a legenda está dizendo.
  const speed = ANIMATED_PROPS[nome]?.speed ?? 0;
  return { frames: speed ? frames : [frames[0]], speed };
}

/** Fundo em degradê, desenhado em faixas — sem shader, do jeito 8 bits. */
function ceu(cores) {
  const g = new Graphics();
  const [de, para] = cores.map((c) => parseInt(c.slice(1), 16));
  const FAIXAS = 16;
  for (let i = 0; i < FAIXAS; i++) {
    const k = i / (FAIXAS - 1);
    const cor =
      (Math.round(((de >> 16) & 255) * (1 - k) + ((para >> 16) & 255) * k) << 16) |
      (Math.round(((de >> 8) & 255) * (1 - k) + ((para >> 8) & 255) * k) << 8) |
      Math.round((de & 255) * (1 - k) + (para & 255) * k);
    g.rect(0, (ALTURA / FAIXAS) * i, LARGURA, ALTURA / FAIXAS + 1).fill(cor);
  }
  return g;
}

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

      // Carrega tudo ANTES do primeiro quadro: um painel dura cinco segundos, e
      // um PNG chegando atrasado ocuparia um quinto do tempo dele em branco.
      const caminhos = assetsDaHistoria().map(caminhoDe);
      const texturas = await Assets.load(caminhos);
      if (morto) { app.destroy(true, { children: true }); return; }

      // Um contêiner por painel, todos montados de uma vez e revelados pela
      // opacidade. Montar sob demanda daria um engasgo na troca.
      const chamas = [];
      const palcos = PAINEIS.map((p) => {
        const c = new Container();
        c.alpha = 0;
        c.addChild(ceu(p.ceu));
        // O piso. Sem ele o personagem fica pendurado no degradê e o painel lê
        // como recorte, não como lugar.
        if (p.chao) {
          c.addChild(new Graphics()
            .rect(0, p.chao, LARGURA, ALTURA - p.chao).fill({ color: 0x000000, alpha: 0.45 }));
        }
        for (const f of [...(p.fundo ?? []), ...(p.figuras ?? [])]) {
          const tex = texturas[caminhoDe(f.asset)];
          if (!tex) continue;
          const { frames, speed } = quadrosDe(tex, f.asset);
          const s = new Sprite(frames[0]);
          s.anchor.set(0.5, 1);
          s.scale.set(espelhamentoDe(f) * f.escala, f.escala);
          if (f.tint) s.tint = f.tint;
          s.x = f.x;
          s.y = f.y + s.height;
          c.addChild(s);
          // Chama viva. Um painel com fogo parado lê como ilustração; com o
          // fogo tremendo, lê como jogo.
          if (speed) chamas.push({ sprite: s, frames, speed, t: Math.random() * frames.length });
        }
        app.stage.addChild(c);
        return c;
      });

      // A tarja do texto, por cima de tudo, fixa: o olho não deve procurar onde
      // a legenda foi parar a cada painel.
      const tarja = new Graphics()
        .rect(0, ALTURA - 62, LARGURA, 62).fill({ color: 0x000000, alpha: 0.72 });
      app.stage.addChild(tarja);

      const legenda = new Text({
        text: "",
        style: new TextStyle({
          fontFamily: "monospace", fontSize: 12, fill: 0xe8e0d0,
          wordWrap: true, wordWrapWidth: LARGURA - 48, lineHeight: 16,
        }),
      });
      legenda.x = 24;
      legenda.y = ALTURA - 52;
      app.stage.addChild(legenda);

      const aviso = new Text({
        text: textos.skip,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x6b7280 }),
      });
      aviso.x = LARGURA - aviso.width - 10;
      aviso.y = 8;
      app.stage.addChild(aviso);

      let t = 0;
      const TOTAL = duracaoTotal();
      app.ticker.add((tk) => {
        t += tk.deltaTime / 60;
        for (const ch of chamas) {
          ch.t = (ch.t + ch.speed * tk.deltaTime) % ch.frames.length;
          ch.sprite.texture = ch.frames[Math.floor(ch.t)];
        }
        const agora = painelEm(t);
        if (!agora) { fimRef.current?.(); return; }
        const { indice, painel, local } = agora;
        palcos.forEach((c, i) => { c.alpha = i === indice ? opacidadeEm(local, painel.dur) : 0; });

        const frase = textos[painel.id] ?? "";
        legenda.text = frase.slice(0, letrasEm(local, frase.length));
        // A tarja acompanha o painel: no fade ela some junto, senão fica uma
        // faixa preta pairando sobre o corte.
        tarja.alpha = 0.72 * opacidadeEm(local, painel.dur);
        legenda.alpha = opacidadeEm(local, painel.dur);
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
  // uma história que já viu.
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
