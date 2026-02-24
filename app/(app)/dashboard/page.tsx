"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { useAuth } from "@/src/store/auth";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";
import { useT } from "@/src/i18n/useT";
import { apiAuthGet } from "@/src/lib/api";

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

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

// =====================
// Types
// =====================
type TabKey = "operations" | "finance" | "maintenance" | "dev";
const TAB_STORAGE_KEY = "dash_active_tab_v1";
type TrendPoint = { label: string; value: number };

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
// KPI Delta
// =====================
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
  const t = useT();
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
      <span className="opacity-70">{t("common.vsPrev")}</span>
    </span>
  );
}

// =====================
// UI atoms
// =====================
function EmptyNice({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm text-slate-400">{hint}</div>
    </div>
  );
}

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
              <span className="mr-2 text-xs opacity-80">({it.count})</span> // ✅ RTL
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
  empty,
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
  const t = useT();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!searchable) return rows || [];
    const s = q.trim().toLowerCase();
    if (!s) return rows || [];
    return (rows || []).filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, q, searchable]);

  const clickable = Boolean(onRowClick);
  const emptyNode = typeof empty !== "undefined" ? empty : t("common.noData");

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
              placeholder={t("common.search")}
              className="px-3 py-1.5 rounded-lg bg-slate-950/30 border border-white/10 text-sm text-slate-100 outline-none"
            />
          ) : null}
          <span className="text-xs text-slate-400">
            {fmtInt(filtered.length)} {t("common.rows")}
          </span>
        </div>
      </div>

      {!filtered.length ? (
        <div className="p-5 text-sm text-slate-300">
          {typeof emptyNode === "string" ? emptyNode : emptyNode}
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full text-sm" dir="rtl">
            <thead className="bg-white/5">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "text-right font-medium text-slate-200 px-4 py-2 whitespace-nowrap", // ✅ RTL
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
                        "px-4 py-2 text-slate-200 whitespace-nowrap text-right", // ✅ RTL
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
  openLabel,
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "warn" | "danger" | "good";
  href?: string;
  openLabel?: string;
}) {
  const t = useT();

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
      {hint ? <div className="mt-1 text-xs text-slate-300/80">{hint}</div> : null}
      {href ? (
        <div className="mt-3">
          <span className="inline-flex text-xs text-orange-200/90 underline">
            {openLabel || t("common.open")}
          </span>
        </div>
      ) : null}
    </div>
  );

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAB_STORAGE_KEY) as TabKey | null;
      if (saved && allowedTabs.includes(saved)) setTab(saved);
      else setTab(allowedTabs[0] || "operations");
    } catch {
      setTab(allowedTabs[0] || "operations");
    }
  }, [allowedTabs]);

  const changeTab = (k: TabKey) => {
    if (!allowedTabs.includes(k)) return;
    setTab(k);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, k);
    } catch {}
  };

  const fetchSummary = async (activeTab: TabKey) => {
    setLoadingSummary(true);
    setErr(null);
    try {
      const data = await apiAuthGet(`/dashboard/summary`, { tab: activeTab });
      setSummary(data);
    } catch (e: any) {
      setErr(e?.message || t("common.failed"));
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchBundleIfNeeded = async (activeTab: TabKey) => {
    if (activeTab !== "operations") {
      setBundle(null);
      setLoadingCharts(false);
      return;
    }

    setLoadingCharts(true);
    try {
      const data = await apiAuthGet(`/dashboard/trends/bundle`, { bucket: "daily" });
      const normalized = (data && (data.data ?? data)) || null;
      setBundle(normalized);
    } catch {
      setBundle(null);
    } finally {
      setLoadingCharts(false);
    }
  };

  const reloadAll = async () => {
    await Promise.all([fetchSummary(tab), fetchBundleIfNeeded(tab)]);
  };

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

  const tabItems = useMemo(() => {
    const opsCount = Number(alerts?.active_trips_now_count ?? tables?.active_trips_now?.length ?? 0);

    const finCount =
      Number(alerts?.advances_open ?? 0) + Number(alerts?.expenses_pending_too_long ?? 0);

    const m = cards?.maintenance || {};
    const mntCount = Number(m?.open_work_orders ?? 0) + Number(m?.qa_needs ?? 0);

    const items: { key: TabKey; label: string; count?: number }[] = [];

    if (allowedTabs.includes("operations"))
      items.push({ key: "operations", label: t("tabs.operations"), count: opsCount });

    if (allowedTabs.includes("finance"))
      items.push({ key: "finance", label: t("tabs.finance"), count: finCount });

    if (allowedTabs.includes("maintenance"))
      items.push({ key: "maintenance", label: t("tabs.maintenance"), count: mntCount });

    if (allowedTabs.includes("dev") && canSeeDev(user?.role))
      items.push({ key: "dev", label: t("tabs.dev") });

    return items;
  }, [allowedTabs, alerts, tables, cards, user?.role, t]);

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
    const qaNeeds = Number(m.qa_needs ?? 0);
    const qaFailed = Number(m.qa_failed ?? 0);
    const mismatch = Number(m.parts_mismatch ?? 0);

    const toneOpen = openWos > 0 ? "neutral" : "good";
    const toneQa = qaNeeds > 0 ? "warn" : "good";
    const toneFail = qaFailed > 0 ? "danger" : "good";
    const toneMismatch = mismatch > 0 ? "warn" : "good";

    return { openWos, completedToday, qaNeeds, qaFailed, mismatch, toneOpen, toneQa, toneFail, toneMismatch } as const;
  }, [cards]);

  const maintenanceOpenHref = useMemo(() => {
    if (isAdminAcc) return "/maintenance/work-orders?status=OPEN";
    return "/maintenance/requests?status=APPROVED";
  }, [isAdminAcc]);

  const maintenanceQaNeedsHref = useMemo(() => {
    if (isAdminAcc) return "/maintenance/work-orders?status=COMPLETED";
    return "/maintenance/requests?status=APPROVED";
  }, [isAdminAcc]);

  const maintenanceFailedHref = useMemo(() => {
    if (isAdminAcc) return "/maintenance/work-orders?status=COMPLETED";
    return "/maintenance/requests";
  }, [isAdminAcc]);

  const maintenanceMismatchHref = useMemo(() => {
    if (isAdminAcc) return "/maintenance/work-orders?status=COMPLETED";
    return "/maintenance/requests";
  }, [isAdminAcc]);

  return (
    <div className="min-h-screen bg-slate-950 text-white" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">{t("dashboard.title")}</div>
            <div className="text-sm text-slate-400">
              {user?.full_name || "—"} — {user?.role || "—"}
            </div>
          </div>

          {/* RTL: مجموعة الأزرار */}
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

        {err ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            {err}
          </div>
        ) : null}

        <Tabs value={tab} items={tabItems} onChange={changeTab} />

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
            {tab === "operations" && (
              <div className="space-y-6">
                <Section
                  title={t("sections.opsAction")}
                  right={
                    <span className="text-xs text-slate-400">
                      {t("common.lastRefresh")} {new Date().toLocaleTimeString(getCurrentLocale())}
                    </span>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ActionTile
                      title={t("dashboard.ops.tripsNeedingFinanceClose.title")}
                      value={fmtInt(ops.needingClose)}
                      hint={
                        ops.needingClose
                          ? t("dashboard.ops.tripsNeedingFinanceClose.hintOn")
                          : t("dashboard.ops.tripsNeedingFinanceClose.hintOff")
                      }
                      tone={ops.toneClose}
                      href="/trips?status=COMPLETED&financial_closed_at=null"
                      openLabel={t("common.open")}
                    />

                    <ActionTile
                      title={t("dashboard.ops.activeTripsNow.title")}
                      value={fmtInt(ops.activeNow)}
                      hint={
                        ops.activeNow
                          ? t("dashboard.ops.activeTripsNow.hintOn")
                          : t("dashboard.ops.activeTripsNow.hintOff")
                      }
                      tone={ops.toneActive as any}
                      href="/trips?status=ASSIGNED,IN_PROGRESS"
                      openLabel={t("common.open")}
                    />

                    <ActionTile
                      title={t("dashboard.ops.tripsToday.title")}
                      value={fmtInt(ops.tripsTodayTotal)}
                      hint={t("dashboard.ops.tripsToday.hint")}
                      tone={ops.tripsTodayTotal ? "neutral" : "good"}
                      href="/trips?range=today"
                      openLabel={t("common.open")}
                    />
                  </div>
                </Section>

                <Section title={t("dashboard.ops.quickKpis")}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CompactKpi
                      title={t("dashboard.ops.kpis.tripsToday")}
                      value={fmtInt(cards?.trips_today?.total)}
                      sub={t("dashboard.ops.kpis.allStatuses")}
                      right={<DeltaBadge points={chartData?.trips_created} />}
                      href="/trips?range=today"
                    />
                    <CompactKpi
                      title={t("dashboard.ops.kpis.assignedToday")}
                      value={fmtInt(cards?.trips_today?.ASSIGNED ?? 0)}
                      sub={t("dashboard.ops.kpis.assignedStatus")}
                      href="/trips?range=today&status=ASSIGNED"
                    />
                    <CompactKpi
                      title={t("dashboard.ops.kpis.inProgressToday")}
                      value={fmtInt(cards?.trips_today?.IN_PROGRESS ?? 0)}
                      sub={t("dashboard.ops.kpis.inProgressStatus")}
                      href="/trips?range=today&status=IN_PROGRESS"
                    />
                    <CompactKpi
                      title={t("dashboard.ops.kpis.completedToday")}
                      value={fmtInt(cards?.trips_today?.COMPLETED ?? 0)}
                      sub={t("dashboard.ops.kpis.completedStatus")}
                      href="/trips?range=today&status=COMPLETED"
                    />
                  </div>
                </Section>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <DataTable
                    title={t("dashboard.ops.tables.activeTripsNow")}
                    rows={tables?.active_trips_now || []}
                    searchable
                    empty={
                      <EmptyNice
                        title={t("dashboard.ops.empty.activeTripsNow.title")}
                        hint={t("dashboard.ops.empty.activeTripsNow.hint")}
                      />
                    }
                    onRowClick={(r) => {
                      if (r?.trip_id) router.push(`/trips/${r.trip_id}`);
                    }}
                    columns={[
                      {
                        key: "trip_id",
                        label: t("dashboard.columns.trip"),
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
                              {t("common.copy")}
                            </button>
                          </div>
                        ),
                      },
                      { key: "trip_status", label: t("dashboard.columns.status") },
                      { key: "client", label: t("dashboard.columns.client") },
                      { key: "site", label: t("dashboard.columns.site") },
                      { key: "vehicle_plate_number", label: t("dashboard.columns.vehicle") },
                      { key: "driver_name", label: t("dashboard.columns.driver") },
                      {
                        key: "trip_created_at",
                        label: t("dashboard.columns.created"),
                        render: (r) => fmtDate(r.trip_created_at),
                      },
                    ]}
                  />

                  <DataTable
                    title={t("dashboard.ops.tables.tripsNeedingClose")}
                    rows={tables?.trips_needing_finance_close || []}
                    searchable
                    empty={
                      <EmptyNice
                        title={t("dashboard.ops.empty.tripsNeedingClose.title")}
                        hint={t("dashboard.ops.empty.tripsNeedingClose.hint")}
                      />
                    }
                    onRowClick={(r) => {
                      if (r?.id) router.push(`/trips/${r.id}`);
                    }}
                    columns={[
                      {
                        key: "id",
                        label: t("dashboard.columns.trip"),
                        render: (r) => <span className="font-mono">{shortId(r.id)}</span>,
                      },
                      { key: "status", label: t("dashboard.columns.status") },
                      { key: "financial_status", label: t("dashboard.columns.financial") },
                      { key: "client", label: t("dashboard.columns.client") },
                      { key: "site", label: t("dashboard.columns.site") },
                      {
                        key: "created_at",
                        label: t("dashboard.columns.created"),
                        render: (r) => fmtDate(r.created_at),
                      },
                    ]}
                  />
                </div>

                <Section
                  title={t("dashboard.ops.trendTitle")}
                  right={
                    loadingCharts ? (
                      <span className="text-xs text-slate-400">{t("common.loading")}</span>
                    ) : chartData ? (
                      <span className="text-xs text-slate-400">{t("common.daily")}</span>
                    ) : (
                      <span className="text-xs text-slate-400">{t("common.unavailable")}</span>
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
                      <MiniChart title={t("dashboard.ops.charts.tripsCreated")} points={chartData.trips_created} valueKey="value" />
                      <MiniChart title={t("dashboard.ops.charts.tripsAssigned")} points={chartData.trips_assigned} valueKey="value" />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                      {t("dashboard.errors.trendsUnavailable")}
                    </div>
                  )}
                </Section>
              </div>
            )}

            {tab === "finance" && (
              <div className="space-y-6">
                <Section title={t("dashboard.finance.actionRequired")}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ActionTile
                      title={t("dashboard.finance.pendingTooLong.title")}
                      value={fmtInt(fin.pendingTooLong)}
                      hint={
                        fin.pendingTooLong
                          ? t("dashboard.finance.pendingTooLong.hintOn")
                          : t("dashboard.finance.pendingTooLong.hintOff")
                      }
                      tone={fin.tonePending as any}
                      href="/finance?tab=pending"
                      openLabel={t("common.open")}
                    />

                    <ActionTile
                      title={t("dashboard.finance.openAdvances.title")}
                      value={fmtInt(fin.advancesOpen)}
                      hint={
                        fin.advancesOpen
                          ? t("dashboard.finance.openAdvances.hintOn")
                          : t("dashboard.finance.openAdvances.hintOff")
                      }
                      tone={fin.toneAdv as any}
                      href="/finance?tab=advances"
                      openLabel={t("common.open")}
                    />

                    <ActionTile
                      title={t("dashboard.finance.expensesTodayApproved.title")}
                      value={fmtMoney(cards?.expenses_today?.APPROVED ?? 0)}
                      hint={t("dashboard.finance.expensesTodayApproved.hint")}
                      tone={Number(cards?.expenses_today?.APPROVED ?? 0) > 0 ? "neutral" : "good"}
                      href="/finance/expenses?status=APPROVED"
                      openLabel={t("common.open")}
                    />
                  </div>
                </Section>

                <Section title={t("dashboard.finance.topExpenseTypesToday.sectionTitle")}>
                  <DataTable
                    title={t("dashboard.finance.topExpenseTypesToday.tableTitle")}
                    rows={tables?.top_expense_types_today || []}
                    searchable
                    empty={
                      <EmptyNice
                        title={t("dashboard.finance.empty.noApprovedToday.title")}
                        hint={t("dashboard.finance.empty.noApprovedToday.hint")}
                      />
                    }
                    columns={[
                      { key: "expense_type", label: t("dashboard.columns.type") },
                      { key: "amount", label: t("dashboard.columns.amount"), render: (r) => fmtMoney(r.amount) },
                    ]}
                  />
                </Section>
              </div>
            )}

            {tab === "maintenance" && (
              <div className="space-y-6">
                <Section title={t("dashboard.maintenance.actionRequired")}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <ActionTile
                      title={t("dashboard.maintenance.openWorkOrders.title")}
                      value={fmtInt(mnt.openWos)}
                      hint={mnt.openWos ? t("dashboard.maintenance.openWorkOrders.hintOn") : t("dashboard.maintenance.openWorkOrders.hintOff")}
                      tone={mnt.toneOpen as any}
                      href={maintenanceOpenHref}
                      openLabel={t("common.open")}
                    />

                    <ActionTile
                      title={t("dashboard.maintenance.qaNeeds.title")}
                      value={fmtInt(mnt.qaNeeds)}
                      hint={mnt.qaNeeds ? t("dashboard.maintenance.qaNeeds.hintOn") : t("dashboard.maintenance.qaNeeds.hintOff")}
                      tone={mnt.toneQa as any}
                      href={maintenanceQaNeedsHref}
                      openLabel={t("common.open")}
                    />

                    <ActionTile
                      title={t("dashboard.maintenance.qaFailed.title")}
                      value={fmtInt(mnt.qaFailed)}
                      hint={mnt.qaFailed ? t("dashboard.maintenance.qaFailed.hintOn") : t("dashboard.maintenance.qaFailed.hintOff")}
                      tone={mnt.toneFail as any}
                      href={maintenanceFailedHref}
                      openLabel={t("common.open")}
                    />

                    <ActionTile
                      title={t("dashboard.maintenance.partsMismatch.title")}
                      value={fmtInt(mnt.mismatch)}
                      hint={mnt.mismatch ? t("dashboard.maintenance.partsMismatch.hintOn") : t("dashboard.maintenance.partsMismatch.hintOff")}
                      tone={mnt.toneMismatch as any}
                      href={maintenanceMismatchHref}
                      openLabel={t("common.open")}
                    />
                  </div>

                  {!isAdminAcc ? (
                    <div className="mt-2 text-xs text-slate-400">{t("dashboard.maintenance.supervisorNote")}</div>
                  ) : null}
                </Section>

                <Section title={t("dashboard.maintenance.kpisToday")}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <CompactKpi title={t("dashboard.maintenance.completedToday.title")} value={fmtInt(mnt.completedToday)} sub={t("dashboard.maintenance.completedToday.sub")} />
                    <CompactKpi title={t("dashboard.maintenance.partsCostToday.title")} value={fmtMoney(cards?.maintenance?.maintenance_parts_cost_today ?? 0)} sub={t("dashboard.maintenance.partsCostToday.sub")} />
                    <CompactKpi title={t("dashboard.maintenance.cashCostToday.title")} value={fmtMoney(cards?.maintenance?.maintenance_cash_cost_today ?? 0)} sub={t("dashboard.maintenance.cashCostToday.sub")} />
                    <CompactKpi title={t("dashboard.maintenance.totalCostToday.title")} value={fmtMoney(cards?.maintenance?.maintenance_cost_today ?? 0)} sub={t("dashboard.maintenance.totalCostToday.sub")} />
                  </div>
                </Section>

                <Section
                  title={t("dashboard.maintenance.recentWorkOrders.sectionTitle")}
                  right={
                    <Link
                      href={isAdminAcc ? "/maintenance/work-orders" : "/maintenance/requests"}
                      className="text-xs text-orange-200/90 underline"
                    >
                      {t("dashboard.maintenance.recentWorkOrders.openList")} ←
                    </Link>
                  }
                >
                  <DataTable
                    title={t("dashboard.maintenance.recentWorkOrders.tableTitle")}
                    rows={tables?.maintenance_recent_work_orders || []}
                    searchable
                    empty={
                      <EmptyNice
                        title={t("dashboard.maintenance.empty.noWorkOrders.title")}
                        hint={t("dashboard.maintenance.empty.noWorkOrders.hint")}
                      />
                    }
                    onRowClick={(r) => {
                      if (isAdminAcc && r?.id) router.push(`/maintenance/work-orders/${r.id}`);
                      else router.push(`/maintenance/requests`);
                    }}
                    columns={[
                      { key: "id", label: t("dashboard.columns.wo"), render: (r) => <span className="font-mono">{shortId(r.id)}</span> },
                      { key: "status", label: t("dashboard.columns.status") },
                      { key: "type", label: t("dashboard.columns.type") },
                      { key: "vehicle_id", label: t("dashboard.columns.vehicle"), render: (r) => <span className="font-mono">{shortId(r.vehicle_id)}</span> },
                      { key: "opened_at", label: t("dashboard.columns.opened"), render: (r) => fmtDate(r.opened_at) },
                      { key: "completed_at", label: t("dashboard.columns.completed"), render: (r) => fmtDate(r.completed_at) },
                    ]}
                  />
                </Section>
              </div>
            )}

            {tab === "dev" && (
              <div className="space-y-6">
                <EmptyNice title={t("dashboard.dev.title")} hint={t("dashboard.dev.hint")} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}