"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { DataTable } from "@/src/components/ui/DataTable";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

import { tripsService } from "@/src/services/trips.service";
import { clientsService } from "@/src/services/clients.service";
import { vehiclesService } from "@/src/services/vehicles.service";
import { sitesService } from "@/src/services/sites.service";

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

export default function TripsClientPage() {
  const [rows, setRows] = useState<any[]>([]);

  const [clients, setClients] = useState<Option[]>([]);
  const [vehicles, setVehicles] = useState<Option[]>([]);
  const [sites, setSites] = useState<Option[]>([]);
  const [supervisors, setSupervisors] = useState<Option[]>([]);

  const [filters, setFilters] = useState({
    search: "",
    client_id: "",
    vehicle_id: "",
    site_id: "",
    supervisor_id: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMaster() {
    try {
      setMasterLoading(true);
      setError(null);

      const [clientsRes, vehiclesRes, sitesRes, supervisorsRes] =
        await Promise.all([
          clientsService.list({ page: 1, limit: 200 }),
          vehiclesService.list({ page: 1, pageSize: 200 }),
          sitesService.list({ page: 1, limit: 200 }),
          tripsService.listSupervisorsOptions(),
        ]);

      setClients(
        extractItems(clientsRes).map((c: any) => ({
          value: String(c.id),
          label: c.name || c.company_name || c.client_name || `#${c.id}`,
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
        }))
      );

      setSites(
        extractItems(sitesRes).map((s: any) => ({
          value: String(s.id),
          label: s.name || s.site_name || s.code || `#${s.id}`,
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
      setError(err?.message || "حدث خطأ أثناء تحميل بيانات الفلاتر");
    } finally {
      setMasterLoading(false);
    }
  }

  async function loadTrips() {
    try {
      setLoading(true);
      setError(null);

      const res = await tripsService.list({
        client_id: filters.client_id || undefined,
        status: filters.status || undefined,
        page: 1,
        pageSize: 200,
      });

      setRows(extractItems(res));
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل الرحلات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaster();
  }, []);

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.client_id, filters.status]);

  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return rows.filter((r: any) => {
      const matchesSearch =
        !q ||
        [
          r.trip_no,
          r.trip_number,
          r.code,
          r.clients?.name,
          r.client?.name,
          r.sites?.name,
          r.site?.name,
          r.vehicles?.plate_no,
          r.vehicle?.plate_no,
          r.vehicles?.plate_number,
          r.vehicle?.plate_number,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);

      const matchesVehicle =
        !filters.vehicle_id ||
        String(r.vehicle_id || r.vehicles?.id || r.vehicle?.id || "") ===
          String(filters.vehicle_id);

      const matchesSite =
        !filters.site_id ||
        String(r.site_id || r.sites?.id || r.site?.id || "") ===
          String(filters.site_id);

      const matchesSupervisor =
        !filters.supervisor_id ||
        String(
          r.supervisor_id ||
            r.supervisors?.id ||
            r.supervisor?.id ||
            r.assigned_supervisor_id ||
            ""
        ) === String(filters.supervisor_id);

      return (
        matchesSearch &&
        matchesVehicle &&
        matchesSite &&
        matchesSupervisor
      );
    });
  }, [rows, filters]);

  const columns = [
    {
      key: "trip",
      label: "رقم الرحلة",
      render: (r: any) => r.trip_no || r.trip_number || r.code || "—",
    },
    {
      key: "client",
      label: "العميل",
      render: (r: any) =>
        r.clients?.name ||
        r.client?.name ||
        r.clients?.company_name ||
        r.client?.company_name ||
        "—",
    },
    {
      key: "site",
      label: "الموقع",
      render: (r: any) =>
        r.sites?.name || r.site?.name || r.sites?.site_name || "—",
    },
    {
      key: "vehicle",
      label: "المركبة",
      render: (r: any) =>
        r.vehicles?.plate_no ||
        r.vehicle?.plate_no ||
        r.vehicles?.plate_number ||
        r.vehicle?.plate_number ||
        r.vehicles?.truck_number ||
        r.vehicle?.truck_number ||
        "—",
    },
    {
      key: "date",
      label: "التاريخ",
      render: (r: any) =>
        r.trip_date ||
        r.date ||
        r.started_at ||
        r.created_at ||
        "—",
    },
    {
      key: "status",
      label: "الحالة",
      render: (r: any) => (
        <span className="text-blue-700">{r.status || "—"}</span>
      ),
    },
    {
      key: "actions",
      label: "الإجراءات",
      render: (r: any) => (
        <Link
          href={`/trips/${r.id}`}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          عرض
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الرحلات</h1>
          <p className="mt-1 text-sm text-gray-500">
            إدارة الرحلات وربطها بالعملاء والمواقع والمركبات والمشرفين.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadTrips}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            تحديث
          </button>
          

          <Link
            href="/trips/new"
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            رحلة جديدة
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3">
        <TrexInput
          labelText="بحث"
          placeholder="رقم الرحلة / العميل / الموقع / المركبة"
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              search: e.target.value,
            }))
          }
        />

        <TrexSelect
          labelText="العميل"
          value={filters.client_id}
          options={[{ label: "كل العملاء", value: "" }, ...clients]}
          loading={masterLoading}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              client_id: value,
            }))
          }
        />

        <TrexSelect
          labelText="المركبة"
          value={filters.vehicle_id}
          options={[{ label: "كل المركبات", value: "" }, ...vehicles]}
          loading={masterLoading}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              vehicle_id: value,
            }))
          }
        />

        <TrexSelect
          labelText="الموقع"
          value={filters.site_id}
          options={[{ label: "كل المواقع", value: "" }, ...sites]}
          loading={masterLoading}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              site_id: value,
            }))
          }
        />

        <TrexSelect
          labelText="المشرف"
          value={filters.supervisor_id}
          options={[{ label: "كل المشرفين", value: "" }, ...supervisors]}
          loading={masterLoading}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              supervisor_id: value,
            }))
          }
        />

        <TrexSelect
          labelText="الحالة"
          value={filters.status}
          options={[
            { label: "كل الحالات", value: "" },
            { label: "DRAFT", value: "DRAFT" },
            { label: "SUBMITTED", value: "SUBMITTED" },
            { label: "POSTED", value: "POSTED" },
            { label: "CANCELLED", value: "CANCELLED" },
          ]}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              status: value,
            }))
          }
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white shadow-sm">
        <DataTable columns={columns} rows={filteredRows} loading={loading} />
      </div>
    </div>
  );
}