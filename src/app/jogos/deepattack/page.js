"use client";

import dynamic from "next/dynamic";

const DeepAttack = dynamic(() => import("@/components/games/DeepAttack"), { ssr: false });

export default function DeepAttackPage() {
  return <DeepAttack />;
}
