import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import {
  isLocalizedOgImage,
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
//     português (ver src/lib/host-routing.js).
export default function middleware(request) {
  const host = requestHost(request.headers);
  const { pathname, search } = request.nextUrl;

  if (isLocalizedOgImage(pathname)) return NextResponse.next();

  const target =
    wwwRedirectTarget(host, pathname, search) ?? prefixRedirectTarget(host, pathname, search);
  if (target) return NextResponse.redirect(target, 301);

  if (isProductionHost(host) && rawRequestHost(request.headers) !== host) {
    const headers = new Headers(request.headers);
    headers.set("host", host);
    if (headers.has("x-forwarded-host")) headers.set("x-forwarded-host", host);
    return handleI18n(new NextRequest(request, { headers }));
  }
  return handleI18n(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
