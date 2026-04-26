"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SimpleMasterDataForm from "../../_components/SimpleMasterDataForm";
import { contractPricingService } from "@/src/services/contract-pricing.service";

export default function Page() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <SimpleMasterDataForm
      title="إضافة فئة مركبة"
      saving={saving}
      onCancel={() => router.push("/contract-pricing/vehicle-classes")}
      onSubmit={async (payload) => {
        setSaving(true);
        try {
          await contractPricingService.createVehicleClass({
            code: payload.code || "",
            name: payload.name,
            description: payload.description,
            is_active: payload.is_active,
          });
          router.push("/contract-pricing/vehicle-classes");
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}