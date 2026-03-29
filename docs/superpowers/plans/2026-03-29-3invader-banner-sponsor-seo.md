# 3Invader Banner + Sponsor Gate + Logo + SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote 3Invader on the homepage with a cinematic banner, add sponsor gate before gameplay, replace menu text with logo SVG, and bring SEO/GEO/OG to 90%+ quality.

**Architecture:** Direct modifications to existing files — banner JSX in page.js, sponsor gate as new screen state in ThreeInvader.jsx, logo SVG as static asset, SEO metadata overhaul in page.js, new opengraph-image.js for social sharing.

**Tech Stack:** Next.js 14, React client components, CSS animations, next/og ImageResponse, JSON-LD structured data.

**Spec:** `docs/superpowers/specs/2026-03-29-3invader-banner-sponsor-gate-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `public/images/3invader/logo.svg` | Logo SVG asset for game menu |
| Create | `src/app/jogos/3invader/opengraph-image.js` | Dynamic OG image for social sharing |
| Modify | `src/app/page.js` | Homepage banner + 3invader in jogos array |
| Modify | `src/components/games/ThreeInvader.jsx` | Logo in menu + sponsor gate screen |
| Modify | `src/app/jogos/3invader/page.js` | Complete SEO metadata + expanded VideoGame schema |
| Modify | `src/app/sitemap.js` | Add 3invader to sitemap array |

---

### Task 1: Copy Logo SVG Asset

**Files:**
- Create: `public/images/3invader/logo.svg`

- [ ] **Step 1: Copy the SVG file**

Copy the file from `/mnt/c/Users/alex/Downloads/3invader_logo_final_tight.svg` to `public/images/3invader/logo.svg`.

```bash
cp "/mnt/c/Users/alex/Downloads/3invader_logo_final_tight.svg" public/images/3invader/logo.svg
```

- [ ] **Step 2: Commit**

```bash
git add public/images/3invader/logo.svg
git commit -m "feat: add 3Invader logo SVG asset"
```

---

### Task 2: Homepage Banner

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Add 3Invader to the jogos array**

In `src/app/page.js`, find the `jogos` array. Add this entry after the last item (brickbreaker, around line 100):

```js
  {
    slug: "3invader",
    nome: "3INVADER",
    emoji: "👾",
    desc: "Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses épicos.",
    cor: "#9a50d0",
    destaque: false,
  },
```

- [ ] **Step 2: Add the banner section**

In `src/app/page.js`, find the line (around line 196):

```jsx
      <AdBanner slot="home_top" style={{ marginBottom: 20, maxWidth: 900, width: "100%" }} />
