"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { DataTable } from "@/src/components/ui/DataTable";
import { TrexInput } from "@/src/components/ui/TrexInput";

import { contractPricingService } from "@/src/services/contract-pricing.service";

type RouteItem = {
  id: string;
  name?: string;
  code?: string;
  origin_label?: string;
  destination_label?: string;
  distance_km?: number;
  is_active?: boolean;
};

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.rows)) return body.rows;
  return [];
}

export default function RoutesClientPage() {
  const [rows, setRows] = useState<RouteItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadRoutes() {
    try {
      setLoading(true);

      const res = await contractPricingService.listRoutes({
        page: 1,
        pageSize: 200,
      });

      setRows(extractItems(res));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRoutes();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return rows;

    const q = search.toLowerCase();

    return rows.filter((r) =>
      [
        r.name,
        r.code,
        r.origin_label,
        r.destination_label,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const columns = [
    {
      key: "name",
      label: "الاسم",
      render: (r: RouteItem) =>
        r.name || r.code || "—",
    },
    {
      key: "route",
      label: "المسار",
      render: (r: RouteItem) =>
        [r.origin_label, r.destination_label]
          .filter(Boolean)
          .join(" → ") || "—",
    },
    {
      key: "distance",
      label: "المسافة",
      render: (r: RouteItem) =>
        r.distance_km ? `${r.distance_km} كم` : "—",
    },
    {
      key: "status",
      label: "الحالة",
      render: (r: RouteItem) => (
        <span
          className={
            r.is_active
              ? "text-green-600"
              : "text-red-600"
          }
        >
          {r.is_active ? "نشط" : "غير نشط"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "الإجراءات",
      render: (r: RouteItem) => (
        <Link
          href={`/contract-pricing/routes/${r.id}`}
          className="text-blue-600 hover:underline"
        >
          عرض
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">المسارات</h1>

        <Link
          href="/contract-pricing/routes/new"
          className="bg-black text-white px-4 py-2 rounded"
        >
          إضافة مسار
        </Link>
      </div>

      {/* SEARCH */}
      <TrexInput
        labelText="بحث"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* TABLE */}
      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
      />
    </div>
  );
}