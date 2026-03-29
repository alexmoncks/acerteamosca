import dynamic from "next/dynamic";
const ThreeInvader = dynamic(() => import("@/components/games/ThreeInvader"), { ssr: false });

export const metadata = {
  title: "3INVADER - Jogo de Nave Shoot 'em Up Online Grátis",
  description:
    "Pilote o ARROW-7 e enfrente a invasão alienígena 3I/ATLAS! Jogo shoot em up vertical com 25 fases, 5 mundos épicos e 5 bosses colossais. Jogue grátis no navegador, sem download. Controles touch para celular.",
  keywords: [
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
    "space shooter browser game",
    "jogo arcade grátis sem download",
  ],
  alternates: { canonical: "/jogos/3invader" },
  openGraph: {
    title: "3INVADER - Jogo de Nave Shoot 'em Up Online Grátis",
    description:
      "Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses épicos. Jogue grátis no navegador!",
    url: "https://acerteamosca.com.br/jogos/3invader",
    type: "website",
    images: [
      {
        url: "/jogos/3invader/opengraph-image",
        width: 1200,
        height: 630,
        alt: "3INVADER - Jogo Shoot em Up Espacial",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "3INVADER - Jogo de Nave Shoot 'em Up Online Grátis",
    description:
      "Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses épicos.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "3INVADER",
  description:
    "Pilote o caça estelar ARROW-7 e enfrente a invasão alienígena 3I/ATLAS! Jogo shoot em up vertical com 25 fases distribuídas em 5 mundos épicos — da órbita terrestre até Júpiter — com 5 bosses colossais. Jogue grátis no navegador, sem download.",
  url: "https://acerteamosca.com.br/jogos/3invader",
  image: "https://acerteamosca.com.br/jogos/3invader/opengraph-image",
  screenshot: "https://acerteamosca.com.br/images/3invader/intro-4.jpg",
  genre: ["Arcade", "Shoot 'em up", "Vertical Shooter", "Ação"],
  gamePlatform: ["Web Browser", "Mobile Browser"],
  operatingSystem: "Any",
  applicationCategory: "Game",
  inLanguage: "pt-BR",
  numberOfPlayers: "1",
  datePublished: "2026-03-15",
  gameItem: {
    "@type": "Thing",
    name: "ARROW-7",
    description: "Caça estelar experimental da classe Aleste, único que conseguiu decolar.",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
    availability: "https://schema.org/InStock",
  },
  publisher: {
    "@type": "Organization",
    name: "Acerte a Mosca",
    url: "https://acerteamosca.com.br",
  },
};

export default function ThreeInvaderPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ThreeInvader />
    </>
  );
}
