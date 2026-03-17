import dynamic from "next/dynamic";
const MemoryGame = dynamic(() => import("@/components/games/MemoryGame"), { ssr: false });

export const metadata = {
  title: "Jogo da Memoria Online - Gratis Multiplayer",
  description: "Jogo da memoria online gratis! 3 niveis de dificuldade, desafio por tempo de 60 segundos e multiplayer online. Jogue no celular ou computador sem download.",
  keywords: ["jogo da memoria", "memory game online", "jogo da memoria online", "jogo de pares", "memoria gratis"],
  alternates: { canonical: "/jogos/memory" },
  openGraph: {
    title: "Jogo da Memoria Online - Gratis Multiplayer",
    description: "Jogo da memoria online gratis! 3 niveis de dificuldade e multiplayer online.",
    url: "https://acerteamosca.com.br/jogos/memory",
  },
  other: { "geo.region": "BR", "geo.placename": "Brasil" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Memory Game",
  "description": "Jogo da memoria online gratis! 3 niveis de dificuldade, desafio por tempo e multiplayer online.",
  "url": "https://acerteamosca.com.br/jogos/memory",
  "genre": ["Puzzle", "Card Game"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function MemoryPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MemoryGame />
    </>
  );
}
