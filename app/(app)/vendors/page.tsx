import { Suspense } from "react";
import VendorsClient from "./VendorsClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-4">جارٍ التحميل...</div>}>
      <VendorsClient />
    </Suspense>
  );
}