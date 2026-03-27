"use client";

import { useEffect, useRef, useState } from "react";

export default function AdBanner({ slot, format = "auto", responsive = true, style }) {
  const adRef = useRef(null);
  const pushed = useRef(false);
  const [hasAd, setHasAd] = useState(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_ADSENSE_ID || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}

    // Check if ad rendered after a delay
    const timer = setTimeout(() => {
      if (adRef.current) {
        const ins = adRef.current.querySelector("ins");
        if (ins && ins.offsetHeight > 0) {
          setHasAd(true);
        }
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!process.env.NEXT_PUBLIC_ADSENSE_ID) return null;

  return (
    <div
      ref={adRef}
      style={{
        textAlign: "center",
        overflow: "hidden",
        minHeight: hasAd ? 90 : 0,
        maxHeight: hasAd ? 400 : 0,
        opacity: hasAd ? 1 : 0,
        transition: "all 0.3s",
        ...style,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
