// Igual nos dois domínios. O sitemap mora no .com.br e lista também as URLs
// do nailedthefly.com: referenciá-lo no robots.txt do nailedthefly.com é o que
// autoriza essas URLs no sitemap de outro domínio (ver src/app/sitemap.js).
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: "https://acerteamosca.com.br/sitemap.xml",
  };
}
