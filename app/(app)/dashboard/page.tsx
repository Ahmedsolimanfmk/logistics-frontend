// app/(app)/dashboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter } from "next/navigation";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";
import { useT } from "@/src/i18n/useT";

// =====================
// Helpers
// =====================
function getCurrentLocale(): string {
  if (typeof window === "undefined") return "ar-EG";
  const v = localStorage.getItem("app_lang");
  return v === "en" ? "en-US" : "ar-EG";
}

const fmtInt = (n: unknown) =>
  new Intl.NumberFormat(getCurrentLocale(), { maximumFractionDigits: 0 }).format(
    Number(n ?? 0)
  );

const fmtMoney = (n: unknown) =>
  new Intl.NumberFormat(getCurrentLocale(), { maximumFractionDigits: 0 }).format(
    Number(n ?? 0)
  );

const fmtDate = (d: unknown) => {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString(getCurrentLocale());
};

const shortId = (id: unknown) => {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
};

async function safeCopy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

type TabKey = "operations" | "finance" | "maintenance" | "dev";
const TAB_STORAGE_KEY = "dash_active_tab_v1";

type TrendPoint = { label: string; value: number };

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

// ===== KPI Delta (lightweight) =====
function deltaFromSeries(points: TrendPoint[] | null | undefined) {
  const arr = points || [];
  const last = Number(arr[arr.length - 1]?.value ?? 0);
  const prev = Number(arr[arr.length - 2]?.value ?? 0);

  if (!prev && !last) return { pct: 0, dir: "flat" as const, last, prev };
  if (!prev && last) return { pct: 100, dir: "up" as const, last, prev };

  const pct = Math.round(((last - prev) / Math.abs(prev)) * 100);
  const dir = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
  return { pct, dir, last, prev };
}

function DeltaBadge({ points }: { points: TrendPoint[] | null | undefined }) {
  const d = deltaFromSeries(points);
  const cls =
    d.dir === "up"
      ? "bg-emerald-500/10 text-emerald-200 border-emerald-400/20"
      : d.dir === "down"
      ? "bg-rose-500/10 text-rose-200 border-rose-400/20"
      : "bg-slate-500/10 text-slate-200 border-white/10";
  const icon = d.dir === "up" ? "↑" : d.dir === "down" ? "↓" : "•";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
        cls
      )}
    >
      <span>{icon}</span>
      <span>{d.pct}%</span>
      <span className="opacity-70">vs prev</span>
    </span>
  );
}

function EmptyNice({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{hint}</div>
    </div>
  );
}

// =====================
// Role-based tabs
// =====================
function roleUpper(r?: string) {
  return String(r || "").toUpperCase();
}

function getAllowedTabs(role?: string): TabKey[] {
  const r = roleUpper(role);

  if (r === "ADMIN") return ["operations", "finance", "maintenance", "dev"];
  if (r === "FIELD_SUPERVISOR") return ["operations", "maintenance"];
  if (r === "FINANCE" || r === "ACCOUNTANT") return ["operations", "finance"];
  return ["operations"];
}

function canSeeDev(role?: string) {
  return process.env.NODE_ENV === "development" && roleUpper(role) === "ADMIN";
}

function isAdminOrAccountant(role?: string) {
  const r = roleUpper(role);
  return r === "ADMIN" || r === "ACCOUNTANT";
}

