import dynamic from "next/dynamic";
const ThreeInvader = dynamic(() => import("@/components/games/ThreeInvader"), { ssr: false });

export const metadata = {
  title: "3INVADER - Jogo Shoot em Up Espacial Online Gratis",
  description: "Pilote o ARROW-7 e enfrente a invasao alienigena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses epicos. Jogo shmup vertical online gratis sem download.",
  keywords: ["shoot em up", "shmup", "jogo de nave", "space shooter", "3invader", "jogo online gratis", "arcade", "vertical shooter"],
  alternates: { canonical: "/jogos/3invader" },
  openGraph: {
    title: "3INVADER - Jogo Shoot em Up Espacial Online Gratis",
    description: "Pilote o ARROW-7 e enfrente a invasao alienigena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses epicos.",
    url: "https://acerteamosca.com.br/jogos/3invader",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "3INVADER",
  "description": "Pilote o ARROW-7 e enfrente a invasao alienigena 3I/ATLAS! 25 fases em 5 mundos com bosses epicos.",
  "url": "https://acerteamosca.com.br/jogos/3invader",
  "genre": ["Arcade", "Shoot 'em up", "Vertical Shooter"],
  "gamePlatform": "Web Browser",
  "operatingSystem": "Any",
  "applicationCategory": "Game",
  "inLanguage": "pt-BR",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "BRL", "availability": "https://schema.org/InStock" },
  "publisher": { "@type": "Organization", "name": "Acerte a Mosca", "url": "https://acerteamosca.com.br" }
};

export default function ThreeInvaderPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ThreeInvader />
    </>
  );
}
