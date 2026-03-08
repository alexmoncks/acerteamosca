"use client";

import { useEffect, useRef } from "react";

export default function AdBanner({ slot, format = "auto", responsive = true, style }) {
  const adRef = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_ADSENSE_ID || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, []);

  if (!process.env.NEXT_PUBLIC_ADSENSE_ID) return null;

  return (
    <div style={{ textAlign: "center", overflow: "hidden", ...style }}>
      <ins
        className="adsbygoogle"
        ref={adRef}
        style={{ display: "block" }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
