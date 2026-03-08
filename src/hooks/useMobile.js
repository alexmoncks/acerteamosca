"use client";

import { useState, useEffect } from "react";

export default function useMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);
  return mobile;
}
