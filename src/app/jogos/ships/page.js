import dynamic from "next/dynamic";
const Ships = dynamic(() => import("@/components/games/Ships"), { ssr: false });

export const metadata = {
  title: "Ships - Batalha de Naves Online",
  description: "Navegue por labirintos, ricocheteie tiros e destrua a nave inimiga! Jogo de naves multiplayer online grátis.",
  keywords: ["jogo de naves", "ships online", "batalha de naves", "naves multiplayer", "jogo de tiro online"],
  alternates: { canonical: "/jogos/ships" },
  openGraph: {
    title: "Ships - Batalha de Naves Online",
    description: "Navegue por labirintos, ricocheteie tiros e destrua a nave inimiga! Jogo multiplayer online grátis.",
    url: "https://acerteamosca.com.br/jogos/ships",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Ships",
  "description": "Navegue por labirintos, ricocheteie tiros e destrua a nave inimiga! Jogo multiplayer online grátis.",
  "url": "https://acerteamosca.com.br/jogos/ships",
  "genre": ["Arcade", "Shooter"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function ShipsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Ships />
    </>
  );
}
