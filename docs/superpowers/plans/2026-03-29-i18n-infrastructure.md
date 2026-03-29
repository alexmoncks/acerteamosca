# i18n Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add internationalization infrastructure with `next-intl` — subpath routing (PT default without prefix, EN at `/en`), automatic language detection, translation dictionaries, navbar language selector, and translated homepage.

**Architecture:** Restructure App Router into `[locale]` dynamic segment. Middleware handles locale detection and routing. Translation dictionaries in `src/messages/`. Game pages move into `[locale]/jogos/` but keep PT content for now.

**Tech Stack:** next-intl, Next.js 14 App Router, JSON translation dictionaries

**Spec:** `docs/superpowers/specs/2026-03-29-i18n-infrastructure-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Install | `next-intl` | i18n library |
| Create | `src/i18n/request.js` | next-intl config — loads messages per locale |
| Create | `src/i18n/routing.js` | Locale routing config — shared between middleware and navigation |
| Create | `src/i18n/navigation.js` | Locale-aware Link, redirect, useRouter exports |
| Create | `src/middleware.js` | Locale detection + routing middleware |
| Create | `src/messages/pt.json` | Portuguese dictionary |
| Create | `src/messages/en.json` | English dictionary |
| Rewrite | `src/app/layout.js` | Minimal root layout (no html/body lang) |
| Create | `src/app/[locale]/layout.js` | Full layout with NextIntlClientProvider |
| Move | `src/app/page.js` → `src/app/[locale]/page.js` | Homepage with translations |
| Move | `src/app/opengraph-image.js` → `src/app/[locale]/opengraph-image.js` | OG image |
| Move | `src/app/jogos/` → `src/app/[locale]/jogos/` | All 13 game directories |
| Modify | `src/components/Navbar.jsx` | Add language selector + locale-aware links |
| Modify | `next.config.js` | Wrap with createNextIntlPlugin |
| Modify | `src/app/sitemap.js` | Add multilingual URLs |
| Keep | `src/app/api/` | API routes stay at root (no locale) |
| Keep | `src/app/robots.js` | Stays at root |

---

### Task 1: Install next-intl

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install next-intl**

```bash
npm install next-intl
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install next-intl for i18n support"
```

---

### Task 2: Create i18n Configuration Files

**Files:**
- Create: `src/i18n/routing.js`
- Create: `src/i18n/request.js`
- Create: `src/i18n/navigation.js`

- [ ] **Step 1: Create routing config**

Create `src/i18n/routing.js`:

```js
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "as-needed",
});
```

- [ ] **Step 2: Create request config**

Create `src/i18n/request.js`:

```js
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create navigation helpers**

Create `src/i18n/navigation.js`:

```js
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n/
git commit -m "feat: add next-intl routing, request config, and navigation helpers"
```

---

### Task 3: Create Translation Dictionaries

**Files:**
- Create: `src/messages/pt.json`
- Create: `src/messages/en.json`

- [ ] **Step 1: Create Portuguese dictionary**

Create `src/messages/pt.json`:

