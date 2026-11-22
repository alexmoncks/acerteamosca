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
 * Nos domínios de produção, URL com prefixo de idioma é sempre duplicata:
 *   /en/...  -> https://nailedthefly.com/...      (venha de qual domínio vier)
 *   /pt/...  -> https://acerteamosca.com.br/...
 * O next-intl faria isso com 307 (temporário) e, no caso cruzado, em dois
 * saltos; aqui é um 301 só, que é o que consolida a URL no Google.
 * Em outro host (localhost, prévia) devolve null e /en continua servindo.
 */
export function prefixRedirectTarget(host, pathname, search = "") {
  if (!PROD_HOSTS.has(host)) return null;
  const m = pathname.match(/^\/(en|pt)(\/.*)?$/);
  if (!m) return null;
  const rest = m[2] && m[2] !== "/" ? m[2] : "";
  const origin = m[1] === "en" ? EN_ORIGIN : PT_ORIGIN;
  return `${origin}${rest || "/"}${search}`;
}
