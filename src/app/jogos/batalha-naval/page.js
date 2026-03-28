import dynamic from "next/dynamic";

const BatalhaNaval = dynamic(() => import("@/components/games/BatalhaNaval"), { ssr: false });

export const metadata = {
  title: "Batalha Naval - Jogue Online Grátis",
  description: "Jogo de Batalha Naval online grátis! Posicione seus navios e afunde a frota inimiga. 3 níveis de dificuldade. Jogue no celular ou computador!",
  keywords: ["batalha naval", "battleship online", "jogo de batalha naval", "jogo de estratégia", "jogo de tabuleiro online"],
  alternates: { canonical: "/jogos/batalha-naval" },
  openGraph: {
    title: "Batalha Naval - Jogue Online Grátis",
    description: "Posicione seus navios e afunde a frota inimiga!",
    url: "https://acerteamosca.com.br/jogos/batalha-naval",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Batalha Naval",
  "description": "Jogo de Batalha Naval. Posicione navios e afunde a frota inimiga!",
  "url": "https://acerteamosca.com.br/jogos/batalha-naval",
  "genre": ["Strategy", "Board Game"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function BatalhaNavalPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BatalhaNaval />
    </>
  );
}
