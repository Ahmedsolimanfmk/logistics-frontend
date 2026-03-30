"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { apiAuthGet } from "@/src/lib/api";

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

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function getErrorMessage(err: any) {
  return (
    err?.response?.data?.message ||
    err?.message ||
    "تعذر تحميل الـ insights حاليًا."
  );
}

function getContextTitle(context: DashboardInsightsContext) {
  const map: Record<DashboardInsightsContext, string> = {
    finance: "Insights المالية",
    ar: "Insights حسابات العملاء",
    maintenance: "Insights الصيانة",
    inventory: "Insights المخزون",
    trips: "Insights الرحلات",
  };

  return map[context];
}

function getContextSubtitle(context: DashboardInsightsContext) {
  const map: Record<DashboardInsightsContext, string> = {
    finance: "ملخص سريع لأهم مؤشرات المصروفات والموردين والاعتمادات.",
    ar: "أهم مؤشرات المديونية والمتأخرات والعملاء الأعلى رصيدًا.",
    maintenance: "مؤشرات أوامر العمل المفتوحة وتكلفة الصيانة.",
    inventory: "أهم التنبيهات حول الأصناف المنخفضة وأكثر الأصناف صرفًا.",
    trips: "ملخص للرحلات النشطة والإغلاق المالي وأهم أنماط التشغيل.",
  };

  return map[context];
}

function EmptyInsights({
  context,
  onRefresh,
  loading,
}: {
  context: DashboardInsightsContext;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-6 text-center">
      <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
        لا توجد Insights متاحة حاليًا
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {getContextSubtitle(context)}
      </div>
      <div className="mt-4 flex justify-center">
        <Button variant="secondary" onClick={onRefresh} isLoading={loading}>
          تحديث
        </Button>
      </div>
    </div>
  );
}

export function DashboardInsightsPanel({
  context,
}: {
  context: DashboardInsightsContext;
}) {
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
      setError(getErrorMessage(err));
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
      title={getContextTitle(context)}
      right={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={load} isLoading={loading}>
            تحديث
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-xs text-slate-500">{getContextSubtitle(context)}</div>

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
          <EmptyInsights context={context} onRefresh={load} loading={loading} />
        ) : (
          <div className="space-y-4">
            {!!grouped.error.length && (
              <div className="space-y-2">
                <div className="text-sm font-semibold text-red-700">عناصر حرجة</div>
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
                <div className="text-sm font-semibold text-amber-700">تحتاج متابعة</div>
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
                <div className="text-sm font-semibold text-slate-700">معلومات سريعة</div>
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