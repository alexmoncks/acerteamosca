import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import {
  isLocalizedOgImage,
  isPagePath,
  isProductionHost,
  prefixRedirectTarget,
  rawRequestHost,
  requestHost,
  wwwRedirectTarget,
} from "./lib/host-routing";
import { buildCsp, generateNonce, wsDevOrigins } from "./lib/csp";

const handleI18n = createMiddleware(routing);

// Os NEXT_PUBLIC_* entram no bundle do middleware no build; precisam estar
// escritos por extenso aqui para o Next substituí-los.
const WS_ORIGINS = wsDevOrigins([
  process.env.NEXT_PUBLIC_WS_URL,
  process.env.NEXT_PUBLIC_WS_SHIPS_URL,
  process.env.NEXT_PUBLIC_WS_MEMORY_URL,
  process.env.NEXT_PUBLIC_WS_2048_URL,
  process.env.NEXT_PUBLIC_WS_BATALHA_URL,
]);

// O idioma é decidido pelo domínio (src/i18n/routing.js, `domains`):
// nailedthefly.com serve o conteúdo de /en na raiz, sem depender da
// Cloudflare. Antes do next-intl:
//   - www.<domínio> -> 301 para o domínio raiz;
//   - /en/... e /pt/... nos domínios de produção -> 301 para a URL limpa;
//   - o host é normalizado (sem porta, minúsculo): o next-intl compara o
//     cabeçalho cru com `domains`, e "nailedthefly.com:443" cairia no
//     português (ver src/lib/host-routing.js);
//   - o X-Forwarded-Host só vale quando o Host não é de produção, e só se
//     for um domínio público (requestHost). Quando o host decidido é de
//     produção, Host e X-Forwarded-Host são reescritos com ele antes do
//     next-intl, que lê o X-Forwarded-Host primeiro.
export default function middleware(request) {
  const host = requestHost(request.headers);
  const { pathname, search } = request.nextUrl;

  // www primeiro, para qualquer caminho (inclusive ads.txt e og:image).
  const www = wwwRedirectTarget(host, pathname, search);
  if (www) return NextResponse.redirect(www, 301);

  // Arquivo estático, /api e /_next só chegam aqui pelo matcher do www.
  if (!isPagePath(pathname) || isLocalizedOgImage(pathname)) return NextResponse.next();

  const target = prefixRedirectTarget(host, pathname, search);
  if (target) return NextResponse.redirect(target, 301);

  // CSP com nonce novo a cada pedido (src/lib/csp.js). O nonce vai para o
  // render por dois cabeçalhos do PEDIDO, que o next-intl repassa:
  //   - x-nonce: o layout e o <JsonLd> leem com headers() e põem no
  //     consent default, no adsbygoogle.js, no gtag e nos JSON-LD;
  //   - content-security-policy: o Next tira o nonce daqui e o põe nos
  //     próprios <script> (chunks e dados do RSC).
  // Qualquer x-nonce ou CSP que o cliente mande é sobrescrito.
  // Ler headers() torna as páginas dinâmicas (render por pedido, sem SSG):
  // um HTML pré-gerado teria um nonce fixo, que a CSP não aceitaria.
  const nonce = generateNonce();
  const csp = buildCsp({ nonce, wsOrigins: WS_ORIGINS });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);
  if (isProductionHost(host) && rawRequestHost(request.headers) !== host) {
    headers.set("host", host);
    if (headers.has("x-forwarded-host")) headers.set("x-forwarded-host", host);
  }
  const response = handleI18n(new NextRequest(request, { headers }));
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// 1º: páginas (sem /api, /_next e arquivos com ponto), como antes.
// 2º e 3º: tudo no www dos domínios (pelo Host ou pelo X-Forwarded-Host),
//     para o 301 valer também em ads.txt, robots.txt e outros arquivos com
//     ponto. Aceitam ponto final no host e, no XFH, porta e lista ("a, b").
//     O Next já compara o Host em minúsculas e sem porta. No apex os
//     estáticos continuam fora do middleware.
export const config = {
  matcher: [
    "/((?!api|_next|.*\\..*).*)",
    {
      source: "/:path*",
      has: [{ type: "host", value: "www\\.(?:acerteamosca\\.com\\.br|nailedthefly\\.com)\\.?" }],
    },
    {
      source: "/:path*",
      has: [
        {
          type: "header",
          key: "x-forwarded-host",
          value: "www\\.(?:acerteamosca\\.com\\.br|nailedthefly\\.com)\\.?(?::\\d+)?(?:\\s*,.*)?",
        },
      ],
    },
  ],
};
