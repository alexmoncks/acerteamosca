"use client";

import dynamic from "next/dynamic";

const KungFuCastle = dynamic(() => import("@/components/games/KungFuCastle"), {
  ssr: false,
});

export default function GameClient() {
  return <KungFuCastle />;
}
