"use client";

import dynamic from "next/dynamic";

const Ships = dynamic(() => import("@/components/games/Ships"), { ssr: false });

export default function ShipsPage() {
  return <Ships />;
}
