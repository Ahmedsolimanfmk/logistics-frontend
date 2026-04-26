"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

import { clientsService } from "@/src/services/clients.service";
import { contractsService } from "@/src/services/contracts.service";
import { contractPricingService } from "@/src/services/contract-pricing.service";

import type {
  PricingRulePayload,
  TripType,
} from "@/src/types/contract-pricing.types";

type Option = {
  label: string;
  value: string;
};

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.rows)) return body.rows;
  return [];
}

function nullable(value: string) {
  return value.trim() ? value : null;
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function NewContractPricingRulePage() {
  const router = useRouter();

  const [clients, setClients] = useState<Option[]>([]);
  const [contracts, setContracts] = useState<Option[]>([]);
  const [routes, setRoutes] = useState<Option[]>([]);
  const [vehicleClasses, setVehicleClasses] = useState<Option[]>([]);
  const [cargoTypes, setCargoTypes] = useState<Option[]>([]);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    contract_id: "",
    route_id: "",
    vehicle_class_id: "",
    cargo_type_id: "",
    trip_type: "",
    base_price: "",
    currency: "EGP",
    price_per_ton: "",
    price_per_km: "",
    min_weight: "",
    max_weight: "",
    priority: "100",
    effective_from: "",
    effective_to: "",
    notes: "",
    is_active: "true",
  });

  const filteredContracts = useMemo(() => {
    if (!form.client_id) return contracts;

    return contracts.filter((c: any) => {
      const raw = c as any;
      return !raw.client_id || String(raw.client_id) === String(form.client_id);
    });
  }, [contracts, form.client_id]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadMasterData() {
    try {
      setLoadingMaster(true);
      setError(null);

      const [
        clientsRes,
        contractsRes,
        routesRes,
        vehicleClassesRes,
        cargoTypesRes,
      ] = await Promise.all([
        clientsService.list({
          page: 1,
          limit: 300,
          is_active: true,
        }),
        contractsService.list({
          page: 1,
          limit: 300,
        }),
        contractPricingService.listRoutes({
          page: 1,
          pageSize: 300,
          is_active: true,
        }),
        contractPricingService.listVehicleClasses({
          page: 1,
          pageSize: 300,
          is_active: true,
        }),
        contractPricingService.listCargoTypes({
          page: 1,
          pageSize: 300,
          is_active: true,
        }),
      ]);

      const clientsArr = extractItems(clientsRes);
      const contractsArr = extractItems(contractsRes);
      const routesArr = extractItems(routesRes);
      const vehicleClassesArr = extractItems(vehicleClassesRes);
      const cargoTypesArr = extractItems(cargoTypesRes);

      setClients(
        clientsArr.map((c: any) => ({
          value: String(c.id),
          label: c.name || c.company_name || c.client_name || `#${c.id}`,
        }))
      );

      setContracts(
        contractsArr.map((c: any) => ({
          value: String(c.id),
          label:
            c.contract_no ||
            c.code ||
            c.name ||
            c.title ||
            `#${c.id}`,
          client_id: c.client_id,
        })) as any
      );

      setRoutes(
        routesArr.map((r: any) => ({
          value: String(r.id),
          label:
            r.name ||
            [r.origin_label, r.destination_label].filter(Boolean).join(" → ") ||
            r.code ||
            `#${r.id}`,
        }))
      );

      setVehicleClasses(
        vehicleClassesArr.map((v: any) => ({
          value: String(v.id),
          label: v.name || v.code || `#${v.id}`,
        }))
      );

      setCargoTypes(
        cargoTypesArr.map((c: any) => ({
          value: String(c.id),
          label: c.name || c.code || `#${c.id}`,
        }))
      );
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل البيانات الأساسية");
    } finally {
      setLoadingMaster(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.client_id) {
      setError("اختر العميل");
      return;
    }

    if (!form.contract_id) {
      setError("اختر العقد");
      return;
    }

    if (!form.base_price || Number(form.base_price) <= 0) {
      setError("أدخل سعر أساسي صحيح");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: PricingRulePayload = {
        client_id: form.client_id,
        contract_id: form.contract_id,
        base_price: Number(form.base_price),

        route_id: nullable(form.route_id),
        vehicle_class_id: nullable(form.vehicle_class_id),
        cargo_type_id: nullable(form.cargo_type_id),

        trip_type: nullable(form.trip_type) as TripType | null,

        currency: form.currency || "EGP",
        price_per_ton: optionalNumber(form.price_per_ton),
        price_per_km: optionalNumber(form.price_per_km),
        min_weight: optionalNumber(form.min_weight),
        max_weight: optionalNumber(form.max_weight),

        priority: optionalNumber(form.priority),
        effective_from: nullable(form.effective_from),
        effective_to: nullable(form.effective_to),

        is_active: form.is_active === "true",
        notes: nullable(form.notes),
      };

      await contractPricingService.createRule(payload);

      router.push("/contract-pricing");
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء حفظ قاعدة التسعير");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadMasterData();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          إضافة قاعدة تسعير
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          أنشئ قاعدة تسعير تعاقدية حسب العميل، العقد، المسار، فئة المركبة ونوع الحمولة.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <TrexSelect
            labelText="العميل"
            value={form.client_id}
            loading={loadingMaster}
            options={clients}
            placeholderText="اختر العميل"
            onChange={(value) => {
              updateField("client_id", value);
              updateField("contract_id", "");
            }}
          />

          <TrexSelect
            labelText="العقد"
            value={form.contract_id}
            loading={loadingMaster}
            options={filteredContracts}
            placeholderText="اختر العقد"
            onChange={(value) => updateField("contract_id", value)}
          />

          <TrexSelect
            labelText="المسار"
            value={form.route_id}
            loading={loadingMaster}
            options={routes}
            placeholderText="اختياري"
            onChange={(value) => updateField("route_id", value)}
          />

          <TrexSelect
            labelText="فئة المركبة"
            value={form.vehicle_class_id}
            loading={loadingMaster}
            options={vehicleClasses}
            placeholderText="اختياري"
            onChange={(value) => updateField("vehicle_class_id", value)}
          />

          <TrexSelect
            labelText="نوع الحمولة"
            value={form.cargo_type_id}
            loading={loadingMaster}
            options={cargoTypes}
            placeholderText="اختياري"
            onChange={(value) => updateField("cargo_type_id", value)}
          />

          <TrexSelect
            labelText="نوع الرحلة"
            value={form.trip_type}
            options={[
              { label: "Delivery", value: "DELIVERY" },
              { label: "Transfer", value: "TRANSFER" },
              { label: "Return", value: "RETURN" },
              { label: "Internal", value: "INTERNAL" },
              { label: "Other", value: "OTHER" },
            ]}
            placeholderText="اختياري"
            onChange={(value) => updateField("trip_type", value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <TrexInput
            labelText="السعر الأساسي"
            type="number"
            min="0"
            step="0.01"
            value={form.base_price}
            onChange={(e) => updateField("base_price", e.target.value)}
          />

          <TrexInput
            labelText="العملة"
            value={form.currency}
            onChange={(e) => updateField("currency", e.target.value)}
          />

          <TrexInput
            labelText="الأولوية"
            type="number"
            value={form.priority}
            onChange={(e) => updateField("priority", e.target.value)}
          />

          <TrexInput
            labelText="سعر الطن"
            type="number"
            min="0"
            step="0.01"
            value={form.price_per_ton}
            onChange={(e) => updateField("price_per_ton", e.target.value)}
          />

          <TrexInput
            labelText="سعر الكيلومتر"
            type="number"
            min="0"
            step="0.01"
            value={form.price_per_km}
            onChange={(e) => updateField("price_per_km", e.target.value)}
          />

          <TrexSelect
            labelText="الحالة"
            value={form.is_active}
            options={[
              { label: "نشط", value: "true" },
              { label: "غير نشط", value: "false" },
            ]}
            onChange={(value) => updateField("is_active", value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TrexInput
            labelText="أقل وزن"
            type="number"
            min="0"
            step="0.01"
            value={form.min_weight}
            onChange={(e) => updateField("min_weight", e.target.value)}
          />

          <TrexInput
            labelText="أقصى وزن"
            type="number"
            min="0"
            step="0.01"
            value={form.max_weight}
            onChange={(e) => updateField("max_weight", e.target.value)}
          />

          <TrexInput
            labelText="تاريخ السريان من"
            type="date"
            value={form.effective_from}
            onChange={(e) => updateField("effective_from", e.target.value)}
          />

          <TrexInput
            labelText="تاريخ السريان إلى"
            type="date"
            value={form.effective_to}
            onChange={(e) => updateField("effective_to", e.target.value)}
          />
        </div>

        <label className="grid gap-2 text-sm">
          <span className="text-[rgb(var(--trex-fg))] opacity-80">
            ملاحظات
          </span>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="trex-input min-h-28 w-full px-3 py-2 text-sm text-[rgb(var(--trex-fg))]"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/contract-pricing")}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ قاعدة التسعير"}
          </button>
        </div>
      </form>
    </div>
  );
}