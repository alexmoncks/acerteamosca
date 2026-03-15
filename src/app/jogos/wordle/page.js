"use client";

import dynamic from "next/dynamic";

const WordleBR = dynamic(() => import("@/components/games/WordleBR"), { ssr: false });

export default function WordlePage() {
  return <WordleBR />;
}
