"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/Button";
import { DashboardSection, DashboardStatCard } from "@/src/components/dashboard/DashboardUi";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import tripIntelligenceService, {
  TripProfitRow,
  TripsProfitSummary,
} from "@/src/services/trip-intelligence.service";

type TabKey = "top" | "worst" | "lowMargin";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function money(v: unknown) {
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
  }).format(Number(v || 0));
}

function pct(v: unknown) {
  if (v === null || v === undefined) return "—";
  return `${money(v)}%`;
}

function tripLabel(row: TripProfitRow) {
  return row.trip_code || row.trip_id?.slice(0, 8) || "—";
}

function statusTone(value: number) {
  if (value < 0) return "danger";
  if (value === 0) return "warn";
  return "success";
}

export function TripIntelligenceSection({
  range = "this_month",
}: {
  range?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("top");

  const [summary, setSummary] = useState<TripsProfitSummary | null>(null);
  const [topTrips, setTopTrips] = useState<TripProfitRow[]>([]);
  const [worstTrips, setWorstTrips] = useState<TripProfitRow[]>([]);
  const [lowMarginTrips, setLowMarginTrips] = useState<TripProfitRow[]>([]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, topRes, worstRes, lowMarginRes] = await Promise.all([
        tripIntelligenceService.getSummary(range),
        tripIntelligenceService.getTopProfitableTrips(range, 5),
        tripIntelligenceService.getWorstTrips(range, 5),
        tripIntelligenceService.getLowMarginTrips(range, 5, 10),
      ]);

      setSummary(summaryRes);
      setTopTrips(topRes);
      setWorstTrips(worstRes);
      setLowMarginTrips(lowMarginRes);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "تعذر تحميل بيانات ربحية الرحلات."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [range]);

  const rows = useMemo(() => {
    if (activeTab === "worst") return worstTrips;
    if (activeTab === "lowMargin") return lowMarginTrips;
    return topTrips;
  }, [activeTab, topTrips, worstTrips, lowMarginTrips]);

  return (
    <DashboardSection
      title="ذكاء ربحية الرحلات"
      delay={0.2}
      right={
        <Button variant="secondary" onClick={load} isLoading={loading}>
          تحديث
        </Button>
      }
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <DashboardStatCard
            label="إجمالي الرحلات"
            value={summary?.total_trips ?? 0}
            hint="داخل الفترة الحالية"
            tone="neutral"
            icon={<Target />}
          />

          <DashboardStatCard
            label="رحلات مربحة"
            value={summary?.profitable_count ?? 0}
            hint="حققت صافي ربح موجب"
            tone="success"
            icon={<TrendingUp />}
          />

          <DashboardStatCard
            label="رحلات خاسرة"
            value={summary?.loss_count ?? 0}
            hint="تحتاج مراجعة تشغيلية"
            tone={Number(summary?.loss_count || 0) > 0 ? "danger" : "success"}
            icon={<TrendingDown />}
          />

          <DashboardStatCard
            label="صافي الربح"
            value={`${money(summary?.total_profit)} ج`}
            hint={`هامش الربح: ${pct(summary?.margin_pct)}`}
            tone={statusTone(Number(summary?.total_profit || 0)) as any}
            icon={<DollarSign />}
          />
        </div>

        <div className="rounded-[24px] border border-black/5 bg-slate-50/50 p-4">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <TabButton
              active={activeTab === "top"}
              onClick={() => setActiveTab("top")}
            >
              أعلى ربحًا
            </TabButton>

            <TabButton
              active={activeTab === "worst"}
              onClick={() => setActiveTab("worst")}
            >
              الرحلات الخاسرة
            </TabButton>

            <TabButton
              active={activeTab === "lowMargin"}
              onClick={() => setActiveTab("lowMargin")}
            >
              هامش ضعيف
            </TabButton>
          </div>

          <TripsProfitTable rows={rows} loading={loading} />
        </div>
      </div>
    </DashboardSection>
  );
}

// SmartStat component is now removed in favor of DashboardStatCard

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-5 py-2 text-sm font-bold transition-all duration-300",
        active
          ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
          : "bg-transparent text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm border border-transparent hover:border-black/5"
      )}
    >
      {children}
    </button>
  );
}

function TripsProfitTable({
  rows,
  loading,
}: {
  rows: TripProfitRow[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="h-12 animate-pulse rounded-2xl bg-black/[0.04]"
          />
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-8 text-center">
        <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
          لا توجد بيانات
        </div>
        <div className="mt-1 text-xs text-slate-500">
          لا توجد رحلات مطابقة لهذا التصنيف خلال الفترة الحالية.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10">
      <div className="max-h-[360px] overflow-auto">
        <table className="min-w-full text-right text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">الرحلة</th>
              <th className="px-3 py-3 font-semibold">العميل</th>
              <th className="px-3 py-3 font-semibold">الموقع</th>
              <th className="px-3 py-3 font-semibold">الإيراد</th>
              <th className="px-3 py-3 font-semibold">المصروفات</th>
              <th className="px-3 py-3 font-semibold">الربح</th>
              <th className="px-3 py-3 font-semibold">الهامش</th>
              <th className="px-3 py-3 font-semibold"></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const profit = Number(row.profit || 0);

              return (
                <tr
                  key={row.trip_id}
                  className="border-t border-black/10 hover:bg-black/[0.02]"
                >
                  <td className="whitespace-nowrap px-3 py-3 font-semibold">
                    {tripLabel(row)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    {row.client_name || "—"}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    {row.site_name || "—"}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    {money(row.revenue)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    {money(row.expense)}
                  </td>

                  <td
                    className={cn(
                      "whitespace-nowrap px-3 py-3 font-semibold",
                      profit < 0 && "text-red-600",
                      profit > 0 && "text-emerald-600",
                      profit === 0 && "text-amber-600"
                    )}
                  >
                    {money(row.profit)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    {pct(row.margin_pct)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-left">
                    <Link
                      href={`/trips/${row.trip_id}`}
                      className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-black/[0.04]"
                    >
                      فتح
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TripIntelligenceSection;