```json
{
  "metadata": {
    "title": "Acerte a Mosca - Jogos Online Grátis | Jogue Agora!",
    "titleTemplate": "%s | Acerte a Mosca",
    "description": "Jogos online grátis no navegador! Wordle em português, 2048, Jogo da Memória, Bubble Shooter, Deep Attack e mais. Jogue agora no celular ou PC sem download!",
    "ogDescription": "Jogos online grátis no navegador! Wordle, 2048, Memory, Bubble Shooter e mais. Sem download!"
  },
  "navbar": {
    "brand": "ACERTE A MOSCA",
    "games": "JOGOS"
  },
  "home": {
    "subtitle": "JOGOS ONLINE GRÁTIS",
    "banner3invader": {
      "title": "3INVADER",
      "line1": "Pilote o ARROW-7 e enfrente a invasão alienígena 3I/ATLAS.",
      "line2": "25 fases. 5 mundos. 5 bosses épicos.",
      "line3": "A humanidade depende de você.",
      "cta": "JOGAR AGORA"
    },
    "games": {
      "acerteamosca": { "name": "Acerte a Mosca", "desc": "Mate o mosquito com o chinelo antes que o tempo acabe!" },
      "pong": { "name": "Pong", "desc": "Clássico dos clássicos! Jogue contra o CPU, um amigo local ou online." },
      "ships": { "name": "Ships", "desc": "Navegue por labirintos, ricocheteie tiros e destrua a nave inimiga!" },
      "wordle": { "name": "Wordle BR", "desc": "Adivinhe a palavra de 5 letras em 6 tentativas!" },
      "memory": { "name": "Memory Game", "desc": "Encontre os pares e desafie amigos online!" },
      "2048": { "name": "2048", "desc": "Deslize os blocos e some até chegar no 2048! Jogue online." },
      "bubbleshooter": { "name": "Bubble Shooter", "desc": "Mire, atire e estoure bolhas da mesma cor!" },
      "deepattack": { "name": "Deep Attack", "desc": "Pilote sua nave, destrua aliens e sobreviva no espaço!" },
      "jacare": { "name": "Jogo do Jacaré", "desc": "Atravesse a rua e o rio com o jacaré! Estilo Frogger clássico." },
      "tiroaoalvo": { "name": "Tiro ao Alvo", "desc": "Acerte os pratos de argila no timing certo! Reflexo puro." },
      "batalha-naval": { "name": "Batalha Naval", "desc": "Posicione seus navios e afunde a frota inimiga! VS CPU ou online." },
      "brickbreaker": { "name": "Brick Breaker", "desc": "Destrua todos os blocos em 25 fases! Power-ups, inimigos e 5 mundos épicos." },
      "3invader": { "name": "3INVADER", "desc": "Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses épicos." }
    },
    "faq": {
      "title": "PERGUNTAS FREQUENTES",
      "items": [
        { "q": "O que é o Acerte a Mosca?", "a": "Acerte a Mosca é uma plataforma de jogos online grátis que funciona direto no navegador. Oferecemos 13 jogos incluindo Wordle em português, 2048, Jogo da Memória, Batalha Naval, Bubble Shooter, Deep Attack, Pong, Ships, Jogo do Jacaré, Tiro ao Alvo, Brick Breaker e 3INVADER. Não precisa baixar nada!" },
        { "q": "Quais jogos estão disponíveis?", "a": "Temos 13 jogos: Acerte a Mosca (reflexo), Wordle BR (palavras), Memory Game (memória com multiplayer), 2048 (puzzle com multiplayer), Bubble Shooter (arcade), Deep Attack (nave espacial), Pong (clássico com multiplayer), Ships (batalha de naves com multiplayer), Jogo do Jacaré (estilo Frogger), Tiro ao Alvo (reflexo), Batalha Naval (estratégia com multiplayer online), Brick Breaker (arcade estilo Arkanoid) e 3INVADER (shoot em up espacial)." },
        { "q": "Preciso baixar alguma coisa para jogar?", "a": "Não! Todos os jogos funcionam direto no navegador, tanto no celular quanto no computador. Basta acessar acerteamosca.com.br e começar a jogar." },
        { "q": "Os jogos funcionam no celular?", "a": "Sim! Todos os jogos são responsivos e possuem controles touch otimizados para celular. Jogos de canvas como Bubble Shooter e Deep Attack têm botões de controle dedicados para telas touch." },
        { "q": "Posso jogar com amigos online?", "a": "Sim! Memory Game, 2048, Pong, Ships e Batalha Naval possuem modo multiplayer online. Basta criar uma sala e compartilhar o link com seu amigo para jogar juntos em tempo real." },
        { "q": "Os jogos são realmente grátis?", "a": "Sim, todos os jogos são 100% grátis. Basta se cadastrar com nome e email para começar a jogar." }
      ]
    }
  },
  "common": {
    "playFree": "Jogue grátis em acerteamosca.com.br",
    "mainGame": "JOGO PRINCIPAL",
    "footer": "v1.0 - powered by chineladas"
  }
}
```

- [ ] **Step 2: Create English dictionary**

Create `src/messages/en.json`:

