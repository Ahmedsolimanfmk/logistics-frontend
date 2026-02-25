import { Suspense } from "react";
import WorkOrdersClientPage from "./WorkOrdersClientPage";

export default function Page() {
  return (
    <Suspense>
      <WorkOrdersClientPage />
    </Suspense>
  );
}