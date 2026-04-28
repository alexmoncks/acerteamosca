import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Ships — Batalha de Naves Online Grátis | Acerte a Mosca"
      : "Ships — Free Online Ship Battle Game | Nailed The Fly",
    description: isPt
      ? "Pilote sua nave por labirintos, ricocheteie tiros nas paredes e destrua a nave inimiga! Modo solo e multiplayer online grátis, sem download."
      : "Pilot your ship through labyrinths, ricochet shots off walls and destroy the enemy. Free online solo and multiplayer game, no download needed.",
    keywords: isPt
      ? ["ships", "jogo de naves", "batalha de naves", "naves multiplayer", "jogo de tiro online", "jogo online grátis"]
      : ["ships game", "ship battle online", "ricochet shooter", "top-down multiplayer", "free browser game"],
    alternates: {
      canonical: "/jogos/ships",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/ships",
        "en": "https://nailedthefly.com/en/jogos/ships",
      },
    },
    openGraph: {
      title: isPt ? "Ships — Batalha de Naves Online Grátis" : "Ships — Free Online Ship Battle",
      description: isPt
        ? "Ricocheteie tiros nas paredes e destrua a nave inimiga! Jogo online grátis."
        : "Ricochet shots off walls and destroy the enemy ship! Free online game.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/ships"
        : "https://nailedthefly.com/en/jogos/ships",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Ships",
    description: isPt
      ? "Pilote sua nave por labirintos, ricocheteie tiros nas paredes e destrua a nave inimiga!"
      : "Pilot your ship through labyrinths, ricochet shots off walls and destroy the enemy ship!",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/ships"
      : "https://nailedthefly.com/en/jogos/ships",
    genre: ["Arcade", "Shooter"],
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
    title: "Sobre o Ships",
    intro:
      "Ships é um jogo de batalha de naves arcade com visão de cima (top-down). Você pilota uma nave por labirintos apertados e tenta destruir o adversário com tiros que ricocheteiam nas paredes. Disponível em modo solo e multiplayer online grátis, sem precisar baixar nada — jogue direto no navegador no celular ou computador.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Cada partida acontece numa arena fechada cheia de paredes. Sua nave gira para mirar e avança em linha reta. O objetivo é simples: atingir a nave do oponente antes de ser atingido. O detalhe que muda tudo é que os tiros não somem quando batem nas paredes — eles ricocheteiam com ângulo de reflexão, exatamente como uma bola de bilhar.",
          "No modo solo você enfrenta a CPU em dificuldade crescente. No multiplayer online, você desafia outros jogadores reais em tempo real. Cada partida exige que você pense em geometria: não basta apontar para o inimigo, é preciso calcular os rebounds para acertar por onde ele menos espera.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, use as setas direcionais para girar a nave e avançar, e a barra de espaço para atirar. No celular ou tablet, um stick virtual aparece na tela para movimentar a nave e um botão de tiro fica à disposição do polegar.",
          "Os controles são simples de aprender, mas dominá-los de verdade leva algumas partidas — especialmente prever a trajetória dos ricochetes em alta velocidade.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "A primeira dica de ouro: use as paredes a seu favor. Atirar diretamente no oponente é o movimento mais previsível — e o mais fácil de desviar. Aprenda a calcular ricochetes para que o tiro chegue pelas laterais ou pelas costas do inimigo.",
          "Fique em movimento constante: uma nave parada é alvo fácil. Prefira movimentos circulares perto das paredes, que criam ângulos naturais para rebotes. No multiplayer online, observe o estilo do adversário nas primeiras rodadas: alguns jogadores sempre fogem em linha reta, outros ficam rodando no centro. Adapte sua estratégia a cada perfil. E lembre-se: seus próprios tiros ricocheteados podem te acertar de volta, então cuidado com disparos em espaços pequenos.",
        ],
      },
      {
        summary: "Origem do gênero",
        body: [
          "O gênero de batalha de veículos com ricochete de tiros foi popularizado por Combat, lançado pela Atari em 1977 e um dos títulos de estreia do Atari 2600. Era um dos primeiros jogos com modo multijogador local, permitindo duas pessoas competirem lado a lado no mesmo sofá.",
          "A mecânica de ricochete transformou o simples ato de atirar num exercício de geometria mental: o jogador que consegue prever dois ou três reflexos consecutivos tem enorme vantagem. Esse conceito influenciou Wii Tanks, Tanks! e dezenas de minijogos modernos online. Ships mantém essa tradição viva no navegador, trazendo a intensidade do arcade clássico para a geração de jogos online grátis.",
        ],
      },
    ],
  },
  en: {
    title: "About Ships",
    intro:
      "Ships is a top-down arcade ship battle game where you pilot a vessel through tight labyrinths and try to destroy your opponent using shots that ricochet off the walls. Available as a free online game with solo and multiplayer modes — no download required, play directly in any browser on mobile or desktop.",
    details: [
      {
        summary: "How to play",
        body: [
          "Each match takes place in a closed arena filled with walls. Your ship rotates to aim and moves forward in a straight line. The goal is straightforward: hit the enemy ship before they hit you. The twist that makes everything interesting is that shots don't disappear when they hit walls — they bounce off at a reflection angle, exactly like a billiard ball.",
          "Solo mode pits you against the CPU at increasing difficulty levels. Online multiplayer lets you challenge real players in real time. Every match demands geometric thinking: don't just point at the enemy, calculate the rebounds to hit them from unexpected angles.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use the arrow keys to rotate and move your ship, and the spacebar to fire. On mobile or tablet, a virtual joystick appears on screen to steer and a fire button sits within thumb reach.",
          "The controls are easy to pick up, but truly mastering them — especially predicting ricochet trajectories at high speed — takes a few matches to get comfortable with.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Golden tip number one: use the walls as your allies. Firing directly at the opponent is the most predictable move and the easiest to dodge. Learn to calculate ricochets so your shot arrives from the side or behind the enemy.",
          "Keep moving constantly — a stationary ship is an easy target. Circular movement close to the walls creates natural bounce angles. In online multiplayer, study your opponent's style in the first few seconds: some always flee in straight lines, others spin around the center. Adapt to each profile. And watch out: your own ricocheted shots can come back and hit you, so be careful when firing in tight spaces.",
        ],
      },
      {
        summary: "Origin of the genre",
        body: [
          "The vehicle combat genre with ricocheting projectiles was popularized by Combat, released by Atari in 1977 as one of the launch titles for the Atari 2600. It was among the first games to feature a local multiplayer mode, letting two players compete side by side on the same couch.",
          "The ricochet mechanic turned the simple act of shooting into a mental geometry exercise: the player who can predict two or three consecutive bounces gains a massive advantage. This concept influenced Wii Tanks, the browser game Tanks!, and dozens of modern online mini-games. Ships keeps that tradition alive in the browser, bringing classic arcade intensity to today's free online gaming scene.",
        ],
      },
    ],
  },
};

export default async function ShipsPage({ params }) {
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
