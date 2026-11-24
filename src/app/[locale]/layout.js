import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import InstallPrompt from "@/components/InstallPrompt";
import CookieConsent from "@/components/CookieConsent";
import Footer from "@/components/Footer";
import { SITE_URL, localeUrl, siteName } from "@/lib/seo";
import { ADSENSE_PUBLISHER, isValidAdClient } from "@/lib/ads";
import JsonLd from "@/components/JsonLd";
import { getNonce } from "@/lib/nonce";
import { headers } from "next/headers";
import { consentDefaultScript, isValidGaId, regiaoConsentimento } from "@/lib/consent";

// GA4 e AdSense só entram na página depois do Aceitar do aviso de cookies:
// quem os injeta é o script consent-default (src/lib/consent.js).
const GA_ID = isValidGaId(process.env.NEXT_PUBLIC_GA_ID) ? process.env.NEXT_PUBLIC_GA_ID.trim() : null;
// O script do AdSense, com o publisher do ads.txt (injetado depois do
// Aceitar). Os anúncios saem dos blocos manuais (AdBanner); os Anúncios
// Automáticos são desligados no painel, não aqui (docs/adsense.md).
// ID fora do formato ca-pub-XXXXXXXXXXXXXXXX não liga nada.
const ADSENSE_ID = isValidAdClient(process.env.NEXT_PUBLIC_ADSENSE_ID)
  ? process.env.NEXT_PUBLIC_ADSENSE_ID.trim()
  : null;

// Render por pedido (lote 2): cada HTML leva o nonce da CSP do seu pedido
// (src/middleware.js). Um HTML pré-gerado no build teria um nonce fixo, e a
// CSP bloquearia todos os scripts dele. O getNonce() (headers()) já obriga
// isso; o force-dynamic deixa explícito e vale para todas as páginas.
export const dynamic = "force-dynamic";

// Viewport única, pelo próprio Next. Com a <meta name="viewport"> escrita à
// mão no <head>, o Next ainda emitia a dele (width=device-width,
// initial-scale=1) e a página saía com DUAS metas viewport. Exportando aqui,
// o Next emite uma só, com os valores do site:
// - maximum-scale=5: o zoom com pinça continua liberado (acessibilidade);
// - viewport-fit=cover: o conteúdo vai até as bordas do iPhone com entalhe,
//   e o body compensa com env(safe-area-inset-*) (globals.css).
// A theme-color continua na <meta> do <head>, como antes.
// A meta sozinha não faz o jogo caber na altura: quem faz é o encaixe
// (src/lib/game-fit.js e src/components/GameFit.jsx).
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;

  // A MESMA guarda do LocaleLayout, e ela precisa estar aqui também: o Next roda
  // generateMetadata ANTES do componente, então a guarda de lá chega tarde.
  //
  // O matcher do middleware exclui qualquer caminho com ponto (`.*\..*`), para
  // não reescrever arquivo estático. Um pedido de raiz que tenha ponto e NÃO
  // seja arquivo — /favicon.ico é o caso de todo navegador, em toda visita —
  // passa direto e casa com [locale]. Sem esta linha o import vira
  // `../../messages/favicon.ico.json`, que não existe, e o 404 sai como 500.
  if (!routing.locales.includes(locale)) {
    notFound();
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;
  const m = messages.metadata;

  return {
    title: {
      default: m.title,
      template: m.titleTemplate,
    },
    description: m.description,
    authors: [{ name: "Acerte a Mosca" }],
    creator: "Acerte a Mosca",
    publisher: "Acerte a Mosca",
    // Cada idioma no próprio domínio (src/lib/seo.js). O canonical NÃO fica
    // aqui: um canonical no layout é herdado por toda página que não declara
    // o seu, e foi assim que as institucionais acabaram apontando para a home.
    // Cada page.js declara `alternates: pageAlternates(locale, "/caminho")`.
    metadataBase: new URL(SITE_URL[locale] ?? SITE_URL.pt),
    openGraph: {
      type: "website",
      locale: locale === "pt" ? "pt_BR" : "en_US",
      url: localeUrl(locale, "/"),
      siteName: siteName(locale),
      title: m.title,
      description: m.ogDescription,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Acerte a Mosca",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.ogDescription,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
    },
    icons: {
      icon: "/icons/icon-192.svg",
    },
  };
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!routing.locales.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  // Nonce da CSP deste pedido (src/middleware.js). Vai em todo <script>.
  const nonce = getNonce();
  // País do visitante pela Cloudflare (CF-IPCountry): decide se o Aceitar do
  // aviso concede (fora do EEE/UK/CH) ou se a mensagem do Google decide.
  // Sem o cabeçalho, null: o site segue a resposta da CMP (src/lib/consent.js).
  const regiao = regiaoConsentimento(headers().get("cf-ipcountry"));

  return (
    // suppressHydrationWarning: o script consent-default marca o <html> com
    // data-aam-ads="on" (quem já aceitou) antes da hidratação; o atributo não
    // vem do React e não pode virar aviso de divergência. Só vale para os
    // atributos do próprio <html>, não para os filhos.
    <html lang={locale === "pt" ? "pt-BR" : "en"} suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content={ADSENSE_PUBLISHER} />
        <meta name="theme-color" content="#050510" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Acerte a Mosca" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        {/* Fontes do próprio domínio (src/app/fonts.css): o subset latin das
            duas famílias chega antes da primeira pintura, e o texto não
            muda de largura depois (CLS). Nada de fonts.googleapis/gstatic. */}
        <link rel="preload" href="/fonts/press-start-2p-v16-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/fira-code-v27-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Modo de consentimento do Google e as tags do Google
            (src/lib/consent.js): default "denied" no mundo todo, sem região.
            O adsbygoogle.js (async + crossorigin, sem ?client=: defesa
            contra Anúncios Automáticos, docs/adsense.md) e o
            gtag.js só são injetados por este script, com o nonce dele,
            depois do Aceitar do aviso de cookies; quem já aceitou numa
            visita anterior recebe as tags já aqui. A tag do AdSense também
            traz a mensagem de consentimento do Google (EEE/UK/CH). A conta
            continua verificada pela meta google-adsense-account acima. */}
        <script
          id="consent-default"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: consentDefaultScript({ adsClient: ADSENSE_ID, gaId: GA_ID, regiao }) }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://acerteamosca.com.br/#organization",
              "name": "MMSoft Digital",
              "url": "https://acerteamosca.com.br",
              "logo": "https://acerteamosca.com.br/icons/icon-192.svg",
              "sameAs": [
                "https://nailedthefly.com",
                "https://www.wikidata.org/wiki/Q139577693",
              ],
              "founder": {
                "@type": "Person",
                "name": "Alex Marra",
              },
            }}
          />
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${localeUrl(locale, "/")}/#website`,
              "name": siteName(locale),
              "url": localeUrl(locale, "/"),
              "description": messages.metadata.description,
              "inLanguage": locale === "pt" ? "pt-BR" : "en",
              "publisher": {
                "@type": "Organization",
                "@id": "https://acerteamosca.com.br/#organization",
              },
            }}
          />
          <Script id="register-sw" strategy="afterInteractive" nonce={nonce}>
            {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`}
          </Script>
          <Navbar />
          <InstallPrompt />
          <main style={{ paddingTop: 48 }}>{children}</main>
          <Footer />
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
