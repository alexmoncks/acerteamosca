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
