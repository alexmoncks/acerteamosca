import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "2048 Online — Jogue Grátis Multiplayer | Acerte a Mosca"
      : "2048 Online — Play Free Multiplayer | Nailed The Fly",
    description: isPt
      ? "Jogue 2048 online grátis! Deslize os blocos, some os números e chegue ao 2048. Modo solo e corrida multiplayer online em tempo real. Sem download, funciona no celular e computador."
      : "Play 2048 online for free! Slide the tiles, combine numbers and reach 2048. Solo mode and online multiplayer race in real time. No download, works on mobile and desktop.",
    keywords: isPt
      ? ["2048 online", "2048 grátis", "jogo 2048", "2048 multiplayer", "puzzle online", "jogo de blocos", "2048 navegador"]
      : ["2048 online", "2048 free", "2048 game", "2048 multiplayer", "puzzle game", "number puzzle", "2048 browser"],
    alternates: {
      canonical: "/jogos/2048",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/2048",
        "en": "https://nailedthefly.com/en/jogos/2048",
      },
    },
    openGraph: {
      title: isPt ? "2048 Online - Jogue Grátis Multiplayer" : "2048 Online - Play Free Multiplayer",
      description: isPt
        ? "Deslize os blocos e chegue ao 2048! Solo ou corrida multiplayer online. Grátis no navegador."
        : "Slide the tiles and reach 2048! Solo or online multiplayer race. Free in your browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/2048"
        : "https://nailedthefly.com/en/jogos/2048",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "2048",
    description: isPt
      ? "Jogue 2048 online grátis! Deslize os blocos, some os números e chegue ao 2048. Modo solo e corrida multiplayer online."
      : "Play 2048 online for free! Slide the tiles, combine numbers and reach 2048. Solo mode and online multiplayer race.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/2048"
      : "https://nailedthefly.com/en/jogos/2048",
    genre: ["Puzzle", "Strategy"],
    gamePlatform: "Web Browser",
    operatingSystem: "Any",
    applicationCategory: "Game",
    inLanguage: isPt ? "pt-BR" : "en",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: isPt ? "BRL" : "USD",
      availability: "https://schema.org/InStock",
    },
    publisher: {
      "@type": "Organization",
      name: isPt ? "Acerte a Mosca" : "Nailed The Fly",
      url: isPt ? "https://acerteamosca.com.br" : "https://nailedthefly.com",
    },
  };
}

