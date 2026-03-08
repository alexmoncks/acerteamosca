"use client";

import dynamic from "next/dynamic";

const AcerteAMosca = dynamic(() => import("@/components/games/AcerteAMosca"), {
  ssr: false,
});

export default function AcerteAMoscaPage() {
  return <AcerteAMosca />;
}
