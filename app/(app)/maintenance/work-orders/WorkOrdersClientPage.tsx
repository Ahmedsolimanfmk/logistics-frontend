"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/store/auth";
import { useSearchParams, useRouter } from "next/navigation";
import { api, unwrapItems } from "@/src/lib/api";
import { useT } from "@/src/i18n/useT";

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
function roleUpper(r: any) {
  return String(r || "").trim().toUpperCase();
}
function isAdminOrAccountant(role: any) {
  const rr = roleUpper(role);
  return rr === "ADMIN" || rr === "ACCOUNTANT";
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

const selectCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none text-white";
const optionCls = "bg-neutral-900 text-white";

function statusLabel(v: string) {
  const s = String(v || "").toUpperCase();
  if (!s) return "ALL";
  return s.replace(/_/g, " ");
}

type WorkOrderRow = {
  id: string;
  status: string;
  type: string;
  vendor_name?: string | null;
  opened_at?: string | null;
  completed_at?: string | null;
  vehicle_id?: string | null;
  vehicles?: {
    id: string;
    plate_no?: string | null;
    fleet_no?: string | null;
    display_name?: string | null;
    status?: string | null;
  } | null;
};

export default function WorkOrdersClientPage() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  const role = user?.role;
  const canSee = isAdminOrAccountant(role);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WorkOrderRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const initialStatus = searchParams.get("status") || "";
  const initialQ = searchParams.get("q") || "";
  const initialQa = searchParams.get("qa") || "";
  const initialParts = searchParams.get("parts") || "";

  const [status, setStatus] = useState<string>(initialStatus);
  const [q, setQ] = useState<string>(initialQ);
  const [qa, setQa] = useState<string>(initialQa);
  const [parts, setParts] = useState<string>(initialParts);

  useEffect(() => {
    setStatus(initialStatus);
    setQ(initialQ);
    setQa(initialQa);
    setParts(initialParts);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus, initialQ, initialQa, initialParts]);

  async function fetchList(params: any) {
    const res: any = await api.get("/maintenance/work-orders", { params });
    const list = unwrapItems<WorkOrderRow>(res);
    const meta = (res?.meta || res?.data?.meta || null) as any;
    const pageOut = Number(res?.page ?? res?.data?.page ?? meta?.page ?? params.page ?? 1);
    const totalOut = Number(res?.total ?? res?.data?.total ?? meta?.total ?? 0);
    return {
      items: list,
      page: Number.isFinite(pageOut) ? pageOut : 1,
      total: Number.isFinite(totalOut) ? totalOut : 0,
    };
  }

  async function load(p = page) {
    if (!token) return;
    setLoading(true);

    try {
      const normalizedStatus = String(status || "").toUpperCase().trim();

      // ✅ بدون تعديل باك: لو "OPEN,IN_PROGRESS" نعمل طلبين ونضمهم
      if (normalizedStatus === "OPEN,IN_PROGRESS") {
        const [a, b] = await Promise.all([
          fetchList({ page: p, limit, status: "OPEN", q: q || undefined }),
          fetchList({ page: p, limit, status: "IN_PROGRESS", q: q || undefined }),
        ]);

        const merged = [...(a.items || []), ...(b.items || [])];

        // dedupe by id
        const map = new Map<string, WorkOrderRow>();
        for (const it of merged) map.set(it.id, it);
        const out = Array.from(map.values());

        setItems(out);
        setTotal(out.length);
        setPage(p);
        return;
      }

      const out = await fetchList({
        page: p,
        limit,
        status: status || undefined,
        q: q || undefined,
        // qa/parts display-only هنا
      });

      setItems(out.items);
      setTotal(out.total);
      setPage(out.page);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  if (token === null) {
    return (
      <div className="p-4 text-white">
        <Card title={t("workOrders.title")}>
          <div className="text-sm text-white/70">{t("common.loadingSession")}</div>
        </Card>
      </div>
    );
  }

  if (!canSee) {
    return (
      <div className="p-4 text-white">
        <Card title={t("workOrders.title")}>
          <div className="text-sm text-white/70">
            {t("workOrders.roleOnly")}
            <div className="mt-2 text-xs text-white/50">
              {t("common.role")} = {String(role ?? "—")}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-white/70">{t("tabs.maintenance")}</div>
          <div className="text-xl font-semibold">{t("workOrders.title")}</div>
          <div className="text-xs text-white/50">
            {t("workOrders.filtersFromUrl")} status={statusLabel(status)} • qa={qa || "—"} • parts=
            {parts || "—"}
          </div>

          {qa || parts ? (
            <div className="text-[11px] text-amber-200/80">{t("workOrders.noteQaPartsDisplay")}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/maintenance/requests">
            <Button variant="secondary">{t("workOrders.actions.backToRequests")}</Button>
          </Link>

          <Button
            variant="secondary"
            onClick={() => {
              router.push("/maintenance/work-orders");
            }}
          >
            {t("workOrders.actions.clearUrlFilters")}
          </Button>

          <Button variant="secondary" onClick={() => load(page)} disabled={loading}>
            {t("workOrders.actions.refresh")}
          </Button>
        </div>
      </div>

      <Card
        title={t("workOrders.filters.title")}
        right={
          <div className="text-xs text-white/60">
            {t("common.total")}: <span className="text-white font-semibold">{total}</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs text-white/60 mb-1">{t("workOrders.filters.status")}</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              <option value="" className={optionCls}>
                {t("workOrders.status.all")}
              </option>
              <option value="OPEN" className={optionCls}>
                {t("workOrders.status.open")}
              </option>
              <option value="IN_PROGRESS" className={optionCls}>
                {t("workOrders.status.inProgress")}
              </option>
              <option value="COMPLETED" className={optionCls}>
                {t("workOrders.status.completed")}
              </option>
              <option value="CANCELED" className={optionCls}>
                {t("workOrders.status.canceled")}
              </option>

              <option value="OPEN,IN_PROGRESS" className={optionCls}>
                {t("workOrders.status.openPlusInProgress")}
              </option>
            </select>

            <div className="mt-1 text-[11px] text-white/50">
              {t("workOrders.filters.selected")}:{" "}
              <span className="text-white/80">{statusLabel(status)}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-white/60 mb-1">{t("workOrders.filters.qaDisplayOnly")}</div>
            <select value={qa} onChange={(e) => setQa(e.target.value)} className={selectCls}>
              <option value="" className={optionCls}>
                {t("workOrders.status.all")}
              </option>
              <option value="needs" className={optionCls}>
                {t("dashboard.maintenance.qaNeeds.title")}
              </option>
              <option value="failed" className={optionCls}>
                {t("dashboard.maintenance.qaFailed.title")}
              </option>
            </select>
          </div>

          <div>
            <div className="text-xs text-white/60 mb-1">
              {t("workOrders.filters.partsDisplayOnly")}
            </div>
            <select value={parts} onChange={(e) => setParts(e.target.value)} className={selectCls}>
              <option value="" className={optionCls}>
                {t("workOrders.status.all")}
              </option>
              <option value="mismatch" className={optionCls}>
                {t("dashboard.maintenance.partsMismatch.title")}
              </option>
            </select>
          </div>

          <div className="md:col-span-4">
            <div className="text-xs text-white/60 mb-1">{t("workOrders.filters.searchTitle")}</div>
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("common.search")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none text-white placeholder:text-white/40"
              />
              <Button
                variant="primary"
                onClick={() => {
                  setPage(1);
                  load(1);
                }}
                disabled={loading}
              >
                {t("workOrders.filters.searchBtn")}
              </Button>
            </div>

            <div className="mt-2 text-[11px] text-white/50">
              {t("workOrders.tips.cardsSendStatusInUrl")}
            </div>
          </div>
        </div>
      </Card>

      <Card title={t("workOrders.list.title")}>
        {loading ? (
          <div className="text-sm text-white/70">{t("workOrders.list.loading")}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-white/70">{t("workOrders.list.empty")}</div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-white/10">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="text-left p-3">{t("workOrders.list.columns.opened")}</th>
                  <th className="text-left p-3">{t("workOrders.list.columns.vehicle")}</th>
                  <th className="text-left p-3">{t("workOrders.list.columns.type")}</th>
                  <th className="text-left p-3">{t("workOrders.list.columns.vendor")}</th>
                  <th className="text-left p-3">{t("workOrders.list.columns.status")}</th>
                  <th className="text-left p-3">{t("workOrders.list.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((wo) => (
                  <tr key={wo.id} className="border-t border-white/10">
                    <td className="p-3">{fmtDate(wo.opened_at)}</td>
                    <td className="p-3">
                      <div className="font-semibold">
                        {wo.vehicles?.fleet_no ? `${wo.vehicles.fleet_no} - ` : ""}
                        {wo.vehicles?.plate_no || wo.vehicles?.display_name || "—"}
                      </div>
                      <div className="text-xs text-white/50 font-mono">{shortId(wo.vehicle_id)}</div>
                    </td>
                    <td className="p-3">{wo.type || "—"}</td>
                    <td className="p-3">{wo.vendor_name || "—"}</td>
                    <td className="p-3">
                      <Badge value={wo.status} />
                    </td>
                    <td className="p-3">
                      <Link href={`/maintenance/work-orders/${wo.id}`} className="underline text-white">
                        {t("workOrders.list.view")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-white/60">
          <div>
            {t("workOrders.pagination.page")} {page} / {pages}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={loading || page <= 1} onClick={() => load(page - 1)}>
              {t("common.prev")}
            </Button>
            <Button variant="secondary" disabled={loading || page >= pages} onClick={() => load(page + 1)}>
              {t("common.next")}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