// =====================
// UI atoms
// =====================
function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base md:text-lg font-semibold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Tabs({
  value,
  items,
  onChange,
}: {
  value: TabKey;
  items: { key: TabKey; label: string; count?: number }[];
  onChange: (k: TabKey) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cn(
              "px-3 py-2 rounded-xl border text-sm transition",
              active
                ? "bg-orange-500/15 border-orange-400/30 text-orange-100"
                : "bg-slate-950/20 border-white/10 text-slate-200 hover:bg-white/5"
            )}
          >
            {it.label}
            {typeof it.count === "number" ? (
              <span className="ml-2 text-xs opacity-80">({it.count})</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function DataTable({
  title,
  rows,
  columns,
  empty = "No data",
  searchable = false,
  onRowClick,
  right,
}: {
  title: string;
  rows: any[];
  columns: {
    key: string;
    label: string;
    render?: (r: any) => React.ReactNode;
    className?: string;
  }[];
  empty?: React.ReactNode | string;
  searchable?: boolean;
  onRowClick?: (r: any) => void;
  right?: React.ReactNode;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!searchable) return rows || [];
    const s = q.trim().toLowerCase();
    if (!s) return rows || [];
    return (rows || []).filter((r) =>
      JSON.stringify(r).toLowerCase().includes(s)
    );
  }, [rows, q, searchable]);

  const clickable = Boolean(onRowClick);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{title}</div>

        <div className="flex items-center gap-2">
          {right}
          {searchable ? (
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="px-3 py-1.5 rounded-lg bg-slate-950/30 border border-white/10 text-sm text-slate-100 outline-none"
            />
          ) : null}
          <span className="text-xs text-slate-400">
            {fmtInt(filtered.length)} rows
          </span>
        </div>
      </div>

      {!filtered.length ? (
        <div className="p-5 text-sm text-slate-300">
          {typeof empty === "string" ? empty : empty}
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "text-left font-medium text-slate-200 px-4 py-2 whitespace-nowrap",
                      c.className
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "border-t border-white/10 hover:bg-white/5",
                    clickable && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (onRowClick) onRowClick(r);
                  }}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-2 text-slate-200 whitespace-nowrap",
                        c.className
                      )}
                    >
                      {c.render ? c.render(r) : String(r?.[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MiniChart({
  title,
  points,
  valueKey,
}: {
  title: string;
  points: TrendPoint[];
  valueKey: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-white mb-3">{title}</div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" hide />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={valueKey} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ActionTile({
  title,
  value,
  hint,
  tone = "neutral",
  href,
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "warn" | "danger" | "good";
  href?: string;
}) {
  const toneCls =
    tone === "danger"
      ? "border-rose-500/20 bg-rose-500/10"
      : tone === "warn"
      ? "border-amber-500/20 bg-amber-500/10"
      : tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/10"
      : "border-white/10 bg-white/5";

  const Body = (
    <div className={cn("rounded-2xl border p-4 shadow-sm", toneCls)}>
      <div className="text-xs text-slate-300">{title}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-slate-300/80">{hint}</div>
      ) : null}
      {href ? (
        <div className="mt-3">
          <span className="inline-flex text-xs text-orange-200/90 underline">
            Open →
          </span>
        </div>
      ) : null}
    </div>
  );

  // ✅ Next Link instead of <a>
  return href ? (
    <Link href={href} className="block">
      {Body}
    </Link>
  ) : (
    Body
  );
}

function CompactKpi({
  title,
  value,
  sub,
  right,
  href,
}: {
  title: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  href?: string;
}) {
  const Body = (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-300">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
          {sub ? <div className="mt-1 text-xs text-slate-400">{sub}</div> : null}
        </div>
        {right}
      </div>
    </div>
  );

  // ✅ Next Link instead of <a>
  return href ? (
    <Link href={href} className="block">
      {Body}
    </Link>
  ) : (
    Body
  );
}

// =====================
// Page
// =====================
export default function DashboardPage() {
  const router = useRouter();

  const t = useT();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (token === null) return;
    if (!token) window.location.href = "/login";
  }, [token]);

  const allowedTabs = useMemo(() => getAllowedTabs(user?.role), [user?.role]);
  const isAdminAcc = useMemo(() => isAdminOrAccountant(user?.role), [user?.role]);

  const [tab, setTab] = useState<TabKey>("operations");
  const [summary, setSummary] = useState<any>(null);
  const [bundle, setBundle] = useState<any>(null);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Restore tab
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY) as TabKey | null;
      if (saved && allowedTabs.includes(saved)) setTab(saved);
      else setTab(allowedTabs[0] || "operations");
    } catch {
      setTab(allowedTabs[0] || "operations");
    }
  }, [allowedTabs]);

  const changeTab = (t: TabKey) => {
    if (!allowedTabs.includes(t)) return;
    setTab(t);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, t);
    } catch {}
  };

  const fetchSummary = async (activeTab: TabKey) => {
    setLoadingSummary(true);
    setErr(null);
    try {
      const data = await api.get(`/dashboard/summary?tab=${activeTab}`);
      setSummary(data);
    } catch (e: any) {
      setErr(e?.message || "Failed");
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchBundleIfNeeded = async (activeTab: TabKey) => {
    // charts only for Operations
    if (activeTab !== "operations") {
      setBundle(null);
      setLoadingCharts(false);
      return;
    }

    setLoadingCharts(true);
    try {
      const data = await api.get("/dashboard/trends/bundle?bucket=daily");
      setBundle(data);
    } catch {
      setBundle(null);
    } finally {
      setLoadingCharts(false);
    }
  };

  const reloadAll = async () => {
    await Promise.all([fetchSummary(tab), fetchBundleIfNeeded(tab)]);
  };

  // Load on tab change
  useEffect(() => {
    if (!token) return;
    let cancel = false;

    (async () => {
      await fetchSummary(tab);
      if (cancel) return;
      await fetchBundleIfNeeded(tab);
    })();
    
    
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tab]);

  const cards = summary?.cards || {};
  const tables = summary?.tables || {};
  const alerts = summary?.alerts || {};

  // Tab counts
  const tabItems = useMemo(() => {
    const opsCount = Number(
      alerts?.active_trips_now_count ?? tables?.active_trips_now?.length ?? 0
    );
    const finCount =
      Number(alerts?.advances_open ?? 0) +
      Number(alerts?.expenses_pending_too_long ?? 0);

    const m = cards?.maintenance || {};
    const mntCount =
      Number(m?.open_work_orders ?? 0) + Number(m?.qa_needs ?? 0);

    const items: { key: TabKey; label: string; count?: number }[] = [];

    if (allowedTabs.includes("operations"))
      items.push({ key: "operations", label: t("tabs.operations"), count: opsCount });

    if (allowedTabs.includes("finance"))
      items.push({ key: "finance", label: "Finance", count: finCount });

    if (allowedTabs.includes("maintenance"))
      items.push({ key: "maintenance", label: "Maintenance", count: mntCount });

    if (allowedTabs.includes("dev") && canSeeDev(user?.role))
      items.push({ key: "dev", label: "Dev" });

    return items;
  }, [allowedTabs, alerts, tables, cards, user?.role]);

  const chartData = useMemo(() => {
    if (!bundle) return null;
    const pick = (arr: any[]): TrendPoint[] =>
      (arr || []).map((x) => ({
        label: x.label || x.bucket,
        value: Number(x.value || 0),
      }));

    return {
      trips_created: pick(bundle.trips_created),
      trips_assigned: pick(bundle.trips_assigned),
      expenses_approved: pick(bundle.expenses_approved),
      expenses_pending: pick(bundle.expenses_pending),
    };
  }, [bundle]);

  // ===== Derived numbers =====
  const ops = useMemo(() => {
    const tripsTodayTotal = Number(cards?.trips_today?.total ?? 0);
    const activeNow = Number(tables?.active_trips_now?.length ?? 0);
    const needingClose = Number(tables?.trips_needing_finance_close?.length ?? 0);

    const toneActive = activeNow >= 10 ? "warn" : activeNow > 0 ? "neutral" : "good";
    const toneClose = needingClose > 0 ? "danger" : "good";

    return { tripsTodayTotal, activeNow, needingClose, toneActive, toneClose } as const;
  }, [cards, tables]);

  const fin = useMemo(() => {
    const pendingTooLong = Number(alerts?.expenses_pending_too_long ?? 0);
    const advancesOpen = Number(alerts?.advances_open ?? 0);
    const tonePending = pendingTooLong > 0 ? "warn" : "good";
    const toneAdv = advancesOpen > 0 ? "neutral" : "good";
    return { pendingTooLong, advancesOpen, tonePending, toneAdv } as const;
  }, [alerts]);

  const mnt = useMemo(() => {
    const m = cards?.maintenance || {};
    const openWos = Number(m.open_work_orders ?? 0);
    const completedToday = Number(m.completed_today ?? 0);
    const costToday = Number(m.maintenance_cost_today ?? 0);
    const qaNeeds = Number(m.qa_needs ?? 0);
    const qaFailed = Number(m.qa_failed ?? 0);
    const mismatch = Number(m.parts_mismatch ?? 0);

    const toneOpen = openWos > 0 ? "neutral" : "good";
    const toneQa = qaNeeds > 0 ? "warn" : "good";
    const toneFail = qaFailed > 0 ? "danger" : "good";
    const toneMismatch = mismatch > 0 ? "warn" : "good";

    return {
      openWos,
      completedToday,
      costToday,
      qaNeeds,
      qaFailed,
      mismatch,
      toneOpen,
      toneQa,
      toneFail,
      toneMismatch,
    } as const;
  }, [cards]);

  // ✅ Make Maintenance cards clickable for supervisors too
  const maintenanceOpenHref = useMemo(() => {
    if (isAdminAcc) return "/maintenance/work-orders?status=OPEN,IN_PROGRESS";
    return "/maintenance/requests?status=APPROVED";
  }, [isAdminAcc]);

  const maintenanceQaNeedsHref = useMemo(() => {
    if (isAdminAcc) return "/maintenance/work-orders?status=COMPLETED&qa=needs";
    return "/maintenance/requests?status=APPROVED";
  }, [isAdminAcc]);

  const maintenanceFailedHref = useMemo(() => {
    if (isAdminAcc) return "/maintenance/reports?road_test_result=FAIL";
    return "/maintenance/requests";
  }, [isAdminAcc]);

  const maintenanceMismatchHref = useMemo(() => {
    if (isAdminAcc) return "/maintenance/work-orders?parts=mismatch";
    return "/maintenance/requests";
  }, [isAdminAcc]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        {/* Header */}
<div className="flex flex-wrap items-center justify-between gap-3">
  <div>
    <div className="text-xl font-bold">{t("dashboard.title")}</div>
    <div className="text-sm text-slate-400">
      {user?.full_name || "—"} — {user?.role || "—"}
    </div>
  </div>

  <div className="flex items-center gap-2">
    <LanguageSwitcher />

    <button
      type="button"
      onClick={reloadAll}
      className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
    >
      {t("common.refresh")}
    </button>

    <button
      type="button"
      onClick={() => {
        logout();
        window.location.href = "/login";
      }}
      className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
    >
      {t("common.logout")}
    </button>
  </div>
</div>

        {/* Error */}
        {err ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            {err}
          </div>
        ) : null}

        {/* Tabs */}
        <Tabs value={tab} items={tabItems} onChange={changeTab} />

        {/* Loading */}
        {loadingSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="h-4 w-28 bg-white/10 rounded" />
                <div className="mt-3 h-8 w-16 bg-white/10 rounded" />
                <div className="mt-2 h-3 w-36 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ===================== OPERATIONS ===================== */}
            {tab === "operations" && (
              <div className="space-y-6">
                <Section
                  title="Operations – Action Required"
                  right={
                    <span className="text-xs text-slate-400">
                      Last refresh: {new Date().toLocaleTimeString("ar-EG")}
                    </span>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ActionTile
                      title="Trips Needing Finance Close"
                      value={fmtInt(ops.needingClose)}
                      hint={
                        ops.needingClose
                          ? "Completed trips are waiting reconciliation"
                          : "✓ Everything is reconciled"
                      }
                      tone={ops.toneClose}
                      href="/trips?status=COMPLETED&financial_closed_at=null"
                    />

                    <ActionTile
                      title="Active Trips Now"
                      value={fmtInt(ops.activeNow)}
                      hint={
                        ops.activeNow
                          ? "Assigned / In progress (follow-up dispatch)"
                          : "✓ All vehicles are idle"
                      }
                      tone={ops.toneActive as any}
                      href="/trips?status=ASSIGNED,IN_PROGRESS"
                    />

                    <ActionTile
                      title="Trips Today"
                      value={fmtInt(ops.tripsTodayTotal)}
                      hint="Open today trips list"
                      tone={ops.tripsTodayTotal ? "neutral" : "good"}
                      href="/trips?range=today"
                    />
                  </div>
                </Section>

                <Section title="Quick KPIs">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CompactKpi
                      title="Trips Today"
                      value={fmtInt(cards?.trips_today?.total)}
                      sub="All statuses"
                      right={<DeltaBadge points={chartData?.trips_created} />}
                      href="/trips?range=today"
                    />
                    <CompactKpi
                      title="Assigned Today"
                      value={fmtInt(cards?.trips_today?.ASSIGNED ?? 0)}
                      sub="Assigned status"
                      href="/trips?range=today&status=ASSIGNED"
                    />
                    <CompactKpi
                      title="In Progress Today"
                      value={fmtInt(cards?.trips_today?.IN_PROGRESS ?? 0)}
                      sub="In progress status"
                      href="/trips?range=today&status=IN_PROGRESS"
                    />
                    <CompactKpi
                      title="Completed Today"
                      value={fmtInt(cards?.trips_today?.COMPLETED ?? 0)}
                      sub="Completed status"
                      href="/trips?range=today&status=COMPLETED"
                    />
                  </div>
                </Section>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <DataTable
                    title="Active Trips Now"
                    rows={tables?.active_trips_now || []}
                    searchable
                    empty={<EmptyNice title="No active trips now" hint="✓ All vehicles are idle" />}
                    onRowClick={(r) => {
                      if (r?.trip_id) router.push(`/trips/${r.trip_id}`);
                    }}
                    columns={[
                      {
                        key: "trip_id",
                        label: "Trip",
                        render: (r) => (
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{shortId(r.trip_id)}</span>
                            <button
                              className="text-xs text-orange-200/80 hover:text-orange-100 underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                safeCopy(String(r.trip_id || ""));
                              }}
                              type="button"
                            >
                              Copy
                            </button>
                          </div>
                        ),
                      },
                      { key: "trip_status", label: "Status" },
                      { key: "client", label: "Client" },
                      { key: "site", label: "Site" },
                      { key: "vehicle_plate_number", label: "Vehicle" },
                      { key: "driver_name", label: "Driver" },
                      {
                        key: "trip_created_at",
                        label: "Created",
                        render: (r) => fmtDate(r.trip_created_at),
                      },
                    ]}
                  />

                  <DataTable
                    title="Trips Needing Finance Close"
                    rows={tables?.trips_needing_finance_close || []}
                    searchable
                    empty={<EmptyNice title="No trips need close" hint="✓ Everything is reconciled" />}
                    onRowClick={(r) => {
                      if (r?.id) router.push(`/trips/${r.id}`);
                    }}
                    columns={[
                      {
                        key: "id",
                        label: "Trip",
                        render: (r) => <span className="font-mono">{shortId(r.id)}</span>,
                      },
                      { key: "status", label: "Status" },
                      { key: "financial_status", label: "Financial" },
                      { key: "client", label: "Client" },
                      { key: "site", label: "Site" },
                      {
                        key: "created_at",
                        label: "Created",
                        render: (r) => fmtDate(r.created_at),
                      },
                    ]}
                  />
                </div>

                <Section
                  title="Trips Trend (Last 14 days)"
                  right={
                    loadingCharts ? (
                      <span className="text-xs text-slate-400">Loading…</span>
                    ) : chartData ? (
                      <span className="text-xs text-slate-400">Daily</span>
                    ) : (
                      <span className="text-xs text-slate-400">Unavailable</span>
                    )
                  }
                >
                  {loadingCharts ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="h-4 w-40 bg-white/10 rounded" />
                        <div className="mt-3 h-44 bg-white/10 rounded" />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="h-4 w-40 bg-white/10 rounded" />
                        <div className="mt-3 h-44 bg-white/10 rounded" />
                      </div>
                    </div>
                  ) : chartData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <MiniChart title="Trips Created" points={chartData.trips_created} valueKey="value" />
                      <MiniChart title="Trips Assigned" points={chartData.trips_assigned} valueKey="value" />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                      Trends endpoint not available.
                    </div>
                  )}
                </Section>
              </div>
            )}

            {/* ===================== FINANCE ===================== */}
            {tab === "finance" && (
              <div className="space-y-6">
                <Section title="Finance – Action Required">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ActionTile
                      title="Pending Expenses Too Long"
                      value={fmtInt(fin.pendingTooLong)}
                      hint={fin.pendingTooLong ? "Needs review/approval" : "✓ No delayed pending expenses"}
                      tone={fin.tonePending as any}
                     href="/finance?tab=pending"
                  />

                    <ActionTile
                      title="Open Advances"
                      value={fmtInt(fin.advancesOpen)}
                      hint={fin.advancesOpen ? "Advances need settlement" : "✓ No open advances"}
                      tone={fin.toneAdv as any}
                      href="/finance?tab=advances"
                  />

                    <ActionTile
                      title="Expenses Today (Approved)"
                     value={fmtMoney(cards?.expenses_today?.APPROVED ?? 0)}
                     hint="Approved amount today"
                     tone={Number(cards?.expenses_today?.APPROVED ?? 0) > 0 ? "neutral" : "good"}
                      href="/finance/expenses?status=APPROVED"
                  />

                  </div>
                </Section>

                <Section title="Top Expense Types (Today)">
                  <DataTable
                    title="Top Expense Types Today"
                    rows={tables?.top_expense_types_today || []}
                    searchable
                    empty={<EmptyNice title="No approved expenses today" hint="No data to show" />}
                    columns={[
                      { key: "expense_type", label: "Type" },
                      { key: "amount", label: "Amount", render: (r) => fmtMoney(r.amount) },
                    ]}
                  />
                </Section>
              </div>
            )}

            {/* ===================== MAINTENANCE ===================== */}
            {tab === "maintenance" && (
              <div className="space-y-6">
                <Section title="Maintenance – Action Required">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <ActionTile
                      title="Open Work Orders"
                      value={fmtInt(mnt.openWos)}
                      hint={mnt.openWos ? "Work orders in OPEN / IN_PROGRESS" : "✓ No open work orders"}
                      tone={mnt.toneOpen as any}
                      href={maintenanceOpenHref}
                    />
                    <ActionTile
                      title="QA Needs"
                      value={fmtInt(mnt.qaNeeds)}
                      hint={mnt.qaNeeds ? "Completed WOs missing post report" : "✓ QA is clean"}
                      tone={mnt.toneQa as any}
                      href={maintenanceQaNeedsHref}
                    />
                    <ActionTile
                      title="QA Failed"
                      value={fmtInt(mnt.qaFailed)}
                      hint={mnt.qaFailed ? "Road test failed reports" : "✓ No QA failures"}
                      tone={mnt.toneFail as any}
                      href={maintenanceFailedHref}
                    />
                    <ActionTile
                      title="Parts Mismatch"
                      value={fmtInt(mnt.mismatch)}
                      hint={mnt.mismatch ? "Issued vs installed mismatch" : "✓ No mismatches"}
                      tone={mnt.toneMismatch as any}
                      href={maintenanceMismatchHref}
                    />
                  </div>

                  {!isAdminAcc ? (
                    <div className="mt-2 text-xs text-slate-400">
                      ملاحظة: عرض Work Orders التفصيلي للأدمن/المحاسب — للمشرف هتفتح صفحة Requests كبديل.
                    </div>
                  ) : null}
                </Section>

                <Section title="Maintenance KPIs (Today)">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CompactKpi title="Completed Today" value={fmtInt(mnt.completedToday)} sub="Completed work orders" />
                    <CompactKpi
                      title="Parts Cost Today"
                      value={fmtMoney(cards?.maintenance?.maintenance_parts_cost_today ?? 0)}
                      sub="Inventory issues total"
                    />
                    <CompactKpi
                      title="Cash Cost Today"
                      value={fmtMoney(cards?.maintenance?.maintenance_cash_cost_today ?? 0)}
                      sub="WO linked cash expenses"
                    />
                    <CompactKpi
                      title="Total Cost Today"
                      value={fmtMoney(cards?.maintenance?.maintenance_cost_today ?? 0)}
                      sub="Parts + Cash"
                    />
                  </div>
                </Section>

                <Section
                  title="Recent Work Orders"
                  right={
                    <Link
                      href={isAdminAcc ? "/maintenance/work-orders" : "/maintenance/requests"}
                      className="text-xs text-orange-200/90 underline"
                    >
                      Open list →
                    </Link>
                  }
                >
                  <DataTable
                    title="Maintenance Work Orders (Recent)"
                    rows={tables?.maintenance_recent_work_orders || []}
                    searchable
                    empty={<EmptyNice title="No work orders" hint="No recent work orders found." />}
                    onRowClick={(r) => {
                      // Admin sees details, supervisor goes to requests as fallback
                      if (isAdminAcc && r?.id) router.push(`/maintenance/work-orders/${r.id}`);
                      else router.push(`/maintenance/requests`);
                    }}
                    columns={[
                      { key: "id", label: "WO", render: (r) => <span className="font-mono">{shortId(r.id)}</span> },
                      { key: "status", label: "Status" },
                      { key: "type", label: "Type" },
                      {
                        key: "vehicle_id",
                        label: "Vehicle",
                        render: (r) => <span className="font-mono">{shortId(r.vehicle_id)}</span>,
                      },
                      { key: "opened_at", label: "Opened", render: (r) => fmtDate(r.opened_at) },
                      { key: "completed_at", label: "Completed", render: (r) => fmtDate(r.completed_at) },
                    ]}
                  />
                </Section>
              </div>
            )}

            {/* ===================== DEV ===================== */}
            {tab === "dev" && (
              <div className="space-y-6">
                <EmptyNice title="Dev tab" hint="Reserved for development diagnostics." />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
