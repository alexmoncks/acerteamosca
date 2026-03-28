# AdsTerra Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate AdsTerra ad network (Popunder, Social Bar, Banner 468x60) in parallel with existing AdSense, prioritizing non-intrusive user experience.

**Architecture:** Centralized config in `src/config/ads.js` with three separate client components. Each component reads from config and self-manages its lifecycle. CSP updated in `next.config.js` to allow AdsTerra domains.

**Tech Stack:** Next.js 14, React client components, next/script for script injection, localStorage for popunder frequency control.

**Spec:** `docs/superpowers/specs/2026-03-25-adsterra-integration-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/config/ads.js` | Centralized ad config (enabled flags, URLs, keys) |
| Create | `src/components/AdsTerraPopunder.jsx` | Popunder script with 1x/day localStorage throttle |
| Create | `src/components/AdsTerraSocialBar.jsx` | Social Bar global script loader |
| Create | `src/components/AdsTerraBanner.jsx` | Banner 468x60 with responsive hide on mobile |
| Modify | `next.config.js` | CSP: add AdsTerra domains to script-src and frame-src |
| Modify | `src/app/layout.js` | Import and render AdsTerraSocialBar after main |
| Modify | `src/app/page.js` | Import and render AdsTerraPopunder + 2x AdsTerraBanner |

---

### Task 1: Ads Config

**Files:**
- Create: `src/config/ads.js`

- [ ] **Step 1: Create the config directory and file**

```js
// src/config/ads.js
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

- [ ] **Step 2: Commit**

```bash
git add src/config/ads.js
git commit -m "feat: add centralized ads config for AdsTerra integration"
```

---

### Task 2: CSP Update

**Files:**
- Modify: `next.config.js:22-32` (Content-Security-Policy value array)

- [ ] **Step 1: Add AdsTerra domains to script-src**

In `next.config.js`, find the `script-src` line (line 24) and append the AdsTerra domains:

```js
// BEFORE:
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://adservice.google.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google",

// AFTER:
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://adservice.google.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://*.profitablecpmratenetwork.com https://www.highperformanceformat.com",
```

- [ ] **Step 2: Add AdsTerra domains to frame-src**

Find the `frame-src` line (line 29) and append:

```js
// BEFORE:
"frame-src https://googleads.g.doubleclick.net https://www.google.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google",

// AFTER:
"frame-src https://googleads.g.doubleclick.net https://www.google.com https://fundingchoicesmessages.google.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://www.highperformanceformat.com https://*.profitablecpmratenetwork.com",
```

- [ ] **Step 3: Commit**

```bash
git add next.config.js
git commit -m "feat: add AdsTerra domains to Content-Security-Policy"
```

---

### Task 3: AdsTerraPopunder Component

**Files:**
- Create: `src/components/AdsTerraPopunder.jsx`

- [ ] **Step 1: Create the component**

```jsx
"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { adsConfig } from "@/config/ads";

const STORAGE_KEY = "adsterra_popunder_last";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function shouldShow() {
  try {
    const last = localStorage.getItem(STORAGE_KEY);
    if (!last) return true;
    return Date.now() - Number(last) >= ONE_DAY_MS;
  } catch {
    return false;
  }
}

function markShown() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}

export default function AdsTerraPopunder() {
  const checked = useRef(false);

  if (!adsConfig.adsterra.popunder.enabled) return null;

  return (
    <Script
      src={adsConfig.adsterra.popunder.src}
      strategy="lazyOnload"
      onReady={() => {
        if (checked.current) return;
        checked.current = true;
        if (!shouldShow()) return;
        markShown();
      }}
      onLoad={() => {
        if (!checked.current) {
          checked.current = true;
          if (shouldShow()) {
            markShown();
          }
        }
      }}
    />
  );
}
```

Note: The popunder script from AdsTerra auto-triggers on load. The `shouldShow` check must gate the `<Script>` render itself. Refine to conditionally render:

```jsx
"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { adsConfig } from "@/config/ads";

const STORAGE_KEY = "adsterra_popunder_last";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function shouldShow() {
  try {
    const last = localStorage.getItem(STORAGE_KEY);
    if (!last) return true;
    return Date.now() - Number(last) >= ONE_DAY_MS;
  } catch {
    return false;
  }
}

export default function AdsTerraPopunder() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (adsConfig.adsterra.popunder.enabled && shouldShow()) {
      setShow(true);
      try {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } catch {}
    }
  }, []);

  if (!show) return null;

  return (
    <Script
      src={adsConfig.adsterra.popunder.src}
      strategy="lazyOnload"
    />
  );
}
```

Use this second version. The script only renders if 24h have passed, so it only fires once per day.

- [ ] **Step 2: Commit**

```bash
git add src/components/AdsTerraPopunder.jsx
git commit -m "feat: add AdsTerra Popunder component with daily frequency limit"
```

---

### Task 4: AdsTerraSocialBar Component

**Files:**
- Create: `src/components/AdsTerraSocialBar.jsx`

- [ ] **Step 1: Create the component**

```jsx
"use client";

import Script from "next/script";
import { adsConfig } from "@/config/ads";

