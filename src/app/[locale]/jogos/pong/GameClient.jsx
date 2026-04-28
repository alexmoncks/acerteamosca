"use client";

import dynamic from "next/dynamic";

const Pong = dynamic(() => import("@/components/games/Pong"), {
  ssr: false,
});

export default function GameClient() {
  return <Pong />;
}
