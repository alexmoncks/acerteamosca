import dynamic from "next/dynamic";
const MemoryGame = dynamic(() => import("@/components/games/MemoryGame"), { ssr: false });

export const metadata = {
  title: "Jogo da Memória Online - Grátis Multiplayer",
  description: "Jogo da memória online grátis! 3 níveis de dificuldade, desafio por tempo de 60 segundos e multiplayer online. Jogue no celular ou computador sem download.",
  keywords: ["jogo da memória", "memory game online", "jogo da memória online", "jogo de pares", "memória grátis"],
  alternates: { canonical: "/jogos/memory" },
  openGraph: {
    title: "Jogo da Memória Online - Grátis Multiplayer",
    description: "Jogo da memória online grátis! 3 níveis de dificuldade e multiplayer online.",
    url: "https://acerteamosca.com.br/jogos/memory",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Memory Game",
  "description": "Jogo da memória online grátis! 3 níveis de dificuldade, desafio por tempo e multiplayer online.",
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
