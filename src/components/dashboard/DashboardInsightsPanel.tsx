"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { apiAuthGet } from "@/src/lib/api";
import { useT } from "@/src/i18n/useT";

type DashboardInsightsContext =
  | "finance"
  | "ar"
  | "maintenance"
  | "inventory"
  | "trips";

type InsightItem = {
  type: string;
  level: "info" | "warning" | "error" | string;
  text: string;
};

type InsightsResponse = {
  ok: boolean;
  context?: string | null;
  insights?: InsightItem[];
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.message || err?.message || fallback;
}

function levelConfig(level: string) {
  if (level === "error") {
    return {
      dot: "bg-red-500",
      box: "border-red-200 bg-red-50 text-red-800",
      label: "حرج",
    };
  }

  if (level === "warning") {
    return {
      dot: "bg-amber-500",
      box: "border-amber-200 bg-amber-50 text-amber-800",
      label: "متابعة",
    };
  }

  return {
    dot: "bg-blue-500",
    box: "border-blue-100 bg-blue-50 text-blue-800",
    label: "معلومة",
  };
}

export function DashboardInsightsPanel({
  context,
}: {
  context: DashboardInsightsContext;
}) {
  const t = useT();

  const text = useMemo(() => {
    const get = (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    };

    return {
      refresh: get("common.refresh", "تحديث"),
      noInsights: get("dashboardInsights.emptyTitle", "لا توجد مؤشرات حاليًا"),
      loadError: get("dashboardInsights.loadError", "تعذر تحميل المؤشرات."),
      subtitle: get(
        "dashboardInsights.subtitle",
        "قراءة سريعة لأهم المخاطر والفرص بناءً على بيانات النظام."
      ),
      titles: {
        finance: get("dashboardInsights.titles.finance", "المؤشرات المالية"),
        ar: get("dashboardInsights.titles.ar", "مؤشرات حسابات العملاء"),
        maintenance: get("dashboardInsights.titles.maintenance", "مؤشرات الصيانة"),
        inventory: get("dashboardInsights.titles.inventory", "مؤشرات المخزون"),
        trips: get("dashboardInsights.titles.trips", "مؤشرات الرحلات"),
      },
    };
  }, [t]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<InsightItem[]>([]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await apiAuthGet<InsightsResponse>(
        `/ai-analytics/insights?context=${encodeURIComponent(context)}`
      );
      setItems(Array.isArray(res?.insights) ? res.insights : []);
    } catch (err) {
      setError(getErrorMessage(err, text.loadError));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [context]);

  const counts = useMemo(() => {
    return {
      error: items.filter((x) => x.level === "error").length,
      warning: items.filter((x) => x.level === "warning").length,
      info: items.filter((x) => x.level !== "error" && x.level !== "warning").length,
    };
  }, [items]);

  return (
    <Card
      title={text.titles[context]}
      right={
        <Button variant="ghost" onClick={load} isLoading={loading}>
          {text.refresh}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-black/10 bg-gradient-to-br from-black/[0.03] to-transparent p-4">
          <div className="text-sm text-slate-600">{text.subtitle}</div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat label="حرج" value={counts.error} tone="danger" />
            <MiniStat label="متابعة" value={counts.warning} tone="warn" />
            <MiniStat label="معلومات" value={counts.info} tone="info" />
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : !items.length ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-6 text-center">
            <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
              {text.noInsights}
            </div>
            <div className="mt-3">
              <Button variant="secondary" onClick={load}>
                {text.refresh}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => {
              const cfg = levelConfig(item.level);

              return (
                <div
                  key={`${item.type}-${idx}`}
                  className={cn(
                    "rounded-2xl border px-4 py-3 shadow-sm transition hover:shadow-md",
                    cfg.box
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full", cfg.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 text-[11px] font-semibold opacity-70">
                        {cfg.label}
                      </div>
                      <div className="text-sm leading-6">{item.text}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "danger" | "warn" | "info";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-3 py-3",
        tone === "danger" && "border-red-100 bg-red-50",
        tone === "warn" && "border-amber-100 bg-amber-50",
        tone === "info" && "border-blue-100 bg-blue-50"
      )}
    >
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-[rgb(var(--trex-fg))]">
        {value}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-black/10 bg-black/[0.03] p-4">
      <div className="h-3 w-24 rounded bg-black/10" />
      <div className="mt-3 h-3 w-full rounded bg-black/10" />
      <div className="mt-2 h-3 w-2/3 rounded bg-black/10" />
    </div>
  );
}