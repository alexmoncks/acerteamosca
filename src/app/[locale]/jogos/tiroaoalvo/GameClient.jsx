"use client";

import dynamic from "next/dynamic";

const TiroAoAlvo = dynamic(() => import("@/components/games/TiroAoAlvo"), {
  ssr: false,
});

export default function GameClient() {
  return <TiroAoAlvo />;
}
