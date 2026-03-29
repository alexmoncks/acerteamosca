# 3Invader Homepage Banner + Sponsor Gate + Menu Logo + SEO Design

**Date:** 2026-03-29
**Status:** Approved

## Context

The 3Invader game exists at `/jogos/3invader` but has no presence on the homepage, no OpenGraph image, incomplete SEO metadata (missing accents, basic schema), and is missing from the sitemap. We want to promote it with a cinematic banner, add a sponsor gate before gameplay for monetization, add the logo to the game menu, and bring SEO/GEO/OG to 90%+ quality.

## Feature 1: Homepage Banner

Full-width section above the game grid in `src/app/page.js`.

**Layout:**
- `intro-4.jpg` (Arrow-7 leaving Earth) as `background-image: cover`
- Dark gradient overlay `linear-gradient(to right, rgba(5,5,16,0.9), rgba(5,5,16,0.3))` for text readability on the left
- Text positioned left over the gradient: title "3INVADER", impactful tagline, bullet points
- `ship.png` floating on the right with CSS float animation (gentle up/down)
- "JOGAR AGORA" button linking to `/jogos/3invader`
- Purple/lilac color scheme matching 3Invader logo palette (`#9a50d0`, `#d4a0e8`)
- Border: purple `#9a50d0` with glow
- Mobile: same structure but ship smaller, text adjusted, stacks vertically if needed

**File:** Modify `src/app/page.js` — add section between the "JOGOS ONLINE GRATIS" subtitle and the existing `<AdBanner>` top.

Also add 3Invader to the `jogos` array so it appears in the grid too.

## Feature 2: Logo on Game Menu

- Copy `3invader_logo_final_tight.svg` to `public/images/3invader/logo.svg`
- In ThreeInvader.jsx menu screen, replace the "3INVADER" text with `<img src="/images/3invader/logo.svg">` at ~280px width
- Keep existing subtitle/difficulty selector below

**Files:**
- Create: `public/images/3invader/logo.svg`
- Modify: `src/components/games/ThreeInvader.jsx` (menu rendering section)

## Feature 3: Sponsor Gate

New screen `"sponsor"` in ThreeInvader's state machine.

**Flow:**
```
menu → INICIAR → check sponsor (localStorage) → sponsor screen (or skip if <24h) → check user → register (if needed) → intro → playing
```

**Sponsor screen UI:**
- Dark overlay matching game aesthetic
- Text: "Nosso patrocinador mantém o jogo gratuito"
- Button: "CONTINUAR"
- On click: inject popunder script programmatically via `document.createElement('script')` with src from `adsConfig.adsterra.popunder.src`, then advance to next step (register or intro/playing)

**Throttle:**
- localStorage key: `3invader_sponsor_last`
- Check: if `Date.now() - stored timestamp < 24h`, skip sponsor screen entirely
- On show: write current timestamp to localStorage

**Changes to `handleMenuStart`:**
- Before: menu → check user → register/intro/playing
- After: menu → check sponsor → sponsor screen (or skip) → check user → register/intro/playing

**Changes to `handleRegister`:**
- No change needed — register already flows to intro/playing

**File:** Modify `src/components/games/ThreeInvader.jsx`

## Feature 4: SEO, GEO, OpenGraph

### Problems with current state:
- No `opengraph-image.js` (all other games have one)
- Text missing Portuguese accents ("gratis" instead of "grátis", "epicos" instead of "épicos")
- VideoGame schema incomplete (missing `screenshot`, `numberOfPlayers`, `datePublished`)
- No explicit Twitter card
- No long-tail PT-BR keywords
- 3Invader missing from sitemap.js

### What to implement:

**`src/app/jogos/3invader/opengraph-image.js`** — Dynamic OG image (1200x630):
- Space-themed purple gradient background matching 3Invader palette
- Title "3INVADER" prominent
- Tagline: "Pilote o ARROW-7 contra a invasão alienígena"
- "Jogue grátis em acerteamosca.com.br"
- Follow same pattern as other games' opengraph-image.js files

**`src/app/jogos/3invader/page.js`** — Complete metadata overhaul:

Metadata:
- title: "3INVADER - Jogo de Nave Shoot 'em Up Online Grátis"
- description: Rich PT-BR description with accents, mentioning key features (25 fases, 5 mundos, 5 bosses, ARROW-7, 3I/ATLAS)
- keywords: Long-tail PT-BR keywords including "jogo de nave online grátis", "shoot em up brasileiro", "shmup vertical grátis", "jogo espacial no navegador", "arcade shooter online", etc.
- alternates: canonical
- openGraph: complete with title, description, url, type, images pointing to opengraph-image
- twitter: summary_large_image card

VideoGame Schema (JSON-LD) expanded:
- `name`, `description` with accents
- `genre`: ["Arcade", "Shoot 'em up", "Vertical Shooter", "Ação"]
- `gamePlatform`: ["Web Browser", "Mobile Browser"]
- `operatingSystem`: "Any"
- `applicationCategory`: "Game"
- `inLanguage`: "pt-BR"
- `numberOfPlayers`: "1"
- `screenshot`: "/images/3invader/intro-4.jpg"
- `datePublished`: "2026-03-15"
- `offers`: Free
- `publisher`: Acerte a Mosca organization
- `image`: "/jogos/3invader/opengraph-image"

**`src/app/sitemap.js`** — Add `"3invader"` to the jogos array.

## CSP

No changes needed. `turnstilesocially.com` already in `script-src` from AdsTerra integration (commit `0d488a2`).

## Files Summary

| Action | File | What |
|--------|------|------|
| Create | `public/images/3invader/logo.svg` | Logo SVG asset |
| Create | `src/app/jogos/3invader/opengraph-image.js` | Dynamic OG image for social sharing |
| Modify | `src/app/page.js` | Banner section + 3invader in jogos array |
| Modify | `src/components/games/ThreeInvader.jsx` | Logo in menu + sponsor gate screen |
| Modify | `src/app/jogos/3invader/page.js` | Complete SEO metadata + expanded schema |
| Modify | `src/app/sitemap.js` | Add 3invader to sitemap |