export default function AdsTerraSocialBar() {
  if (!adsConfig.adsterra.socialBar.enabled) return null;

  return (
    <Script
      src={adsConfig.adsterra.socialBar.src}
      strategy="lazyOnload"
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdsTerraSocialBar.jsx
git commit -m "feat: add AdsTerra Social Bar component"
```

---

### Task 5: AdsTerraBanner Component

**Files:**
- Create: `src/components/AdsTerraBanner.jsx`

- [ ] **Step 1: Create the component**

```jsx
"use client";

import { useEffect, useRef } from "react";
import { adsConfig } from "@/config/ads";

export default function AdsTerraBanner({ style }) {
  const containerRef = useRef(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current || !adsConfig.adsterra.banner.enabled) return;
    loaded.current = true;

    const { key, width, height, invokeUrl } = adsConfig.adsterra.banner;

    const optionsScript = document.createElement("script");
    optionsScript.text = `atOptions = { 'key': '${key}', 'format': 'iframe', 'height': ${height}, 'width': ${width}, 'params': {} };`;

    const invokeScript = document.createElement("script");
    invokeScript.src = invokeUrl;

    if (containerRef.current) {
      containerRef.current.appendChild(optionsScript);
      containerRef.current.appendChild(invokeScript);
    }
  }, []);

  if (!adsConfig.adsterra.banner.enabled) return null;

  const { width, height } = adsConfig.adsterra.banner;

  return (
    <div
      ref={containerRef}
      style={{
        textAlign: "center",
        overflow: "hidden",
        minHeight: height,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        ...style,
      }}
      className="adsterra-banner-container"
    >
      <style>{`
        @media (max-width: ${width - 1}px) {
          .adsterra-banner-container { display: none !important; }
        }
      `}</style>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdsTerraBanner.jsx
git commit -m "feat: add AdsTerra Banner 468x60 component with mobile hide"
```

---

### Task 6: Integrate Social Bar in Global Layout

**Files:**
- Modify: `src/app/layout.js:1-4` (imports) and `src/app/layout.js:113` (after main)

- [ ] **Step 1: Add import**

Add after the existing imports (line 4):

```js
import AdsTerraSocialBar from "@/components/AdsTerraSocialBar";
```

- [ ] **Step 2: Add component after main**

In `src/app/layout.js`, find line 113:

```jsx
        <main style={{ paddingTop: 48 }}>{children}</main>
```

Add the Social Bar right after it:

```jsx
        <main style={{ paddingTop: 48 }}>{children}</main>
        <AdsTerraSocialBar />
```

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.js
git commit -m "feat: add AdsTerra Social Bar to global layout"
```

---

### Task 7: Integrate Popunder + Banners in Homepage

**Files:**
- Modify: `src/app/page.js:1-2` (imports), `src/app/page.js:168` (after opening div), `src/app/page.js:195` (alongside AdBanner top), `src/app/page.js:288` (after FAQ section)

- [ ] **Step 1: Add imports**

At the top of `src/app/page.js`, add after the existing imports (line 2):

```js
import AdsTerraPopunder from "@/components/AdsTerraPopunder";
import AdsTerraBanner from "@/components/AdsTerraBanner";
```

- [ ] **Step 2: Add Popunder at top of page content**

Find line 168 (the slipper emoji div inside the Home component):

```jsx
      <div style={{ fontSize: 32, marginBottom: 4 }}>🩴</div>
```

Add the Popunder right before it:

```jsx
      <AdsTerraPopunder />
      <div style={{ fontSize: 32, marginBottom: 4 }}>🩴</div>
```

- [ ] **Step 3: Add Banner after existing AdBanner top**

Find line 195:

```jsx
      <AdBanner slot="home_top" style={{ marginBottom: 20, maxWidth: 900, width: "100%" }} />
```

Add the AdsTerra banner right after it:

```jsx
      <AdBanner slot="home_top" style={{ marginBottom: 20, maxWidth: 900, width: "100%" }} />
      <AdsTerraBanner style={{ marginBottom: 20, maxWidth: 900 }} />
```

- [ ] **Step 4: Add Banner after FAQ section**

Find line 288 (end of FAQ section):

```jsx
      </section>
```

Add the AdsTerra banner right after it:

```jsx
      </section>

      <AdsTerraBanner style={{ marginTop: 30, maxWidth: 900 }} />
```

- [ ] **Step 5: Commit**

```bash
git add src/app/page.js
git commit -m "feat: add AdsTerra Popunder and Banners to homepage"
```

---

### Task 8: Verify Build

- [ ] **Step 1: Run Next.js build to check for errors**

```bash
npm run build
```

Expected: Build succeeds with no errors. Warnings about missing AdSense env var are OK.

- [ ] **Step 2: Start dev server and verify visually**

```bash
npm run dev
```

Open `http://localhost:3000` and verify:
- No console errors related to CSP
- Social Bar loads (may not render without production AdsTerra approval)
- Banner containers are present in DOM (visible on desktop, hidden on screens < 468px)
- Popunder script loads once, check localStorage for `adsterra_popunder_last` key
- AdSense banners still work as before

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any build/runtime issues from AdsTerra integration"
```
