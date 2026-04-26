"use client";

import { useEffect, useMemo, useState } from "react";

import { DataTable } from "@/src/components/ui/DataTable";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

import { tripsService } from "@/src/services/trips.service";
import { tripFinanceService } from "@/src/services/trip-finance.service";
import { tripRevenuesService } from "@/src/services/trip-revenues.service";

function money(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG");
}

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.rows)) return body.rows;
  return [];
}

export default function TripsProfitabilityPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
  });

  async function load() {
    try {
      setLoading(true);

      const tripsRes = await tripsService.list({
        page: 1,
        pageSize: 200,
        status: filters.status || undefined,
      });

      const trips = extractItems(tripsRes);

      // 🔥 نجيب البيانات المالية لكل رحلة
      const enriched = await Promise.all(
        trips.map(async (trip: any) => {
          try {
            const [finance, revenue] = await Promise.all([
              tripFinanceService.getSummary(trip.id),
              tripRevenuesService.getByTrip(trip.id),
            ]);

            const revenueData = (revenue as any)?.data || null;
            const financeData = (finance as any)?.data || finance || null;

            const totalRevenue =
              revenueData?.approved_amount ||
              revenueData?.final_amount ||
              revenueData?.expected_amount ||
              0;

            const totalExpenses =
              financeData?.total_expenses ||
              financeData?.expenses_total ||
              0;

            const net = totalRevenue - totalExpenses;

            const margin =
              totalRevenue > 0
                ? Math.round((net / totalRevenue) * 100)
                : null;

            return {
              ...trip,
              totalRevenue,
              totalExpenses,
              net,
              margin,
            };
          } catch {
            return {
              ...trip,
              totalRevenue: 0,
              totalExpenses: 0,
              net: 0,
              margin: null,
            };
          }
        })
      );

      setRows(enriched);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filters.status]);

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase();

    if (!q) return rows;

    return rows.filter((r: any) =>
      [
        r.trip_no,
        r.trip_number,
        r.code,
        r.clients?.name,
        r.client?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, filters.search]);

  const columns = [
    {
      key: "trip",
      label: "الرحلة",
      render: (r: any) =>
        r.trip_no || r.trip_number || r.code || "—",
    },
    {
      key: "client",
      label: "العميل",
      render: (r: any) =>
        r.clients?.name ||
        r.client?.name ||
        r.clients?.company_name ||
        "—",
    },
    {
      key: "status",
      label: "الحالة",
      render: (r: any) => r.status,
    },
    {
      key: "revenue",
      label: "الإيراد",
      render: (r: any) => money(r.totalRevenue),
    },
    {
      key: "expenses",
      label: "المصروفات",
      render: (r: any) => money(r.totalExpenses),
    },
    {
      key: "net",
      label: "الربح",
      render: (r: any) => (
        <span
          className={
            r.net > 0
              ? "text-green-600"
              : r.net < 0
              ? "text-red-600"
              : ""
          }
        >
          {money(r.net)}
        </span>
      ),
    },
    {
      key: "margin",
      label: "الهامش",
      render: (r: any) =>
        r.margin != null ? `${r.margin}%` : "—",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          تحليل ربحية الرحلات
        </h1>
        <p className="text-sm text-gray-500">
          عرض الإيرادات والمصروفات وصافي الربح لكل رحلة.
        </p>
      </div>

      {/* FILTERS */}
      <div className="grid md:grid-cols-3 gap-4">
        <TrexInput
          labelText="بحث"
          value={filters.search}
          onChange={(e) =>
            setFilters((p) => ({
              ...p,
              search: e.target.value,
            }))
          }
        />

        <TrexSelect
          labelText="الحالة"
          value={filters.status}
          options={[
            { label: "الكل", value: "" },
            { label: "DRAFT", value: "DRAFT" },
            { label: "IN_PROGRESS", value: "IN_PROGRESS" },
            { label: "FINISHED", value: "FINISHED" },
          ]}
          onChange={(v) =>
            setFilters((p) => ({ ...p, status: v }))
          }
        />
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
      />
    </div>
  );
}