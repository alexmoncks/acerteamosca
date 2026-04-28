import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Jogo da Memória Online — Jogue Grátis | Acerte a Mosca"
      : "Memory Game Online — Play Free | Nailed The Fly",
    description: isPt
      ? "Jogue o Jogo da Memória online grátis! Combine os pares de cartas, desafie o cronômetro ou enfrente outros jogadores no multiplayer online. 3 níveis de dificuldade. Sem download."
      : "Play Memory Game online for free! Match card pairs, beat the clock, or challenge players in online multiplayer. 3 difficulty levels. No download needed.",
    keywords: isPt
      ? ["jogo da memória online", "jogo da memória grátis", "memory game", "jogo de pares", "jogo da memória navegador", "memory multiplayer"]
      : ["memory game online", "memory game free", "card matching game", "memory game browser", "concentration game", "memory multiplayer"],
    alternates: {
      canonical: "/jogos/memory",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/memory",
        "en": "https://nailedthefly.com/en/jogos/memory",
      },
    },
    openGraph: {
      title: isPt ? "Jogo da Memória Online - Jogue Grátis" : "Memory Game Online - Play Free",
      description: isPt
        ? "Combine os pares de cartas! 3 dificuldades, modo cronometrado e multiplayer online. Grátis no navegador."
        : "Match the card pairs! 3 difficulty levels, timed mode and online multiplayer. Free in your browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/memory"
        : "https://nailedthefly.com/en/jogos/memory",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: isPt ? "Jogo da Memória" : "Memory Game",
    description: isPt
      ? "Jogue o Jogo da Memória online grátis! Combine os pares de cartas em 3 níveis de dificuldade, com modo cronometrado e multiplayer online."
      : "Play Memory Game online for free! Match card pairs across 3 difficulty levels, with timed mode and online multiplayer.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/memory"
      : "https://nailedthefly.com/en/jogos/memory",
    genre: ["Puzzle", "Casual"],
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
    title: "Sobre o Jogo da Memória",
    intro:
      "O Jogo da Memória é o clássico dos clássicos: um tabuleiro de cartas viradas para baixo, e você precisa encontrar todos os pares. Simples de aprender, impossível de parar. Aqui você joga online e grátis no navegador, com três níveis de dificuldade, um modo desafio com 60 segundos e multiplayer online para disputar com outros jogadores.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "O tabuleiro começa com todas as cartas viradas para baixo. No seu turno, clique em qualquer carta para revelá-la, depois clique em uma segunda. Se as duas tiverem a mesma imagem, o par é encontrado e fica visível permanentemente. Se forem diferentes, ambas viram de volta após um breve instante — e aí entra a memória.",
          "No modo clássico, o objetivo é combinar todos os pares no menor número de tentativas possível. No modo desafio, você tem 60 segundos para encontrar o máximo de pares antes do tempo acabar. No multiplayer online, dois jogadores se revezam e ganha quem encontrar mais pares ao final da rodada.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "Os controles são os mais simples possíveis: clique com o mouse em qualquer carta para virá-la no computador. No celular ou tablet, basta tocar na carta desejada. Não há teclado, não há botões especiais — apenas clique ou toque.",
          "A única restrição é que você não pode clicar em uma carta já revelada nem clicar duas vezes na mesma carta. O jogo aceita um clique por vez e aguarda você escolher a segunda carta antes de processar o resultado.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "A estratégia mais eficiente é criar um mapa mental do tabuleiro desde o início: tente associar cada carta a uma posição fixa em vez de decorar as imagens isoladas. As cartas das bordas e dos cantos são mais fáceis de localizar depois porque têm referências espaciais claras — comece explorando por elas.",
          "No modo cronometrado, não hesite quando souber onde está o par: clique rápido. Velocidade conta tanto quanto memória. No nível difícil, com mais cartas, foque em uma região por vez para não sobrecarregar a mente. E nunca clique aleatoriamente — cada revelação é uma informação valiosa que você pode usar a seu favor nos próximos turnos.",
        ],
      },
      {
        summary: "Origem do jogo",
        body: [
          "A mecânica de virar cartas e memorizar pares vem de jogos de salão alemães do século XIX, como o Schnitzel-Bank, onde participantes precisavam lembrar sequências de imagens. No mundo anglófono, o jogo ficou famoso como 'Concentration', popularizado pelo programa de TV americano homônimo que estreou em 1958 e ficou no ar por mais de uma década.",
          "As primeiras versões digitais surgiram ainda nos anos 1980: Concentration para o Atari 2600 foi lançado em 1980. Com a chegada dos computadores pessoais e depois da internet, o Jogo da Memória virou um dos primeiros jogos disponíveis online grátis no navegador — acessível a todas as idades, sem precisar instalar absolutamente nada.",
        ],
      },
    ],
  },
  en: {
    title: "About Memory Game",
    intro:
      "Memory Game is the timeless classic: a board of face-down cards waiting to be paired up. Easy to learn, surprisingly hard to master. Play free in your browser with three difficulty levels, a 60-second timed challenge mode, and online multiplayer to compete against other players.",
    details: [
      {
        summary: "How to play",
        body: [
          "The board starts with all cards face down. On your turn, click any card to flip it, then click a second one. If both cards show the same image, the pair is found and stays face up permanently. If they don't match, both cards flip back down after a brief moment — and that's where memory comes in.",
          "In classic mode, the goal is to match all pairs in as few turns as possible. In timed challenge mode, you have 60 seconds to find as many pairs as you can before the clock runs out. In online multiplayer, two players take turns and whoever finds the most pairs at the end of the round wins.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "The controls couldn't be simpler: click the mouse on any card to flip it on desktop. On mobile or tablet, just tap the card you want. No keyboard shortcuts, no special buttons — click or tap, that's it.",
          "You can't click a card that's already revealed, and clicking the same card twice does nothing. The game processes one flip at a time and waits for you to choose a second card before showing the result.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "The most effective strategy is building a mental map of the board from the very start — try to associate each card with a fixed position rather than just memorizing isolated images. Cards along the edges and corners are easier to relocate later because they have clear spatial anchors; start exploring those first.",
          "In timed mode, don't hesitate when you know where a pair is — click fast, because speed matters as much as memory. On hard difficulty with a larger board, focus on one region at a time to avoid cognitive overload. And never click randomly: every flip is information you can use on future turns.",
        ],
      },
      {
        summary: "Origin of the game",
        body: [
          "The card-flipping memory mechanic traces back to nineteenth-century German parlor games like Schnitzel-Bank, where players had to recall sequences of images. In the English-speaking world, the format was popularized as 'Concentration,' a TV game show that premiered in the United States in 1958 and ran for over a decade.",
          "The first digital versions arrived as early as the 1980s — Concentration for the Atari 2600 launched in 1980. With personal computers and later the internet, Memory Game became one of the earliest titles available free in the browser, playable by all ages with no install required. Today's online multiplayer version brings a competitive twist to this ageless puzzle.",
        ],
      },
    ],
  },
};

export default async function MemoryPage({ params }) {
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
