"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";
import { apiGet, unwrapItems } from "@/src/lib/api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}
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

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition border";
  const styles: Record<string, string> = {
    primary: "bg-white text-black border-white hover:bg-neutral-200",
    secondary: "bg-white/5 text-white border-white/10 hover:bg-white/10",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
    ghost: "bg-transparent text-white border-transparent hover:bg-white/10",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(base, styles[variant], disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
}

function Badge({ value }: { value: string }) {
  const v = String(value || "").toUpperCase();
  const cls =
    v === "OPEN" || v === "IN_PROGRESS"
      ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
      : v === "COMPLETED"
      ? "bg-green-500/15 text-green-200 border-green-500/30"
      : v === "CANCELED"
      ? "bg-red-500/15 text-red-200 border-red-500/30"
      : "bg-white/5 text-white border-white/10";
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs", cls)}>{v}</span>;
}

type WorkOrderListItem = {
  id: string;
  status?: string | null;
  type?: string | null;
  vendor_name?: string | null;
  opened_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  vehicle_id?: string | null;
  vehicles?: {
    fleet_no?: string | null;
    plate_no?: string | null;
    display_name?: string | null;
  } | null;
};

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

  async function load() {
    if (!token) return;

    setLoading(true);
    setErr(null);

    try {
      // ✅ نستخدم api.ts (baseURL + token automatically)
      const res = await apiGet(`/maintenance/work-orders`, {
        page,
        limit,
        q: q.trim() ? q.trim() : undefined,
        status: status ? status : undefined,
      });

      const arr = unwrapItems<WorkOrderListItem>(res);
      setItems(arr);
    } catch (e: any) {
      setItems([]);
      setErr(e?.message || "Failed to load");
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

  // ✅ حالة "لسه بنحمّل الجلسة"
  if (!token) {
    return (
      <div className="space-y-4 p-4 text-white">
        <Card title={t("woList.title") || "Work Orders"}>
          <div className="text-sm text-white/70">
            {t("common.loadingSession") || "Loading session…"}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-white/70">{t("woList.breadcrumb") || "Maintenance / Work Orders"}</div>
          <div className="text-xl font-semibold">{t("woList.title") || "Work Orders"}</div>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          {t("common.refresh") || "Refresh"}
        </Button>
      </div>

      <Card
        title={t("woList.filters") || "Filters"}
        right={
          <div className="text-xs text-white/60">
            {t("common.count") || "Count"}: {filteredLocal.length}
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs text-white/60">{t("common.search") || "Search"}</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none text-white placeholder:text-white/40"
              placeholder={t("woList.searchPlaceholder") || "id / vendor / vehicle…"}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-white/60">{t("common.status") || "Status"}</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none text-white"
            >
              <option className="bg-neutral-900" value="">
                {t("common.all") || "All"}
              </option>
              <option className="bg-neutral-900" value="OPEN">
                OPEN
              </option>
              <option className="bg-neutral-900" value="IN_PROGRESS">
                IN_PROGRESS
              </option>
              <option className="bg-neutral-900" value="COMPLETED">
                COMPLETED
              </option>
              <option className="bg-neutral-900" value="CANCELED">
                CANCELED
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
              disabled={loading}
            >
              {t("common.apply") || "Apply"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setQ("");
                setStatus("");
                setPage(1);
              }}
            >
              {t("common.clear") || "Clear"}
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title={t("woList.list") || "List"}
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
            >
              ←
            </Button>
            <div className="text-xs text-white/60">
              {t("common.page") || "Page"}: {page}
            </div>
            <Button variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={loading}>
              →
            </Button>
          </div>
        }
      >
        {loading ? (
          <div className="text-sm text-white/70">{t("common.loading") || "Loading…"}</div>
        ) : err ? (
          <div className="text-sm text-red-200">
            {t("common.error") || "Error"}: {err}
          </div>
        ) : filteredLocal.length === 0 ? (
          <div className="text-sm text-white/70">{t("common.noData") || "No data"}</div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-white/10">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="p-3 text-left">{t("woList.id") || "ID"}</th>
                  <th className="p-3 text-left">{t("woList.vehicle") || "Vehicle"}</th>
                  <th className="p-3 text-left">{t("woList.vendor") || "Vendor"}</th>
                  <th className="p-3 text-left">{t("woList.type") || "Type"}</th>
                  <th className="p-3 text-left">{t("common.status") || "Status"}</th>
                  <th className="p-3 text-left">{t("woList.opened") || "Opened"}</th>
                  <th className="p-3 text-left">{t("common.actions") || "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocal.map((x) => (
                  <tr key={x.id} className="border-t border-white/10">
                    <td className="p-3">
                      <div className="font-semibold">{shortId(x.id)}</div>
                      <div className="text-xs font-mono text-white/50">{x.id}</div>
                    </td>
                    <td className="p-3">
                      {x.vehicles?.fleet_no ? `${x.vehicles.fleet_no} - ` : ""}
                      {x.vehicles?.plate_no || x.vehicles?.display_name || "—"}
                      <div className="text-xs font-mono text-white/50">
                        vehicle_id: {shortId(x.vehicle_id)}
                      </div>
                    </td>
                    <td className="p-3">{x.vendor_name || "—"}</td>
                    <td className="p-3">{x.type || "—"}</td>
                    <td className="p-3">{x.status ? <Badge value={String(x.status)} /> : "—"}</td>
                    <td className="p-3">{fmtDate(x.opened_at)}</td>
                    <td className="p-3">
                      <Link href={`/maintenance/work-orders/${encodeURIComponent(x.id)}`}>
                        <Button variant="secondary">{t("common.view") || "View"}</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}