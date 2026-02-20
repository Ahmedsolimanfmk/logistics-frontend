import React, { Suspense } from "react";
import NewDirectIssueClientPage from "./NewDirectIssueClientPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-300">Loading…</div>}>
      <NewDirectIssueClientPage />
    </Suspense>
  );
}
