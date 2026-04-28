"use client";

import dynamic from "next/dynamic";

const BrickBreaker = dynamic(() => import("@/components/games/BrickBreaker"), {
  ssr: false,
});

export default function GameClient() {
  return <BrickBreaker />;
}
