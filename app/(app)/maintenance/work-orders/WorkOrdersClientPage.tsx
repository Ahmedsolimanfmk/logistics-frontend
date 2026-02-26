// ✅ imports (تأكد منها)
import Link from "next/link";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";
import { apiGet } from "@/src/lib/api";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
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

type WorkOrderListItem = {
  id: string;
  status?: string | null;
  type?: string | null;
  vendor_name?: string | null;
  opened_at?: string | null;
  vehicle_id?: string | null;
  vehicles?: {
    fleet_no?: string | null;
    plate_no?: string | null;
    display_name?: string | null;
  } | null;
};

function normalizeList(res: any): WorkOrderListItem[] {
  const arr =
    (Array.isArray(res) && res) ||
    res?.items ||
    res?.data ||
    res?.work_orders ||
    res?.workOrders ||
    res?.result ||
    [];
  return Array.isArray(arr) ? arr : [];
}

export default function WorkOrdersClientPage() {
  const t = useT();
  const token = useAuth((s: any) => s.token);

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<WorkOrderListItem[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErr(null);

    try {
      const params: any = { page, limit };
      if (q.trim()) params.q = q.trim();
      if (status) params.status = status;

      const res: any = await apiGet(`/maintenance/work-orders`, params);
      setItems(normalizeList(res));
    } catch (e: any) {
      setItems([]);
      setErr(e?.message || t("workOrders.list.loading"));
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, q, status, t]);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, page, load]);

  const filteredLocal = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((x) => {
      const stOk = !status || String(x.status || "").toUpperCase() === status;
      if (!qq) return stOk;
      const hay = [
        x.id,
        x.type,
        x.vendor_name,
        x.vehicles?.fleet_no,
        x.vehicles?.plate_no,
        x.vehicles?.display_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return stOk && hay.includes(qq);
    });
  }, [items, q, status]);

  // ✅ DataTable columns (حل مشكلة label/render + row types)
  const columns: DataTableColumn<WorkOrderListItem>[] = useMemo(
    () => [
      {
        key: "actions",
        label: t("workOrders.list.columns.actions"),
        render: (row) => (
          <Link href={`/maintenance/work-orders/${encodeURIComponent(row.id)}`}>
            <Button variant="secondary">{t("workOrders.list.view")}</Button>
          </Link>
        ),
      },
      {
        key: "opened_at",
        label: t("workOrders.list.columns.opened"),
        render: (row) => fmtDate(row.opened_at),
      },
      {
        key: "status",
        label: t("workOrders.list.columns.status"),
        render: (row) =>
          row.status ? <StatusBadge status={row.status} /> : "—", // ✅ status مش value
      },
      {
        key: "type",
        label: t("workOrders.list.columns.type"),
        render: (row) => row.type || "—",
      },
      {
        key: "vendor_name",
        label: t("workOrders.list.columns.vendor"),
        render: (row) => row.vendor_name || "—",
      },
      {
        key: "vehicle",
        label: t("workOrders.list.columns.vehicle"),
        render: (row) => {
          const v = row.vehicles;
          const name =
            (v?.fleet_no ? `${v.fleet_no} - ` : "") + (v?.plate_no || v?.display_name || "—");
          return (
            <div>
              <div>{name}</div>
              <div className="text-xs font-mono text-gray-500">
                vehicle_id: {shortId(row.vehicle_id)}
              </div>
            </div>
          );
        },
      },
      {
        key: "id",
        label: "ID",
        render: (row) => (
          <div>
            <div className="font-semibold">{shortId(row.id)}</div>
            <div className="text-xs font-mono text-gray-500">{row.id}</div>
          </div>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title={t("workOrders.title")}
        subtitle={`${t("workOrders.breadcrumb")} / ${t("workOrders.title")}`}
        actions={
          <Button variant="secondary" onClick={load} isLoading={loading}>
            {t("workOrders.actions.refresh")}
          </Button>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-slate-500">{t("workOrders.filters.searchTitle")}</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              placeholder={t("maintenanceRequests.filters.searchPlaceholder")}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-500">{t("workOrders.filters.status")}</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">{t("workOrders.status.all")}</option>
              <option value="OPEN">{t("workOrders.status.open")}</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">{t("workOrders.status.completed")}</option>
              <option value="CANCELED">{t("workOrders.status.canceled")}</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setPage(1);
                load();
              }}
              isLoading={loading}
            >
              {t("workOrders.filters.searchBtn")}
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setQ("");
                setStatus("");
                setPage(1);
              }}
            >
              {t("common.clear")}
            </Button>
          </div>
        </div>
      </Card>

      <DataTable<WorkOrderListItem>
        title={t("workOrders.list.title")}
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
            >
              ←
            </Button>
            <div className="text-xs text-slate-500">
              {t("workOrders.pagination.page")}: {page}
            </div>
            <Button
              variant="secondary"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
            >
              →
            </Button>
          </div>
        }
        columns={columns}
        rows={filteredLocal}                 // ✅ rows مش data
        loading={loading}
        emptyTitle={err ? err : t("workOrders.list.empty")}
        emptyHint={err ? t("common.tryAgain") : t("maintenanceRequests.filters.searchPlaceholder")}
        total={filteredLocal.length}
      />
    </div>
  );
}