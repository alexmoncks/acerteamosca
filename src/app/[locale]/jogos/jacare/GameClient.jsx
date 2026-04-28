"use client";

import dynamic from "next/dynamic";

const JogoDoJacare = dynamic(() => import("@/components/games/JogoDoJacare"), {
  ssr: false,
});

export default function GameClient() {
  return <JogoDoJacare />;
}
