import dynamic from "next/dynamic";
const AcerteAMosca = dynamic(() => import("@/components/games/AcerteAMosca"), { ssr: false });

export const metadata = {
  title: "Acerte a Mosca - Mate o Mosquito!",
  description: "Acerte a mosca com o chinelo antes que o tempo acabe! Jogo de reflexo online grátis. Quanto mais rápido, mais pontos!",
  keywords: ["acerte a mosca", "matar mosquito", "jogo de reflexo", "whack a mole", "jogo rápido online"],
  alternates: { canonical: "/jogos/acerteamosca" },
  openGraph: {
    title: "Acerte a Mosca - Mate o Mosquito!",
    description: "Acerte a mosca com o chinelo antes que o tempo acabe! Jogo de reflexo online grátis.",
    url: "https://acerteamosca.com.br/jogos/acerteamosca",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "Acerte a Mosca",
  "description": "Acerte a mosca com o chinelo antes que o tempo acabe! Jogo de reflexo online grátis.",
  "url": "https://acerteamosca.com.br/jogos/acerteamosca",
  "genre": ["Arcade", "Action"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function AcerteAMoscaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <AcerteAMosca />
    </>
  );
}
