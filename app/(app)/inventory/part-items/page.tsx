"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { unwrapItems } from "@/src/lib/api";
import { listPartItems, type PartItem } from "@/src/lib/partItems.api";

// ✅ Design System
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export default function PartItemsPage() {
  const t = useT();

  const [q, setQ] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [partId, setPartId] = useState("");
  const [status, setStatus] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PartItem[]>([]);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await listPartItems({
        q: q || undefined,
        warehouse_id: warehouseId || undefined,
        part_id: partId || undefined,
        status: status || undefined,
      });
      setRows(unwrapItems<PartItem>(res));
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(() => rows || [], [rows]);

  const columns: DataTableColumn<PartItem>[] = [
    {
      key: "serials",
      label: t("partItems.colSerial"),
      render: (pi) => (
        <div>
          <div className="font-mono text-xs text-gray-900">{pi.internal_serial || "—"}</div>
          <div className="font-mono text-xs text-gray-500">{pi.manufacturer_serial || "—"}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: t("partItems.colStatus"),
      render: (pi) => <StatusBadge status={pi.status} />,
    },
    {
      key: "part",
      label: t("partItems.colPart"),
      render: (pi) => (
        <div>
          <div className="text-gray-900 font-semibold">{pi.parts?.name || "—"}</div>
          <div className="text-xs text-gray-600">{pi.parts?.brand || ""}</div>
          <div className="text-xs text-gray-500 font-mono">{shortId(pi.part_id)}</div>
        </div>
      ),
    },
    {
      key: "warehouse",
      label: t("partItems.colWarehouse"),
      render: (pi) => (
        <div>
          <div className="text-gray-900">{pi.warehouses?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">{shortId(pi.warehouse_id)}</div>
        </div>
      ),
    },
    {
      key: "received_at",
      label: t("partItems.colReceivedAt"),
      render: (pi) => <span className="text-gray-700">{fmtDate(pi.received_at)}</span>,
    },
    {
      key: "last_moved_at",
      label: t("partItems.colLastMovedAt"),
      render: (pi) => <span className="text-gray-700">{fmtDate(pi.last_moved_at)}</span>,
    },
    {
      key: "ids",
      label: t("partItems.colIds"),
      render: (pi) => (
        <div className="text-xs text-gray-500 font-mono">
          id: {pi.id}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title={t("partItems.title")}
        subtitle={t("partItems.subtitle")}
        actions={
          <>
            <Link href="/inventory/issues/new-direct">
              <Button variant="secondary">{t("partItems.directIssue")}</Button>
            </Link>
            <Button variant="secondary" onClick={load} isLoading={loading}>
              {t("common.refresh")}
            </Button>
          </>
        }
      />

      <FiltersBar
        left={
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 w-full">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("partItems.filterQ")}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
            />
            <input
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              placeholder={t("partItems.filterWarehouseId")}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
            />
            <input
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
              placeholder={t("partItems.filterPartId")}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
            />
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder={t("partItems.filterStatus")}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
            />
          </div>
        }
        right={
          <>
            <Button variant="primary" onClick={load} isLoading={loading}>
              {t("common.search")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setQ("");
                setWarehouseId("");
                setPartId("");
                setStatus("");
                setTimeout(load, 0);
              }}
            >
              {t("common.reset")}
            </Button>
          </>
        }
      />

      <DataTable
        title={t("partItems.title")}
        subtitle={t("partItems.subtitle")}
        columns={columns}
        rows={items}
        loading={loading}
        emptyTitle={t("common.noData")}
        emptyHint="جرّب تغيير الفلاتر أو البحث."
        minWidthClassName="min-w-[1400px]"
      />
    </div>
  );
}