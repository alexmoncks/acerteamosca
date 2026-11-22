import { INDEXABLE_PATHS, languageAlternates, localeUrl } from "@/lib/seo";

// Um sitemap só, servido igual nos dois domínios, com as páginas indexáveis
// nas duas línguas (uma <url> por versão, cada uma com o grupo hreflang
// completo, como pede a documentação do Google).
//
// As URLs do nailedthefly.com podem morar aqui porque o robots.txt dos dois
// domínios aponta para este arquivo — é o método do Google para sitemap de
// vários sites ("cross-site submission" via robots.txt).
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
  const lastModified = new Date();
  return ["pt", "en"].flatMap((locale) =>
    INDEXABLE_PATHS.map((path) => ({
      url: localeUrl(locale, path),
      lastModified,
      changeFrequency: changeFrequencyFor(path),
      priority: priorityFor(path),
      alternates: { languages: languageAlternates(path) },
    }))
  );
}
