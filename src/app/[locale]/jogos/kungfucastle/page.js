import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Kung Fu Castle — Beat-em-up Online Grátis | Acerte a Mosca"
      : "Kung Fu Castle — Free Beat-em-up Online | Nailed The Fly",
    description: isPt
      ? "Suba o castelo andar por andar, derrubando capangas e enfrentando bosses brutais! Beat-em-up side-scroller online grátis, direto no navegador. Sem download. Em desenvolvimento ativo."
      : "Climb the castle floor by floor, beating up minions and taking on brutal bosses! Free side-scroll beat-em-up online, straight in your browser. No download. Actively in development.",
    keywords: isPt
      ? ["kung fu castle", "beat em up", "jogo de luta online", "side scroller", "jogo de ação grátis", "beat em up navegador"]
      : ["kung fu castle", "beat em up", "side scroller", "free fighting game", "action game browser", "beat em up online"],
    alternates: {
      canonical: "/jogos/kungfucastle",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/kungfucastle",
        "en": "https://nailedthefly.com/en/jogos/kungfucastle",
      },
    },
    openGraph: {
      title: isPt ? "Kung Fu Castle - Beat-em-up Online Grátis" : "Kung Fu Castle - Free Beat-em-up Online",
      description: isPt
        ? "Suba o castelo andar por andar enfrentando capangas e bosses! Grátis no navegador."
        : "Climb the castle floor by floor beating up minions and bosses! Free in your browser.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/kungfucastle"
        : "https://nailedthefly.com/en/jogos/kungfucastle",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Kung Fu Castle",
    description: isPt
      ? "Beat-em-up side-scroller onde você sobe o castelo andar por andar, derrotando capangas e bosses brutais. Online grátis no navegador."
      : "Side-scroll beat-em-up where you climb the castle floor by floor, defeating minions and brutal bosses. Free online in your browser.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/kungfucastle"
      : "https://nailedthefly.com/en/jogos/kungfucastle",
    genre: ["Arcade", "Beat 'em up", "Action"],
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
    title: "Sobre o Kung Fu Castle",
    intro:
      "Kung Fu Castle é um beat-em-up side-scroller de ação onde você sobe um castelo perigoso andar por andar, na força do soco e do chute. Derrube capangas, encare bosses brutais e avance pelo castelo com estilo. O jogo está em desenvolvimento ativo — já tem fases iniciais e dois bosses desafiadores: o Mestre dos Capangas e o Senhor do Castelo. Jogue online e grátis, direto no navegador.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Você avança lateralmente pelo castelo enfrentando ondas de capangas que aparecem de ambos os lados. Use socos, chutes e ataques especiais para derrotá-los antes de seguir em frente. Fique de olho na sua barra de vida — perder todo o HP significa recomeçar a fase. Itens de comida aparecem pelo cenário para recuperar energia.",
          "Ao final de cada andar, um boss poderoso bloqueia sua passagem. Bosses têm padrões de ataque únicos e exigem mais do que força bruta — observar e aprender os movimentos é fundamental para vencê-los. Depois de derrotar o boss, você avança para o próximo andar do castelo.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, use as teclas de seta para mover o personagem (esquerda, direita, agachar) e Z para soco e X para chute. Ataques especiais são ativados por combinações específicas. No celular, use o D-pad virtual na tela para mover e os botões de ataque na lateral direita.",
          "Combinar socos e chutes cria combos que causam mais dano e empurram os inimigos — muito mais eficiente do que ataques soltos.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Use combos de soco e chute em vez de ataques soltos — os danos são maiores e você controla melhor a posição dos inimigos. Mantenha distância de inimigos que carregam armas: tente acertá-los no momento em que avançam em vez de encostar neles. Aprenda os padrões dos bosses antes de sair atacando — cada boss tem janelas de vulnerabilidade após certos ataques. Pegue a comida que aparecer pelo cenário para recuperar HP antes de ficar no zero. Não fique encostado nas bordas da tela, pois capangas surgem dos dois lados e você pode ficar cercado.",
        ],
      },
      {
        summary: "Origem do gênero",
        body: [
          "O beat-em-up side-scroller tem um pai claro: Kung-Fu Master, lançado pela Irem em 1984. O jogo colocava o herói Thomas num castelo de cinco andares para resgatar sua namorada das mãos do vilão Mr. X — e cada andar era cheio de capangas com estilos de luta diferentes. A fórmula foi um sucesso estrondoso nos fliperamas.",
          "Kung-Fu Master influenciou diretamente Double Dragon (1987) e Final Fight (1989), que definiram o gênero como o conhecemos. Kung Fu Castle é uma homenagem direta a essa tradição: castelo, andares, capangas, bosses — tudo no lugar certo. O jogo está em desenvolvimento ativo, com novas fases e conteúdo sendo adicionados regularmente. Jogue grátis no navegador e acompanhe a evolução.",
        ],
      },
    ],
  },
  en: {
    title: "About Kung Fu Castle",
    intro:
      "Kung Fu Castle is a side-scroll beat-em-up where you climb a dangerous castle floor by floor, powered by punches and kicks. Beat down minions, face brutal bosses, and make your way up the castle with style. The game is actively in development — it already features early levels and two challenging bosses: the Master of Henchmen and the Lord of the Castle. Play online and free, straight in your browser.",
    details: [
      {
        summary: "How to play",
        body: [
          "You move laterally through the castle taking on waves of minions that come from both sides. Use punches, kicks, and special attacks to defeat them before advancing. Keep an eye on your health bar — losing all your HP means restarting the level. Food items scattered around the stage restore your energy.",
          "At the end of each floor, a powerful boss blocks your way. Bosses have unique attack patterns and require more than brute force — watching and learning their moves is key to beating them. After defeating the boss, you advance to the next floor of the castle.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, use the arrow keys to move your character (left, right, crouch) and Z for punch and X for kick. Special attacks are triggered by specific combinations. On mobile, use the on-screen virtual D-pad to move and the attack buttons on the right side.",
          "Combining punches and kicks creates combos that deal more damage and control enemy positioning — far more efficient than isolated attacks.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Use punch-and-kick combos instead of isolated attacks — the damage is higher and you control enemy position better. Keep distance from weapon-carrying enemies: try to hit them as they move toward you rather than getting in close. Learn boss patterns before going all-out — every boss has vulnerability windows after certain attacks. Pick up food items that appear in the stage to restore HP before hitting zero. Don't hug the screen edges, as minions spawn from both sides and you can quickly get surrounded.",
        ],
      },
      {
        summary: "Origin of the genre",
        body: [
          "The side-scroll beat-em-up has one clear father: Kung-Fu Master, released by Irem in 1984. The game put hero Thomas inside a five-floor castle to rescue his girlfriend from the villain Mr. X — each floor packed with minions sporting different fighting styles. The formula was a massive hit in arcades worldwide.",
          "Kung-Fu Master directly influenced Double Dragon (1987) and Final Fight (1989), which defined the genre as we know it today. Kung Fu Castle is a direct tribute to that tradition: castle, floors, minions, bosses — everything in the right place. The game is actively in development, with new levels and content being added regularly. Play free in your browser and follow its evolution.",
        ],
      },
    ],
  },
};

export default async function KungFuCastlePage({ params }) {
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
