import dynamic from "next/dynamic";
const Game2048 = dynamic(() => import("@/components/games/Game2048"), { ssr: false });

export const metadata = {
  title: "2048 Online - Jogue Gratis Multiplayer",
  description: "Jogue 2048 online gratis! Deslize os blocos e some ate chegar no 2048. Modo solo e corrida multiplayer online. Sem download.",
  keywords: ["2048 online", "2048 gratis", "jogo 2048", "2048 multiplayer", "puzzle online"],
  alternates: { canonical: "/jogos/2048" },
  openGraph: {
    title: "2048 Online - Jogue Gratis Multiplayer",
    description: "Jogue 2048 online gratis! Deslize os blocos e some ate chegar no 2048.",
    url: "https://acerteamosca.com.br/jogos/2048",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "2048",
  "description": "Jogue 2048 online gratis! Deslize os blocos e some ate chegar no 2048.",
  "url": "https://acerteamosca.com.br/jogos/2048",
  "genre": ["Puzzle", "Strategy"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function Game2048Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Game2048 />
    </>
  );
}
