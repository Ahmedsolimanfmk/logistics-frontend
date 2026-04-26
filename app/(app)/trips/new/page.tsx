"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

import { tripsService } from "@/src/services/trips.service";
import { contractPricingService } from "@/src/services/contract-pricing.service";

type Option = {
  label: string;
  value: string;
  raw?: any;
};

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.rows)) return body.rows;
  return [];
}

function emptyToNull(value: string) {
  return value.trim() ? value : null;
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function NewTripPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Option[]>([]);
  const [contracts, setContracts] = useState<Option[]>([]);
  const [sites, setSites] = useState<Option[]>([]);
  const [routes, setRoutes] = useState<Option[]>([]);
  const [vehicles, setVehicles] = useState<Option[]>([]);
  const [drivers, setDrivers] = useState<Option[]>([]);
  const [supervisors, setSupervisors] = useState<Option[]>([]);

  const [loadingMaster, setLoadingMaster] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    contract_id: "",
    pickup_site_id: "",
    dropoff_site_id: "",
    route_id: "",
    vehicle_id: "",
    driver_id: "",
    supervisor_id: "",
    trip_type: "DELIVERY",
    trip_date: "",
    planned_start_at: "",
    planned_end_at: "",
    cargo_type_id: "",
    notes: "",
    estimated_distance_km: "",
  });

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function loadMaster() {
    try {
      setLoadingMaster(true);
      setError(null);

      const [
        clientsRes,
        vehiclesRes,
        driversRes,
        supervisorsRes,
        routesRes,
        cargoTypesRes,
      ] = await Promise.all([
        tripsService.listClientsOptions(),
        tripsService.listVehiclesOptions(),
        tripsService.listDriversOptions(),
        tripsService.listSupervisorsOptions(),
        contractPricingService.listRoutes({
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

      setClients(
        extractItems(clientsRes).map((c: any) => ({
          value: String(c.id),
          label: c.name || c.company_name || c.client_name || `#${c.id}`,
          raw: c,
        }))
      );

      setVehicles(
        extractItems(vehiclesRes).map((v: any) => ({
          value: String(v.id),
          label:
            v.plate_no ||
            v.plate_number ||
            v.truck_number ||
            v.code ||
            `#${v.id}`,
          raw: v,
        }))
      );

      setDrivers(
        extractItems(driversRes).map((d: any) => ({
          value: String(d.id),
          label:
            d.name ||
            d.full_name ||
            d.driver_name ||
            d.email ||
            `#${d.id}`,
          raw: d,
        }))
      );

      setSupervisors(
        extractItems(supervisorsRes).map((s: any) => ({
          value: String(s.id),
          label:
            s.name ||
            s.full_name ||
            s.email ||
            s.username ||
            `#${s.id}`,
          raw: s,
        }))
      );

      setRoutes(
        extractItems(routesRes).map((r: any) => ({
          value: String(r.id),
          label:
            r.name ||
            [r.origin_label, r.destination_label].filter(Boolean).join(" → ") ||
            r.code ||
            `#${r.id}`,
          raw: r,
        }))
      );

      // cargoTypesRes اتحمل هنا علشان نستخدمه لاحقًا مع التسعير،
      // لكن لو الـ TripCreatePayload عندك لا يقبل cargo_type_id سيبه في الفورم فقط مؤقتًا.
      void cargoTypesRes;
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل البيانات الأساسية");
    } finally {
      setLoadingMaster(false);
    }
  }

  async function loadDependentOptions(clientId: string) {
    if (!clientId) {
      setContracts([]);
      setSites([]);
      return;
    }

    try {
      const [contractsRes, sitesRes] = await Promise.all([
        tripsService.listContractsOptions(clientId),
        tripsService.listSitesOptions(clientId),
      ]);

      setContracts(
        extractItems(contractsRes).map((c: any) => ({
          value: String(c.id),
          label:
            c.contract_no ||
            c.code ||
            c.name ||
            `#${c.id}`,
          raw: c,
        }))
      );

      setSites(
        extractItems(sitesRes).map((s: any) => ({
          value: String(s.id),
          label: s.name || s.site_name || s.code || `#${s.id}`,
          raw: s,
        }))
      );
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل عقود/مواقع العميل");
    }
  }

  useEffect(() => {
    loadMaster();
  }, []);

  useEffect(() => {
    loadDependentOptions(form.client_id);
  }, [form.client_id]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.value === form.route_id)?.raw,
    [routes, form.route_id]
  );

  useEffect(() => {
    if (!selectedRoute) return;

    const distance =
      selectedRoute.distance_km ||
      selectedRoute.distance ||
      selectedRoute.km ||
      "";

    if (distance) {
      updateField("estimated_distance_km", String(distance));
    }
  }, [selectedRoute]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.client_id) {
      setError("اختر العميل");
      return;
    }

    if (!form.pickup_site_id) {
      setError("اختر موقع التحميل");
      return;
    }

    if (!form.dropoff_site_id) {
      setError("اختر موقع التسليم");
      return;
    }

    if (!form.trip_date) {
      setError("اختر تاريخ الرحلة");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: any = {
        client_id: form.client_id,
        contract_id: emptyToNull(form.contract_id),

        pickup_site_id: form.pickup_site_id,
        dropoff_site_id: form.dropoff_site_id,
        route_id: emptyToNull(form.route_id),

        vehicle_id: emptyToNull(form.vehicle_id),
        driver_id: emptyToNull(form.driver_id),
        supervisor_id: emptyToNull(form.supervisor_id),

        trip_type: form.trip_type,
        trip_date: form.trip_date,
        planned_start_at: emptyToNull(form.planned_start_at),
        planned_end_at: emptyToNull(form.planned_end_at),

        estimated_distance_km: numberOrNull(form.estimated_distance_km),
        notes: emptyToNull(form.notes),
      };

      await tripsService.create(payload);

      router.push("/trips");
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء إنشاء الرحلة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">رحلة جديدة</h1>
        <p className="mt-1 text-sm text-gray-500">
          إنشاء رحلة وربطها بالعميل، العقد، المواقع، المركبة، السائق والمشرف.
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
              updateField("pickup_site_id", "");
              updateField("dropoff_site_id", "");
            }}
          />

          <TrexSelect
            labelText="العقد"
            value={form.contract_id}
            loading={loadingMaster}
            options={contracts}
            placeholderText="اختياري"
            onChange={(value) => updateField("contract_id", value)}
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
            onChange={(value) => updateField("trip_type", value)}
          />

          <TrexSelect
            labelText="موقع التحميل"
            value={form.pickup_site_id}
            loading={loadingMaster}
            options={sites}
            placeholderText="اختر موقع التحميل"
            onChange={(value) => updateField("pickup_site_id", value)}
          />

          <TrexSelect
            labelText="موقع التسليم"
            value={form.dropoff_site_id}
            loading={loadingMaster}
            options={sites}
            placeholderText="اختر موقع التسليم"
            onChange={(value) => updateField("dropoff_site_id", value)}
          />

          <TrexSelect
            labelText="المسار"
            value={form.route_id}
            loading={loadingMaster}
            options={routes}
            placeholderText="اختياري"
            onChange={(value) => updateField("route_id", value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <TrexSelect
            labelText="المركبة"
            value={form.vehicle_id}
            loading={loadingMaster}
            options={vehicles}
            placeholderText="اختياري"
            onChange={(value) => updateField("vehicle_id", value)}
          />

          <TrexSelect
            labelText="السائق"
            value={form.driver_id}
            loading={loadingMaster}
            options={drivers}
            placeholderText="اختياري"
            onChange={(value) => updateField("driver_id", value)}
          />

          <TrexSelect
            labelText="المشرف"
            value={form.supervisor_id}
            loading={loadingMaster}
            options={supervisors}
            placeholderText="اختياري"
            onChange={(value) => updateField("supervisor_id", value)}
          />

          <TrexInput
            labelText="تاريخ الرحلة"
            type="date"
            value={form.trip_date}
            onChange={(e) => updateField("trip_date", e.target.value)}
          />

          <TrexInput
            labelText="وقت البداية المخطط"
            type="datetime-local"
            value={form.planned_start_at}
            onChange={(e) => updateField("planned_start_at", e.target.value)}
          />

          <TrexInput
            labelText="وقت النهاية المخطط"
            type="datetime-local"
            value={form.planned_end_at}
            onChange={(e) => updateField("planned_end_at", e.target.value)}
          />

          <TrexInput
            labelText="المسافة المتوقعة كم"
            type="number"
            min="0"
            step="0.01"
            value={form.estimated_distance_km}
            onChange={(e) => updateField("estimated_distance_km", e.target.value)}
          />
        </div>

        <label className="grid gap-2 text-sm">
          <span className="text-gray-600">ملاحظات</span>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="trex-input min-h-28 w-full px-3 py-2 text-sm"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/trips")}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "إنشاء الرحلة"}
          </button>
        </div>
      </form>
    </div>
  );
}