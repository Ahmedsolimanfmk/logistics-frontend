import { Suspense } from "react";
import NewContractPricingRulePage from "./NewContractPricingRulePage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewContractPricingRulePage />
    </Suspense>
  );
}