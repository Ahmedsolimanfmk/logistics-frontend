import { Suspense } from "react";
import AdvancesClientPage from "./AdvancesClientPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-300">Loading…</div>}>
      <AdvancesClientPage />
    </Suspense>
  );
}