```json
{
  "metadata": {
    "title": "Acerte a Mosca - Free Online Games | Play Now!",
    "titleTemplate": "%s | Acerte a Mosca",
    "description": "Free online browser games! Wordle, 2048, Memory Game, Bubble Shooter, Deep Attack and more. Play now on mobile or PC, no download required!",
    "ogDescription": "Free online browser games! Wordle, 2048, Memory, Bubble Shooter and more. No download!"
  },
  "navbar": {
    "brand": "ACERTE A MOSCA",
    "games": "GAMES"
  },
  "home": {
    "subtitle": "FREE ONLINE GAMES",
    "banner3invader": {
      "title": "3INVADER",
      "line1": "Pilot the ARROW-7 and face the alien invasion 3I/ATLAS.",
      "line2": "25 stages. 5 worlds. 5 epic bosses.",
      "line3": "Humanity depends on you.",
      "cta": "PLAY NOW"
    },
    "games": {
      "acerteamosca": { "name": "Swat the Fly", "desc": "Swat the mosquito with the slipper before time runs out!" },
      "pong": { "name": "Pong", "desc": "The classic of classics! Play against CPU, a local friend, or online." },
      "ships": { "name": "Ships", "desc": "Navigate mazes, ricochet shots, and destroy the enemy ship!" },
      "wordle": { "name": "Wordle", "desc": "Guess the 5-letter word in 6 attempts!" },
      "memory": { "name": "Memory Game", "desc": "Find the pairs and challenge friends online!" },
      "2048": { "name": "2048", "desc": "Slide the blocks and add up to 2048! Play online." },
      "bubbleshooter": { "name": "Bubble Shooter", "desc": "Aim, shoot, and pop bubbles of the same color!" },
      "deepattack": { "name": "Deep Attack", "desc": "Pilot your ship, destroy aliens, and survive in space!" },
      "jacare": { "name": "Croc Crossing", "desc": "Cross the road and river with the crocodile! Classic Frogger style." },
      "tiroaoalvo": { "name": "Target Shooting", "desc": "Hit the clay targets at the right time! Pure reflex." },
      "batalha-naval": { "name": "Battleship", "desc": "Position your ships and sink the enemy fleet! VS CPU or online." },
      "brickbreaker": { "name": "Brick Breaker", "desc": "Destroy all blocks in 25 stages! Power-ups, enemies, and 5 epic worlds." },
      "3invader": { "name": "3INVADER", "desc": "Pilot the ARROW-7 against the alien invasion 3I/ATLAS! 25 stages, 5 worlds, 5 epic bosses." }
    },
    "faq": {
      "title": "FREQUENTLY ASKED QUESTIONS",
      "items": [
        { "q": "What is Acerte a Mosca?", "a": "Acerte a Mosca is a free online gaming platform that works right in your browser. We offer 13 games including Wordle, 2048, Memory Game, Battleship, Bubble Shooter, Deep Attack, Pong, Ships, Croc Crossing, Target Shooting, Brick Breaker, and 3INVADER. No download needed!" },
        { "q": "What games are available?", "a": "We have 13 games: Swat the Fly (reflex), Wordle (words), Memory Game (memory with multiplayer), 2048 (puzzle with multiplayer), Bubble Shooter (arcade), Deep Attack (space ship), Pong (classic with multiplayer), Ships (ship battle with multiplayer), Croc Crossing (Frogger style), Target Shooting (reflex), Battleship (strategy with online multiplayer), Brick Breaker (Arkanoid-style arcade), and 3INVADER (space shoot em up)." },
        { "q": "Do I need to download anything to play?", "a": "No! All games work right in the browser, on both mobile and desktop. Just visit acerteamosca.com.br and start playing." },
        { "q": "Do the games work on mobile?", "a": "Yes! All games are responsive with touch controls optimized for mobile. Canvas games like Bubble Shooter and Deep Attack have dedicated touch control buttons." },
        { "q": "Can I play with friends online?", "a": "Yes! Memory Game, 2048, Pong, Ships, and Battleship have online multiplayer mode. Just create a room and share the link with your friend to play together in real time." },
        { "q": "Are the games really free?", "a": "Yes, all games are 100% free. Just register with your name and email to start playing." }
      ]
    }
  },
  "common": {
    "playFree": "Play free at acerteamosca.com.br",
    "mainGame": "FEATURED GAME",
    "footer": "v1.0 - powered by slipper slaps"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/messages/
git commit -m "feat: add PT and EN translation dictionaries"
```

---

### Task 4: Create Middleware

**Files:**
- Create: `src/middleware.js`

- [ ] **Step 1: Create the middleware**

Create `src/middleware.js`:

```js
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

The matcher skips API routes (`/api/`), Next.js internals (`/_next/`), and static files (anything with a dot like `.js`, `.css`, `.png`).

- [ ] **Step 2: Commit**

```bash
git add src/middleware.js
git commit -m "feat: add i18n middleware for locale detection and routing"
```

---

### Task 5: Update next.config.js

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: Wrap config with next-intl plugin**

Replace the full content of `next.config.js` with:

```js
const createNextIntlPlugin = require("next-intl/plugin");
const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://adservice.google.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://*.profitablecpmratenetwork.com https://www.highperformanceformat.com https://turnstilesocially.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https: wss:",
              "frame-src https://googleads.g.doubleclick.net https://www.google.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://www.highperformanceformat.com https://*.profitablecpmratenetwork.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};
