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

  const initialClientId = searchParams.get("client_id") || "";
  const initialContractId = searchParams.get("contract_id") || "";

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
    client_id: initialClientId,
    contract_id: initialContractId,

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
        msg: e?.response?.data?.message || e?.message || "فشل تحميل عقود ومسارات ومواقع العميل",
      });
    }
  }

  useEffect(() => {
    loadBaseLookups();
  }, []);

  useEffect(() => {
    loadClientDependentData(form.client_id);
  }, [form.client_id]);

  const pickupSite = useMemo(
    () => sites.find((x) => x.id === form.pickup_site_id) || null,
    [sites, form.pickup_site_id]
  );

  const dropoffSite = useMemo(
    () => sites.find((x) => x.id === form.dropoff_site_id) || null,
    [sites, form.dropoff_site_id]
  );

  useEffect(() => {
    if (pickupSite?.zone_id && !form.from_zone_id) {
      setForm((prev) => ({ ...prev, from_zone_id: pickupSite.zone_id || "" }));
    }
  }, [pickupSite?.zone_id, form.from_zone_id]);

  useEffect(() => {
    if (dropoffSite?.zone_id && !form.to_zone_id) {
      setForm((prev) => ({ ...prev, to_zone_id: dropoffSite.zone_id || "" }));
    }
  }, [dropoffSite?.zone_id, form.to_zone_id]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.client_id) {
      setToast({ type: "error", msg: "العميل مطلوب" });
      return;
    }

    if (!form.contract_id) {
      setToast({ type: "error", msg: "العقد مطلوب" });
      return;
    }

    if (form.base_price === "") {
      setToast({ type: "error", msg: "السعر الأساسي مطلوب" });
      return;
    }

    const basePrice = Number(form.base_price);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      setToast({ type: "error", msg: "السعر الأساسي يجب أن يكون رقمًا صالحًا" });
      return;
    }

    try {
      setSaving(true);

      const created = await contractPricingService.createRule({
        client_id: form.client_id,
        contract_id: form.contract_id,

        route_id: form.route_id || null,
        pickup_site_id: form.pickup_site_id || null,
        dropoff_site_id: form.dropoff_site_id || null,
        from_zone_id: form.from_zone_id || null,
        to_zone_id: form.to_zone_id || null,
        vehicle_class_id: form.vehicle_class_id || null,
        cargo_type_id: form.cargo_type_id || null,

        trip_type: form.trip_type || null,

        min_weight: toNullableNumber(form.min_weight),
        max_weight: toNullableNumber(form.max_weight),

        base_price: basePrice,
        currency: form.currency || "EGP",
        price_per_ton: toNullableNumber(form.price_per_ton),
        price_per_km: toNullableNumber(form.price_per_km),

        priority:
          form.priority === ""
            ? null
            : Number.isInteger(Number(form.priority))
            ? Number(form.priority)
            : 100,

        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,

        is_active: form.is_active,
        notes: form.notes || null,
      });

      setToast({
        type: "success",
        msg: "تم إنشاء قاعدة التسعير بنجاح",
      });

      router.push(`/contract-pricing/${created.id}`);
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل إنشاء قاعدة التسعير",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="إضافة قاعدة تسعير"
        subtitle="إنشاء قاعدة تسعير جديدة مرتبطة بعقد وعميل"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/contract-pricing">
              <Button variant="secondary">رجوع</Button>
            </Link>
          </div>
        }
      />

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">العميل *</label>
              <select
                value={form.client_id}
                onChange={(e) => {
                  const nextClientId = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    client_id: nextClientId,
                    contract_id: "",
                    route_id: "",
                    pickup_site_id: "",
                    dropoff_site_id: "",
                    from_zone_id: "",
                    to_zone_id: "",
                  }));
                }}
                disabled={loadingLookups}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                <option value="">اختر العميل</option>
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">العقد *</label>
              <select
                value={form.contract_id}
                onChange={(e) => setField("contract_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                <option value="">اختر العقد</option>
                {contracts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.contract_no || item.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">المسار</label>
              <select
                value={form.route_id}
                onChange={(e) => setField("route_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                <option value="">بدون مسار محدد</option>
                {routes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.code || item.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">موقع التحميل</label>
              <select
                value={form.pickup_site_id}
                onChange={(e) => setField("pickup_site_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                <option value="">بدون تحديد</option>
                {sites.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">موقع التفريغ</label>
              <select
                value={form.dropoff_site_id}
                onChange={(e) => setField("dropoff_site_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                <option value="">بدون تحديد</option>
                {sites.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">نوع الرحلة</label>
              <select
                value={form.trip_type}
                onChange={(e) => setField("trip_type", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                {tripTypeOptions.map((item) => (
                  <option key={item || "empty"} value={item}>
                    {item || "أي نوع"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">منطقة البداية</label>
              <select
                value={form.from_zone_id}
                onChange={(e) => setField("from_zone_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                <option value="">بدون تحديد</option>
                {zones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.code || item.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">منطقة النهاية</label>
              <select
                value={form.to_zone_id}
                onChange={(e) => setField("to_zone_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                <option value="">بدون تحديد</option>
                {zones.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.code || item.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">فئة السيارة</label>
              <select
                value={form.vehicle_class_id}
                onChange={(e) => setField("vehicle_class_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                <option value="">أي فئة</option>
                {vehicleClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.code || item.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">نوع المنقول</label>
              <select
                value={form.cargo_type_id}
                onChange={(e) => setField("cargo_type_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-black/10"
                )}
              >
                <option value="">أي نوع</option>
                {cargoTypes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.code || item.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Card className="p-4">
            <h2 className="mb-4 text-base font-semibold">التسعير</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">السعر الأساسي *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.base_price}
                  onChange={(e) => setField("base_price", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">العملة</label>
                <input
                  value={form.currency}
                  onChange={(e) => setField("currency", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                  placeholder="EGP"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">سعر الطن</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_per_ton}
                  onChange={(e) => setField("price_per_ton", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                  placeholder="اختياري"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">سعر الكيلومتر</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_per_km}
                  onChange={(e) => setField("price_per_km", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                  placeholder="اختياري"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">الحد الأدنى للوزن</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.min_weight}
                  onChange={(e) => setField("min_weight", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                  placeholder="اختياري"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">الحد الأقصى للوزن</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_weight}
                  onChange={(e) => setField("max_weight", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                  placeholder="اختياري"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">الأولوية</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.priority}
                  onChange={(e) => setField("priority", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                  placeholder="100"
                />
              </div>

              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setField("is_active", e.target.checked)}
                  />
                  القاعدة نشطة
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="mb-4 text-base font-semibold">فترة السريان والملاحظات</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">ساري من</label>
                <input
                  type="date"
                  value={form.effective_from}
                  onChange={(e) => setField("effective_from", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">ساري إلى</label>
                <input
                  type="date"
                  value={form.effective_to}
                  onChange={(e) => setField("effective_to", e.target.value)}
                  className={cn(
                    "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">ملاحظات</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  className={cn(
                    "min-h-[120px] w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-black/10"
                  )}
                  placeholder="أي ملاحظات إضافية"
                />
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href="/contract-pricing">
              <Button type="button" variant="secondary">
                إلغاء
              </Button>
            </Link>

            <Button type="submit" isLoading={saving}>
              حفظ قاعدة التسعير
            </Button>
          </div>
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