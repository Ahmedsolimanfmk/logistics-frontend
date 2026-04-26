"use client";

import dynamic from "next/dynamic";

const RoutesClientPage = dynamic(
  () => import("./RoutesClientPage"),
  { ssr: false }
);

export default function Page() {
  return <RoutesClientPage />;
}