"use client";

import { useEffect, useRef, useState } from "react";
import { adsConfig } from "@/config/ads";

export default function AdsTerraBanner({ style }) {
  const containerRef = useRef(null);
  const loaded = useRef(false);
  const [hasAd, setHasAd] = useState(false);

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

    // Check if ad rendered after a delay
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const iframe = containerRef.current.querySelector("iframe");
        if (iframe && iframe.offsetHeight > 0) {
          setHasAd(true);
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!adsConfig.adsterra.banner.enabled) return null;

  const { width, height } = adsConfig.adsterra.banner;

  return (
    <div
      ref={containerRef}
      style={{
        textAlign: "center",
        overflow: "hidden",
        minHeight: hasAd ? height : 0,
        maxHeight: hasAd ? height : 0,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        opacity: hasAd ? 1 : 0,
        transition: "all 0.3s",
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
