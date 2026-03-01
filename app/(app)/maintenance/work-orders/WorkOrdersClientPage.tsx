"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";
import { apiGet, unwrapTotal } from "@/src/lib/api";

// ✅ Design System (الموحد)
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
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

  // ✅ تثبيت t لتجنب loop
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const token = useAuth((s: any) => s.token);

  // hydrate once
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

  // server-side pagination
  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState<number>(0);

  // toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setErr(null);

    try {
      const params: any = { page, limit };
      if (q.trim()) params.q = q.trim();
      if (status) params.status = String(status).toUpperCase();

      const res: any = await apiGet(`/maintenance/work-orders`, params);

      const list = normalizeList(res);
      setItems(list);

      const ttotal = unwrapTotal(res);
      if (typeof ttotal === "number" && Number.isFinite(ttotal)) setTotal(ttotal);
      else setTotal(list.length);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      const msg = e?.message || tRef.current("workOrders.list.loading");
      setErr(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, q, status, showToast]);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, page, q, status, load]);

  const pages = useMemo(() => {
    if (!total || total <= 0) return 1;
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

  // Local filter (fallback) — لو السيرفر مش بيفلتر
  const filteredLocal = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const st = String(status || "").toUpperCase();

    return items.filter((x) => {
      const stOk = !st || String(x.status || "").toUpperCase() === st;
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

  // ✅ total shown should match what we display (avoid mismatch)
  const totalShown = useMemo(() => {
    // لو بتستخدم fallback local filter، اعرض عدد النتائج الظاهرة
    // (لو انت متأكد السيرفر بيفلتر، ممكن تحط total هنا بدل filteredLocal.length)
    return filteredLocal.length;
  }, [filteredLocal.length]);

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
          const name = (v?.fleet_no ? `${v.fleet_no} - ` : "") + (v?.plate_no || v?.display_name || "—");
          return (
            <div>
              <div>{name}</div>
              <div className="text-xs font-mono text-gray-500">vehicle_id: {shortId(row.vehicle_id)}</div>
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
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="space-y-4 p-4">
        <PageHeader
          title={t("workOrders.title")}
          subtitle={`${t("workOrders.breadcrumb")} / ${t("workOrders.title")}`}
          actions={
            <Button
              variant="secondary"
              onClick={() => {
                load();
                showToast(t("common.refresh"), "success");
              }}
              isLoading={loading}
            >
              {t("workOrders.actions.refresh")}
            </Button>
          }
        />

        <Card>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-gray-500">{t("workOrders.filters.searchTitle")}</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="trex-input w-full px-3 py-2 text-sm"
                placeholder={t("workOrders.filters.searchPlaceholder")}
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-gray-500">{t("workOrders.filters.status")}</div>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="trex-input w-full px-3 py-2 text-sm"
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
                  setPage(1); // ✅ rely on useEffect to reload (avoid double request)
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
          right={<div className="text-xs text-gray-500">{err ? `⚠ ${err}` : null}</div>}
          columns={columns}
          rows={filteredLocal}
          loading={loading}
          emptyTitle={err ? err : t("workOrders.list.empty")}
          emptyHint={err ? t("common.tryAgain") : t("workOrders.filters.searchPlaceholder")}
          total={totalShown}
          page={page}
          pages={pages}
          onPrev={page > 1 && !loading ? () => setPage((p) => Math.max(1, p - 1)) : undefined}
          onNext={page < pages && !loading ? () => setPage((p) => p + 1) : undefined}
        />

        <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
      </div>
    </div>
  );
}