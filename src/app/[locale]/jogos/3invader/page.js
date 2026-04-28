import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "3INVADER — Jogo de Nave Shoot 'em Up Online Grátis | Acerte a Mosca"
      : "3INVADER — Free Vertical Shoot 'em Up Online | Nailed The Fly",
    description: isPt
      ? "Pilote o ARROW-7 e enfrente a invasão alienígena 3I/ATLAS! Shoot em up vertical com 25 fases, 5 mundos épicos e 5 bosses colossais. Jogue grátis no navegador, sem download. Controles touch para celular."
      : "Pilot the ARROW-7 and face the 3I/ATLAS alien invasion! Vertical shoot 'em up with 25 levels, 5 epic worlds and 5 colossal bosses. Play free in your browser, no download. Touch controls for mobile.",
    keywords: isPt
      ? [
          "jogo de nave online grátis",
          "shoot em up brasileiro",
          "shmup vertical grátis",
          "jogo espacial no navegador",
          "arcade shooter online",
          "3invader",
          "jogo de tiro espacial",
          "nave espacial jogo online",
          "jogo estilo Galaga",
          "vertical shooter grátis",
          "jogo de nave para celular",
          "jogo arcade grátis sem download",
        ]
      : [
          "3invader",
          "vertical shoot em up free",
          "space shooter browser game",
          "shmup online free",
          "arcade space game",
          "alien invasion game",
          "shoot em up no download",
          "free online shooter",
        ],
    alternates: {
      canonical: "/jogos/3invader",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/3invader",
        "en": "https://nailedthefly.com/en/jogos/3invader",
      },
    },
    openGraph: {
      title: isPt
        ? "3INVADER - Jogo de Nave Shoot 'em Up Online Grátis"
        : "3INVADER - Free Vertical Shoot 'em Up Online",
      description: isPt
        ? "Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses épicos. Jogue grátis no navegador!"
        : "Pilot the ARROW-7 against the 3I/ATLAS alien invasion! 25 levels, 5 worlds, 5 epic bosses. Play free in your browser!",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/3invader"
        : "https://nailedthefly.com/en/jogos/3invader",
      type: "website",
      images: [
        {
          url: "/jogos/3invader/opengraph-image",
          width: 1200,
          height: 630,
          alt: isPt ? "3INVADER - Jogo Shoot em Up Espacial" : "3INVADER - Space Shoot 'em Up Game",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: isPt
        ? "3INVADER - Jogo de Nave Shoot 'em Up Online Grátis"
        : "3INVADER - Free Vertical Shoot 'em Up Online",
      description: isPt
        ? "Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses épicos."
        : "Pilot the ARROW-7 against the 3I/ATLAS alien invasion! 25 levels, 5 worlds, 5 epic bosses.",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "3INVADER",
    description: isPt
      ? "Pilote o caça estelar ARROW-7 e enfrente a invasão alienígena 3I/ATLAS! Shoot em up vertical com 25 fases em 5 mundos épicos — da órbita terrestre até Júpiter — com 5 bosses colossais. Jogue grátis no navegador, sem download."
      : "Pilot the ARROW-7 starfighter and face the 3I/ATLAS alien invasion! Vertical shoot 'em up with 25 levels across 5 epic worlds — from Earth orbit to Jupiter — with 5 colossal bosses. Play free in your browser, no download.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/3invader"
      : "https://nailedthefly.com/en/jogos/3invader",
    image: "https://acerteamosca.com.br/jogos/3invader/opengraph-image",
    screenshot: "https://acerteamosca.com.br/images/3invader/intro-4.jpg",
    genre: ["Arcade", "Shoot 'em up", "Action"],
    gamePlatform: ["Web Browser", "Mobile Browser"],
    operatingSystem: "Any",
    applicationCategory: "Game",
    inLanguage: isPt ? "pt-BR" : "en",
    numberOfPlayers: "1",
    datePublished: "2026-03-15",
    gameItem: {
      "@type": "Thing",
      name: "ARROW-7",
      description: isPt
        ? "Caça estelar experimental da classe Aleste, único que conseguiu decolar."
        : "Experimental Aleste-class starfighter, the only one that made it off the ground.",
    },
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
    title: "Sobre o 3INVADER",
    intro:
      "3INVADER é um shoot 'em up vertical cheio de adrenalina onde você pilota o caça estelar ARROW-7 contra a invasão alienígena 3I/ATLAS. São 25 fases distribuídas em 5 mundos épicos — da órbita terrestre até as profundezas do sistema solar — com 5 bosses colossais no caminho. Jogue online e grátis, direto no navegador, sem precisar baixar nada.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Sua nave ARROW-7 move-se horizontalmente na parte de baixo da tela enquanto hordas de inimigos alienígenas descem em formação. Atire para cima, destrua tudo que aparecer e desvie dos tiros e meteoros que vêm em sua direção. Colete power-ups para fortalecer sua nave. Ao final de cada grupo de fases, um boss colossal entra em cena.",
          "O jogo tem 25 fases divididas em 5 mundos temáticos, cada um com cenários, inimigos e bosses únicos. Derrotar o boss de cada mundo libera o próximo. A dificuldade escala progressivamente — os primeiros mundos são uma entrada suave, mas a partir do terceiro as coisas ficam sérias.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, use as teclas de seta esquerda e direita (ou A e D) para mover a nave, e a barra de espaço para atirar. Alguns modos têm tiro automático ativo por padrão. No celular, use os botões de controle on-screen: um D-pad virtual para mover e botão de tiro na lateral.",
          "Atire continuamente e concentre-se em desviar — ficar parado é a forma mais rápida de morrer.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Aprenda os padrões de ataque dos bosses antes de tentar fazer dano — cada boss tem uma janela de vulnerabilidade específica. Mantenha o dedo sempre no movimento lateral para esquivar de projéteis: ficar estático é convite para levar hit. Priorize os inimigos que disparam antes dos que só avançam — projéteis cruzados são mais perigosos que inimigos kamikaze. Guarde seus power-ups mais poderosos para as batalhas de boss, onde cada hit conta muito mais. Observe os padrões das ondas: muitos grupos de inimigos se repetem com variações previsíveis.",
        ],
      },
      {
        summary: "Origem do gênero",
        body: [
          "Space Invaders, criado por Tomohiro Nishikado para a Taito em 1978, praticamente inventou o gênero shoot 'em up e provocou um fenômeno cultural sem precedentes: o jogo causou uma escassez literal de moedas de 100 ienes no Japão porque as pessoas despejavam tudo nos fliperamas. Foi o primeiro arcade a atingir um bilhão de dólares em faturamento.",
          "Em 1981 o Galaga da Namco refinou a fórmula com formações de inimigos mais complexas e a mecânica de bosses — referência direta que 3INVADER homenageia. 3INVADER expande essa herança com mundos temáticos, narrativa de invasão alienígena e bosses com múltiplas fases de ataque, trazendo o clássico shoot em up arcade para o navegador online grátis.",
        ],
      },
    ],
  },
  en: {
    title: "About 3INVADER",
    intro:
      "3INVADER is an adrenaline-fueled vertical shoot 'em up where you pilot the ARROW-7 starfighter against the 3I/ATLAS alien invasion. Twenty-five levels spread across 5 epic worlds — from Earth orbit to the depths of the solar system — with 5 colossal bosses standing in your way. Play online and free, straight in your browser, no download required.",
    details: [
      {
        summary: "How to play",
        body: [
          "Your ARROW-7 moves horizontally along the bottom of the screen while waves of alien enemies descend in formation. Shoot upward, destroy everything in your path, and dodge the incoming fire and meteors. Collect power-ups to strengthen your ship. At the end of each group of levels, a colossal boss takes the stage.",
          "The game features 25 levels divided into 5 themed worlds, each with unique scenery, enemies, and bosses. Defeating each world's boss unlocks the next. Difficulty scales progressively — the first worlds ease you in gently, but from the third world onward things get serious fast.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use the Left and Right arrow keys (or A and D) to move your ship, and the Space bar to fire. Some modes have auto-fire enabled by default. On mobile, use the on-screen controls: a virtual D-pad to move and a fire button on the side.",
          "Keep shooting continuously and focus on dodging — staying still is the fastest way to get destroyed.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Learn each boss's attack patterns before focusing on dealing damage — every boss has a specific vulnerability window. Keep moving laterally at all times to dodge projectiles: standing still is an open invitation to get hit. Prioritize enemies that shoot over enemies that only charge — crossed projectile patterns are more dangerous than kamikazes. Save your most powerful power-ups for boss fights, where every hit counts much more. Watch the wave patterns: many enemy groups repeat with predictable variations you can anticipate.",
        ],
      },
      {
        summary: "Origin of the genre",
        body: [
          "Space Invaders, created by Tomohiro Nishikado for Taito in 1978, practically invented the shoot 'em up genre and triggered an unprecedented cultural phenomenon: the game caused a literal shortage of 100-yen coins in Japan because players were dumping everything they had into arcade machines. It was the first arcade game to earn a billion dollars in revenue.",
          "In 1981 Namco's Galaga refined the formula with more complex enemy formations and boss mechanics — a direct reference that 3INVADER pays homage to. 3INVADER expands that legacy with themed worlds, an alien invasion narrative, and multi-phase boss attacks, bringing the classic arcade shoot 'em up to your free online browser.",
        ],
      },
    ],
  },
};

export default async function ThreeInvaderPage({ params }) {
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
