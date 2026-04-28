"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { apiAuthPost } from "@/src/lib/api";
import { useT } from "@/src/i18n/useT";

type DashboardAssistantContext =
  | "finance"
  | "ar"
  | "maintenance"
  | "inventory"
  | "trips";

type ExecutionStatus =
  | "needs_more_info"
  | "ready_to_execute"
  | "executed"
  | "execution_failed"
  | string;

type ChatMode = "query" | "action" | "unknown";

type InsightItem = {
  type: string;
  level: "info" | "warning" | "error" | string;
  text: string;
};

type QueryResponse = {
  ok: boolean;
  answer?: string;
  message?: string;
  result?: any;
  followUps?: string[];
  mode?: ChatMode | string;
  action?: string | null;
  parsed?: any;
  ui?: {
    mode?: string;
    title?: string;
    summary?: string;
    badges?: string[];
    result_type?: string;
    has_items?: boolean;
  } | null;
  execution?: {
    status?: ExecutionStatus;
    ready_to_execute?: boolean;
    executed?: boolean;
    payload?: any;
    missing_fields?: string[];
  } | null;
  insights?: InsightItem[];
  session_snapshot?: any;
  conversation_id?: string | null;
};

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  response?: QueryResponse | null;
};

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function toChatMode(value: unknown): ChatMode {
  if (value === "query") return "query";
  if (value === "action") return "action";
  return "unknown";
}

function pickItems(result: any): any[] {
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function formatCellValue(v: any) {
  if (v == null || v === "") return "—";
  if (typeof v === "number") {
    return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 }).format(v);
  }
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return String(v);
}

function translateColumnLabel(key: string) {
  const labels: Record<string, string> = {
    count: "العدد",
    total_amount: "الإجمالي",
    total_expense: "إجمالي المصروفات",
    expense_type: "نوع المصروف",
    client_name: "العميل",
    total_outstanding: "المديونية",
    overdue_amount: "المتأخرات",
    current_amount: "الحالي",
    display_name: "المركبة",
    fleet_no: "رقم الأسطول",
    plate_no: "اللوحة",
    payment_source: "مصدر الدفع",
    vendor_name: "المورد",
    approval_status: "حالة الاعتماد",
    total_cost: "إجمالي التكلفة",
    total_issued_qty: "إجمالي المنصرف",
    part_name: "الصنف",
    warehouse_name: "المخزن",
    qty_on_hand: "الرصيد",
    min_stock: "الحد الأدنى",
    shortage: "العجز",
    status: "الحالة",
    trips_count: "عدد الرحلات",
    total_trips: "إجمالي الرحلات",
    active_count: "النشطة",
    completed_count: "المكتملة",
    financial_status: "الحالة المالية",
    site_name: "الموقع",
    revenue: "الإيراد",
    expense: "المصروفات",
    profit: "الربح",
    margin_pct: "الهامش",
  };

  return labels[key] || key;
}

