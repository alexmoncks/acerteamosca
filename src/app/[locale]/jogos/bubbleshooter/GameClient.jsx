"use client";

import dynamic from "next/dynamic";

const BubbleShooter = dynamic(() => import("@/components/games/BubbleShooter"), {
  ssr: false,
});

export default function GameClient() {
  return <BubbleShooter />;
}
