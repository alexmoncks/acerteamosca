import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Brick Breaker — Jogo Arkanoid Online Grátis | Acerte a Mosca"
      : "Brick Breaker — Free Arkanoid Game Online | Nailed The Fly",
    description: isPt
      ? "Destrua todos os blocos em 25 fases épicas! Arcade estilo Arkanoid com power-ups, inimigos e 5 mundos. Jogue grátis no navegador, sem download, funciona no celular."
      : "Smash all the bricks across 25 epic levels! Arkanoid-style arcade with power-ups, enemies and 5 worlds. Play free in your browser, no download, works on mobile.",
    keywords: isPt
      ? ["brick breaker", "arkanoid", "breakout", "jogo de blocos", "jogo arcade grátis", "jogo no navegador"]
      : ["brick breaker", "arkanoid", "breakout", "block game", "free arcade game", "browser game"],
    alternates: {
      canonical: "/jogos/brickbreaker",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/brickbreaker",
        "en": "https://nailedthefly.com/en/jogos/brickbreaker",
      },
    },
    openGraph: {
      title: isPt ? "Brick Breaker - Jogo Arkanoid Online Grátis" : "Brick Breaker - Free Arkanoid Game Online",
      description: isPt
        ? "25 fases, 5 mundos, power-ups e inimigos! Arcade de destruir blocos grátis no navegador."
        : "25 levels, 5 worlds, power-ups and enemies! Free brick-breaking arcade in your browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/brickbreaker"
        : "https://nailedthefly.com/en/jogos/brickbreaker",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Brick Breaker",
    description: isPt
      ? "Destrua todos os blocos em 25 fases épicas! Arcade estilo Arkanoid com power-ups, inimigos e 5 mundos."
      : "Smash all the bricks across 25 epic levels! Arkanoid-style arcade with power-ups, enemies and 5 worlds.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/brickbreaker"
      : "https://nailedthefly.com/en/jogos/brickbreaker",
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
    title: "Sobre o Brick Breaker",
    intro:
      "Brick Breaker é o arcade clássico de rebater bola e destruir blocos, reinventado com 25 fases, 5 mundos temáticos, power-ups e inimigos que descem pra atrapalhar a sua vida. Jogue online e grátis, direto no navegador, no computador ou no celular — sem download, sem cadastro.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Seu objetivo é destruir todos os blocos de cada fase usando a bola. Para isso, controle a paddle horizontal na parte de baixo da tela e rebata a bola antes que ela caia. Quando todos os blocos somem, você avança para a próxima fase. Se a bola cair três vezes, a partida acaba.",
          "Alguns blocos precisam de mais de uma pancada para quebrar, e outros soltam power-ups ao serem destruídos. Inimigos aparecem em fases avançadas e descem em direção à sua paddle — você precisa destruí-los também para limpar o campo. Cada mundo tem seu padrão de blocos e novos desafios.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, use as teclas de seta esquerda e direita para mover a paddle, ou deslize o mouse horizontalmente. No celular ou tablet, arraste o dedo para a esquerda e para a direita na tela — a paddle segue o movimento do toque.",
          "A paddle responde rápido, então movimentos precisos fazem diferença. Posicione bem antes de a bola chegar pra ter mais controle sobre o ângulo de saída.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Posicione a paddle de forma a direcionar a bola para áreas com muitos blocos agrupados — assim você faz mais dano por rebatida. Pegue os power-ups estrategicamente: paddle maior e multibolas são os melhores aliados, mas laser pode ser útil contra inimigos. Não ignore os inimigos que descem — eles roubam sua atenção e podem travar sua passagem para a fase seguinte. Aprenda o padrão de blocos de cada mundo para saber onde concentrar o ataque logo de cara. Se estiver sem power-ups numa fase difícil, jogue mais devagar e controle cada rebatida com calma.",
        ],
      },
      {
        summary: "Origem do gênero",
        body: [
          "O Breakout foi criado em 1976 pela Atari — e a história por trás é incrível. Steve Jobs convenceu Steve Wozniak (sim, o Woz, futuro co-fundador da Apple) a desenvolver o jogo em apenas 4 dias para economizar no bônus pago por usar poucos chips. Wozniak entregou, mas Jobs ficou com a maior parte do dinheiro. Wozniak só soube da verdade anos depois, já sendo sócio da Apple.",
          "Em 1986 a Taito lançou o Arkanoid, que adicionou power-ups, inimigos e fases com temas variados — e fez o gênero explodir nos fliperamas do mundo todo. Brick Breaker herda essa tradição de destruição de blocos e traz de volta a diversão clássica do arcade, agora online e grátis no navegador, para jogar em qualquer dispositivo.",
        ],
      },
    ],
  },
  en: {
    title: "About Brick Breaker",
    intro:
      "Brick Breaker is the classic ball-and-paddle arcade game, reinvented with 25 levels, 5 themed worlds, power-ups, and enemies that drop down to make your life harder. Play online and free, right in your browser, on desktop or mobile — no download, no sign-up.",
    details: [
      {
        summary: "How to play",
        body: [
          "Your goal is to destroy all the bricks in each level using the ball. Control the horizontal paddle at the bottom of the screen and keep bouncing the ball before it falls. When all bricks are cleared, you move on to the next level. Lose the ball three times and the game is over.",
          "Some bricks need more than one hit to break, and others drop power-ups when destroyed. Enemies appear in later levels and descend toward your paddle — you need to take them out too to clear the field. Each world brings its own brick patterns and new challenges.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use the Left and Right arrow keys to move the paddle, or slide the mouse horizontally. On mobile or tablet, drag your finger left and right on the screen — the paddle follows your touch.",
          "The paddle responds quickly, so precise movements matter. Position yourself before the ball arrives to have more control over the bounce angle.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Aim the ball toward clusters of bricks so each bounce does maximum damage. Grab power-ups strategically — wider paddle and multi-ball are your best friends, but a laser can be handy for taking down enemies. Don't ignore the enemies descending toward you — they steal your attention and can block your path to the next level. Learn each world's brick layout so you know where to concentrate your attack from the start. If you're out of power-ups on a tough level, slow down and control each bounce deliberately instead of panicking.",
        ],
      },
      {
        summary: "Origin of the genre",
        body: [
          "Breakout was created by Atari in 1976 — and the backstory is legendary. Steve Jobs convinced Steve Wozniak (yes, Woz, the future Apple co-founder) to build the game in just 4 days to cash in on a bonus for using fewer chips. Wozniak delivered, but Jobs kept most of the money. Wozniak only found out the truth years later, by which point they were already Apple partners.",
          "In 1986 Taito released Arkanoid, adding power-ups, enemies, and themed levels — and the genre exploded in arcades worldwide. Brick Breaker inherits that brick-smashing tradition and brings the classic arcade fun back online and free in your browser, playable on any device.",
        ],
      },
    ],
  },
};

export default async function BrickBreakerPage({ params }) {
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
