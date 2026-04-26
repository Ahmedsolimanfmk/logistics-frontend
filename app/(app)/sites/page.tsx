"use client";

import dynamic from "next/dynamic";

const SitesPageInner = dynamic(
  () => import("./SitesPageInner"),
  { ssr: false }
);

export default function Page() {
  return <SitesPageInner />;
}