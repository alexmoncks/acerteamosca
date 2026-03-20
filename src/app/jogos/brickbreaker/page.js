import dynamic from "next/dynamic";
const BrickBreaker = dynamic(() => import("@/components/games/BrickBreaker"), { ssr: false });

export const metadata = {
  title: "Brick Breaker - Jogo Arkanoid Online Gratis",
  description: "Destrua todos os blocos em 25 fases epicas! Jogo estilo Arkanoid com power-ups, inimigos e 5 mundos. Jogue gratis no navegador sem download.",
  keywords: ["brick breaker", "arkanoid", "breakout", "jogo de blocos", "jogo online gratis", "arcade"],
  alternates: { canonical: "/jogos/brickbreaker" },
  openGraph: {
    title: "Brick Breaker - Jogo Arkanoid Online Gratis",
    description: "Destrua todos os blocos em 25 fases epicas! 5 mundos, power-ups e inimigos.",
    url: "https://acerteamosca.com.br/jogos/brickbreaker",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Brick Breaker",
  "description": "Destrua todos os blocos em 25 fases epicas! Jogo estilo Arkanoid com power-ups, inimigos e 5 mundos.",
  "url": "https://acerteamosca.com.br/jogos/brickbreaker",
  "genre": ["Arcade", "Breakout"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function BrickBreakerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BrickBreaker />
    </>
  );
}
