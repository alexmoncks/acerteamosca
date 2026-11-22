import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { prefixRedirectTarget, requestHost } from "./lib/host-routing";

const handleI18n = createMiddleware(routing);

// O idioma é decidido pelo domínio (src/i18n/routing.js, `domains`):
// nailedthefly.com serve o conteúdo de /en na raiz, sem depender da
// Cloudflare. Antes do next-intl, só o 301 das URLs com prefixo nos domínios
// de produção (ver src/lib/host-routing.js).
export default function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const target = prefixRedirectTarget(requestHost(request.headers), pathname, search);
  if (target) return NextResponse.redirect(target, 301);
  return handleI18n(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
