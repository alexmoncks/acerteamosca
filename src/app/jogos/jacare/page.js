import dynamic from "next/dynamic";

const JogoDoJacare = dynamic(() => import("@/components/games/JogoDoJacare"), { ssr: false });

export const metadata = {
  title: "Jogo do Jacaré - Frogger Online Grátis",
  description: "Atravesse a rua e o rio com o jacaré! Jogo estilo Frogger online grátis. Desvie de carros, pule em troncos e alcance as casinhas!",
  keywords: ["jogo do jacaré", "frogger online", "frogger grátis", "jogo de atravessar rua", "jogos retro online"],
  alternates: { canonical: "/jogos/jacare" },
  openGraph: {
    title: "Jogo do Jacaré - Frogger Online Grátis",
    description: "Atravesse a rua e o rio com o jacaré! Desvie de carros, pule em troncos!",
    url: "https://acerteamosca.com.br/jogos/jacare",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Jogo do Jacaré",
  "description": "Jogo estilo Frogger. Atravesse a rua movimentada e o rio perigoso com o jacaré!",
  "url": "https://acerteamosca.com.br/jogos/jacare",
  "genre": ["Arcade", "Action"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function JacarePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <JogoDoJacare />
    </>
  );
}
