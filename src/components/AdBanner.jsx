"use client";

import { useEffect, useRef, useState } from "react";

export default function AdBanner({ slot, format = "auto", responsive = true, style }) {
  const adRef = useRef(null);
  const pushed = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!adRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !process.env.NEXT_PUBLIC_ADSENSE_ID || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {}
  }, [isVisible]);

  if (!process.env.NEXT_PUBLIC_ADSENSE_ID) return null;

  return (
    <div ref={adRef} style={{ textAlign: "center", overflow: "hidden", ...style }}>
      {isVisible && (
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_ID}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
        />
      )}
    </div>
  );
}
