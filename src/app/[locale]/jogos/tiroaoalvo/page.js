import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Tiro ao Alvo Online — Jogue Grátis | Acerte a Mosca"
      : "Target Shooter Online — Play Free | Nailed The Fly",
    description: isPt
      ? "Jogue Tiro ao Alvo online grátis! Skeet shooting no navegador: pratos de argila aparecem voando e você acerta com timing perfeito. Apenas dois botões, reflexo puro. Sem download."
      : "Play Target Shooter online for free! Browser skeet shooting: clay disks fly across the screen and you hit them with perfect timing. Just two buttons, pure reflex. No download.",
    keywords: isPt
      ? ["tiro ao alvo", "skeet shooting online", "tiro ao prato", "jogo de tiro grátis", "tiro ao alvo navegador", "jogo de reflexo online"]
      : ["target shooter online", "skeet shooting game", "clay pigeon game", "shooting game free", "reflex game browser", "target shooting online"],
    alternates: {
      canonical: "/jogos/tiroaoalvo",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/tiroaoalvo",
        "en": "https://nailedthefly.com/en/jogos/tiroaoalvo",
      },
    },
    openGraph: {
      title: isPt ? "Tiro ao Alvo Online - Jogue Grátis" : "Target Shooter Online - Play Free",
      description: isPt
        ? "Acerte os pratos de argila com timing perfeito! Dois botões, reflexo puro. Grátis no navegador."
        : "Hit the clay disks with perfect timing! Two buttons, pure reflex. Free in your browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/tiroaoalvo"
        : "https://nailedthefly.com/en/jogos/tiroaoalvo",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: isPt ? "Tiro ao Alvo" : "Target Shooter",
    description: isPt
      ? "Jogue Tiro ao Alvo online grátis! Skeet shooting no navegador com pratos de argila e timing puro."
      : "Play Target Shooter online for free! Browser skeet shooting with clay disks and pure timing gameplay.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/tiroaoalvo"
      : "https://nailedthefly.com/en/jogos/tiroaoalvo",
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
    title: "Sobre o Tiro ao Alvo",
    intro:
      "O Tiro ao Alvo é um jogo de reflexo puro inspirado no skeet shooting olímpico. Pratos de argila voam pela tela e você precisa acertá-los no momento exato, usando apenas dois botões. Sem cursor, sem mira — só timing e concentração. Jogue grátis online no navegador, sem precisar baixar nada.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "A tela mostra dois canhões — um à esquerda e um à direita. Cada um lança pratos de argila em trajetórias curvas distintas. Quando um prato atinge a zona de tiro — a área central da tela — você deve pressionar o botão correspondente ao lado de onde o prato veio para acertá-lo.",
          "Errar três vezes encerra o jogo. Acertar pratos em sequência sem errar constrói um multiplicador de pontuação: combo de 2x, 3x, 4x e assim por diante. Quanto maior o combo, mais pontos cada prato acertado vale. Os pratos ficam mais rápidos conforme o nível avança — concentração e antecipação são fundamentais.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, use a seta esquerda (ou a tecla Z) para acertar pratos do lado esquerdo, e a seta direita (ou a tecla X) para pratos do lado direito. No celular ou tablet, dois botões touch aparecem na tela, um de cada lado — toque no botão correspondente ao canhão que lançou o prato.",
          "Não há cursor nem mira a controlar. Tudo se resume a observar de qual lado o prato foi lançado e apertar o botão certo no momento exato. Simples na teoria, exigente na prática.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "A dica mais importante é apertar o botão um instante ANTES de o prato chegar ao centro — o seu reflexo humano tem uma pequena latência que você precisa compensar. Nos níveis iniciais, acerte todos os pratos para construir o maior combo possível antes que a velocidade aumente.",
          "Quando dois pratos aparecerem ao mesmo tempo (um de cada lado), foque no que está mais próximo da zona de tiro primeiro. Em níveis avançados, se estiver com dificuldade, priorize o lado em que você erra menos e ignore o outro — um erro dói menos que três seguidos. O multiplicador de combo é a chave para pontuações altas: não quebre a sequência.",
        ],
      },
      {
        summary: "Origem do jogo",
        body: [
          "O gênero de tiro ao alvo digital tem sua obra-prima em Duck Hunt (Nintendo, 1984), o clássico da NES Zapper que colocou uma pistola de luz nas mãos de milhões de jogadores. Mas a mecânica de dois botões e timing simples do Tiro ao Alvo se aproxima mais de Hyper Sports (Konami, 1984), que simulava diversas provas olímpicas nos fliperamas — incluindo o skeet shooting.",
          "Hyper Sports foi um dos primeiros jogos a transformar esportes olímpicos em mecânicas arcade acessíveis e viciantes. O skeet shooting digital virou febre nas Olimpíadas de videogame dos anos 1980 e seu DNA permanece vivo até hoje em incontáveis jogos de reflexo online grátis no navegador — incluindo este.",
        ],
      },
    ],
  },
  en: {
    title: "About Target Shooter",
    intro:
      "Target Shooter is a pure-reflex game inspired by Olympic skeet shooting. Clay disks fly across the screen and you must hit them at the exact right moment using just two buttons. No cursor, no aiming — only timing and focus. Play free online in your browser, no download required.",
    details: [
      {
        summary: "How to play",
        body: [
          "The screen shows two launchers — one on the left and one on the right. Each fires clay disks along different curved trajectories. When a disk reaches the shooting zone — the center area of the screen — press the button corresponding to the side the disk came from to hit it.",
          "Miss three times and the game is over. Hit disks in consecutive succession to build a score multiplier: 2x, 3x, 4x combo and beyond. The higher your combo, the more points each hit scores. Disks fly faster as the level increases — anticipation and focus are everything.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use the left arrow key (or Z) to hit disks from the left, and the right arrow key (or X) for disks from the right. On mobile or tablet, two touch buttons appear on screen, one on each side — tap the button matching the launcher that fired the disk.",
          "There's no cursor or aiming reticle to control. Everything comes down to watching which side the disk came from and pressing the correct button at the exact right moment. Simple in theory, demanding in practice.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "The most important tip: press the button a split second BEFORE the disk reaches the center — your human reaction time has a small delay that you need to compensate for. In early levels, hit every disk to build the biggest possible combo before the speed ramps up.",
          "When two disks appear simultaneously — one from each side — focus on the one closer to the shooting zone first. In advanced levels, if you're struggling, prioritize the side you miss less often and let the other go — one miss hurts less than three in a row. The combo multiplier is the key to high scores: never break the chain.",
        ],
      },
      {
        summary: "Origin of the game",
        body: [
          "The digital shooting gallery genre has its landmark title in Duck Hunt (Nintendo, 1984), the NES Zapper classic that put a light gun in millions of players' hands. But the two-button timing mechanic in Target Shooter is closer to Hyper Sports (Konami, 1984), which simulated various Olympic events in the arcade — including skeet shooting.",
          "Hyper Sports was one of the first games to turn Olympic sports into accessible and addictive arcade mechanics. Digital skeet shooting became a sensation in the video game Olympics of the 1980s, and its DNA lives on today in countless reflex games available free online in the browser — including this one.",
        ],
      },
    ],
  },
};

export default async function TiroAoAlvoPage({ params }) {
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
