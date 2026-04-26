"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SimpleMasterDataForm from "../../_components/SimpleMasterDataForm";
import { contractPricingService } from "@/src/services/contract-pricing.service";

export default function Page() {
  const { id } = useParams();
  const router = useRouter();

  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await contractPricingService.getZoneById(id as string);
        setItem(res);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  return (
    <SimpleMasterDataForm
      title="تعديل منطقة"
      initialData={item}
      loading={loading}
      saving={saving}
      requireCode={false}
      onCancel={() => router.push("/contract-pricing/zones")}
      onSubmit={async (payload) => {
        setSaving(true);
        try {
          await contractPricingService.updateZone(id as string, {
            code: payload.code,
            name: payload.name,
            description: payload.description,
            is_active: payload.is_active,
          });
          router.push("/contract-pricing/zones");
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}