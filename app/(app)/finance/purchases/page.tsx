// app/(app)/finance/purchases/page.tsx
import React, { Suspense } from "react";
import PurchasesClientPage from "./PurchasesClientPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-gray-500">Loading…</div>}>
      <PurchasesClientPage />
    </Suspense>
  );
}