import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Batalha Naval — Jogue Online Grátis | Acerte a Mosca"
      : "Battleship — Play Free Online | Nailed The Fly",
    description: isPt
      ? "Jogue Batalha Naval online grátis! Posicione sua frota num grid e afunde os navios inimigos. 3 níveis de dificuldade. Sem download, funciona no navegador."
      : "Play Battleship free online! Position your fleet on a grid and sink the enemy ships. 3 difficulty levels. No download — runs in any browser.",
    keywords: isPt
      ? ["batalha naval", "battleship online", "jogo de batalha naval", "jogo de estratégia online", "jogo de tabuleiro online grátis"]
      : ["battleship online", "batalha naval", "free battleship game", "strategy board game online", "browser battleship"],
    alternates: {
      canonical: "/jogos/batalha-naval",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/batalha-naval",
        "en": "https://nailedthefly.com/en/jogos/batalha-naval",
      },
    },
    openGraph: {
      title: isPt ? "Batalha Naval — Jogue Online Grátis" : "Battleship — Play Free Online",
      description: isPt
        ? "Posicione sua frota e afunde os navios inimigos! Jogo online grátis."
        : "Position your fleet and sink the enemy ships! Free online game.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/batalha-naval"
        : "https://nailedthefly.com/en/jogos/batalha-naval",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: isPt ? "Batalha Naval" : "Battleship",
    description: isPt
      ? "Jogo de Batalha Naval online. Posicione sua frota e afunde os navios inimigos em 3 níveis de dificuldade."
      : "Online Battleship game. Position your fleet and sink enemy ships across 3 difficulty levels.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/batalha-naval"
      : "https://nailedthefly.com/en/jogos/batalha-naval",
    genre: ["Strategy", "Board Game"],
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
    title: "Sobre o Batalha Naval",
    intro:
      "Batalha Naval é o clássico jogo de estratégia de tabuleiro que você provavelmente já jogou no papel quando era criança. Agora em versão online grátis no navegador: posicione sua frota secreta num grid, tente adivinhar onde estão os navios do adversário e afunde tudo antes de ser afundado. Três níveis de dificuldade para a CPU.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Cada jogador tem dois grids de 10x10: um onde você posiciona sua frota (porta-aviões, contratorpedeiros, submarinos e outros navios de tamanhos diferentes) e outro onde você registra seus palpites contra o inimigo. Na fase de posicionamento, arraste ou clique para colocar cada navio — você pode escolher orientação horizontal ou vertical.",
          "Na fase de batalha, os turnos se alternam: você escolhe uma coordenada no grid inimigo (por exemplo, C5) e o sistema revela 'água' se errou ou 'acerto' e 'afundou' se acertou um navio. O primeiro jogador a afundar toda a frota adversária vence. Contra a CPU, há três níveis: fácil (tiros aleatórios), médio (explora adjacências) e difícil (usa lógica de probabilidade).",
        ],
      },
      {
        summary: "Controles",
        body: [
          "Tudo é feito com clique ou toque na tela. Na fase de posicionamento, clique sobre o navio para selecionar e clique no grid para posicioná-lo; há um botão para girar a orientação. Na fase de batalha, basta clicar ou tocar na célula do grid inimigo onde você quer disparar.",
          "O jogo funciona igualmente bem no computador e no celular, sem necessidade de download ou instalação.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Comece pelos cantos e pelo centro para mapear zonas vazias rapidamente — navios grandes não cabem em áreas muito próximas das bordas, então o centro e as diagonais costumam esconder os barcos maiores. Ao acertar um navio, explore imediatamente as quatro células adjacentes (cima, baixo, esquerda, direita) para descobrir a orientação e completar o afundamento.",
          "Evite disparos aleatórios após um acerto — priorize completar o navio que você já localizou. Guarde um mapa mental dos tiros já utilizados para não desperdiçar rodadas. No nível difícil, a CPU usa padrões probabilísticos, então posicionar seus navios espalhados pelo grid (evitando clusters) dificulta a vida dela. Submarinos menores costumam ser os últimos sobreviventes — esconda-os nos cantos.",
        ],
      },
      {
        summary: "Origem do gênero",
        body: [
          "A Batalha Naval como passatempo de papel e lápis é atribuída à marinha russa no período pré-Primeira Guerra Mundial, quando oficiais jogavam em cadernos durante expedições. O formato de grid com coordenadas alfabéticas e numéricas se espalhou pela Europa nas décadas seguintes.",
          "A Milton Bradley publicou a versão comercial em caixa nos Estados Unidos em 1967, tornando o jogo um fenômeno de vendas mundial. As primeiras versões digitais aparecem nos anos 1980, em microcomputadores como Apple II e Commodore 64. Desde então, Batalha Naval migrou para consoles, handhelds e hoje vive no navegador como jogo online grátis acessível em qualquer dispositivo — fiel às regras do tabuleiro original.",
        ],
      },
    ],
  },
  en: {
    title: "About Battleship",
    intro:
      "Battleship is the classic strategy board game you probably played on paper as a kid. Now available as a free online browser game: position your secret fleet on a grid, try to guess where the enemy ships are hiding, and sink them all before they sink you. Three CPU difficulty levels to keep every session challenging.",
    details: [
      {
        summary: "How to play",
        body: [
          "Each player has two 10x10 grids: one where you place your fleet (aircraft carrier, destroyers, submarines and other ships of different lengths) and one where you track your guesses against the enemy. During the placement phase, drag or click to position each ship — you can choose horizontal or vertical orientation.",
          "In the battle phase, turns alternate: you pick a coordinate on the enemy grid (for example, C5) and the system reveals 'miss' if you're wrong, or 'hit' and 'sunk' when you strike a ship. The first player to sink the entire enemy fleet wins. Against the CPU, three difficulty levels are available: easy (random shots), medium (explores adjacent cells after a hit), and hard (uses probability logic).",
        ],
      },
      {
        summary: "Controls",
        body: [
          "Everything is handled with click or tap. During placement, click a ship to select it and click the grid to place it; a rotate button flips orientation. During battle, simply click or tap the cell on the enemy grid where you want to fire.",
          "The game works equally well on desktop and mobile, with no download or installation required — just open it in your browser and play for free.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Start with the corners and the center to quickly map out empty zones — large ships can't fit too close to edges, so the middle area and diagonals tend to hide the bigger vessels. When you score a hit, immediately explore the four adjacent cells (up, down, left, right) to determine orientation and complete the sinking.",
          "Avoid random shots after a hit — prioritize finishing the ship you already located. Keep a mental map of used shots to avoid wasting turns. On hard difficulty the CPU uses probability patterns, so spreading your ships across the grid (avoiding clusters) makes you harder to find. Smaller submarines tend to be the last survivors — tuck them into corners for maximum staying power.",
        ],
      },
      {
        summary: "Origin of the genre",
        body: [
          "The pen-and-paper version of Battleship is attributed to the Russian Navy in the years before World War I, when officers reportedly played it in notebooks during voyages. The grid-with-alphanumeric-coordinates format spread across Europe in the following decades.",
          "Milton Bradley published the commercial boxed version in the United States in 1967, turning Battleship into a global bestseller. Digital versions began appearing in the 1980s on home computers like the Apple II and Commodore 64. Since then Battleship has migrated through consoles, handhelds, and now lives in the browser as a free online game — faithful to the original board rules and accessible on any device without download.",
        ],
      },
    ],
  },
};

export default async function BatalhaNavalPage({ params }) {
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
