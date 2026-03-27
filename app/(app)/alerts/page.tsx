import { Suspense } from "react";
import AlertsClientPage from "./AlertsClientPage";

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AlertsClientPage />
    </Suspense>
  );
}