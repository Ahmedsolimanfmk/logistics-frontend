import { Suspense } from "react";
import NewContractClientPage from "./NewContractClientPage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewContractClientPage />
    </Suspense>
  );
}