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
