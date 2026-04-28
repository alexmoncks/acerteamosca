"use client";

import dynamic from "next/dynamic";

const BatalhaNaval = dynamic(() => import("@/components/games/BatalhaNaval"), {
  ssr: false,
});

export default function GameClient() {
  return <BatalhaNaval />;
}