```

Add this banner section RIGHT BEFORE the `<AdBanner>` line (after the "JOGOS ONLINE GRÁTIS" subtitle):

```jsx
      {/* 3INVADER Cinematic Banner */}
      <Link href="/jogos/3invader" style={{ textDecoration: "none", maxWidth: 900, width: "100%", marginBottom: 20 }}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 12,
            border: "2px solid #9a50d0",
            boxShadow: "0 0 30px rgba(154,80,208,0.3)",
            background: "#0a0a1a",
            minHeight: 180,
          }}
        >
          {/* Background image */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: "url(/images/3invader/intro-4.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          {/* Gradient overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to right, rgba(5,5,16,0.92), rgba(5,5,16,0.4))",
            }}
          />
          {/* Content */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "24px 32px",
              minHeight: 180,
            }}
          >
            {/* Text left */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 22,
                  color: "#d4a0e8",
                  textShadow: "0 0 20px rgba(154,80,208,0.5)",
                  marginBottom: 8,
                  letterSpacing: 3,
                }}
              >
                3INVADER
              </h2>
              <p
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 12,
                  color: "#ccd6f6",
                  lineHeight: 1.8,
                  marginBottom: 16,
                  maxWidth: 400,
                }}
              >
                Pilote o ARROW-7 e enfrente a invasão alienígena 3I/ATLAS.
                <br />
                25 fases. 5 mundos. 5 bosses épicos.
                <br />
                A humanidade depende de você.
              </p>
              <span
                style={{
                  display: "inline-block",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 9,
                  color: "#020824",
                  background: "#9a50d0",
                  borderRadius: 6,
                  padding: "8px 20px",
                  letterSpacing: 2,
                  boxShadow: "0 0 15px rgba(154,80,208,0.4)",
                }}
              >
                JOGAR AGORA &gt;&gt;
              </span>
            </div>
            {/* Ship floating right */}
            <div style={{ marginLeft: 24, flexShrink: 0 }}>
              <img
                src="/images/3invader/ship.png"
                alt="ARROW-7"
                width={96}
                height={72}
                style={{
                  imageRendering: "pixelated",
                  filter: "drop-shadow(0 0 12px rgba(0,240,255,0.5))",
                  animation: "invBannerFloat 3s ease-in-out infinite",
                }}
              />
            </div>
          </div>
        </div>
      </Link>

      <style>{`
        @keyframes invBannerFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
```

- [ ] **Step 3: Also update the ItemList schema to include 3Invader**

In `src/app/page.js`, find the ItemList JSON-LD schema. Update `"numberOfItems"` from 12 to 13. Add this entry after position 12 (brickbreaker):

```js
              { "@type": "ListItem", "position": 13, "url": "https://acerteamosca.com.br/jogos/3invader", "name": "3INVADER" },
```

- [ ] **Step 4: Update FAQ count**

In the FAQ answers, update references from "12 jogos" to "13 jogos" where they mention the count. Also add "3INVADER (shoot em up espacial)" to the lists of games in FAQ answers.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.js
git commit -m "feat: add 3Invader cinematic banner and game entry to homepage"
```

---

### Task 3: Logo on Game Menu

**Files:**
- Modify: `src/components/games/ThreeInvader.jsx:4631-4654` (menu screen title area)

- [ ] **Step 1: Replace title text with logo image**

In `src/components/games/ThreeInvader.jsx`, find the menu screen section (inside `{screen === "menu" && (`, around line 4631). Replace the `<h1>3INVADER</h1>` and the subtitle `<p>ARROW-7 vs 3I/ATLAS</p>` with the logo image:

Find this block (lines 4631-4654):

```jsx
              <h1
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 28,
                  color: ACCENT,
                  animation: "invPulse 2s ease-in-out infinite",
                  marginBottom: 4,
                  textAlign: "center",
                  lineHeight: 1.3,
                  letterSpacing: 4,
                }}
              >
                3INVADER
              </h1>
              <p
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 10,
                  color: "#7a8baa",
                  marginBottom: 20,
                }}
              >
                ARROW-7 vs 3I/ATLAS
              </p>
```

Replace with:

```jsx
              <img
                src="/images/3invader/logo.svg"
                alt="3INVADER"
                style={{
                  width: 280,
                  maxWidth: "80%",
                  height: "auto",
                  animation: "invPulse 2s ease-in-out infinite",
                  marginBottom: 20,
                }}
              />