const content = {
  pt: {
    title: "Sobre o 2048",
    intro:
      "O 2048 é um puzzle de deslizar blocos com números que vicia instantaneamente. Você desliza os blocos em quatro direções e combina os de mesmo valor para dobrá-los — 2+2 vira 4, 4+4 vira 8, e assim por diante. O objetivo é chegar ao bloco 2048. Aqui você joga grátis no navegador, com modo solo e corrida multiplayer online contra outros jogadores em tempo real.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "O tabuleiro tem 4×4 casas preenchidas por blocos numerados. Você move todos os blocos ao mesmo tempo: ao pressionar uma seta, todos deslizam naquela direção. Quando dois blocos de mesmo número se encontram, eles somam e formam um único bloco de valor dobrado. A cada jogada um novo bloco — de valor 2 ou 4 — aparece em uma posição aleatória vazia.",
          "O jogo termina quando o tabuleiro fica completamente lotado e não há mais nenhuma combinação possível. No modo corrida multiplayer online, a batalha é contra outros jogadores em tempo real: quem chegar ao 2048 primeiro vence. Raciocínio rápido e planejamento de dois ou três movimentos à frente fazem toda a diferença.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador use as setas do teclado — cima, baixo, esquerda e direita — para mover todos os blocos de uma vez na direção escolhida. No celular ou tablet, deslize o dedo na tela (swipe) na direção desejada para reproduzir o mesmo movimento.",
          "O jogo responde imediatamente ao comando, sem atraso. Evite movimentos automáticos e pense antes de cada deslizada — um passo errado pode bloquear o tabuleiro sem saída.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "A dica mais valiosa é manter o bloco de maior valor sempre num canto — de preferência o canto inferior esquerdo ou inferior direito. A partir daí, construa uma cadeia decrescente naquele canto: por exemplo 1024, 512, 256, 128. Isso organiza o tabuleiro e evita que blocos grandes fiquem presos no meio.",
          "Evite ao máximo mover para cima se seu canto de referência for um dos de baixo — esse movimento desorganiza a cadeia. No modo multiplayer, priorize velocidade sobre perfeição: errar uma combinação é melhor do que perder segundos pensando demais. Jogue online grátis no navegador e treine até o reflexo virar automático.",
        ],
      },
      {
        summary: "Origem do jogo",
        body: [
          "O 2048 foi criado em 2014 pelo desenvolvedor italiano Gabriele Cirulli em apenas um fim de semana. Ele queria apenas praticar JavaScript e construiu o jogo como um clone open-source do 1024, que por sua vez derivava do Threes. Cirulli publicou o código no GitHub sem grandes expectativas — e em menos de quatro dias o jogo havia virado febre mundial.",
          "A ironia é que Cirulli declarou publicamente na época que o 2048 era 'apenas um projeto para aprender'. O jogo foi baixado, clonado e adaptado centenas de vezes em dezenas de plataformas e idiomas. Hoje é um dos puzzles digitais mais famosos do mundo, com versões em navegador, celular e até versões temáticas que substituem os números por personagens ou emojis.",
        ],
      },
    ],
  },
  en: {
    title: "About 2048",
    intro:
      "2048 is a sliding number puzzle that hooks you from the very first swipe. Slide all the tiles in one of four directions, merge matching numbers to double their value — 2+2 becomes 4, 4+4 becomes 8 — and work your way up to the 2048 tile. Play free in your browser with solo mode or jump into an online multiplayer race against real players in real time.",
    details: [
      {
        summary: "How to play",
        body: [
          "The board is a 4×4 grid filled with numbered tiles. Every move slides all tiles simultaneously in the chosen direction. When two tiles of the same number collide, they merge into one tile with double the value. After every move, a new tile — worth 2 or 4 — spawns at a random empty cell.",
          "The game ends when the board is completely full and no merges are possible. In online multiplayer race mode, the first player to reach the 2048 tile wins. Planning two or three moves ahead and keeping the board organized separates the champions from the also-rans.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use the keyboard arrow keys — up, down, left, right — to slide all tiles in the chosen direction at once. On mobile or tablet, swipe in the direction you want to move; the touch controls mirror the keyboard exactly.",
          "The game reacts instantly. Think before each move — one careless swipe can lock the board into an unwinnable state and end your run.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "The single most effective tip: keep your highest-value tile locked in one corner — lower-left or lower-right works best. From there, build a descending chain in that corner: 1024, 512, 256, 128 in a neat line. This keeps the board organized and prevents large tiles from getting stranded in the middle.",
          "Avoid moving in the direction that pulls tiles away from your anchor corner. In multiplayer, speed matters — a slightly imperfect move made quickly beats the perfect move made too late. Play free online in the browser and let repetition turn strategy into instinct.",
        ],
      },
      {
        summary: "Origin of the game",
        body: [
          "2048 was created in 2014 by Italian developer Gabriele Cirulli over a single weekend. He wanted to practice JavaScript and built the game as an open-source clone of 1024, which itself derived from the mobile hit Threes. Cirulli pushed the code to GitHub with modest expectations — and within four days it had gone viral worldwide.",
          "The kicker: Cirulli publicly described the project as 'just a JavaScript exercise.' The game was forked, cloned, and adapted hundreds of times across platforms and languages. Today it stands as one of the most recognized digital puzzles ever made, available free in browsers everywhere and spawning themed variants swapping numbers for characters, animals, or emoji.",
        ],
      },
    ],
  },
};

export default async function Game2048Page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const jsonLd = buildJsonLd(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameClient />
      <GameInfo content={content} locale={locale} />
    </>
  );
}