module.exports = withNextIntl(nextConfig);
```

The only changes vs the current file: added `createNextIntlPlugin` import, created `withNextIntl` wrapper, and changed `module.exports = nextConfig` to `module.exports = withNextIntl(nextConfig)`.

- [ ] **Step 2: Commit**

```bash
git add next.config.js
git commit -m "feat: wrap next.config.js with next-intl plugin"
```

---

### Task 6: Restructure App Router

**Files:**
- Create: `src/app/[locale]/` directory
- Move: all pages and game dirs into `[locale]/`

- [ ] **Step 1: Create [locale] directory and move files**

```bash
mkdir -p src/app/\[locale\]
mv src/app/page.js src/app/\[locale\]/page.js
mv src/app/opengraph-image.js src/app/\[locale\]/opengraph-image.js
mv src/app/jogos src/app/\[locale\]/jogos
```

- [ ] **Step 2: Verify API routes and static files stayed at root**

```bash
ls src/app/api/
ls src/app/robots.js src/app/sitemap.js src/app/globals.css
```

All should still be at `src/app/` root.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move pages into [locale] directory for i18n routing"
```

---

### Task 7: Split Layout — Root + Locale

**Files:**
- Rewrite: `src/app/layout.js` (minimal root)
- Create: `src/app/[locale]/layout.js` (full layout with providers)

- [ ] **Step 1: Rewrite root layout**

Replace the full content of `src/app/layout.js` with:

```js
import "./globals.css";

export default function RootLayout({ children }) {
  return children;
}
```

This is the minimal root layout. It imports globals.css but delegates html/body/head to the locale layout.

- [ ] **Step 2: Create locale layout**

Create `src/app/[locale]/layout.js`:

```js
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import InstallPrompt from "@/components/InstallPrompt";
import AdsTerraSocialBar from "@/components/AdsTerraSocialBar";
import CookieConsent from "@/components/CookieConsent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
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
    metadataBase: new URL("https://acerteamosca.com.br"),
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: locale === "pt" ? "pt_BR" : "en_US",
      url: "https://acerteamosca.com.br",
      siteName: "Acerte a Mosca",
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
      icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🩴</text></svg>",
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
        <meta name="google-adsense-account" content="ca-pub-4148140889800778" />
        <meta name="theme-color" content="#050510" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Acerte a Mosca" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "Acerte a Mosca",
                "url": "https://acerteamosca.com.br",
                "description": messages.metadata.description,
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
          <Script id="load-fonts" strategy="afterInteractive">
            {`var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Fira+Code:wght@400;700&display=swap';document.head.appendChild(l);`}
          </Script>
          <Script id="register-sw" strategy="afterInteractive">
            {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(()=>{})}`}
          </Script>
          <Navbar />
          <InstallPrompt />
          <main style={{ paddingTop: 48 }}>{children}</main>
          <AdsTerraSocialBar />
          <CookieConsent />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.js src/app/\[locale\]/layout.js
git commit -m "feat: split layout into root + locale with NextIntlClientProvider"
```

---

### Task 8: Update Navbar with Language Selector

**Files:**
- Modify: `src/components/Navbar.jsx`

- [ ] **Step 1: Rewrite Navbar with locale support**

Replace the full content of `src/components/Navbar.jsx` with:

```jsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

export default function Navbar() {
  const t = useTranslations("navbar");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/";

  const switchLocale = () => {
    const next = locale === "pt" ? "en" : "pt";
    router.replace(pathname, { locale: next });
  };

  return (
    <nav style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 48,
      background: "rgba(5,5,16,0.85)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid rgba(0,240,255,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      zIndex: 1000,
    }}>
      <Link href="/" style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
      }}>
        <span style={{ fontSize: 22 }}>🩴</span>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 11,
          color: "#00f0ff",
          textShadow: "0 0 8px rgba(0,240,255,0.4)",
          letterSpacing: 2,
        }}>
          {t("brand")}
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!isHome && (
          <Link href="/" style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            background: "rgba(0,240,255,0.08)",
            border: "1px solid rgba(0,240,255,0.2)",
            borderRadius: 6,
            color: "#00f0ff",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8,
            letterSpacing: 1,
            textDecoration: "none",
            transition: "all 0.2s",
          }}>
            ← {t("games")}
          </Link>
        )}

        <button
          onClick={switchLocale}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "6px 10px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            color: "#ccd6f6",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 7,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {locale === "pt" ? "EN" : "PT"}
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Navbar.jsx
git commit -m "feat: add language selector to Navbar with next-intl"
```

