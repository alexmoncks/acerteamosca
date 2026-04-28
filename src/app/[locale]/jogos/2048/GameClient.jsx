"use client";

import dynamic from "next/dynamic";

const Game2048 = dynamic(() => import("@/components/games/Game2048"), {
  ssr: false,
});

export default function GameClient() {
  return <Game2048 />;
}
