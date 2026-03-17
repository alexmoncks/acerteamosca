import dynamic from "next/dynamic";
const WordleBR = dynamic(() => import("@/components/games/WordleBR"), { ssr: false });

export const metadata = {
  title: "Wordle em Portugues - Jogue Gratis Online",
  description: "Jogue Wordle em portugues! Adivinhe a palavra de 5 letras em 6 tentativas. Jogo online gratis sem download, funciona no celular e computador.",
  keywords: ["wordle portugues", "wordle brasileiro", "wordle online", "jogo de palavras", "adivinhar palavra"],
  alternates: { canonical: "/jogos/wordle" },
  openGraph: {
    title: "Wordle em Portugues - Jogue Gratis",
    description: "Adivinhe a palavra de 5 letras em 6 tentativas! Jogo online gratis.",
    url: "https://acerteamosca.com.br/jogos/wordle",
  },
  other: { "geo.region": "BR", "geo.placename": "Brasil" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Wordle BR",
  "description": "Jogue Wordle em portugues! Adivinhe a palavra de 5 letras em 6 tentativas.",
  "url": "https://acerteamosca.com.br/jogos/wordle",
  "genre": ["Puzzle", "Word Game"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function WordlePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <WordleBR />
    </>
  );
}
