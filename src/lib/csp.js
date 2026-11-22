// Content-Security-Policy estrita, com nonce por pedido (lote 2).
// Sem import nenhum: o middleware (Edge) e os testes carregam este arquivo.
//
// Por que estrita: a documentação do AdSense (support.google.com/adsense/
// answer/16283098) só suporta CSP com nonce + 'strict-dynamic', porque os
// domínios do código de anúncio mudam com o tempo. Com 'strict-dynamic', o
// navegador confia no <script> que tem o nonce do pedido e em tudo o que ele
// carregar (adsbygoogle.js -> show_ads_impl, Funding Choices, gtag.js ->
// analytics). Listas de domínio em script-src deixam de valer, e por isso
// não há lista: o 'self' e o https: abaixo só servem a navegadores antigos
// (CSP 2), que ignoram 'strict-dynamic'; os modernos ignoram os dois.
//
// Sem 'unsafe-inline' e sem 'unsafe-eval' em script-src. A doc do Google
// mostra os dois no exemplo: o 'unsafe-inline' é ignorado por quem entende
// nonce (só serve a navegador de 2015), e o 'unsafe-eval' não fez falta na
// validação: 0 violações com o AdSense e os jogos, PT e EN (relatório do
// lote 2). O único que usava eval era o PixiJS do Kung Fu Castle, resolvido
// sem abrir a CSP com o módulo pixi.js/unsafe-eval. Se um dia o Google
// passar a exigir eval, a violação aparece no console e a decisão é
// acrescentar 'unsafe-eval' aqui, sabendo o que se perde.
//
// style-src continua com 'unsafe-inline': o site inteiro usa style={...} do
// React e a mensagem de consentimento do Google injeta estilos.

/** Criativos do AdSense (iframe/SafeFrame), mensagem do Funding Choices e verificação de tráfego. */
export const ADSENSE_FRAME_SRC = [
  "https://googleads.g.doubleclick.net",
  "https://*.doubleclick.net",
  "https://tpc.googlesyndication.com",
  "https://*.safeframe.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://www.google.com",
  "https://*.google.com",
  "https://*.google.com.br",
  "https://*.gstatic.com",
  "https://fundingchoicesmessages.google.com",
  "https://*.adtrafficquality.google",
];

// Base64 (ou base64url) sem nada que feche atributo HTML. O Next recusa
// nonce com & < > e quebra de linha; aqui a regra é mais estreita.
const NONCE_RE = /^[A-Za-z0-9+/_-]{16,}={0,2}$/;

export function isValidNonce(nonce) {
  return typeof nonce === "string" && NONCE_RE.test(nonce);
}

/**
 * Cabeçalhos do PEDIDO que o render lê como nonce/CSP: o x-nonce (getNonce,
 * src/lib/nonce.js) e as duas CSPs, de onde o Next tira o nonce dos chunks
 * dele (a report-only quando não há a outra). Só o middleware os escreve;
 * vindos do cliente, são descartados (o matcher do middleware pega todo
 * pedido que traga um deles, em qualquer caminho).
 */
export const CSP_REQUEST_HEADERS = ["x-nonce", "content-security-policy", "content-security-policy-report-only"];

/** Cópia dos cabeçalhos do pedido sem nenhum CSP_REQUEST_HEADERS do cliente. */
export function stripClientCspHeaders(requestHeaders) {
  const headers = new Headers(requestHeaders);
  for (const nome of CSP_REQUEST_HEADERS) headers.delete(nome);
  return headers;
}

/** 128 bits aleatórios em base64. Um por pedido: nunca reaproveitar. */
export function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Origens ws:// (sem TLS) dos NEXT_PUBLIC_WS_*. Em produção eles são wss:// e
 * já cabem no "wss:" do connect-src, então nada é acrescentado e a CSP de
 * produção fica igual. No ambiente de dev do homeserver
 * (scripts/dev-homeserver.sh) o front fala com ws://<host>:<porta>, e sem
 * esta origem a CSP bloqueia a conexão.
 */
export function wsDevOrigins(urls) {
  return (urls || [])
    .map((u) => {
      try {
        const url = new URL(u);
        return url.protocol === "ws:" ? `ws://${url.host}` : null;
      } catch {
        return null;
      }
    })
    .filter((o, i, all) => o && all.indexOf(o) === i);
}

/** A CSP do pedido. `nonce` é obrigatório e vem de generateNonce(). */
export function buildCsp({ nonce, wsOrigins = [] }) {
  if (!isValidNonce(nonce)) throw new Error("nonce inválido para a CSP");
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self' https:`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // Sem http: (conteúdo misto). Criativos do AdSense rodam em iframe
    // (frame-src); pixels do Google e do GA são https.
    "img-src 'self' data: blob: https:",
    ["connect-src 'self' https: wss:", ...wsOrigins].join(" "),
    ["frame-src", ...ADSENSE_FRAME_SRC].join(" "),
    // service worker (/sw.js) e workers em blob: de jogos; sem esta linha o
    // worker-src cairia no script-src com 'strict-dynamic'.
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
}

/**
 * CSP fixa das respostas que NÃO passam pelo middleware (caminhos com ponto:
 * ads.txt, ícones, sw.js e a página 404 de um "/x.y" qualquer). Não há nonce
 * ali, então nenhum script inline roda: script-src 'self' basta para o
 * service worker e os arquivos do site, e a 404 aparece sem hidratar.
 * Vai no next.config.js só para esses caminhos (nunca junto da CSP com nonce).
 */
export const STATIC_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

/** Lê os directives de uma CSP: { "script-src": ["'nonce-…'", …], … }. */
export function parseCsp(csp) {
  const out = {};
  for (const part of String(csp).split(";")) {
    const [name, ...values] = part.trim().split(/\s+/);
    if (name) out[name.toLowerCase()] = values;
  }
  return out;
}
