import { Suspense } from "react";
import ContractsClientPage from "./ContractsClientPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContractsClientPage />
    </Suspense>
  );
}