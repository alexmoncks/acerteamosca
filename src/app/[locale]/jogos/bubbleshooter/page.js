import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Bubble Shooter Online — Jogue Grátis | Acerte a Mosca"
      : "Bubble Shooter Online — Play Free | Nailed The Fly",
    description: isPt
      ? "Jogue Bubble Shooter online grátis! Mire e atire bolhas para formar grupos de 3 ou mais da mesma cor e estourá-las. Clássico jogo de bolhas no navegador, sem download."
      : "Play Bubble Shooter online for free! Aim and shoot bubbles to form groups of 3+ of the same color and pop them. Classic bubble game in the browser, no download needed.",
    keywords: isPt
      ? ["bubble shooter online", "bubble shooter grátis", "jogo de bolhas", "estoura bolhas", "bubble shooter navegador", "puzzle bubble"]
      : ["bubble shooter online", "bubble shooter free", "bubble game", "pop bubbles", "bubble shooter browser", "puzzle bubble"],
    alternates: {
      canonical: "/jogos/bubbleshooter",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/bubbleshooter",
        "en": "https://nailedthefly.com/en/jogos/bubbleshooter",
      },
    },
    openGraph: {
      title: isPt ? "Bubble Shooter Online - Jogue Grátis" : "Bubble Shooter Online - Play Free",
      description: isPt
        ? "Mire e estoure bolhas coloridas! Clássico jogo de bolhas online grátis no navegador."
        : "Aim and pop colored bubbles! Classic bubble shooter game free online in your browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/bubbleshooter"
        : "https://nailedthefly.com/en/jogos/bubbleshooter",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Bubble Shooter",
    description: isPt
      ? "Jogue Bubble Shooter online grátis! Mire e atire bolhas para formar grupos de 3 ou mais da mesma cor e estourá-las."
      : "Play Bubble Shooter online for free! Aim and shoot bubbles to form groups of 3+ same color and pop them.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/bubbleshooter"
      : "https://nailedthefly.com/en/jogos/bubbleshooter",
    genre: ["Arcade", "Puzzle"],
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
    title: "Sobre o Bubble Shooter",
    intro:
      "O Bubble Shooter é um dos jogos de mira mais viciantes que existem: você controla um canhão na parte de baixo da tela e atira bolhas coloridas para cima. Quando três ou mais bolhas da mesma cor se conectam, elas explodem. O segredo está na pontaria e no planejamento — e você pode jogar online grátis direto no navegador, sem precisar baixar nada.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Um canhão posicionado na parte inferior da tela atira bolhas coloridas uma de cada vez. Mire apontando o cursor na direção desejada e atire. Quando três ou mais bolhas da mesma cor se tocam, todas explodem — e bolhas que ficaram penduradas sem apoio após a explosão também caem, gerando combos.",
          "As bolhas descem gradualmente com o tempo: se chegarem à linha do canhão, o jogo acaba. Por isso a urgência aumenta a cada rodada. Fique de olho na próxima bolha da fila para já planejar o próximo tiro. O jogo termina quando você limpar toda a tela ou quando as bolhas chegarem ao limite.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, mova o mouse para apontar o canhão na direção desejada e clique para atirar a bolha. No celular ou tablet, toque na posição da tela onde quer que a bolha vá — o canhão atira automaticamente na direção do toque.",
          "Uma linha pontilhada indica a trajetória prevista do tiro. Use essa guia para planejar ricochetes nas paredes laterais e alcançar cantos difíceis.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "O ricochete nas paredes é o recurso mais poderoso do jogo: uma bolha que bate na parede e volta pode alcançar grupos escondidos atrás de outras bolhas, derrubando cascatas inteiras. Pratique calcular o ângulo de reflexo — é como jogar sinuca com bolhas coloridas.",
          "Priorize derrubar grupos presos no teto: quando uma bolha que sustentava vários grupos é destruída, tudo que estava pendurado cai de uma vez, criando combos massivos. Guarde bolhas raras para quando surgir a oportunidade certa. E sempre observe a cor da próxima bolha na fila para não desperdiçar um tiro perfeito.",
        ],
      },
      {
        summary: "Origem do jogo",
        body: [
          "O Bubble Shooter tem raízes no Puzzle Bobble, lançado pela Taito em 1994 nos arcades japoneses e conhecido no Ocidente como Bust-a-Move. Era um spin-off dos personagens de Bubble Bobble (1986) — os dragõezinhos que sopravam bolhas. A mecânica de canhão + combinação de cores foi uma revolução no gênero puzzle da época.",
          "Com a chegada dos portais de jogos Flash nos anos 2000, o Bubble Shooter virou um dos títulos mais jogados da internet, alcançando centenas de milhões de partidas. Hoje é um dos gêneros mais populares em celular, com dezenas de variações. A versão online grátis que você joga aqui no navegador preserva a mecânica pura do clássico original.",
        ],
      },
    ],
  },
  en: {
    title: "About Bubble Shooter",
    intro:
      "Bubble Shooter is one of the most addictive aim-and-shoot games ever made: you control a cannon at the bottom of the screen and fire colored bubbles upward. When three or more bubbles of the same color connect, they pop. Strategy, aim, and planning separate a good run from a great one — and you can play free online in your browser right now, no download required.",
    details: [
      {
        summary: "How to play",
        body: [
          "A cannon at the bottom of the screen fires one colored bubble at a time. Aim by pointing your cursor in the desired direction and shoot. When three or more bubbles of the same color touch, they all pop — and any bubbles left hanging without support after the explosion drop too, creating chain combos.",
          "The bubble cluster slowly descends over time: if it reaches the cannon line, the game is over. This creates urgency as the rounds progress. Keep an eye on the next bubble in the queue so you can already plan your next move. The game ends when you clear the board or when the bubbles hit the limit.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, move the mouse to aim the cannon and click to fire a bubble. On mobile or tablet, tap the position on screen where you want the bubble to go — the cannon fires automatically toward your tap.",
          "A dotted trajectory line shows the predicted path of your shot. Use this guide to plan wall ricochets and reach clusters tucked behind other bubbles.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Wall ricochets are the most powerful tool in the game: a bubble that bounces off a side wall can reach clusters hidden behind other bubbles, triggering massive chain reactions. Practice calculating the reflection angle — it's like playing pool with colored bubbles.",
          "Prioritize taking out clusters anchored to the ceiling: when a supporting bubble is destroyed, everything hanging below it drops at once, creating huge combos. Save rare-colored bubbles for the right moment and always watch the next bubble in the queue so you never waste a perfect shot.",
        ],
      },
      {
        summary: "Origin of the game",
        body: [
          "Bubble Shooter's roots lie in Puzzle Bobble, released by Taito in 1994 in Japanese arcades and known in the West as Bust-a-Move. It was a spin-off featuring the characters from Bubble Bobble (1986) — the little dragons that blew bubbles. The cannon-plus-color-matching mechanic was a breakthrough for the puzzle genre at the time.",
          "When Flash game portals exploded in the 2000s, Bubble Shooter became one of the most-played titles on the internet, racking up hundreds of millions of sessions. Today it's one of the most popular mobile game genres worldwide, with dozens of variations. The free online version you play here in the browser keeps the pure mechanics of the original classic.",
        ],
      },
    ],
  },
};

export default async function BubbleShooterPage({ params }) {
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
