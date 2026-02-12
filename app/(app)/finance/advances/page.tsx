// app/(app)/finance/advances/page.tsx
"use client";

import React, { Suspense } from "react";
import AdvancesClientPage from "./AdvancesClientPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white p-6">
          <div className="text-sm text-slate-300">Loading…</div>
        </div>
      }
    >
      <AdvancesClientPage />
    </Suspense>
  );
}
