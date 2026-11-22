const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

// Domínios do Google AdSense (tag, criativos em iframe/SafeFrame, Funding
// Choices para a mensagem de consentimento, verificação de tráfego) conforme
// a documentação do AdSense. Sem eles a CSP bloqueia parte dos anúncios
// depois da aprovação — e o bloqueio só aparece no console do navegador.
const ADSENSE_SCRIPT_SRC = [
  "https://pagead2.googlesyndication.com",
  "https://tpc.googlesyndication.com",
  "https://*.googlesyndication.com",
  "https://googleads.g.doubleclick.net",
  "https://partner.googleadservices.com",
  "https://www.googletagservices.com",
  "https://adservice.google.com",
  "https://adservice.google.com.br",
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
  "https://fundingchoicesmessages.google.com",
  "https://*.adtrafficquality.google",
];

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
  "connect-src 'self' https: wss:",
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
