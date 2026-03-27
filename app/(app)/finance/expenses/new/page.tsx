import { Suspense } from "react";
import NewCashExpensePage from "./NewCashExpensePage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-300">Loading…</div>}>
      <NewCashExpensePage />
    </Suspense>
  );
}