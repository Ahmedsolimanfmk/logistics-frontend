import { Suspense } from "react";
import PurchasesClientPage from "./PurchasesClientPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">جار التحميل…</div>}>
      <PurchasesClientPage />
    </Suspense>
  );
}