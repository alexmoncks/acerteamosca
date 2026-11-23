// Decisões de roteamento por host que o middleware toma antes do next-intl.
// Sem import nenhum: roda no runtime edge e os testes carregam o arquivo direto.

// Domínio público de cada idioma (os mesmos de src/lib/seo.js).
const PT_ORIGIN = "https://acerteamosca.com.br";
const EN_ORIGIN = "https://nailedthefly.com";
const PROD_HOSTS = new Set(["acerteamosca.com.br", "nailedthefly.com"]);
// Hosts públicos aceitos: os dois domínios e o www de cada um.
const PUBLIC_HOSTS = new Set([...PROD_HOSTS, ...[...PROD_HOSTS].map((h) => `www.${h}`)]);

/** Primeiro valor do cabeçalho, minúsculo, sem porta e sem ponto final. */
function normalizeHost(raw) {
  return (raw ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

/**
 * O host que decide idioma e redirecionamentos, sem porta.
 *
 * O X-Forwarded-Host pode vir do próprio cliente, então não manda sozinho:
 *   - Host já é um domínio público (acerteamosca.com.br, nailedthefly.com ou
 *     o www deles) -> vale o Host, e o X-Forwarded-Host é ignorado. Um
 *     "X-Forwarded-Host: nailedthefly.com" mandado para o acerteamosca.com.br
 *     não troca o idioma (nem envenena um cache de HTML, se houver).
 *   - Host não é público (ex.: *.up.railway.app atrás da Cloudflare, prévia)
 *     -> usa o X-Forwarded-Host só se ele for um dos domínios públicos.
 *   - Fora isso, o próprio Host.
 */
export function requestHost(headers) {
  const host = normalizeHost(headers.get("host"));
  if (PUBLIC_HOSTS.has(host)) return host;
  const forwarded = normalizeHost(headers.get("x-forwarded-host"));
  if (PUBLIC_HOSTS.has(forwarded)) return forwarded;
  return host;
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
 * www.<domínio de produção> -> 301 para o domínio raiz, com caminho e query,
 * num salto só: www + /en/... já vai direto para o nailedthefly.com (e
 * www + /pt/... para o acerteamosca.com.br), sem passar pelo apex.
 * Vale também para arquivo com ponto (ads.txt, robots.txt), que entra no
 * middleware por um matcher só do www (src/middleware.js).
 * A regra principal fica na Cloudflare (o www nem tem DNS hoje); esta é a
 * rede de segurança caso o pedido chegue ao app.
 */
export function wwwRedirectTarget(host, pathname, search = "") {
  if (!host.startsWith("www.")) return null;
  const apex = host.slice(4);
  if (!PROD_HOSTS.has(apex)) return null;
  return prefixRedirectTarget(apex, pathname, search) ?? `https://${apex}${pathname || "/"}${search}`;
}

/**
 * Caminho que o middleware trata como página (o mesmo filtro do primeiro
 * matcher): fora /api, /_next e qualquer coisa com ponto. O resto só chega
 * ao middleware pelo matcher do www e, se não for redirecionado, segue sem
 * passar pelo next-intl.
 */
export function isPagePath(pathname) {
  return /^\/(?!api|_next|.*\..*)/.test(pathname);
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
