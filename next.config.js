const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

// Domínios do Google AdSense (tag, criativos em iframe/SafeFrame, Funding
// Choices / "Privacidade e mensagens" para a mensagem de consentimento,
// verificação de tráfego). Sem eles a CSP bloqueia parte dos anúncios depois
// da aprovação — e o bloqueio só aparece no console do navegador.
//
// PROVISÓRIO: a documentação do AdSense (support.google.com/adsense/answer/
// 16283098) só suporta CSP estrita — nonce em todo <script> + 'strict-dynamic'
// —, porque os domínios usados pelo código de anúncio mudam com o tempo. Esta
// lista com curingas (*.google.com, *.gstatic.com etc.) cobre o que se sabe
// hoje; a migração para nonce + 'strict-dynamic' (e a saída de
// 'unsafe-inline'/'unsafe-eval') está registrada como pendência.
const ADSENSE_SCRIPT_SRC = [
  "https://pagead2.googlesyndication.com",
  "https://tpc.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
  "https://*.doubleclick.net",
  "https://partner.googleadservices.com",
  "https://*.googleadservices.com",
  "https://www.googletagservices.com",
  "https://adservice.google.com",
  "https://adservice.google.com.br",
  "https://*.google.com",
  "https://*.google.com.br",
  "https://*.gstatic.com",
  "https://fundingchoicesmessages.google.com",
  "https://*.adtrafficquality.google",
];
const ADSENSE_FRAME_SRC = [
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

// Servidor WebSocket dos jogos multiplayer em ws:// (sem TLS). Em produção os
// NEXT_PUBLIC_WS_* são wss:// e já cabem no "wss:" do connect-src, então nada
// é acrescentado e a CSP de produção fica igual. No ambiente de dev do
// homeserver (scripts/dev-homeserver.sh) o front fala com ws://<host>:<porta>
// (host e porta locais, fora do repo), e sem esta origem a CSP bloqueia a conexão no navegador.
const WS_DEV_ORIGINS = [
  process.env.NEXT_PUBLIC_WS_URL,
  process.env.NEXT_PUBLIC_WS_SHIPS_URL,
  process.env.NEXT_PUBLIC_WS_MEMORY_URL,
  process.env.NEXT_PUBLIC_WS_2048_URL,
  process.env.NEXT_PUBLIC_WS_BATALHA_URL,
]
  .map((u) => {
    try {
      const url = new URL(u);
      return url.protocol === "ws:" ? `ws://${url.host}` : null;
    } catch {
      return null;
    }
  })
  .filter((o, i, all) => o && all.indexOf(o) === i);

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    ...ADSENSE_SCRIPT_SRC,
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://static.cloudflareinsights.com",
  ].join(" "),
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: http:",
  ["connect-src 'self' https: wss:", ...WS_DEV_ORIGINS].join(" "),
  ["frame-src", ...ADSENSE_FRAME_SRC].join(" "),
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

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
          {
            key: "Content-Security-Policy",
            value: CONTENT_SECURITY_POLICY,
          },
        ],
      },
    ];
  },
};
module.exports = withNextIntl(nextConfig);
