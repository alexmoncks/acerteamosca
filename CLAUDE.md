# Regras do Projeto - Acerte a Mosca

## Checklist para adicionar novo jogo

Ao adicionar um novo jogo à plataforma, SEMPRE executar todos os passos abaixo:

### SEO
1. Criar `export const metadata` na página do jogo (`src/app/jogos/<slug>/page.js`) com: title, description, keywords, alternates (canonical), openGraph (title, description, url)
2. Adicionar JSON-LD `VideoGame` schema na página do jogo com: name, description, url, genre, gamePlatform, operatingSystem, applicationCategory, inLanguage, offers, publisher
3. Adicionar o jogo ao array `jogos` em `src/app/page.js` (menu principal)
4. Adicionar o jogo ao schema `ItemList` (JSON-LD) em `src/app/page.js` — atualizar `numberOfItems`
5. Atualizar o schema `FAQPage` (JSON-LD) em `src/app/page.js` com a contagem correta de jogos
6. Atualizar o array `faqs` em `src/app/page.js` mencionando o novo jogo
7. Adicionar o jogo ao `public/sitemap.xml`
8. Atualizar `description` e `keywords` globais em `src/app/layout.js` para incluir o novo jogo

### GEO
1. Adicionar `other: { "geo.region": "BR", "geo.placename": "Brasil" }` no metadata da página do jogo
2. Manter `inLanguage: "pt-BR"` no JSON-LD VideoGame schema
3. Manter `lang="pt-BR"` no HTML e `locale: "pt_BR"` no OpenGraph (já configurado globalmente)

### Thumbnails e Ícones
1. Gerar thumbnail/OG image para o jogo (para compartilhamento em redes sociais)
2. Gerar ícones do jogo para indexação e PWA
3. Referenciar as imagens no metadata `openGraph.images` da página do jogo
