import dynamic from "next/dynamic";

const TiroAoAlvo = dynamic(() => import("@/components/games/TiroAoAlvo"), { ssr: false });

export const metadata = {
  title: "Tiro ao Alvo - Skeet Shooting Online Grátis",
  description: "Jogo de tiro ao alvo estilo Skeet Shooting online grátis! Acerte os pratos de argila com timing perfeito. Dois botões, reflexo puro!",
  keywords: ["tiro ao alvo", "skeet shooting", "clay pigeon", "jogo de tiro", "hyper sports", "jogo de reflexo"],
  alternates: { canonical: "/jogos/tiroaoalvo" },
  openGraph: {
    title: "Tiro ao Alvo - Skeet Shooting Online",
    description: "Acerte os pratos de argila! Jogo de reflexo online grátis.",
    url: "https://acerteamosca.com.br/jogos/tiroaoalvo",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Tiro ao Alvo",
  "description": "Jogo de tiro ao alvo estilo Skeet Shooting. Acerte pratos de argila com timing perfeito!",
  "url": "https://acerteamosca.com.br/jogos/tiroaoalvo",
  "genre": ["Arcade", "Sports"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function TiroAoAlvoPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TiroAoAlvo />
    </>
  );
}
