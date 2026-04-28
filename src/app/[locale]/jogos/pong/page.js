import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Pong Online — Jogue Grátis Multiplayer | Acerte a Mosca"
      : "Pong Online — Play Free Multiplayer | Nailed The Fly",
    description: isPt
      ? "Jogue Pong online grátis! Clássico arcade de tênis com modo solo contra a CPU e multiplayer online via WebSocket. Sem download, funciona no celular e computador."
      : "Play Pong online for free! Classic arcade tennis with solo vs CPU and online multiplayer via WebSocket. No download needed, works on mobile and desktop.",
    keywords: isPt
      ? ["pong online", "pong grátis", "pong multiplayer", "jogo pong", "jogo arcade retro", "pong no navegador"]
      : ["pong online", "pong free", "pong multiplayer", "arcade game", "retro game browser", "classic pong"],
    alternates: {
      canonical: "/jogos/pong",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/pong",
        "en": "https://nailedthefly.com/en/jogos/pong",
      },
    },
    openGraph: {
      title: isPt ? "Pong Online - Jogue Grátis Multiplayer" : "Pong Online - Play Free Multiplayer",
      description: isPt
        ? "Clássico arcade de tênis! Solo contra CPU ou multiplayer online. Grátis no navegador."
        : "Classic arcade tennis! Solo vs CPU or online multiplayer. Free in your browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/pong"
        : "https://nailedthefly.com/en/jogos/pong",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Pong",
    description: isPt
      ? "Jogue Pong online grátis! Clássico arcade de tênis com modo solo contra CPU e multiplayer online."
      : "Play Pong online for free! Classic arcade tennis with solo vs CPU and online multiplayer.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/pong"
      : "https://nailedthefly.com/en/jogos/pong",
    genre: ["Arcade", "Sports"],
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
    title: "Sobre o Pong",
    intro:
      "O Pong é o clássico arcade de tênis que originou a indústria comercial dos videogames. Aqui você joga online e grátis, no navegador, sem precisar baixar nada. Escolha entre encarar a CPU no modo solo ou desafiar outro jogador real em tempo real via multiplayer online.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "O objetivo é simples: não deixe a bola passar pela sua paddle. Cada vez que o adversário perde a bola, você marca um ponto. O primeiro a chegar à pontuação limite vence a partida. No modo solo você enfrenta a CPU, que vai ficando mais esperta conforme o tempo avança.",
          "No multiplayer online, você entra em uma sala e aguarda um oponente. A bola começa devagar e acelera a cada rebatida, tornando o jogo cada vez mais frenético. O controle da paddle é vertical — sobe e desce para interceptar a trajetória da bola antes que ela escape.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, use as teclas de seta para cima e para baixo, ou W e S, para mover sua paddle. No celular ou tablet, arraste o dedo verticalmente na tela — a paddle acompanha o movimento do seu toque.",
          "O jogo responde rápido, então treine a antecipação: o segredo não é reagir quando a bola já chegou perto, mas sim se posicionar antes.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Antecipar a trajetória da bola é mais importante do que ter reflexo rápido — observe a direção logo depois de cada rebatida para já ir se posicionando. Acertar a bola na borda superior ou inferior da paddle muda o ângulo de saída: isso confunde o oponente e cria aberturas difíceis de cobrir. No multiplayer, varie o ritmo e finque as paradas em vez de só defender — um movimento brusco pode fazer o oponente errar. Mantenha a paddle centralizada quando a bola estiver no lado do adversário; assim você cobre mais área.",
        ],
      },
      {
        summary: "Origem do jogo",
        body: [
          "O Pong foi criado em 1972 pela Atari e desenvolvido por Allan Alcorn como exercício de treinamento — mas o resultado foi tão bom que virou produto. Lançado como máquina de fliperama, foi o primeiro arcade a ter sucesso comercial de verdade: as máquinas quebravam porque os clientes enchiam a caixinha de moedas além da capacidade.",
          "Em 1975 chegou ao console caseiro, inaugurando a era dos videogames domésticos. Cinquenta anos depois, o Pong continua sendo o ícone máximo do arcade: mecânica pura, sem enrolação. Hoje você joga a versão online grátis direto no navegador, no computador ou no celular, sem precisar de uma moeda sequer.",
        ],
      },
    ],
  },
  en: {
    title: "About Pong",
    intro:
      "Pong is the classic arcade tennis game that kicked off the commercial video game industry. Play it online and free, right in your browser — no download required. Choose between solo mode against the CPU or challenge a real player in real-time online multiplayer.",
    details: [
      {
        summary: "How to play",
        body: [
          "The goal is straightforward: don't let the ball slip past your paddle. Every time your opponent misses the ball, you score a point. The first player to reach the score limit wins. In solo mode you face the CPU, which gets progressively trickier over time.",
          "In online multiplayer, you join a room and wait for an opponent. The ball starts slow and speeds up with each hit, making the game increasingly frantic. Your paddle moves vertically — up and down — to intercept the ball before it escapes past your side.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use the Up and Down arrow keys, or W and S, to move your paddle. On mobile or tablet, drag your finger vertically on the screen — the paddle follows your touch movement.",
          "The game responds quickly, so practice anticipation: the secret is not to react when the ball is already close, but to position yourself before it arrives.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Anticipating the ball's trajectory matters more than raw reflexes — watch the direction right after each hit and start moving before the ball is halfway across. Hitting the ball with the edge of your paddle changes the exit angle, which confuses opponents and creates hard-to-cover openings. In multiplayer, vary your rhythm instead of playing a purely defensive game — a sudden move can force an opponent's mistake. Keep your paddle centered when the ball is on your opponent's side so you cover the most ground.",
        ],
      },
      {
        summary: "Origin of the game",
        body: [
          "Pong was created in 1972 by Atari and developed by Allan Alcorn as a training exercise — but the result was so good it became a real product. Released as an arcade cabinet, it was the first arcade machine to achieve genuine commercial success: some units broke down because customers stuffed them with more coins than the coin box could hold.",
          "In 1975 it came home as a dedicated console, kicking off the era of home video gaming. Fifty years later Pong remains the ultimate arcade icon — pure mechanics, zero fluff. Today you can play the free online version right in your browser, on desktop or mobile, without needing a single coin.",
        ],
      },
    ],
  },
};

export default async function PongPage({ params }) {
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
