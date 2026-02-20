import React, { Suspense } from "react";
import NewIssueClientPage from "./NewIssueClientPage";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-300">Loading…</div>}>
      <NewIssueClientPage />
    </Suspense>
  );
}
