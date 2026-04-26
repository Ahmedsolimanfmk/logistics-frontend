"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { DataTable } from "@/src/components/ui/DataTable";
import { TrexInput } from "@/src/components/ui/TrexInput";

import { contractPricingService } from "@/src/services/contract-pricing.service";

type Item = {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
};

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.rows)) return body.rows;
  return [];
}

export default function ZonesClientPage() {
  const [rows, setRows] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);

      const res = await contractPricingService.listZones({
        page: 1,
        pageSize: 200,
      });

      setRows(extractItems(res));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return rows;

    const q = search.toLowerCase();

    return rows.filter((r) =>
      [r.name, r.code, r.description]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, search]);

  const columns = [
    {
      key: "name",
      label: "الاسم",
      render: (r: Item) => r.name || r.code || "—",
    },
    {
      key: "description",
      label: "الوصف",
      render: (r: Item) => r.description || "—",
    },
    {
      key: "status",
      label: "الحالة",
      render: (r: Item) => (
        <span className={r.is_active ? "text-green-600" : "text-red-600"}>
          {r.is_active ? "نشط" : "غير نشط"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "الإجراءات",
      render: (r: Item) => (
        <Link href={`/contract-pricing/zones/${r.id}`}>
          عرض
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between">
        <h1 className="text-xl font-bold">المناطق</h1>

        <Link
          href="/contract-pricing/zones/new"
          className="bg-black text-white px-4 py-2 rounded"
        >
          إضافة
        </Link>
      </div>

      <TrexInput
        labelText="بحث"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <DataTable columns={columns} rows={filtered} loading={loading} />
    </div>
  );
}