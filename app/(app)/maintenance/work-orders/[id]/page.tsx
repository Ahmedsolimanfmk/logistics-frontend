import { Suspense } from "react";
import WorkOrderDetailsPage from "./WorkOrderDetailsPage";

export default function Page() {
  return (
    <Suspense>
      <WorkOrderDetailsPage />
    </Suspense>
  );
}