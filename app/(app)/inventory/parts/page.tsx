"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

import { apiGet } from "@/src/lib/api";

type PartCategory = {
  id: string;
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
};

type PartRow = {
  id: string;
  part_number?: string | null;
  name?: string | null;
  brand?: string | null;
  unit?: string | null;
  min_stock?: number | null;
  is_active?: boolean | null;
  category_id?: string | null;
  category?: PartCategory | null;
  category_legacy?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function asArray<T = unknown>(body: any): T[] {
  if (Array.isArray(body)) return body as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.data?.items)) return body.data.items as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  return [];
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function formatCategory(part: PartRow) {
  const name = part.category?.name || part.category_legacy || "";
  if (!name) return "—";
  return part.category?.code ? `${name} — ${part.category.code}` : name;
}

export default function PartsPage() {
  const [rows, setRows] = useState<PartRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await apiGet("/inventory/parts", {
        q: q.trim() || undefined,
        active: activeOnly ? "1" : undefined,
      });

      setRows(asArray<PartRow>(res));
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to load parts",
        type: "error",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const active = rows.filter((r) => Boolean(r.is_active)).length;
    const inactive = rows.length - active;

    return {
      total: rows.length,
      active,
      inactive,
    };
  }, [rows]);

  const columns: DataTableColumn<PartRow>[] = [
    {
      key: "part_number",
      label: "Part Number",
      render: (row) => row.part_number || "—",
    },
    {
      key: "name",
      label: "Name",
      render: (row) => row.name || "—",
    },
    {
      key: "brand",
      label: "Brand",
      render: (row) => row.brand || "—",
    },
    {
      key: "category",
      label: "Category",
      render: (row) => formatCategory(row),
    },
    {
      key: "unit",
      label: "Unit",
      render: (row) => row.unit || "—",
    },
    {
      key: "min_stock",
      label: "Min Stock",
      render: (row) =>
        row.min_stock == null || row.min_stock === undefined ? "—" : String(row.min_stock),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />
      ),
    },
    {
      key: "updated_at",
      label: "Updated",
      render: (row) => fmtDate(row.updated_at),
    },
    {
      key: "open",
      label: "",
      render: (row) => (
        <Link href={`/inventory/parts/${row.id}`}>
          <Button variant="secondary">Open</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast
        {...toast}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PageHeader
        title="Parts"
        subtitle={`Total: ${stats.total} • Active: ${stats.active} • Inactive: ${stats.inactive}`}
        actions={
          <>
            <Link href="/inventory/parts/new">
              <Button variant="primary">New</Button>
            </Link>
            <Button onClick={load} isLoading={loading}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-slate-500">Total Parts</div>
          <div className="mt-1 text-xl font-semibold">{stats.total}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-slate-500">Active</div>
          <div className="mt-1 text-xl font-semibold">{stats.active}</div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="text-xs text-slate-500">Inactive</div>
          <div className="mt-1 text-xl font-semibold">{stats.inactive}</div>
        </div>
      </div>

      <FiltersBar
        left={
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-xl border border-black/10 px-3 py-2"
              placeholder="Search by part number / name / brand"
            />

            <label className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
              />
              <span className="text-sm">Active only</span>
            </label>
          </>
        }
        right={<Button onClick={load}>Search</Button>}
      />

      <DataTable<PartRow>
        columns={columns}
        rows={rows}
        loading={loading}
      />
    </div>
  );
}