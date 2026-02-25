"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";
import { api, unwrapItems, unwrapTotal } from "@/src/lib/api";

// ✅ Theme Components
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";

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

export default function WorkOrdersClientPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const token = useAuth((s: any) => s.token);

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [items, setItems] = useState<WorkOrderListItem[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");

  const [page, setPage] = useState(1);
  const limit = 20;

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  // ✅ اقرأ status من URL لو جاي من كروت الداشبورد
  useEffect(() => {
    const st = String(sp?.get("status") || "").toUpperCase();
    if (st && ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"].includes(st)) {
      setStatus(st);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    if (!token) return;

    setLoading(true);
    setErr(null);

    try {
      const params: any = { page, limit };
      if (q.trim()) params.q = q.trim();
      if (status) params.status = status;

      const res = await api.get("/maintenance/work-orders", { params });

      const list = unwrapItems<WorkOrderListItem>(res.data);
      const tot = unwrapTotal(res.data);

      setItems(list);
      setTotal(tot || 0);
    } catch (e: any) {
      setItems([]);
      setTotal(0);

      const msg =
        e?.response?.data?.message ||
        e?.message ||
        t("common.error") ||
        "Failed";

      setErr(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page]);

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

  const columns: DataTableColumn<WorkOrderListItem>[] = useMemo(() => {
    return [
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
        render: (row) => (row.status ? <StatusBadge status={row.status} /> : "—"),
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
          const line1 = `${v?.fleet_no ? `${v.fleet_no} - ` : ""}${v?.plate_no || v?.display_name || "—"}`;
          return (
            <div className="space-y-1">
              <div className="font-medium">{line1}</div>
              <div className="text-xs opacity-70 font-mono">
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
          <div className="space-y-1">
            <div className="font-semibold">{shortId(row.id)}</div>
            <div className="text-xs opacity-70 font-mono">{row.id}</div>
          </div>
        ),
      },
    ];
  }, [t]);

  if (token === null) {
    return (
      <div className="p-4 space-y-4">
        <Card>
          <div className="text-sm opacity-70">{t("maintenanceRequests.checkingSession")}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title={t("workOrders.title")}
        subtitle={`${t("workOrders.breadcrumb")} / ${t("workOrders.title")}`}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setPage(1);
              load();
            }}
            isLoading={loading}
          >
            {t("workOrders.actions.refresh")}
          </Button>
        }
      />

      <FiltersBar
        left={
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs opacity-70">{t("workOrders.filters.searchTitle")}</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none text-white placeholder:text-white/40"
                placeholder={t("workOrders.filters.searchTitle")}
              />
            </div>

            <div>
              <div className="mb-1 text-xs opacity-70">{t("workOrders.filters.status")}</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none text-white"
              >
                <option className="bg-neutral-900" value="">
                  {t("workOrders.status.all")}
                </option>
                <option className="bg-neutral-900" value="OPEN">
                  {t("workOrders.status.open")}
                </option>
                <option className="bg-neutral-900" value="IN_PROGRESS">
                  {t("workOrders.status.inProgress")}
                </option>
                <option className="bg-neutral-900" value="COMPLETED">
                  {t("workOrders.status.completed")}
                </option>
                <option className="bg-neutral-900" value="CANCELED">
                  {t("workOrders.status.canceled")}
                </option>
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

                  const p = new URLSearchParams(sp?.toString() || "");
                  p.delete("status");
                  router.replace(`/maintenance/work-orders${p.toString() ? `?${p.toString()}` : ""}`);
                }}
              >
                {t("common.clear") || "مسح"}
              </Button>
            </div>
          </div>
        }
        right={
          <div className="text-sm text-white/70">
            {t("maintenanceRequests.pagination.total")}:{" "}
            <span className="font-semibold text-white">{filteredLocal.length}</span>
          </div>
        }
      />

      <Card>
        {err ? <div className="text-sm text-red-300 mb-3">{err}</div> : null}

        {/* ✅ DataTable يستخدم rows مش data */}
        <DataTable<WorkOrderListItem>
          columns={columns}
          rows={filteredLocal}
          loading={loading}
          emptyTitle={t("workOrders.list.empty")}
          emptyHint={t("maintenanceRequests.filters.searchLocal")}
          right={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
              >
                ←
              </Button>
              <div className="text-xs text-gray-600">
                {t("workOrders.pagination.page")}{" "}
                <span className="font-semibold text-gray-900">{page}</span>
              </div>
              <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={loading}>
                →
              </Button>
            </div>
          }
          total={total}
          page={page}
          // pages اختياري — لو عايز يظهر: احسبه
          pages={Math.max(1, Math.ceil((total || 0) / limit))}
          onPrev={page > 1 ? () => setPage((p) => Math.max(1, p - 1)) : undefined}
          onNext={
            page < Math.max(1, Math.ceil((total || 0) / limit))
              ? () => setPage((p) => p + 1)
              : undefined
          }
        />
      </Card>

      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
    </div>
  );
}