"use client";

import dynamic from "next/dynamic";

const ThreeInvader = dynamic(() => import("@/components/games/ThreeInvader"), {
  ssr: false,
});

export default function GameClient() {
  return <ThreeInvader />;
}