```

- [ ] **Step 2: Commit**

```bash
git add src/components/games/ThreeInvader.jsx
git commit -m "feat: replace 3Invader menu title with logo SVG"
```

---

### Task 4: Sponsor Gate

**Files:**
- Modify: `src/components/games/ThreeInvader.jsx:4322-4343` (handleMenuStart function) and render section

- [ ] **Step 1: Add sponsor gate constants and helper**

In `src/components/games/ThreeInvader.jsx`, find the import for `adsConfig` — if it doesn't exist, add it after the existing imports at the top of the component file. Add this import near the top of the file (after the other imports):

```js
import { adsConfig } from "@/config/ads";
```

Then, near the other constants at the top of the file (around line 29, after `const RESPAWN_TIME = 120;`), add:

```js
const SPONSOR_STORAGE_KEY = "3invader_sponsor_last";
const SPONSOR_COOLDOWN_MS = 24 * 60 * 60 * 1000;
```

- [ ] **Step 2: Modify handleMenuStart to check sponsor**

Find the `handleMenuStart` function (around line 4322):

```js
  const handleMenuStart = () => {
    if (user) {
```

Replace the entire `handleMenuStart` function with:

```js
  const handleMenuStart = () => {
    // Check sponsor gate (once per day)
    let sponsorSeen = false;
    try {
      const last = localStorage.getItem(SPONSOR_STORAGE_KEY);
      if (last && Date.now() - Number(last) < SPONSOR_COOLDOWN_MS) sponsorSeen = true;
    } catch {}

    if (!sponsorSeen) {
      setScreen("sponsor");
      return;
    }

    proceedAfterSponsor();
  };

  const proceedAfterSponsor = () => {
    if (user) {
      // Check if intro has been seen
      let introSeen = false;
      try { introSeen = !!localStorage.getItem("3invader_intro_seen"); } catch {}
      if (!introSeen) {
        initAudio();
        setIntroScreen(0);
        setIntroCharIndex(0);
        setIntroText("");
        setScreen("intro");
        return;
      }
      initAudio();
      playCountRef.current++;
      initGame();
      setScreen("playing");
      window.gtag?.("event", "game_start", { game_name: "3invader" });
    } else {
      setScreen("register");
    }
  };

  const handleSponsorContinue = () => {
    // Mark sponsor as seen
    try { localStorage.setItem(SPONSOR_STORAGE_KEY, String(Date.now())); } catch {}
    // Inject popunder script
    try {
      const s = document.createElement("script");
      s.src = adsConfig.adsterra.popunder.src;
      document.body.appendChild(s);
    } catch {}
    // Proceed
    proceedAfterSponsor();
  };
```

- [ ] **Step 3: Add sponsor screen UI**

In the render section of ThreeInvader.jsx, find the line (around line 4618):

```jsx
          {screen === "menu" && (
```

Add the sponsor screen RIGHT BEFORE the menu screen block:

```jsx
          {screen === "sponsor" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(2,8,36,0.95)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100,
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
              <h2
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 14,
                  color: ACCENT,
                  textAlign: "center",
                  lineHeight: 2,
                  marginBottom: 8,
                }}
              >
                MISSÃO PATROCINADA
              </h2>
              <p
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 11,
                  color: "#8892b0",
                  textAlign: "center",
                  lineHeight: 1.8,
                  maxWidth: 320,
                  marginBottom: 24,
                }}
              >
                Nosso patrocinador mantém o jogo gratuito.
                <br />
                Clique para continuar e iniciar sua missão.
              </p>
              <button
                onClick={handleSponsorContinue}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 13,
                  color: "#020824",
                  background: ACCENT,
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 36px",
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(0,240,255,0.4)",
                  letterSpacing: 2,
                }}
              >
                CONTINUAR
              </button>
            </div>
          )}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/games/ThreeInvader.jsx
git commit -m "feat: add sponsor gate before 3Invader gameplay"
```

---

### Task 5: SEO/GEO Metadata Overhaul

**Files:**
- Modify: `src/app/jogos/3invader/page.js` (complete rewrite of metadata and schema)

- [ ] **Step 1: Rewrite the entire page.js**

Replace the full content of `src/app/jogos/3invader/page.js` with:

```js
import dynamic from "next/dynamic";
const ThreeInvader = dynamic(() => import("@/components/games/ThreeInvader"), { ssr: false });

