import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Deep Attack — Jogo de Nave Espacial Online Grátis | Acerte a Mosca"
      : "Deep Attack — Free Online Space Shooter | Nailed The Fly",
    description: isPt
      ? "Pilote sua nave pelo corredor espacial, destrua aliens e sobreviva! Jogo estilo River Raid online grátis no navegador, sem download."
      : "Pilot your ship through the space corridor, destroy aliens and survive! River Raid-style free online browser game, no download needed.",
    keywords: isPt
      ? ["deep attack", "jogo de nave", "space shooter", "river raid online", "nave espacial online grátis", "jogo de tiro online"]
      : ["deep attack", "space shooter", "river raid style", "vertical scrolling shooter", "free browser game online"],
    alternates: {
      canonical: "/jogos/deepattack",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/deepattack",
        "en": "https://nailedthefly.com/en/jogos/deepattack",
      },
    },
    openGraph: {
      title: isPt ? "Deep Attack — Nave Espacial Online Grátis" : "Deep Attack — Free Online Space Shooter",
      description: isPt
        ? "Destrua aliens e sobreviva no corredor espacial! Estilo River Raid, grátis no navegador."
        : "Destroy aliens and survive the space corridor! River Raid-style, free in browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/deepattack"
        : "https://nailedthefly.com/en/jogos/deepattack",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Deep Attack",
    description: isPt
      ? "Pilote sua nave pelo corredor espacial, destrua aliens e sobreviva! Jogo estilo River Raid online grátis."
      : "Pilot your ship through the space corridor, destroy aliens and survive! Free online River Raid-style game.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/deepattack"
      : "https://nailedthefly.com/en/jogos/deepattack",
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
    title: "Sobre o Deep Attack",
    intro:
      "Deep Attack é um jogo de nave espacial com scrolling vertical — o cenário rola para baixo enquanto sua nave avança pelo corredor. Destrua aliens, desvie de obstáculos e sobreviva o máximo possível. Totalmente online e grátis no navegador, sem precisar baixar nada. A inspiração vem diretamente do clássico arcade River Raid, transportado para o espaço.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Sua nave avança automaticamente para cima enquanto o corredor espacial rola em sua direção. Você controla o movimento lateral — desvie de meteoros, estruturas e inimigos que aparecem em padrões variados. Atire nos aliens para ganhar pontos e eliminar ameaças antes que colidam com você.",
          "O jogo fica progressivamente mais difícil: a velocidade aumenta, os padrões de inimigos ficam mais complexos e os obstáculos aparecem com menos tempo de reação. Aprenda os padrões de cada zona do corredor e você sobreviverá muito mais tempo. O objetivo é simples: aguentar o máximo possível e bater seu próprio recorde de pontuação.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, use as setas esquerda e direita para mover a nave lateralmente e a barra de espaço para atirar. No celular ou tablet, um stick virtual aparece na tela para o movimento e um botão de disparo fica à disposição do polegar.",
          "O controle é responsivo e direto — sem complicações extras. O desafio vem da velocidade crescente do jogo, não da complexidade dos controles.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Aprenda os padrões de spawn de cada zona: os inimigos geralmente aparecem em formações repetíveis, então antecipar a posição deles é mais eficaz do que reagir no último segundo. Atire levemente à frente do alvo em movimento — não no alvo diretamente, mas onde ele estará daqui a um instante.",
          "Priorize eliminar os inimigos que ameaçam sua trajetória em vez de perseguir pontuação isolada. Se houver sistema de combustível ou energia, nunca deixe chegar próximo de zero — passe pelos postos de reabastecimento sempre que aparecerem. Decorar os atalhos e rotas mais seguras do corredor é o que separa os sobreviventes dos campeões de pontuação neste jogo online grátis.",
        ],
      },
      {
        summary: "Origem do gênero",
        body: [
          "Deep Attack é uma homenagem ao River Raid, lançado pela Activision em 1982. O jogo foi criado por Carol Shaw, pioneira da indústria e uma das primeiras mulheres contratadas como designer de videogames numa grande publisher. No River Raid, você pilota um avião de combate por um rio, atirando em barcos e helicópteros e parando em postos de combustível para não ficar sem energia.",
          "River Raid foi um dos primeiros jogos com geração procedural de fases — os cenários eram quasi-infinitos, criados por um algoritmo simples mas eficiente. A mecânica foi revolucionária para a época e influenciou toda uma geração de shooters de scrolling vertical, de 1942 a Raiden, passando por Space Harrier. Deep Attack adapta essa fórmula clássica para o espaço sideral, trazendo o espírito do arcade dos anos 80 para o navegador moderno como jogo online grátis.",
        ],
      },
    ],
  },
  en: {
    title: "About Deep Attack",
    intro:
      "Deep Attack is a vertical-scrolling space shooter — the scenery scrolls downward while your ship flies forward through the corridor. Destroy aliens, dodge obstacles and survive as long as possible. Completely free to play online in any browser, no download required. The inspiration comes directly from the classic arcade game River Raid, transported into outer space.",
    details: [
      {
        summary: "How to play",
        body: [
          "Your ship automatically advances upward while the space corridor scrolls toward you. You control lateral movement — dodge meteors, structures and enemies that appear in varied patterns. Shoot aliens to score points and eliminate threats before they collide with you.",
          "The game gets progressively harder: speed increases, enemy patterns grow more complex, and obstacles give you less reaction time. Learn the patterns in each corridor zone and you'll survive much longer. The goal is simple: hold on as long as possible and beat your own high score.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use the left and right arrow keys to move your ship laterally and the spacebar to fire. On mobile or tablet, a virtual joystick appears on screen for movement and a fire button sits within thumb reach.",
          "Controls are responsive and straightforward — no extra complexity. The challenge comes from the game's increasing speed, not from difficult inputs.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Learn the spawn patterns in each zone: enemies generally appear in repeatable formations, so anticipating their position is far more effective than reacting at the last second. Lead your shots slightly ahead of moving targets — aim not at where the enemy is, but where it will be a moment from now.",
          "Prioritize eliminating enemies that threaten your path rather than chasing isolated score opportunities. If the game has a fuel or energy system, never let it get close to zero — pass through refueling stations whenever they appear. Memorizing the safest routes and shortcuts through the corridor is what separates survivors from high-score champions in this free online browser game.",
        ],
      },
      {
        summary: "Origin of the genre",
        body: [
          "Deep Attack is a tribute to River Raid, released by Activision in 1982. The game was created by Carol Shaw, an industry pioneer and one of the first women hired as a video game designer at a major publisher. In River Raid you pilot a combat jet along a river, shooting boats and helicopters while stopping at fuel depots to avoid running out of energy.",
          "River Raid was one of the first games to feature procedurally generated levels — the stages were quasi-infinite, produced by a simple but effective algorithm. The mechanic was revolutionary for its time and influenced an entire generation of vertical-scrolling shooters, from 1942 to Raiden and Space Harrier. Deep Attack adapts that classic formula to outer space, bringing the spirit of 1980s arcade gaming into the modern browser as a free online game.",
        ],
      },
    ],
  },
};

export default async function DeepAttackPage({ params }) {
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
