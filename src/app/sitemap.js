import { INDEXABLE_PATHS, languageAlternates, localeUrl } from "@/lib/seo";

// Um sitemap só, servido igual nos dois domínios, com as páginas indexáveis
// nas duas línguas (uma <url> por versão, cada uma com o grupo hreflang
// completo, como pede a documentação do Google).
//
// As URLs do nailedthefly.com podem morar aqui porque o robots.txt dos dois
// domínios aponta para este arquivo — é o método do Google para sitemap de
// vários sites ("cross-site submission" via robots.txt).
// lastModified fixo, por rota: a data em que o CONTEÚDO da página mudou de
// verdade. new Date() a cada build dizia ao Google que as 36 URLs mudaram em
// todo deploy, e ele passa a ignorar o campo. Ao mudar o texto de uma página,
// atualize a data dela aqui (ou a padrão, se mudou o site todo).
// 2026-11-22: lote AdSense (canonical, GameInfo aberto, política, sobre).
const LAST_MODIFIED_DEFAULT = "2026-11-22";
const LAST_MODIFIED_BY_PATH = {
  // "/jogos/wordle": "2026-12-01",
};

function lastModifiedFor(path) {
  return new Date(`${LAST_MODIFIED_BY_PATH[path] ?? LAST_MODIFIED_DEFAULT}T00:00:00Z`);
}

function priorityFor(path) {
  if (path === "/") return 1.0;
  if (path.startsWith("/jogos/")) return 0.8;
  return 0.4;
}

function changeFrequencyFor(path) {
  if (path === "/") return "weekly";
  if (path.startsWith("/jogos/")) return "monthly";
  return "yearly";
}

export default function sitemap() {
  return ["pt", "en"].flatMap((locale) =>
    INDEXABLE_PATHS.map((path) => ({
      url: localeUrl(locale, path),
      lastModified: lastModifiedFor(path),
      changeFrequency: changeFrequencyFor(path),
      priority: priorityFor(path),
      alternates: { languages: languageAlternates(path) },
    }))
  );
}
