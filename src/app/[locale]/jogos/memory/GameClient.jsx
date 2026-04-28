"use client";

import dynamic from "next/dynamic";

const MemoryGame = dynamic(() => import("@/components/games/MemoryGame"), {
  ssr: false,
});

export default function GameClient() {
  return <MemoryGame />;
}
