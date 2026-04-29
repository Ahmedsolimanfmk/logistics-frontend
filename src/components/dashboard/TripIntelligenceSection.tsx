"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
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
    <Card
      title="ذكاء ربحية الرحلات"
      right={
        <Button variant="ghost" onClick={load} isLoading={loading}>
          تحديث
        </Button>
      }
    >
      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <SmartStat
            label="إجمالي الرحلات"
            value={summary?.total_trips ?? 0}
            hint="داخل الفترة الحالية"
            tone="info"
            loading={loading}
          />

          <SmartStat
            label="رحلات مربحة"
            value={summary?.profitable_count ?? 0}
            hint="حققت صافي ربح موجب"
            tone="success"
            loading={loading}
          />

          <SmartStat
            label="رحلات خاسرة"
            value={summary?.loss_count ?? 0}
            hint="تحتاج مراجعة تشغيلية"
            tone={Number(summary?.loss_count || 0) > 0 ? "danger" : "success"}
            loading={loading}
          />

          <SmartStat
            label="صافي الربح"
            value={`${money(summary?.total_profit)} ج`}
            hint={`هامش الربح: ${pct(summary?.margin_pct)}`}
            tone={statusTone(Number(summary?.total_profit || 0))}
            loading={loading}
          />
        </div>

        <div className="rounded-3xl border border-black/10 bg-white p-3">
          <div className="mb-4 flex flex-wrap items-center gap-2">
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
    </Card>
  );
}

function SmartStat({
  label,
  value,
  hint,
  tone,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone: "success" | "danger" | "warn" | "info" | "neutral";
  loading?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-100 bg-red-50"
      : tone === "warn"
      ? "border-amber-100 bg-amber-50"
      : tone === "success"
      ? "border-emerald-100 bg-emerald-50"
      : tone === "info"
      ? "border-blue-100 bg-blue-50"
      : "border-black/10 bg-white";

  const dotClass =
    tone === "danger"
      ? "bg-red-500"
      : tone === "warn"
      ? "bg-amber-500"
      : tone === "success"
      ? "bg-emerald-500"
      : tone === "info"
      ? "bg-blue-500"
      : "bg-slate-400";

  return (
    <div className={cn("rounded-3xl border p-4 shadow-sm", toneClass)}>
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded bg-black/10" />
          <div className="h-6 w-16 rounded bg-black/10" />
          <div className="h-3 w-32 rounded bg-black/10" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-slate-500">{label}</div>
              <div className="mt-2 text-2xl font-bold text-[rgb(var(--trex-fg))]">
                {value}
              </div>
            </div>
            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", dotClass)} />
          </div>

          {hint ? (
            <div className="mt-3 text-xs leading-5 text-slate-500">{hint}</div>
          ) : null}
        </>
      )}
    </div>
  );
}

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
        "rounded-full px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "border border-black/10 bg-white text-slate-600 hover:bg-black/[0.04]"
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