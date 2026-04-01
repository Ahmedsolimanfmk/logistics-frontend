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

function getErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.message || err?.message || fallback;
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
      noInsights: get("dashboardInsights.emptyTitle", "لا توجد Insights متاحة حاليًا"),
      loadError: get("dashboardInsights.loadError", "تعذر تحميل الـ insights حاليًا."),
      groups: {
        error: get("dashboardInsights.groups.error", "عناصر حرجة"),
        warning: get("dashboardInsights.groups.warning", "تحتاج متابعة"),
        info: get("dashboardInsights.groups.info", "معلومات سريعة"),
      },
      titles: {
        finance: get("dashboardInsights.titles.finance", "Insights المالية"),
        ar: get("dashboardInsights.titles.ar", "Insights حسابات العملاء"),
        maintenance: get("dashboardInsights.titles.maintenance", "Insights الصيانة"),
        inventory: get("dashboardInsights.titles.inventory", "Insights المخزون"),
        trips: get("dashboardInsights.titles.trips", "Insights الرحلات"),
      },
      subtitles: {
        finance: get(
          "dashboardInsights.subtitles.finance",
          "ملخص سريع لأهم مؤشرات المصروفات والموردين والاعتمادات."
        ),
        ar: get(
          "dashboardInsights.subtitles.ar",
          "أهم مؤشرات المديونية والمتأخرات والعملاء الأعلى رصيدًا."
        ),
        maintenance: get(
          "dashboardInsights.subtitles.maintenance",
          "مؤشرات أوامر العمل المفتوحة وتكلفة الصيانة."
        ),
        inventory: get(
          "dashboardInsights.subtitles.inventory",
          "أهم التنبيهات حول الأصناف المنخفضة وأكثر الأصناف صرفًا."
        ),
        trips: get(
          "dashboardInsights.subtitles.trips",
          "ملخص للرحلات النشطة والإغلاق المالي وأهم أنماط التشغيل."
        ),
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

  const grouped = useMemo(() => {
    return {
      warning: items.filter((x) => x.level === "warning"),
      error: items.filter((x) => x.level === "error"),
      info: items.filter((x) => x.level !== "warning" && x.level !== "error"),
    };
  }, [items]);

  return (
    <Card
      title={text.titles[context]}
      right={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={load} isLoading={loading}>
            {text.refresh}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-xs text-slate-500">{text.subtitles[context]}</div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            <div className="h-14 rounded-xl bg-black/[0.05]" />
            <div className="h-14 rounded-xl bg-black/[0.05]" />
            <div className="h-14 rounded-xl bg-black/[0.05]" />
          </div>
        ) : !items.length ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-6 text-center">
            <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
              {text.noInsights}
            </div>
            <div className="mt-1 text-xs text-slate-500">{text.subtitles[context]}</div>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={load} isLoading={loading}>
                {text.refresh}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!!grouped.error.length && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-red-700">{text.groups.error}</div>
                {grouped.error.map((item, idx) => (
                  <div
                    key={`error-${item.type}-${idx}`}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800"
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            )}

            {!!grouped.warning.length && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-amber-700">{text.groups.warning}</div>
                {grouped.warning.map((item, idx) => (
                  <div
                    key={`warning-${item.type}-${idx}`}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800"
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            )}

            {!!grouped.info.length && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-700">{text.groups.info}</div>
                {grouped.info.map((item, idx) => (
                  <div
                    key={`info-${item.type}-${idx}`}
                    className="rounded-xl border border-black/10 bg-black/[0.02] px-3 py-3 text-sm text-slate-700"
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}