"use client";

import { useEffect } from "react";

export default function useLockScroll(active = true) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add("game-active");
    return () => {
      document.body.classList.remove("game-active");
    };
  }, [active]);
}
