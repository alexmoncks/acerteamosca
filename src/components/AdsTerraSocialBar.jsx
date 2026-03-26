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
