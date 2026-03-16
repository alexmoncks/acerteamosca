import dynamic from "next/dynamic";
const Pong = dynamic(() => import("@/components/games/Pong"), { ssr: false });

export const metadata = {
  title: "Pong Online - Jogue Gratis Multiplayer",
  description: "Jogue Pong online gratis! Classico dos classicos com modo solo contra CPU e multiplayer online. Sem download.",
  keywords: ["pong online", "pong gratis", "pong multiplayer", "jogo pong", "jogo retro online"],
  alternates: { canonical: "/jogos/pong" },
  openGraph: {
    title: "Pong Online - Jogue Gratis Multiplayer",
    description: "Jogue Pong online gratis! Classico dos classicos com modo solo contra CPU e multiplayer online.",
    url: "https://acerteamosca.com.br/jogos/pong",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Pong",
  "description": "Jogue Pong online gratis! Classico dos classicos com modo solo contra CPU e multiplayer online.",
  "url": "https://acerteamosca.com.br/jogos/pong",
  "genre": ["Arcade", "Sports"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function PongPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Pong />
    </>
  );
}