export const metadata = {
  title: "3INVADER - Jogo de Nave Shoot 'em Up Online Grátis",
  description:
    "Pilote o ARROW-7 e enfrente a invasão alienígena 3I/ATLAS! Jogo shoot em up vertical com 25 fases, 5 mundos épicos e 5 bosses colossais. Jogue grátis no navegador, sem download. Controles touch para celular.",
  keywords: [
    "jogo de nave online grátis",
    "shoot em up brasileiro",
    "shmup vertical grátis",
    "jogo espacial no navegador",
    "arcade shooter online",
    "3invader",
    "jogo de tiro espacial",
    "nave espacial jogo online",
    "jogo estilo Galaga",
    "vertical shooter grátis",
    "jogo de nave para celular",
    "space shooter browser game",
    "jogo arcade grátis sem download",
  ],
  alternates: { canonical: "/jogos/3invader" },
  openGraph: {
    title: "3INVADER - Jogo de Nave Shoot 'em Up Online Grátis",
    description:
      "Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses épicos. Jogue grátis no navegador!",
    url: "https://acerteamosca.com.br/jogos/3invader",
    type: "website",
    images: [
      {
        url: "/jogos/3invader/opengraph-image",
        width: 1200,
        height: 630,
        alt: "3INVADER - Jogo Shoot em Up Espacial",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "3INVADER - Jogo de Nave Shoot 'em Up Online Grátis",
    description:
      "Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS! 25 fases, 5 mundos, 5 bosses épicos.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "3INVADER",
  description:
    "Pilote o caça estelar ARROW-7 e enfrente a invasão alienígena 3I/ATLAS! Jogo shoot em up vertical com 25 fases distribuídas em 5 mundos épicos — da órbita terrestre até Júpiter — com 5 bosses colossais. Jogue grátis no navegador, sem download.",
  url: "https://acerteamosca.com.br/jogos/3invader",
  image: "https://acerteamosca.com.br/jogos/3invader/opengraph-image",
  screenshot: "https://acerteamosca.com.br/images/3invader/intro-4.jpg",
  genre: ["Arcade", "Shoot 'em up", "Vertical Shooter", "Ação"],
  gamePlatform: ["Web Browser", "Mobile Browser"],
  operatingSystem: "Any",
  applicationCategory: "Game",
  inLanguage: "pt-BR",
  numberOfPlayers: "1",
  datePublished: "2026-03-15",
  gameItem: {
    "@type": "Thing",
    name: "ARROW-7",
    description: "Caça estelar experimental da classe Aleste, único que conseguiu decolar.",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
    availability: "https://schema.org/InStock",
  },
  publisher: {
    "@type": "Organization",
    name: "Acerte a Mosca",
    url: "https://acerteamosca.com.br",
  },
};

export default function ThreeInvaderPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ThreeInvader />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/jogos/3invader/page.js
git commit -m "feat: complete SEO/GEO metadata overhaul for 3Invader"
```

---

### Task 6: OpenGraph Image

**Files:**
- Create: `src/app/jogos/3invader/opengraph-image.js`

- [ ] **Step 1: Create the OG image file**

Create `src/app/jogos/3invader/opengraph-image.js`:

```js
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "3INVADER - Jogo Shoot em Up Espacial";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0020 0%, #1a0e2e 40%, #0a0020 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 120, marginBottom: 20 }}>👾</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#d4a0e8",
            textShadow: "0 0 40px #9a50d080",
            marginBottom: 12,
            letterSpacing: 6,
          }}
        >
          3INVADER
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#ccd6f6",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Pilote o ARROW-7 contra a invasão alienígena 3I/ATLAS
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#8892b0",
            marginBottom: 8,
          }}
        >
          25 fases | 5 mundos | 5 bosses épicos
        </div>
        <div
          style={{
            fontSize: 20,
            color: "#4a5568",
            marginTop: 24,
          }}
        >
          Jogue grátis em acerteamosca.com.br
        </div>
        <div
          style={{
            position: "absolute",
            top: 30,
            left: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 36 }}>🩴</span>
          <span style={{ fontSize: 20, color: "#00f0ff", fontWeight: 700 }}>
            ACERTE A MOSCA
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/jogos/3invader/opengraph-image.js
git commit -m "feat: add 3Invader OpenGraph image for social sharing"
```

---

### Task 7: Add 3Invader to Sitemap

**Files:**
- Modify: `src/app/sitemap.js:4-8` (jogos array)

- [ ] **Step 1: Add 3invader to the array**

In `src/app/sitemap.js`, find the jogos array (line 4):

```js
  const jogos = [
    "acerteamosca", "pong", "ships", "wordle", "memory",
    "2048", "bubbleshooter", "deepattack", "jacare",
    "tiroaoalvo", "batalha-naval", "brickbreaker",
  ];
```

Replace with:

```js
  const jogos = [
    "acerteamosca", "pong", "ships", "wordle", "memory",
    "2048", "bubbleshooter", "deepattack", "jacare",
    "tiroaoalvo", "batalha-naval", "brickbreaker", "3invader",
  ];
```

- [ ] **Step 2: Commit**

```bash
git add src/app/sitemap.js
git commit -m "feat: add 3Invader to sitemap"
```

---

### Task 8: Verify Build

- [ ] **Step 1: Run Next.js build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Visual verification**

```bash
npm run dev
```

Verify at `http://localhost:3000`:
- Homepage: 3Invader banner visible above game grid with background image, floating ship, and purple styling
- Homepage: 3Invader card appears in the grid
- Click banner: navigates to `/jogos/3invader`
- 3Invader menu: logo SVG displayed instead of text
- 3Invader start: sponsor gate appears on first click, then proceeds to register/intro/playing
- Sponsor gate: doesn't appear again within 24h (check localStorage key `3invader_sponsor_last`)
- OG image: visit `/jogos/3invader/opengraph-image` to see the generated image

- [ ] **Step 3: Commit fixes if needed**

```bash
git add -A
git commit -m "fix: address build/runtime issues from 3Invader integration"
```
