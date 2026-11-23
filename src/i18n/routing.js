import { defineRouting } from "next-intl/routing";

// Um domínio por idioma (ver src/lib/seo.js):
//   acerteamosca.com.br -> português, sem prefixo
//   nailedthefly.com    -> inglês, sem prefixo (serve o conteúdo de /en)
//
// Em qualquer outro host (localhost, a prévia na Tailscale) o next-intl cai no
// roteamento por prefixo: "/" em português e "/en" em inglês.
//
// localeDetection desligado: o Google desaconselha redirecionar pelo
// Accept-Language (o Googlebot não manda o cabeçalho e veria sempre a mesma
// versão), e o idioma aqui já é decidido pelo domínio. Sem detecção, o cookie
// NEXT_LOCALE não serve para nada e também sai.
//
// alternateLinks desligado: o hreflang vai no HTML, gerado por
// src/lib/seo.js. O cabeçalho Link do next-intl seria uma segunda fonte, com
// as URLs do host que recebeu o pedido.
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
  domains: [
    { domain: "acerteamosca.com.br", defaultLocale: "pt", locales: ["pt"] },
    { domain: "nailedthefly.com", defaultLocale: "en", locales: ["en"] },
  ],
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false,
});
