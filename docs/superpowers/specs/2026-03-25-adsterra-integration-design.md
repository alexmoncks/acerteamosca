# AdsTerra Integration Design

**Date:** 2026-03-25
**Status:** Approved

## Context

The acerteamosca gaming site currently uses Google AdSense for monetization. We're adding AdsTerra as a parallel ad network with 3 ad unit types. Priority: ads must NOT interfere with the gaming experience.

## AdsTerra Account

- API Key: `c9448f35cea763a767408a9f2b3833de`
- Publisher ID: `5684793`
- Ad Units:
  - **Popunder** (28885192): `https://pl28985691.profitablecpmratenetwork.com/e8/af/5e/e8af5e1ef8758093ed62d268ab3de5e7.js`
  - **Social Bar** (28885193): `https://pl28985692.profitablecpmratenetwork.com/12/ca/32/12ca32b5c5c5b71f06f0e474d1df17c8.js`
  - **Banner 468x60** (28885194): key `2ff84ce2802bd4665950a480fe0d5b07`, invoke URL `https://www.highperformanceformat.com/2ff84ce2802bd4665950a480fe0d5b07/invoke.js`

## Approach

**Approach A (selected):** Separate components per ad type with centralized config file. Simple, clear, easy to migrate to admin panel later.

Rejected: Unified AdManager component — overengineering for 3 fundamentally different ad types (script global, script inline, iframe).

## Config Structure

File: `src/config/ads.js`

Centralized config object with `enabled` flags per ad type. When the admin panel is built later, this file gets replaced by an API call to `/api/ads/config` reading from DB. Component interfaces stay the same.

```js
export const adsConfig = {
  adsterra: {
    popunder: {
      enabled: true,
      src: "https://pl28985691.profitablecpmratenetwork.com/e8/af/5e/e8af5e1ef8758093ed62d268ab3de5e7.js",
      frequency: "daily",
    },
    socialBar: {
      enabled: true,
      src: "https://pl28985692.profitablecpmratenetwork.com/12/ca/32/12ca32b5c5c5b71f06f0e474d1df17c8.js",
    },
    banner: {
      enabled: true,
      key: "2ff84ce2802bd4665950a480fe0d5b07",
      width: 468,
      height: 60,
      invokeUrl: "https://www.highperformanceformat.com/2ff84ce2802bd4665950a480fe0d5b07/invoke.js",
    },
  },
  adsense: {
    enabled: true,
  },
};
```

## Components

### AdsTerraPopunder (`src/components/AdsTerraPopunder.jsx`)

- Client component
- Loads script only on homepage
- Checks `localStorage` key `adsterra_popunder_last` before loading
- If less than 24h since last load, does nothing
- On load, writes current timestamp to localStorage
- Returns `null` if `enabled === false`

### AdsTerraSocialBar (`src/components/AdsTerraSocialBar.jsx`)

- Client component
- Loads script once in the global layout
- Social Bar positions itself on screen (AdsTerra controls placement)
- Returns `null` if `enabled === false`

### AdsTerraBanner (`src/components/AdsTerraBanner.jsx`)

- Client component
- Renders `atOptions` block + invoke script
- Accepts `style` prop for positioning
- Responsive: hidden on screens < 468px (fixed 468x60 banner would be cut off)
- Returns `null` if `enabled === false`

## Placement

| Component | Location | Frequency | Mobile |
|---|---|---|---|
| AdsTerraPopunder | Homepage only | 1x/day (localStorage) | Yes |
| AdsTerraSocialBar | Global layout (all pages) | Always | Yes |
| AdsTerraBanner (468x60) | Homepage (2x: pre-grid + post-FAQ) | Always | Hidden < 468px |
| AdBanner (AdSense) | Unchanged | Unchanged | Unchanged |

### Layout changes

- `src/app/layout.js`: Add `<AdsTerraSocialBar />` inside `<body>`, after `<main>`
- `src/app/page.js`: Add `<AdsTerraPopunder />` at top, `<AdsTerraBanner />` alongside existing AdSense banners (pre-grid and post-FAQ)
- Game pages: No AdsTerra ads inside game area. Social Bar global is sufficient.

## CSP Updates (`next.config.js`)

- `script-src`: add `https://*.profitablecpmratenetwork.com` and `https://www.highperformanceformat.com`
- `frame-src`: add `https://www.highperformanceformat.com` (banner uses iframe)

## Future: Admin Panel

- Route: `/admin` (protected route in this Next.js project)
- Will replace static `ads.js` config with API endpoint `/api/ads/config`
- Component interfaces remain unchanged — only the data source changes
- Out of scope for this implementation
