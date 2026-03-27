import { Suspense } from "react";
import InventoryReceiptsPage from "./InventoryReceiptsPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <InventoryReceiptsPage />
    </Suspense>
  );
}