import dynamic from "next/dynamic";
const DeepAttack = dynamic(() => import("@/components/games/DeepAttack"), { ssr: false });

export const metadata = {
  title: "Deep Attack - Jogo de Nave Espacial Online",
  description: "Pilote sua nave pelo espaço, destrua aliens e sobreviva no corredor espacial! Jogo estilo River Raid online grátis sem download.",
  keywords: ["jogo de nave", "space shooter", "deep attack", "river raid online", "jogo espacial", "nave online"],
  alternates: { canonical: "/jogos/deepattack" },
  openGraph: {
    title: "Deep Attack - Jogo de Nave Espacial Online",
    description: "Pilote sua nave pelo espaço, destrua aliens e sobreviva no corredor espacial!",
    url: "https://acerteamosca.com.br/jogos/deepattack",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Deep Attack",
  "description": "Pilote sua nave pelo espaço, destrua aliens e sobreviva no corredor espacial!",
  "url": "https://acerteamosca.com.br/jogos/deepattack",
  "genre": ["Arcade", "Shooter"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function DeepAttackPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DeepAttack />
    </>
  );
}
