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

const handleI18n = createMiddleware(routing);

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

  if (isProductionHost(host) && rawRequestHost(request.headers) !== host) {
    const headers = new Headers(request.headers);
    headers.set("host", host);
    if (headers.has("x-forwarded-host")) headers.set("x-forwarded-host", host);
    return handleI18n(new NextRequest(request, { headers }));
  }
  return handleI18n(request);
}

// 1º: páginas (sem /api, /_next e arquivos com ponto), como antes.
// 2º: tudo no www dos domínios, para o 301 valer também em ads.txt,
//     robots.txt e outros arquivos com ponto. No apex os estáticos continuam
//     fora do middleware.
export const config = {
  matcher: [
    "/((?!api|_next|.*\\..*).*)",
    {
      source: "/:path*",
      has: [{ type: "host", value: "www\\.(?:acerteamosca\\.com\\.br|nailedthefly\\.com)" }],
    },
    {
      source: "/:path*",
      has: [
        {
          type: "header",
          key: "x-forwarded-host",
          value: "www\\.(?:acerteamosca\\.com\\.br|nailedthefly\\.com)(?::\\d+)?",
        },
      ],
    },
  ],
};
