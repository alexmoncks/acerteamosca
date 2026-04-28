import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Acerte a Mosca — Jogue Grátis Online | Acerte a Mosca"
      : "Nailed The Fly — Play Free Online | Nailed The Fly",
    description: isPt
      ? "Acerte a mosca com o chinelo antes que ela voe embora! Jogo de reflexo online grátis, direto no navegador. Quanto mais rápido, mais pontos — sem download."
      : "Swat the annoying fly with a flip-flop before it escapes! Free online reflex game, straight in your browser. The faster you are, the higher your score — no download needed.",
    keywords: isPt
      ? ["acerte a mosca", "matar mosca", "jogo de reflexo", "whack a mole", "jogo grátis online", "acerte a mosca no navegador"]
      : ["nailed the fly", "swat the fly", "reflex game", "whack a mole", "free online game", "browser arcade"],
    alternates: {
      canonical: "/jogos/acerteamosca",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/acerteamosca",
        "en": "https://nailedthefly.com/en/jogos/acerteamosca",
      },
    },
    openGraph: {
      title: isPt ? "Acerte a Mosca - Jogue Grátis Online" : "Nailed The Fly - Play Free Online",
      description: isPt
        ? "Acerte a mosca com o chinelo antes que ela suma! Jogo de reflexo grátis no navegador."
        : "Swat the fly with a flip-flop before it disappears! Free reflex game in your browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/acerteamosca"
        : "https://nailedthefly.com/en/jogos/acerteamosca",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: isPt ? "Acerte a Mosca" : "Nailed The Fly",
    description: isPt
      ? "Acerte a mosca com o chinelo antes que ela voe embora! Jogo de reflexo online grátis."
      : "Swat the annoying fly with a flip-flop before it escapes! Free online reflex game.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/acerteamosca"
      : "https://nailedthefly.com/en/jogos/acerteamosca",
    genre: ["Arcade", "Action"],
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
    title: "Sobre o Acerte a Mosca",
    intro:
      "Acerte a Mosca é o jogo de reflexo que deu nome a esta plataforma. Uma mosca chata aparece na tela, e você precisa acertá-la com o chinelo antes que ela voe embora. Simples assim — mas fácil mesmo não é. O tempo é curto, as moscas aparecem cada vez mais rápido, e o combo pode mudar tudo na sua pontuação. Jogue grátis online, direto no navegador.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Quando a mosca aparecer na tela, clique ou toque nela o mais rápido que conseguir. Você tem um tempo limitado por rodada — se a mosca fugir sem ser acertada, você perde aquela chance. Acertar moscas em sequência sem deixar nenhuma escapar forma um combo que multiplica seus pontos.",
          "O jogo fica mais difícil conforme o tempo passa: as moscas aparecem por menos tempo antes de voar embora, exigindo reflexos cada vez mais afiados. Fique de olho no multiplicador de combo — vale mais tentar manter a sequência do que só correr atrás de pontos soltos.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, use o clique do mouse para acertar a mosca assim que ela aparecer na tela. No celular ou tablet, um toque rápido com o dedo é suficiente — o chinelo voa na direção do toque.",
          "Não precisa mirar com precisão milimétrica: a área de acerto é generosa. O que importa é a velocidade da reação.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Não espere a mosca se aproximar antes de clicar — reaja assim que ela aparecer. Mantenha o cursor (ou o dedo) sempre próximo ao centro da tela para reduzir a distância de deslocamento até qualquer ponto. Priorize as moscas que somem mais rápido antes das que ficam mais tempo — elas custam mais caro em combo se fugirem. Manter o multiplicador de combo ativo vale muito mais do que correr atrás de pontos soltos no final de uma série interrompida. Se perceber que está ficando nervoso e errando, desacelere um segundo para respirar — reflexo funciona pior sob tensão excessiva.",
        ],
      },
      {
        summary: "Origem do gênero",
        body: [
          "O gênero \"whack-a-mole\" nasceu nos fliperamas japoneses dos anos 1970. O Mogura Taiji (literalmente \"derrote a toupeira\"), lançado em 1976 pela Bandai Namco, foi o pioneiro: martelo de espuma, toupeiras mecânicas que subiam e desciam, filas enormes. A mecânica é tão simples e viciante que sobreviveu às arcades, chegou ao computador e hoje vive no celular.",
          "Acerte a Mosca é o jogo original desta plataforma, criado por Alex Marra em 2024. Foi o pretexto que fez o site existir — e o nome acabou sendo tão bom que ficou como identidade de toda a plataforma. Aqui a toupeira virou mosca, o martelo virou chinelo, e o fliperama virou o navegador online grátis que você está usando agora.",
        ],
      },
    ],
  },
  en: {
    title: "About Nailed The Fly",
    intro:
      "Nailed The Fly is the reflex game that gave this platform its name. An annoying fly appears on screen and you have to swat it with a flip-flop before it gets away. Sounds simple — but it isn't, not really. The timer is tight, the flies come faster and faster, and keeping a combo streak can change your score completely. Play free online, straight in your browser.",
    details: [
      {
        summary: "How to play",
        body: [
          "When a fly appears on screen, click or tap it as fast as you can. You have a limited window each round — if the fly escapes without being hit, you lose that chance. Hitting flies one after another without missing any builds a combo that multiplies your points.",
          "The game gets harder as time goes on: flies stay visible for shorter and shorter bursts before flying away, demanding sharper and sharper reflexes. Keep an eye on your combo multiplier — maintaining a streak is worth more than chasing stray points.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use a mouse click to nail the fly the moment it shows up. On mobile or tablet, a quick tap does the job — the flip-flop swings in the direction of your touch.",
          "You don't need pixel-perfect aim: the hit area is generous. What matters is how fast you react.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Don't wait for the fly to drift close — react the instant it appears. Keep your cursor (or finger) near the center of the screen to minimize travel distance to any corner. Prioritize flies that disappear quickly over ones that linger longer — they cost you more in combo if they escape. Keeping your combo multiplier alive is worth far more than chasing loose points after a broken streak. If you notice yourself getting tense and missing shots, take a half-second breath — reflexes actually slow down under excessive stress.",
        ],
      },
      {
        summary: "Origin of the genre",
        body: [
          "The whack-a-mole genre was born in Japanese arcades in the 1970s. Mogura Taiji (literally \"Defeat the Mole\"), released in 1976 by what is now Bandai Namco, was the pioneer: foam mallet, mechanical moles popping up and down, massive queues. The mechanic is so simple and addictive it outlived the arcades, moved to computers, and now lives happily in mobile browsers.",
          "Nailed The Fly is this platform's original game, created by Alex Marra in 2024. It was the excuse that made the whole site exist — and the name was catchy enough to become the identity of the entire platform. Here the mole became a fly, the mallet became a flip-flop, and the arcade cabinet became the free online browser game you're playing right now.",
        ],
      },
    ],
  },
};

export default async function AcerteAMoscaPage({ params }) {
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
