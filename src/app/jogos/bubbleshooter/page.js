import dynamic from "next/dynamic";
const BubbleShooter = dynamic(() => import("@/components/games/BubbleShooter"), { ssr: false });

export const metadata = {
  title: "Bubble Shooter Online - Jogue Grátis",
  description: "Bubble Shooter online grátis! Mire, atire e estoure bolhas da mesma cor. Jogo clássico no navegador sem download.",
  keywords: ["bubble shooter", "bubble shooter online", "estoura bolhas", "jogo de bolhas", "bubble grátis"],
  alternates: { canonical: "/jogos/bubbleshooter" },
  openGraph: {
    title: "Bubble Shooter Online - Jogue Grátis",
    description: "Bubble Shooter online grátis! Mire, atire e estoure bolhas da mesma cor.",
    url: "https://acerteamosca.com.br/jogos/bubbleshooter",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Bubble Shooter",
  "description": "Bubble Shooter online grátis! Mire, atire e estoure bolhas da mesma cor.",
  "url": "https://acerteamosca.com.br/jogos/bubbleshooter",
  "genre": ["Arcade", "Puzzle"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function BubbleShooterPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BubbleShooter />
    </>
  );
}
