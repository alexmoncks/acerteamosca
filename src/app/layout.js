import "./globals.css";
import Script from "next/script";
import Navbar from "@/components/Navbar";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

export const metadata = {
  title: {
    default: "Acerte a Mosca - Jogos Online Gratis",
    template: "%s | Acerte a Mosca",
  },
  description: "Jogos online gratis no navegador! Wordle em portugues, 2048, Jogo da Memoria, Bubble Shooter, Deep Attack e mais. Sem download, jogue agora no celular ou computador!",
  keywords: ["jogos online gratis", "jogos no navegador", "jogos sem download", "wordle portugues", "2048 online", "jogo da memoria online", "bubble shooter online", "jogos gratis", "jogos mobile", "jogos browser"],
  authors: [{ name: "Acerte a Mosca" }],
  creator: "Acerte a Mosca",
  publisher: "Acerte a Mosca",
  metadataBase: new URL("https://acerteamosca.com.br"),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://acerteamosca.com.br",
    siteName: "Acerte a Mosca",
    title: "Acerte a Mosca - Jogos Online Gratis",
    description: "Jogos online gratis no navegador! Wordle, 2048, Memory, Bubble Shooter e mais. Sem download!",
  },
  twitter: {
    card: "summary_large_image",
    title: "Acerte a Mosca - Jogos Online Gratis",
    description: "Jogos online gratis no navegador! Sem download, jogue agora!",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  verification: {
    google: "",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩴</text></svg>",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="google-adsense-account" content="ca-pub-4148140889800778" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Fira+Code:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Acerte a Mosca",
              "url": "https://acerteamosca.com.br",
              "description": "Jogos online gratis no navegador! Wordle, 2048, Memory, Bubble Shooter e mais.",
              "publisher": {
                "@type": "Organization",
                "name": "Acerte a Mosca"
              }
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
        {ADSENSE_ID && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
        <Navbar />
        <div style={{ paddingTop: 24 }}>{children}</div>
      </body>
    </html>
  );
}
