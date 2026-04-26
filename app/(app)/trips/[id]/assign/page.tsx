"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { TrexSelect } from "@/src/components/ui/TrexSelect";
import { tripsService } from "@/src/services/trips.service";

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

export default function AssignTripPage() {
  const { id } = useParams();
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Option[]>([]);
  const [drivers, setDrivers] = useState<Option[]>([]);
  const [supervisors, setSupervisors] = useState<Option[]>([]);

  const [form, setForm] = useState({
    vehicle_id: "",
    driver_id: "",
    supervisor_id: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [tripRes, vehiclesRes, driversRes, supervisorsRes] =
        await Promise.all([
          tripsService.getById(id as string),
          tripsService.listVehiclesOptions(),
          tripsService.listDriversOptions(),
          tripsService.listSupervisorsOptions(),
        ]);

      const trip: any = tripRes;

      setForm({
        vehicle_id:
          trip.vehicle_id ||
          trip.vehicles?.id ||
          trip.vehicle?.id ||
          "",
        driver_id:
          trip.driver_id ||
          trip.drivers?.id ||
          trip.driver?.id ||
          "",
        supervisor_id:
          trip.supervisor_id ||
          trip.supervisors?.id ||
          trip.supervisor?.id ||
          "",
      });

      setVehicles(
        extractItems(vehiclesRes).map((v: any) => ({
          value: String(v.id),
          label:
            v.plate_no ||
            v.plate_number ||
            v.truck_number ||
            v.code ||
            `#${v.id}`,
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
        }))
      );
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل بيانات التخصيص");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      await tripsService.assign(id as string, {
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id,
      });

      router.push(`/trips/${id}`);
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء حفظ التخصيص");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (id) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div className="p-6">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          تعديل تخصيص الرحلة
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          اختر المركبة والسائق والمشرف المسؤول عن الرحلة.
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
            labelText="المركبة"
            value={form.vehicle_id}
            options={[{ label: "بدون مركبة", value: "" }, ...vehicles]}
            onChange={(value) => updateField("vehicle_id", value)}
          />

          <TrexSelect
            labelText="السائق"
            value={form.driver_id}
            options={[{ label: "بدون سائق", value: "" }, ...drivers]}
            onChange={(value) => updateField("driver_id", value)}
          />

          <TrexSelect
            labelText="المشرف"
            value={form.supervisor_id}
            options={[{ label: "بدون مشرف", value: "" }, ...supervisors]}
            onChange={(value) => updateField("supervisor_id", value)}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(`/trips/${id}`)}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            إلغاء
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ التخصيص"}
          </button>
        </div>
      </form>
    </div>
  );
}