function ResultsTable({ items }: { items: any[] }) {
  if (!items.length) return null;

  const columns = Object.keys(items[0]).filter(
    (k) =>
      ![
        "id",
        "client_id",
        "part_id",
        "vehicle_id",
        "warehouse_id",
        "site_id",
        "raw",
      ].includes(k)
  );

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="max-h-72 overflow-auto">
        <table className="min-w-full text-right text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-600">
            <tr>
              {columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">
                  {translateColumnLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i} className="border-t border-black/10 hover:bg-black/[0.02]">
                {columns.map((c) => (
                  <td key={c} className="whitespace-nowrap px-3 py-2">
                    {formatCellValue(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function insightStyle(level: string) {
  if (level === "error") return "border-red-200 bg-red-50 text-red-800";
  if (level === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-100 bg-blue-50 text-blue-800";
}

function getPrimaryEntityLabel(snapshot: any, t: (key: string) => string) {
  const entity = snapshot?.entity_context?.primary_entity;
  if (!entity) return null;

  const typeMap: Record<string, string> = {
    client: t("clients.title") === "clients.title" ? "عميل" : t("clients.title"),
    vehicle: t("vehicles.title") === "vehicles.title" ? "مركبة" : t("vehicles.title"),
    trip: t("trips.title") === "trips.title" ? "رحلة" : t("trips.title"),
    site: t("sites.title") === "sites.title" ? "موقع" : t("sites.title"),
    work_order:
      t("workOrders.title") === "workOrders.title" ? "أمر عمل" : t("workOrders.title"),
  };

  const label = entity.label || entity.id || null;
  if (!label) return null;

  return `${typeMap[String(entity.type || "")] || "العنصر"}: ${label}`;
}

export function DashboardAssistantPanel({
  context = "finance",
}: {
  context?: DashboardAssistantContext;
}) {
  const t = useT();

  const text = useMemo(() => {
    const get = (key: string, fallback: string) => {
      const v = t(key);
      return v === key ? fallback : v;
    };

    return {
      title: get("dashboardAssistant.title", "المساعد الذكي"),
      subtitle: get(
        "dashboardAssistant.subtitle",
        "اسأل عن المصروفات، الرحلات، العملاء، الصيانة أو المخزون بلغة طبيعية."
      ),
      newChat: get("dashboardAssistant.newChat", "محادثة جديدة"),
      currentContext: get("dashboardAssistant.currentContext", "السياق الحالي:"),
      quickInsights: get("dashboardAssistant.quickInsights", "Insights سريعة"),
      assistant: get("dashboardAssistant.assistant", "المساعد"),
      you: get("dashboardAssistant.you", "أنت"),
      executeNow: get("dashboardAssistant.executeNow", "تنفيذ الآن"),
      analyzing: get("dashboardAssistant.analyzing", "جاري التحليل..."),
      suggestedFollowups: get("dashboardAssistant.suggestedFollowups", "متابعة مقترحة"),
      placeholder: get("dashboardAssistant.placeholder", "اكتب سؤالك هنا..."),
      send: get("dashboardAssistant.send", "إرسال"),
      error: get("dashboardAssistant.error", "حدث خطأ أثناء الاتصال بالمساعد الذكي."),
      welcome: {
        finance: "مرحبًا، اسألني عن المصروفات والموردين وحالات الاعتماد.",
        ar: "مرحبًا، اسألني عن مديونية العملاء والمتأخرات.",
        maintenance: "مرحبًا، اسألني عن أوامر العمل المفتوحة وتكلفة الصيانة.",
        inventory: "مرحبًا، اسألني عن الأصناف منخفضة المخزون وأكثر الأصناف صرفًا.",
        trips: "مرحبًا، اسألني عن الرحلات النشطة، الربحية، الإغلاق المالي، والخسائر.",
      },
      examples: {
        finance: "مثال: كم إجمالي المصروفات هذا الشهر؟",
        ar: "مثال: اعرض أعلى 5 عملاء مديونية",
        maintenance: "مثال: ما أعلى مركبة تكلفة صيانة؟",
        inventory: "مثال: ما الأصناف القريبة من النفاد؟",
        trips: "مثال: اعرض أعلى 5 رحلات ربحًا",
      },
    };
  }, [t]);

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionSnapshot, setSessionSnapshot] = useState<any>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<AssistantMessage[]>([
    { id: uid(), role: "assistant", text: text.welcome[context], response: null },
  ]);

  useEffect(() => {
    setMessages([{ id: uid(), role: "assistant", text: text.welcome[context], response: null }]);
    setConversationId(null);
    setSessionSnapshot(null);
    setFollowUps([]);
    setInsights([]);
    setQuestion("");
  }, [context, text]);

  const activeEntityLabel = useMemo(
    () => getPrimaryEntityLabel(sessionSnapshot, t),
    [sessionSnapshot, t]
  );

  function getErrorMessage(err: any) {
    return err?.response?.data?.message || err?.message || text.error;
  }

  function renderExecutionStatus(status?: ExecutionStatus | null) {
    if (status === "needs_more_info") return "يحتاج بيانات إضافية";
    if (status === "ready_to_execute") return "جاهز للتنفيذ";
    if (status === "executed") return "تم التنفيذ";
    if (status === "execution_failed") return "فشل التنفيذ";
    return null;
  }

  async function ask(rawQuestion?: string, autoExecute = false) {
    const q = String(rawQuestion ?? question).trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { id: uid(), role: "user", text: q }]);
    setQuestion("");
    setLoading(true);

    try {
      const data = await apiAuthPost<QueryResponse>("/ai-analytics/query", {
        question: q,
        conversation_id: conversationId,
        context,
        session_snapshot: sessionSnapshot,
        auto_execute: autoExecute,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: data?.answer || data?.message || data?.ui?.summary || "تمت معالجة الطلب.",
          response: data,
        },
      ]);

      setConversationId(data?.conversation_id || conversationId || null);
      setSessionSnapshot(data?.session_snapshot || null);
      setFollowUps(Array.isArray(data?.followUps) ? data.followUps : []);
      setInsights(Array.isArray(data?.insights) ? data.insights : []);

      requestAnimationFrame(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", text: getErrorMessage(err), response: null },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    setMessages([{ id: uid(), role: "assistant", text: text.welcome[context], response: null }]);
    setConversationId(null);
    setSessionSnapshot(null);
    setFollowUps([]);
    setInsights([]);
    setQuestion("");
  }

  return (
    <Card
      title={text.title}
      right={
        <Button variant="ghost" onClick={handleNewChat}>
          {text.newChat}
        </Button>
      }
      className="h-full overflow-hidden"
    >
      <div className="space-y-4">
        <div className="rounded-3xl border border-black/10 bg-gradient-to-br from-black/[0.04] to-transparent p-4">
          <div className="text-sm text-slate-600">{text.subtitle}</div>
          <div className="mt-3 text-xs text-slate-500">{text.examples[context]}</div>
        </div>

        {activeEntityLabel ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span className="font-semibold">{text.currentContext}</span> {activeEntityLabel}
          </div>
        ) : null}

        {!!insights.length && (
          <div className="grid grid-cols-1 gap-2">
            {insights.slice(0, 3).map((item, idx) => (
              <div
                key={`${item.type}-${idx}`}
                className={cn("rounded-2xl border px-4 py-3 text-sm", insightStyle(item.level))}
              >
                {item.text}
              </div>
            ))}
          </div>
        )}

        <div className="max-h-[460px] space-y-3 overflow-auto rounded-3xl border border-black/10 bg-slate-50/80 p-4">
          {messages.map((m) => {
            const response = m.response;
            const mode = toChatMode(response?.mode ?? response?.ui?.mode);
            const items = pickItems(response?.result);
            const execLabel = renderExecutionStatus(response?.execution?.status);

            return (
              <div
                key={m.id}
                className={cn("flex", m.role === "assistant" ? "justify-start" : "justify-end")}
              >
                <div
                  className={cn(
                    "max-w-[90%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-sm",
                    m.role === "assistant"
                      ? "border border-black/10 bg-white text-slate-900"
                      : "bg-slate-950 text-white"
                  )}
                >
                  <div className="mb-1 text-[11px] font-semibold opacity-60">
                    {m.role === "assistant" ? text.assistant : text.you}
                  </div>

                  {response?.ui?.title ? (
                    <div className="mb-2 font-semibold">{response.ui.title}</div>
                  ) : null}

                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {response?.ui?.badges?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {response.ui.badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full border border-black/10 bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-700"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {mode === "action" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {response?.action ? (
                        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-medium text-purple-700">
                          {response.action}
                        </span>
                      ) : null}

                      {execLabel ? (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                          {execLabel}
                        </span>
                      ) : null}

                      {response?.execution?.ready_to_execute ? (
                        <Button className="!px-3 !py-1 text-xs" onClick={() => ask("نفذ الآن", true)}>
                          {text.executeNow}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  <ResultsTable items={items} />
                </div>
              </div>
            );
          })}

          {loading ? (
            <div className="flex justify-start">
              <div className="rounded-3xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                {text.analyzing}
              </div>
            </div>
          ) : null}

          <div ref={scrollRef} />
        </div>

        {!!followUps.length && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
              {text.suggestedFollowups}
            </div>

            <div className="flex flex-wrap gap-2">
              {followUps.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => ask(f, f === "نفذ الآن")}
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm transition hover:bg-black/[0.04]"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={text.placeholder}
            className="trex-input min-h-[54px] max-h-[130px] flex-1 resize-none px-4 py-3 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
          />

          <Button onClick={() => ask()} isLoading={loading}>
            {text.send}
          </Button>
        </div>
      </div>
    </Card>
  );
}