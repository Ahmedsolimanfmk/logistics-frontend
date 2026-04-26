"use client";

import dynamic from "next/dynamic";

const ClientsPageInner = dynamic(
  () => import("./ClientsPageInner"),
  { ssr: false }
);

export default function Page() {
  return <ClientsPageInner />;
}