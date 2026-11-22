// Decisões de roteamento por host que o middleware toma antes do next-intl.
// Sem import nenhum: roda no runtime edge e os testes carregam o arquivo direto.

// Domínio público de cada idioma (os mesmos de src/lib/seo.js).
const PT_ORIGIN = "https://acerteamosca.com.br";
const EN_ORIGIN = "https://nailedthefly.com";
const PROD_HOSTS = new Set(["acerteamosca.com.br", "nailedthefly.com"]);

/** O host como o next-intl enxerga (x-forwarded-host primeiro), sem porta. */
export function requestHost(headers) {
  const raw = headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
  return raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Imagem Open Graph gerada pelo Next com o segmento de idioma no caminho
 * (/pt/opengraph-image, /en/jogos/x/opengraph-image?hash). É a URL que vai no
 * og:image; o caminho interno existe tal qual, então deve servir direto, sem
 * o 301 de prefixo nem o 307 do next-intl.
 */
export function isLocalizedOgImage(pathname) {
  return /^\/(pt|en)(\/.*)?\/(opengraph|twitter)-image$/.test(pathname);
}

/** acerteamosca.com.br ou nailedthefly.com (já normalizado). */
export function isProductionHost(host) {
  return PROD_HOSTS.has(host);
}

/** O cabeçalho cru que o next-intl compara com `domains` (sem normalizar). */
export function rawRequestHost(headers) {
  return headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
}

/**
 * www.<domínio de produção> -> 301 para o domínio raiz, com caminho e query.
 * A regra principal fica na Cloudflare (o www nem tem DNS hoje); esta é a
 * rede de segurança caso o pedido chegue ao app.
 */
export function wwwRedirectTarget(host, pathname, search = "") {
  if (!host.startsWith("www.")) return null;
  const apex = host.slice(4);
  if (!PROD_HOSTS.has(apex)) return null;
  return `https://${apex}${pathname || "/"}${search}`;
}

/**
 * Nos domínios de produção, URL com prefixo de idioma é sempre duplicata:
 *   /en/...  -> https://nailedthefly.com/...      (venha de qual domínio vier)
 *   /pt/...  -> https://acerteamosca.com.br/...
 * O next-intl faria isso com 307 (temporário) e, no caso cruzado, em dois
 * saltos; aqui é um 301 só, que é o que consolida a URL no Google.
 * Em outro host (localhost, prévia) devolve null e /en continua servindo.
 */
export function prefixRedirectTarget(host, pathname, search = "") {
  if (!PROD_HOSTS.has(host)) return null;
  // As imagens Open Graph geradas pelo Next saem no og:image com o segmento
  // de idioma (/pt/opengraph-image, /en/jogos/x/opengraph-image). Elas não
  // são página nem entram no índice: servem direto, sem salto.
  if (isLocalizedOgImage(pathname)) return null;
  const m = pathname.match(/^\/(en|pt)(\/.*)?$/);
  if (!m) return null;
  const rest = m[2] && m[2] !== "/" ? m[2] : "";
  const origin = m[1] === "en" ? EN_ORIGIN : PT_ORIGIN;
  return `${origin}${rest || "/"}${search}`;
}
