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

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
// Anúncios Automáticos: só o script do AdSense, com o publisher do ads.txt.
// ID fora do formato ca-pub-XXXXXXXXXXXXXXXX não liga nada.
const ADSENSE_ID = isValidAdClient(process.env.NEXT_PUBLIC_ADSENSE_ID)
  ? process.env.NEXT_PUBLIC_ADSENSE_ID.trim()
  : null;

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

  return (
    <html lang={locale === "pt" ? "pt-BR" : "en"}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="google-adsense-account" content={ADSENSE_PUBLISHER} />
        <meta name="theme-color" content="#050510" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Acerte a Mosca" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* A tag como o AdSense entrega, no <head>: async + crossorigin, sem
            atributos extras. Formatos de sobreposição (vinheta, âncora,
            intersticial) se controlam no painel de Anúncios Automáticos, não
            com atributo no script — o antigo data-overlays não é documentado. */}
        {ADSENSE_ID && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
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
              })
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
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
              })
            }}
          />
          {GA_ID && (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
              </Script>
            </>
          )}
          <Script id="load-fonts" strategy="afterInteractive">
            {`var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Fira+Code:wght@400;700&display=swap';document.head.appendChild(l);`}
          </Script>
          <Script id="register-sw" strategy="afterInteractive">
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
