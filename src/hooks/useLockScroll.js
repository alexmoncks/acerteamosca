"use client";

import { useEffect } from "react";

export default function useLockScroll(active = true) {
  useEffect(() => {
    if (!active) return;

    // Add class to both html and body (iOS Safari needs html too)
    document.documentElement.classList.add("game-active");
    document.body.classList.add("game-active");

    // Store scroll position to restore later
    const scrollY = window.scrollY;

    // Prevent touchmove on document (iOS rubber-band scroll prevention)
    const preventScroll = (e) => {
      // Allow touch on elements that need it (joystick, buttons)
      if (e.target.closest("[data-allow-touch]")) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      document.documentElement.classList.remove("game-active");
      document.body.classList.remove("game-active");
      document.removeEventListener("touchmove", preventScroll);
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
