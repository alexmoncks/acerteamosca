import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Jogo do Jacaré Online — Frogger Grátis | Acerte a Mosca"
      : "Jacare Online — Frogger-Style Game Free | Nailed The Fly",
    description: isPt
      ? "Jogue o Jogo do Jacaré online grátis! Estilo Frogger com tema brasileiro. Atravesse a rua desviando de carros, pule de tronco em tronco no rio e chegue às casinhas. Sem download."
      : "Play Jacare online for free! Brazilian-themed Frogger-style game. Cross the road dodging cars, hop on logs across the river, and reach the homes. No download needed.",
    keywords: isPt
      ? ["jogo do jacaré", "frogger online", "frogger grátis", "jacaré jogo", "frogger navegador", "jogo de atravessar rua", "jogo retro online"]
      : ["jacare game", "frogger online", "frogger free", "frogger browser", "crossy road style", "dodge cars game", "retro arcade online"],
    alternates: {
      canonical: "/jogos/jacare",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/jacare",
        "en": "https://nailedthefly.com/en/jogos/jacare",
      },
    },
    openGraph: {
      title: isPt ? "Jogo do Jacaré - Frogger Online Grátis" : "Jacare - Frogger-Style Game Free Online",
      description: isPt
        ? "Atravesse a rua e o rio com o jacaré! Desvie de carros, pule em troncos. Grátis no navegador."
        : "Cross the road and river with the croc! Dodge cars, hop on logs. Free in your browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/jacare"
        : "https://nailedthefly.com/en/jogos/jacare",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: isPt ? "Jogo do Jacaré" : "Jacare",
    description: isPt
      ? "Jogue o Jogo do Jacaré online grátis! Estilo Frogger com tema brasileiro. Atravesse a rua desviando de carros e o rio pulando em troncos."
      : "Play Jacare online for free! Brazilian-themed Frogger-style. Cross the road dodging cars and the river hopping on logs.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/jacare"
      : "https://nailedthefly.com/en/jogos/jacare",
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
    title: "Sobre o Jogo do Jacaré",
    intro:
      "O Jogo do Jacaré é um clássico estilo Frogger com tempero brasileiro. Você controla um jacaré que precisa atravessar primeiro uma movimentada avenida desviando de carros, depois cruzar o rio pulando de tronco em tronco até chegar às casinhas no topo. Jogue grátis online no navegador, sem precisar baixar nada.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "O jacaré começa na parte de baixo da tela. O percurso tem duas fases: primeiro você cruza três faixas de rua com carros passando em velocidades diferentes. Depois enfrenta o rio, onde precisa pular em troncos e tartarugas em movimento para não cair na água. O objetivo é chegar a uma das casinhas no topo da tela.",
          "Se todos os espaços das casinhas forem ocupados, a fase avança e a velocidade dos obstáculos aumenta. Carros causam morte por colisão direta. Cair na água sem estar em cima de um tronco ou tartaruga também elimina o jacaré. Atenção: algumas tartarugas afundam periodicamente — pular nelas no momento errado é armadilha certa.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, use as teclas de seta — cima, baixo, esquerda e direita — para mover o jacaré uma casa por vez em cada direção. Cada pressionamento equivale a um salto. No celular ou tablet, deslize o dedo (swipe) na direção desejada ou use o D-pad virtual exibido na tela.",
          "Movimentos precisos e no timing certo são mais importantes do que velocidade bruta. O jacaré não anda — ele salta de posição em posição, então planeje cada salto com cuidado.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Nunca espere no último segundo antes de pular: carros e troncos não param por você. Observe o padrão de velocidade de cada faixa antes de se mover — na rua, espere uma janela segura entre os carros; no rio, calcule onde o tronco vai estar quando você pousar nele, não onde está agora.",
          "Priorize ocupar a casinha mais próxima disponível em vez de mirar sempre no centro. Na fase avançada, as tartarugas afundam com mais frequência — identifique os grupos mais estáveis. Fique no lado mais vantajoso da tela para ter mais opções de movimento e nunca se pressione a saltar sem visibilidade clara do próximo apoio.",
        ],
      },
      {
        summary: "Origem do jogo",
        body: [
          "O Jogo do Jacaré é inspirado no Frogger, criado pela Konami em 1981 sob a liderança de Akira Hashimoto. Frogger foi um dos primeiros jogos arcade a introduzir a mecânica de 'atravessar lanes' com obstáculos em velocidades distintas — um conceito tão simples quanto genial que deu origem a um gênero inteiro.",
          "Frogger vendeu mais de 20 milhões de cabinetes de fliperama e inspirou incontáveis derivados ao longo das décadas, incluindo o hit mobile Crossy Road (2014). A versão do Jacaré traz essa mecânica clássica com identidade brasileira, oferecendo o mesmo desafio atemporal de reflexo e planejamento que você pode jogar online grátis no navegador hoje.",
        ],
      },
    ],
  },
  en: {
    title: "About Jacare",
    intro:
      "Jacare is a Frogger-style arcade classic with a Brazilian twist. You guide a crocodile across a busy road full of cars, then navigate a river by hopping on floating logs and turtles to reach the homes at the top. Play free online in your browser — no download, no install, just pure arcade fun.",
    details: [
      {
        summary: "How to play",
        body: [
          "The crocodile starts at the bottom of the screen. The journey has two phases: first, cross three lanes of road traffic with cars zooming past at different speeds. Then tackle the river, where you must hop on moving logs and turtles without falling into the water. The goal is to land safely in one of the homes at the top of the screen.",
          "Once all home slots are filled, the level advances and obstacles move faster. Cars kill on direct collision. Falling into the water without standing on a log or turtle also ends your run. Watch out: some turtles periodically submerge — jumping on them at the wrong moment is a guaranteed trap.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use the arrow keys — up, down, left, right — to move the croc one cell at a time in each direction. Each keypress equals one jump. On mobile or tablet, swipe in the desired direction or use the on-screen virtual D-pad.",
          "Precise movement and good timing matter far more than raw speed. The croc doesn't walk — it jumps from position to position, so plan each leap carefully before committing.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Never wait until the last second before jumping: cars and logs don't stop for you. Study the speed pattern of each lane before moving — on the road, wait for a safe gap between cars; on the river, calculate where the log will be when you land on it, not where it is right now.",
          "Aim for the nearest available home slot rather than always targeting the center. In later levels, turtles submerge more frequently — identify the most stable groups. Position yourself on the most advantageous side of the screen to keep your movement options open, and never jump without a clear view of your next landing spot.",
        ],
      },
      {
        summary: "Origin of the game",
        body: [
          "Jacare is inspired by Frogger, created by Konami in 1981 under the direction of Akira Hashimoto. Frogger was one of the first arcade games to introduce the lane-crossing mechanic with obstacles moving at different speeds — a concept as simple as it is brilliant, spawning an entire genre.",
          "Frogger sold over 20 million arcade units and inspired countless successors over the decades, including the mobile hit Crossy Road (2014). The Jacare version brings this timeless mechanic with a Brazilian identity, delivering the same classic challenge of reflex and planning you can enjoy free online in your browser today.",
        ],
      },
    ],
  },
};

export default async function JacarePage({ params }) {
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
