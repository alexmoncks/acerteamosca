# i18n Infrastructure Design (Sub-project 1)

**Date:** 2026-03-29
**Status:** Approved

## Context

The acerteamosca gaming site needs full internationalization. This is Sub-project 1 of 3, focusing on the infrastructure: routing, middleware, translation system, homepage translation, and navbar language selector. Game content translation comes in Sub-projects 2 and 3.

## Approach

Use `next-intl` library with Next.js 14 App Router. Subpath routing with PT as default (no prefix) and EN with `/en` prefix (`localePrefix: "as-needed"`). Automatic language detection via `Accept-Language` header redirects English browsers to `/en`.

## App Router Restructure

Move all pages into `src/app/[locale]/` dynamic segment:

```
src/app/
  layout.js              ← root layout (minimal: html/body only)
  robots.js              ← stays at root (no locale)
  sitemap.js             ← stays at root (no locale)
  [locale]/
    layout.js            ← full layout (navbar, scripts, metadata, providers)
    page.js              ← homepage
    opengraph-image.js   ← OG image
    jogos/
      2048/              ← all 13 game directories moved here
      3invader/
      acerteamosca/
      batalha-naval/
      brickbreaker/
      bubbleshooter/
      deepattack/
      jacare/
      memory/
      pong/
      ships/
      tiroaoalvo/
      wordle/
```

- `robots.js` and `sitemap.js` stay at `src/app/` root (locale-independent)
- Everything else moves into `[locale]/`
- Game pages move but keep PT content for now (translation in sub-project 2)

## Translation Dictionaries

```
src/messages/
  pt.json
  en.json
```

Structure (Sub-project 1 scope — homepage + navbar only):

```json
{
  "navbar": {
    "games": "JOGOS",
    "brand": "ACERTE A MOSCA"
  },
  "home": {
    "subtitle": "JOGOS ONLINE GRÁTIS",
    "banner3invader": {
      "title": "3INVADER",
      "desc": "Pilote o ARROW-7 e enfrente a invasão alienígena 3I/ATLAS.",
      "line2": "25 fases. 5 mundos. 5 bosses épicos.",
      "line3": "A humanidade depende de você.",
      "cta": "JOGAR AGORA"
    },
    "games": {
      "acerteamosca": { "name": "Acerte a Mosca", "desc": "..." },
      "pong": { "name": "Pong", "desc": "..." },
      ...all 13 games
    },
    "faq": {
      "title": "PERGUNTAS FREQUENTES",
      "items": [
        { "q": "...", "a": "..." },
        ...all FAQ items
      ]
    }
  },
  "common": {
    "playFree": "Jogue grátis em acerteamosca.com.br",
    "mainGame": "JOGO PRINCIPAL"
  }
}
```

EN dictionary has the same structure with English translations.

## Middleware

File: `src/middleware.js`

- Uses `createMiddleware` from `next-intl/middleware`
- `defaultLocale: "pt"`
- `locales: ["pt", "en"]`
- `localePrefix: "as-needed"` — PT has no prefix, EN uses `/en`
- Automatic detection via `Accept-Language` header
- Redirects English browsers to `/en` on first visit

## next-intl Configuration

File: `src/i18n/request.js`

- Configures `next-intl` for App Router
- Loads correct JSON messages file based on locale parameter

## Next.js Config

File: `next.config.js`

- Wrap existing config with `createNextIntlPlugin` from `next-intl/plugin`
- All existing config (headers, CSP) preserved

## Navbar Language Selector

File: `src/components/Navbar.jsx`

- Add PT/EN toggle button on the right side of navbar
- On click, navigates to the same page in the other locale
- Uses `useLocale` and `useRouter` from `next-intl`
- Visual: text labels "PT" / "EN" with active state highlight

## Files Summary

| Action | File | What |
|--------|------|------|
| Install | `next-intl` | npm dependency |
| Create | `src/middleware.js` | i18n routing middleware |
| Create | `src/i18n/request.js` | next-intl config |
| Create | `src/messages/pt.json` | Portuguese dictionary |
| Create | `src/messages/en.json` | English dictionary |
| Create | `src/app/layout.js` | Minimal root layout |
| Create | `src/app/[locale]/layout.js` | Full layout with providers |
| Move | `src/app/page.js` → `src/app/[locale]/page.js` | Homepage with translations |
| Move | `src/app/opengraph-image.js` → `src/app/[locale]/opengraph-image.js` | OG image |
| Move | `src/app/jogos/*` → `src/app/[locale]/jogos/*` | All 13 game dirs |
| Modify | `next.config.js` | Add next-intl plugin |
| Modify | `src/components/Navbar.jsx` | Add language selector |
| Keep | `src/app/sitemap.js` | Stays at root |
| Keep | `src/app/robots.js` | Stays at root |

## Out of Scope

- Translation of in-game text (Sub-project 2)
- Wordle EN dictionary (Sub-project 2, batch 3)
- Per-locale SEO metadata on game pages (Sub-project 3)
- Game pages move to `[locale]/jogos/` but keep PT content — translation comes later
