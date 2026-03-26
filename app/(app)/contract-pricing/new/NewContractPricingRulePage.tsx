"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { clientsService } from "@/src/services/clients.service";
import { contractsService } from "@/src/services/contracts.service";
import { contractPricingService } from "@/src/services/contract-pricing.service";
import { api } from "@/src/lib/api";

import type { Client } from "@/src/types/clients.types";
import type { Contract } from "@/src/types/contracts.types";
import type {
  CargoTypeRef,
  PricingRouteRef,
  VehicleClassRef,
} from "@/src/types/contract-pricing.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type ZoneRef = {
  id: string;
  code?: string | null;
  name?: string | null;
  is_active?: boolean;
};

type SiteRef = {
  id: string;
  name?: string | null;
  client_id?: string | null;
  zone_id?: string | null;
  is_active?: boolean;
};

type ToastState =
  | {
      type: "success" | "error";
      msg: string;
    }
  | null;

type FormState = {
  client_id: string;
  contract_id: string;

  route_id: string;
  pickup_site_id: string;
  dropoff_site_id: string;
  from_zone_id: string;
  to_zone_id: string;
  vehicle_class_id: string;
  cargo_type_id: string;

  trip_type: string;

  min_weight: string;
  max_weight: string;

  base_price: string;
  currency: string;
  price_per_ton: string;
  price_per_km: string;

  priority: string;

  effective_from: string;
  effective_to: string;

  is_active: boolean;
  notes: string;
};

async function listZones(): Promise<ZoneRef[]> {
  const res = await api.get("/contract-pricing/zones", {
    params: { page: 1, pageSize: 200, is_active: true },
  });
  const body = res.data ?? res;
  const items = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body?.data?.items)
    ? body.data.items
    : Array.isArray(body?.data)
    ? body.data
    : [];
  return items as ZoneRef[];
}

async function listSitesByClient(clientId: string): Promise<SiteRef[]> {
  if (!clientId) return [];

  const res = await api.get("/sites", {
    params: {
      client_id: clientId,
      page: 1,
      limit: 200,
    },
  });

  const body = res.data ?? res;
  const items = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body?.data?.items)
    ? body.data.items
    : Array.isArray(body?.data)
    ? body.data
    : [];

  return items as SiteRef[];
}

function toNullableNumber(value: string): number | null {
  if (value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const tripTypeOptions = ["", "DELIVERY", "TRANSFER", "RETURN", "INTERNAL", "OTHER"];

export default function NewContractPricingRulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ حل آمن مع Next.js build
  const initialValues = useMemo(() => {
    return {
      client_id: searchParams.get("client_id") || "",
      contract_id: searchParams.get("contract_id") || "",
    };
  }, [searchParams]);

  const [toast, setToast] = useState<ToastState>(null);
  const [saving, setSaving] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [routes, setRoutes] = useState<PricingRouteRef[]>([]);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClassRef[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoTypeRef[]>([]);
  const [zones, setZones] = useState<ZoneRef[]>([]);
  const [sites, setSites] = useState<SiteRef[]>([]);

  const [form, setForm] = useState<FormState>({
    client_id: initialValues.client_id,
    contract_id: initialValues.contract_id,

    route_id: "",
    pickup_site_id: "",
    dropoff_site_id: "",
    from_zone_id: "",
    to_zone_id: "",
    vehicle_class_id: "",
    cargo_type_id: "",

    trip_type: "",

    min_weight: "",
    max_weight: "",

    base_price: "",
    currency: "EGP",
    price_per_ton: "",
    price_per_km: "",

    priority: "100",

    effective_from: "",
    effective_to: "",

    is_active: true,
    notes: "",
  });

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    if (initialValues.client_id || initialValues.contract_id) {
      setForm((prev) => ({
        ...prev,
        client_id: initialValues.client_id,
        contract_id: initialValues.contract_id,
      }));
    }
  }, [initialValues]);

  async function loadBaseLookups() {
    try {
      setLoadingLookups(true);

      const [clientsRes, vehicleClassesRes, cargoTypesRes, zonesRes] = await Promise.all([
        clientsService.list({ page: 1, limit: 200 }),
        contractPricingService.listVehicleClasses({
          page: 1,
          pageSize: 200,
          is_active: true,
        }),
        contractPricingService.listCargoTypes({
          page: 1,
          pageSize: 200,
          is_active: true,
        }),
        listZones(),
      ]);

      setClients(clientsRes.items || []);
      setVehicleClasses(vehicleClassesRes.items || []);
      setCargoTypes(cargoTypesRes.items || []);
      setZones(zonesRes || []);
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحميل البيانات الأساسية",
      });
    } finally {
      setLoadingLookups(false);
    }
  }

  async function loadClientDependentData(clientId: string) {
    if (!clientId) {
      setContracts([]);
      setRoutes([]);
      setSites([]);
      return;
    }

    try {
      const [contractsRes, routesRes, sitesRes] = await Promise.all([
        contractsService.list({
          client_id: clientId,
          page: 1,
          limit: 200,
        }),
        contractPricingService.listRoutes({
          client_id: clientId,
          page: 1,
          pageSize: 200,
          is_active: true,
        }),
        listSitesByClient(clientId),
      ]);

      setContracts(contractsRes.items || []);
      setRoutes(routesRes.items || []);
      setSites(sitesRes || []);
    } catch (e: any) {
      setContracts([]);
      setRoutes([]);
      setSites([]);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحميل البيانات",
      });
    }
  }

  useEffect(() => {
    loadBaseLookups();
  }, []);

  useEffect(() => {
    loadClientDependentData(form.client_id);
  }, [form.client_id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.client_id || !form.contract_id) {
      setToast({ type: "error", msg: "العميل والعقد مطلوبان" });
      return;
    }

    try {
      setSaving(true);

      const created = await contractPricingService.createRule({
        client_id: form.client_id,
        contract_id: form.contract_id,
        base_price: Number(form.base_price),
        currency: form.currency,
      } as any);

      setToast({ type: "success", msg: "تم الإنشاء بنجاح" });
      router.push(`/contract-pricing/${created.id}`);
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.message || "فشل الإنشاء",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader title="إضافة قاعدة تسعير" />

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <Button type="submit" isLoading={saving}>
            حفظ
          </Button>
        </form>
      </Card>

      <Toast
        open={!!toast}
        type={toast?.type || "success"}
        message={toast?.msg || ""}
        onClose={() => setToast(null)}
      />
    </div>
  );
}