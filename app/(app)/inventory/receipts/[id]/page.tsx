import React, { Suspense } from "react";
import ReceiptDetailsClientPage from "./ReceiptDetailsClientPage";

export default function ReceiptDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const id = params?.id || "";

  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <ReceiptDetailsClientPage id={id} />
    </Suspense>
  );
}
