const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

// CSP fixa (sem nonce, sem script inline) para o que não passa pelo
// middleware. src/lib/csp.js é ESM; a cópia aqui é conferida pelo teste.
const STATIC_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'";

// A Content-Security-Policy das PÁGINAS não fica aqui desde o lote 2: ela
// leva um nonce novo a cada pedido e é montada no middleware
// (src/middleware.js, com src/lib/csp.js). Um header fixo para todas as
// rotas seria uma segunda CSP, e o navegador aplica as duas: a sem nonce
// bloquearia os scripts. Aqui só vai a CSP fixa dos caminhos com ponto, que
// o matcher do middleware exclui (arquivos estáticos e a 404 de "/x.y").

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
      {
        // Fontes auto-hospedadas (src/app/fonts.css): o nome do arquivo leva
        // a versão da fonte (ex.: press-start-2p-v16-latin.woff2), então o
        // cache pode ser longo e imutável. Fonte nova = arquivo com nome novo.
        // Só os .woff2: os textos da licença (OFL-*.txt) ficam com o padrão.
        source: "/fonts/:file(.*\\.woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path(.*\\..*)",
        headers: [{ key: "Content-Security-Policy", value: STATIC_CSP }],
      },
    ];
  },
};
module.exports = withNextIntl(nextConfig);
