1
import { Suspense } from "react";
import ExpensesClientPage from "./ExpensesClientPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-300">Loading…</div>}>
      <ExpensesClientPage />
    </Suspense>
  );
}
