"use client";

import dynamic from "next/dynamic";

const UpgradeClient = dynamic(
  () => import("@/components/dashboard/upgrade-client").then((mod) => mod.UpgradeClient),
  { ssr: false }
);

export default function UpgradePage() {
  return <UpgradeClient />;
}



