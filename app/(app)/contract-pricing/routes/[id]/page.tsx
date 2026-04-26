"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RouteForm from "../../_components/RouteForm";
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
        const res = await contractPricingService.getRouteById(id as string);
        setItem(res);
      } finally {
        setLoading(false);
      }
    }

    if (id) load();
  }, [id]);

  return (
    <RouteForm
      title="تعديل مسار"
      initialData={item}
      loading={loading}
      saving={saving}
      onCancel={() => router.push("/contract-pricing/routes")}
      onSubmit={async (payload) => {
        setSaving(true);
        try {
          await contractPricingService.updateRoute(id as string, payload);
          router.push("/contract-pricing/routes");
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}