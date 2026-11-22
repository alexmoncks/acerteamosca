// URLs públicas, canonical e hreflang — fonte única.
//
// O site tem dois domínios, um por idioma:
//   - português: https://acerteamosca.com.br/...   (locale "pt")
//   - inglês:    https://nailedthefly.com/...       (locale "en", SEM o /en)
//
// O nailedthefly.com serve o conteúdo de /en pela configuração `domains` do
// next-intl (src/i18n/routing.js) — não depende de regra na Cloudflare.
//
// Regras que o Google cobra e que este arquivo garante:
//   - cada página declara canonical para ELA MESMA, no domínio do idioma dela.
//     A página em inglês nunca aponta canonical para a portuguesa;
//   - o par hreflang pt-BR <-> en é recíproco (as duas versões declaram as
//     duas URLs) e há um x-default (o português);
//   - nenhuma URL pública tem o prefixo /en: no domínio inglês ele é
//     redirecionado para a URL sem prefixo.
//
// Sem import nenhum de propósito: os testes carregam este arquivo direto.

export const SITE_URL = {
  pt: "https://acerteamosca.com.br",
  en: "https://nailedthefly.com",
};

export const SITE_HOST = {
  pt: "acerteamosca.com.br",
  en: "nailedthefly.com",
};

/** Páginas indexáveis, iguais nos dois idiomas (o caminho não é traduzido). */
export const INSTITUTIONAL_PATHS = [
  "/sobre",
  "/contato",
  "/politica-de-privacidade",
  "/termos-de-uso",
];

/**
 * Jogos publicados. O Kung Fu Castle fica de fora enquanto estiver em teste
 * (a página dele é noindex); para publicar, acrescente "kungfucastle" aqui.
 */
export const GAME_SLUGS = [
  "acerteamosca", "pong", "ships", "wordle", "memory",
  "2048", "bubbleshooter", "deepattack", "jacare",
  "tiroaoalvo", "batalha-naval", "brickbreaker", "3invader",
];

export const INDEXABLE_PATHS = [
  "/",
  ...GAME_SLUGS.map((slug) => `/jogos/${slug}`),
  ...INSTITUTIONAL_PATHS,
];

function normalizePath(path = "/") {
  if (!path || path === "/") return "/";
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

/** URL pública absoluta de `path` no domínio do idioma `locale`. */
export function localeUrl(locale, path = "/") {
  const base = SITE_URL[locale] ?? SITE_URL.pt;
  const p = normalizePath(path);
  return p === "/" ? base : `${base}${p}`;
}

/** As URLs hreflang de uma página (as mesmas nas duas versões). */
export function languageAlternates(path = "/") {
  return {
    "pt-BR": localeUrl("pt", path),
    en: localeUrl("en", path),
    "x-default": localeUrl("pt", path),
  };
}

/** `alternates` do Metadata do Next: canonical autorreferente + hreflang. */
export function pageAlternates(locale, path = "/") {
  return {
    canonical: localeUrl(locale, path),
    languages: languageAlternates(path),
  };
}

/** Nome da marca em cada idioma. */
export function siteName(locale) {
  return locale === "en" ? "Nailed The Fly" : "Acerte a Mosca";
}
