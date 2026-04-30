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

type InsightLevel = "info" | "warning" | "error" | string;

type InsightItem = {
  type: string;
  level: InsightLevel;
  text: string;
};

type InsightsResponse = {
  ok: boolean;
  context?: string | null;
  insights?: InsightItem[];
};

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.message || err?.message || fallback;
}

function levelConfig(level: InsightLevel) {
  if (level === "error") {
    return {
      label: "حرج",
      dot: "bg-red-500",
      card: "border-red-200 bg-red-50 text-red-900",
      badge: "bg-red-100 text-red-700",
      priority: 3,
    };
  }

  if (level === "warning") {
    return {
      label: "يحتاج متابعة",
      dot: "bg-amber-500",
      card: "border-amber-200 bg-amber-50 text-amber-900",
      badge: "bg-amber-100 text-amber-700",
      priority: 2,
    };
  }

  return {
    label: "معلومة",
    dot: "bg-blue-500",
    card: "border-blue-100 bg-blue-50 text-blue-900",
    badge: "bg-blue-100 text-blue-700",
    priority: 1,
  };
}

function questionForInsight(context: DashboardInsightsContext, insight: InsightItem) {
  const type = String(insight?.type || "");

  if (context === "finance") {
    if (type.includes("top")) return "اعرض أعلى 5 أنواع مصروف هذا الشهر";
    if (type.includes("total")) return "كم إجمالي المصروفات هذا الشهر؟";
    return "قارن مصروفات هذا الشهر بالشهر الماضي";
  }

  if (context === "ar") {
    if (type.includes("top")) return "اعرض أعلى 5 عملاء مديونية";
    return "كم إجمالي مستحقات العملاء؟";
  }

  if (context === "maintenance") {
    if (type.includes("cost")) return "اعرض أعلى 5 مركبات تكلفة صيانة";
    return "كم عدد أوامر العمل المفتوحة؟";
  }

  if (context === "inventory") {
    if (type.includes("low")) return "ما الأصناف القريبة من النفاد؟";
    return "اعرض أعلى 5 أصناف صرفًا";
  }

  if (context === "trips") {
    if (type.includes("profit")) return "ملخص ربحية الرحلات هذا الشهر";
    if (type.includes("loss")) return "اعرض الرحلات الخاسرة";
    return "كم عدد الرحلات هذا الشهر؟";
  }

  return "اعرض ملخص الداشبورد";
}

export function DashboardInsightsPanel({
  context,
  onAsk,
}: {
  context: DashboardInsightsContext;
  onAsk?: (question: string) => void;
}) {
  const t = useT();

  const text = useMemo(() => {
    const get = (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    };

    return {
      refresh: get("common.refresh", "تحديث"),
      ask: get("dashboardInsights.ask", "اسأل عنها"),
      empty: get("dashboardInsights.emptyTitle", "لا توجد مؤشرات حاليًا"),
      loadError: get("dashboardInsights.loadError", "تعذر تحميل المؤشرات."),
      summaryTitle: get("dashboardInsights.summaryTitle", "ملخص سريع"),
      subtitle: get(
        "dashboardInsights.subtitle",
        "قراءة ذكية لأهم المخاطر والفرص بناءً على بيانات النظام."
      ),
      titles: {
        finance: get("dashboardInsights.titles.finance", "مؤشرات المالية"),
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
      const res = await apiAuthGet("/ai-analytics/insights", { context });
      const body = unwrap<InsightsResponse>(res);
      setItems(Array.isArray(body?.insights) ? body.insights : []);
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

  const sortedItems = useMemo(() => {
    return [...items].sort(
      (a, b) => levelConfig(b.level).priority - levelConfig(a.level).priority
    );
  }, [items]);

  const counts = useMemo(() => {
    return {
      error: items.filter((x) => x.level === "error").length,
      warning: items.filter((x) => x.level === "warning").length,
      info: items.filter((x) => x.level !== "error" && x.level !== "warning").length,
    };
  }, [items]);

  const mainInsight = sortedItems[0] || null;

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
        <div className="rounded-3xl border border-black/10 bg-gradient-to-br from-black/[0.04] to-transparent p-4">
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
        ) : !sortedItems.length ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-6 text-center">
            <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
              {text.empty}
            </div>
            <div className="mt-3">
              <Button variant="secondary" onClick={load}>
                {text.refresh}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {mainInsight ? (
              <InsightCard
                item={mainInsight}
                featured
                question={questionForInsight(context, mainInsight)}
                onAsk={onAsk}
                askLabel={text.ask}
              />
            ) : null}

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {sortedItems.slice(1).map((item, idx) => (
                <InsightCard
                  key={`${item.type}-${idx}`}
                  item={item}
                  question={questionForInsight(context, item)}
                  onAsk={onAsk}
                  askLabel={text.ask}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function InsightCard({
  item,
  featured = false,
  question,
  onAsk,
  askLabel,
}: {
  item: InsightItem;
  featured?: boolean;
  question: string;
  onAsk?: (question: string) => void;
  askLabel: string;
}) {
  const cfg = levelConfig(item.level);

  return (
    <div
      className={cn(
        "rounded-3xl border px-4 py-4 shadow-sm transition hover:shadow-md",
        cfg.card,
        featured && "border-2"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-2 h-2.5 w-2.5 rounded-full", cfg.dot)} />

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", cfg.badge)}>
              {cfg.label}
            </span>

            {featured ? (
              <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                أهم مؤشر
              </span>
            ) : null}
          </div>

          <div className={cn("leading-7", featured ? "text-base font-semibold" : "text-sm")}>
            {item.text}
          </div>

          {onAsk ? (
            <button
              type="button"
              onClick={() => onAsk(question)}
              className="mt-3 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white"
            >
              {askLabel}: {question}
            </button>
          ) : null}
        </div>
      </div>
    </div>
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