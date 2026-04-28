"use client";

import dynamic from "next/dynamic";

const WordleBR = dynamic(() => import("@/components/games/WordleBR"), {
  ssr: false,
});

export default function GameClient() {
  return <WordleBR />;
}