---

### Task 9: Translate Homepage

**Files:**
- Modify: `src/app/[locale]/page.js`

- [ ] **Step 1: Add "use client" and translation hooks**

The homepage needs to become a client component to use `useTranslations`. Rewrite `src/app/[locale]/page.js`:

Add `"use client";` at the top, import `useTranslations` from `next-intl`, and import `Link` from `@/i18n/navigation` instead of `next/link`. Replace all hardcoded text with `t()` calls.

The key changes:
- Add `"use client";` at top
- Replace `import Link from "next/link"` with `import { Link } from "@/i18n/navigation"`
- Add `const t = useTranslations("home");` and `const tc = useTranslations("common");`
- Replace `jogos` array: game names/descriptions come from `t("games.SLUG.name")` and `t("games.SLUG.desc")`
- Replace `faqs` array: questions/answers come from `t.raw("faq.items")`
- Replace all hardcoded text (subtitle, banner text, FAQ title, footer) with `t()` calls
- Replace `href="/jogos/..."` links — they work automatically with `Link` from `@/i18n/navigation`
- Move JSON-LD schemas into a separate server component or remove from client component (JSON-LD must be static for SEO — keep as hardcoded PT for now, will be locale-aware in Sub-project 3)

The jogos array becomes:

```js
const slugs = [
  { slug: "acerteamosca", emoji: "🦟", cor: "#00f0ff", destaque: true },
  { slug: "pong", emoji: "🏓", cor: "#b026ff", destaque: false },
  { slug: "ships", emoji: "🚀", cor: "#39ff14", destaque: false },
  { slug: "wordle", emoji: "🔤", cor: "#a3e635", destaque: false },
  { slug: "memory", emoji: "🧠", cor: "#34d399", destaque: false },
  { slug: "2048", emoji: "🔢", cor: "#f59e0b", destaque: false },
  { slug: "bubbleshooter", emoji: "🫧", cor: "#e879f9", destaque: false },
  { slug: "deepattack", emoji: "🚀", cor: "#22d3ee", destaque: false },
  { slug: "jacare", emoji: "🐊", cor: "#39ff14", destaque: false },
  { slug: "tiroaoalvo", emoji: "🎯", cor: "#4ade80", destaque: false },
  { slug: "batalha-naval", emoji: "⚓", cor: "#3b82f6", destaque: false },
  { slug: "brickbreaker", emoji: "🧱", cor: "#00f0ff", destaque: false },
  { slug: "3invader", emoji: "👾", cor: "#9a50d0", destaque: false },
];
```

And in the JSX, game name/desc is `t(`games.${jogo.slug}.name`)` and `t(`games.${jogo.slug}.desc`)`.

The full rewrite should replace every hardcoded PT string with its `t()` key equivalent, using the dictionary keys defined in Task 3.

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/page.js
git commit -m "feat: translate homepage using next-intl dictionaries"
```

---

### Task 10: Update Sitemap for Multilingual

**Files:**
- Modify: `src/app/sitemap.js`

- [ ] **Step 1: Add EN URLs to sitemap**

Replace the full content of `src/app/sitemap.js` with:

```js
export default function sitemap() {
  const baseUrl = "https://acerteamosca.com.br";

  const jogos = [
    "acerteamosca", "pong", "ships", "wordle", "memory",
    "2048", "bubbleshooter", "deepattack", "jacare",
    "tiroaoalvo", "batalha-naval", "brickbreaker", "3invader",
  ];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: { en: `${baseUrl}/en` },
      },
    },
    ...jogos.map((slug) => ({
      url: `${baseUrl}/jogos/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: { en: `${baseUrl}/en/jogos/${slug}` },
      },
    })),
  ];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/sitemap.js
git commit -m "feat: add multilingual alternates to sitemap"
```

---

### Task 11: Verify Build

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: Build succeeds. May show warnings about static/dynamic pages — that's OK.

- [ ] **Step 2: Test locally**

```bash
npm run dev
```

Verify:
- `http://localhost:3000` — shows PT homepage (no prefix)
- `http://localhost:3000/en` — shows EN homepage
- Navbar shows language toggle (EN when viewing PT, PT when viewing EN)
- Clicking toggle switches language and updates URL
- `http://localhost:3000/jogos/3invader` — game works (PT)
- `http://localhost:3000/en/jogos/3invader` — game works (EN URL, content still PT — game translation is sub-project 2)
- `http://localhost:3000/api/jogadores` — API still works (not affected by locale routing)

- [ ] **Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: address build issues from i18n restructure"
```
