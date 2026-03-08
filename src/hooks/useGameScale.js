"use client";

import { useState, useEffect } from "react";

export default function useGameScale(canvasW = 480) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function calc() {
      const maxW = window.innerWidth - 24; // 12px padding each side
      setScale(maxW < canvasW ? maxW / canvasW : 1);
    }
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [canvasW]);

  return scale;
}
