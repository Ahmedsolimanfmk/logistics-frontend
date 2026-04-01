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

function getPrimaryEntityLabel(snapshot: any, t: (key: string) => string): string | null {
  const entity = snapshot?.entity_context?.primary_entity;
  if (!entity) return null;

  const typeMap: Record<string, string> = {
    client: t("clients.title"),
    vehicle: t("vehicles.title"),
    trip: t("trips.title"),
    site: t("sites.title"),
    work_order: t("workOrders.title"),
  };

  const typeLabel = typeMap[String(entity.type || "")] || "العنصر";
  const label = entity.label || entity.id || null;
  if (!label) return null;

  return `${typeLabel}: ${label}`;
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
    return new Intl.NumberFormat("ar-EG", {
      maximumFractionDigits: 2,
    }).format(v);
  }

  if (typeof v === "boolean") {
    return v ? "نعم" : "لا";
  }

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
    display_name: "اسم المركبة",
    fleet_no: "رقم الأسطول",
    plate_no: "اللوحة",
    payment_source: "مصدر الدفع",
    vendor_name: "المورد",
    approval_status: "حالة الاعتماد",
    total_cost: "إجمالي التكلفة",
    issue_lines_count: "عدد الحركات",
    total_issued_qty: "إجمالي المنصرف",
    issued_qty: "المنصرف",
    qty: "الكمية",
    part_name: "الصنف",
    warehouse_name: "المخزن",
    qty_on_hand: "الرصيد الحالي",
    min_stock: "الحد الأدنى",
    shortage: "العجز",
    status: "الحالة",
    type: "النوع",
    opened_at: "تاريخ الفتح",
    created_at: "تاريخ الإنشاء",
    trips_count: "عدد الرحلات",
    total_trips: "إجمالي الرحلات",
    active_count: "الرحلات النشطة",
    draft_count: "المسودات",
    completed_count: "المكتملة",
    cancelled_count: "الملغاة",
    need_financial_closure_count: "تحتاج إغلاق مالي",
    total_need_financial_closure: "تحتاج إغلاق مالي",
    financial_status: "الحالة المالية",
    site_name: "الموقع",
    scheduled_at: "التاريخ المجدول",
    invoice_count: "عدد الفواتير",
    expense_count: "عدد المصروفات",
    full_name: "الاسم",
    license_no: "رقم الرخصة",
    license_expiry_date: "انتهاء الرخصة",
  };

  return labels[key] || key;
}

function ResultsTable({ items }: { items: any[] }) {
  if (!Array.isArray(items) || !items.length) return null;

  const columns = Object.keys(items[0]).filter(
    (k) =>
      ![
        "id",
        "client_id",
        "part_id",
        "vehicle_id",
        "warehouse_id",
        "site_id",
        "created_by",
        "updated_by",
        "raw",
      ].includes(k)
  );

  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-black/10 bg-white">
      <table className="min-w-full text-right text-xs">
        <thead className="bg-black/5">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-2 py-2 font-semibold whitespace-nowrap">
                {translateColumnLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i} className="border-t border-black/10">
              {columns.map((c) => (
                <td key={c} className="px-2 py-2 whitespace-nowrap">
                  {formatCellValue(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardAssistantPanel({
  context = "finance",
}: {
  context?: DashboardAssistantContext;
}) {
  const t = useT();

  const text = useMemo(() => {
    const isAr = document?.documentElement?.lang === "en" ? false : false;
    return {
      title: t("dashboardAssistant.title") === "dashboardAssistant.title"
        ? "المساعد الذكي داخل الداشبورد"
        : t("dashboardAssistant.title"),
      newChat:
        t("dashboardAssistant.newChat") === "dashboardAssistant.newChat"
          ? "محادثة جديدة"
          : t("dashboardAssistant.newChat"),
      currentContext:
        t("dashboardAssistant.currentContext") === "dashboardAssistant.currentContext"
          ? "السياق الحالي:"
          : t("dashboardAssistant.currentContext"),
      quickInsights:
        t("dashboardAssistant.quickInsights") === "dashboardAssistant.quickInsights"
          ? "Insights سريعة"
          : t("dashboardAssistant.quickInsights"),
      assistant:
        t("dashboardAssistant.assistant") === "dashboardAssistant.assistant"
          ? "المساعد"
          : t("dashboardAssistant.assistant"),
      you:
        t("dashboardAssistant.you") === "dashboardAssistant.you"
          ? "أنت"
          : t("dashboardAssistant.you"),
      executeNow:
        t("dashboardAssistant.executeNow") === "dashboardAssistant.executeNow"
          ? "تنفيذ الآن"
          : t("dashboardAssistant.executeNow"),
      analyzing:
        t("dashboardAssistant.analyzing") === "dashboardAssistant.analyzing"
          ? "جاري التحليل..."
          : t("dashboardAssistant.analyzing"),
      suggestedFollowups:
        t("dashboardAssistant.suggestedFollowups") === "dashboardAssistant.suggestedFollowups"
          ? "متابعة مقترحة"
          : t("dashboardAssistant.suggestedFollowups"),
      placeholder:
        t("dashboardAssistant.placeholder") === "dashboardAssistant.placeholder"
          ? "اكتب سؤالك هنا..."
          : t("dashboardAssistant.placeholder"),
      send:
        t("dashboardAssistant.send") === "dashboardAssistant.send"
          ? "إرسال"
          : t("dashboardAssistant.send"),
      error:
        t("dashboardAssistant.error") === "dashboardAssistant.error"
          ? "حدث خطأ أثناء الاتصال بالمساعد الذكي."
          : t("dashboardAssistant.error"),
      needsMoreInfo:
        t("dashboardAssistant.status.needsMoreInfo") === "dashboardAssistant.status.needsMoreInfo"
          ? "يحتاج بيانات إضافية"
          : t("dashboardAssistant.status.needsMoreInfo"),
      readyToExecute:
        t("dashboardAssistant.status.readyToExecute") === "dashboardAssistant.status.readyToExecute"
          ? "جاهز للتنفيذ"
          : t("dashboardAssistant.status.readyToExecute"),
      executed:
        t("dashboardAssistant.status.executed") === "dashboardAssistant.status.executed"
          ? "تم التنفيذ"
          : t("dashboardAssistant.status.executed"),
      executionFailed:
        t("dashboardAssistant.status.executionFailed") === "dashboardAssistant.status.executionFailed"
          ? "فشل التنفيذ"
          : t("dashboardAssistant.status.executionFailed"),
      welcome: {
        finance:
          t("dashboardAssistant.welcome.finance") === "dashboardAssistant.welcome.finance"
            ? "مرحبًا، اسألني عن المصروفات والموردين وحالات الاعتماد."
            : t("dashboardAssistant.welcome.finance"),
        ar:
          t("dashboardAssistant.welcome.ar") === "dashboardAssistant.welcome.ar"
            ? "مرحبًا، اسألني عن مديونية العملاء والمتأخرات وأعلى العملاء مديونية."
            : t("dashboardAssistant.welcome.ar"),
        maintenance:
          t("dashboardAssistant.welcome.maintenance") === "dashboardAssistant.welcome.maintenance"
            ? "مرحبًا، اسألني عن أوامر العمل المفتوحة وتكلفة الصيانة."
            : t("dashboardAssistant.welcome.maintenance"),
        inventory:
          t("dashboardAssistant.welcome.inventory") === "dashboardAssistant.welcome.inventory"
            ? "مرحبًا، اسألني عن الأصناف منخفضة المخزون وأكثر الأصناف صرفًا."
            : t("dashboardAssistant.welcome.inventory"),
        trips:
          t("dashboardAssistant.welcome.trips") === "dashboardAssistant.welcome.trips"
            ? "مرحبًا، اسألني عن الرحلات النشطة والإغلاق المالي وأعلى العملاء أو المركبات."
            : t("dashboardAssistant.welcome.trips"),
      },
      examples: {
        finance:
          t("dashboardAssistant.examples.finance") === "dashboardAssistant.examples.finance"
            ? "أمثلة: كم إجمالي المصروفات هذا الشهر؟ / اعرض أعلى 5 موردين مصروفات / ما أعلى نوع مصروف؟"
            : t("dashboardAssistant.examples.finance"),
        ar:
          t("dashboardAssistant.examples.ar") === "dashboardAssistant.examples.ar"
            ? "أمثلة: كم إجمالي مستحقات العملاء؟ / اعرض أعلى 5 عملاء مديونية / الأول"
            : t("dashboardAssistant.examples.ar"),
        maintenance:
          t("dashboardAssistant.examples.maintenance") === "dashboardAssistant.examples.maintenance"
            ? "أمثلة: كم عدد أوامر العمل المفتوحة؟ / اعرض أعلى 5 مركبات تكلفة صيانة / الأولى"
            : t("dashboardAssistant.examples.maintenance"),
        inventory:
          t("dashboardAssistant.examples.inventory") === "dashboardAssistant.examples.inventory"
            ? "أمثلة: ما الأصناف القريبة من النفاد؟ / اعرض أعلى 5 أصناف صرفًا / الأول"
            : t("dashboardAssistant.examples.inventory"),
        trips:
          t("dashboardAssistant.examples.trips") === "dashboardAssistant.examples.trips"
            ? "أمثلة: اعرض الرحلات النشطة / اعرض أعلى 5 عملاء حسب الرحلات / الأول / رحلاته"
            : t("dashboardAssistant.examples.trips"),
      },
    };
  }, [t]);

  function getErrorMessage(err: any) {
    return err?.response?.data?.message || err?.message || text.error;
  }

  function renderExecutionStatus(status?: ExecutionStatus | null) {
    if (status === "needs_more_info") return text.needsMoreInfo;
    if (status === "ready_to_execute") return text.readyToExecute;
    if (status === "executed") return text.executed;
    if (status === "execution_failed") return text.executionFailed;
    return null;
  }

  function getWelcomeMessage(contextValue: DashboardAssistantContext) {
    return text.welcome[contextValue];
  }

  function getExamplesByContext(contextValue: DashboardAssistantContext) {
    return text.examples[contextValue];
  }

  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: uid(),
      role: "assistant",
      text: getWelcomeMessage(context),
      response: null,
    },
  ]);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionSnapshot, setSessionSnapshot] = useState<any>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: getWelcomeMessage(context),
        response: null,
      },
    ]);
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

  async function ask(rawQuestion?: string, autoExecute = false) {
    const q = String(rawQuestion ?? question).trim();
    if (!q || loading) return;

    const userMessage: AssistantMessage = {
      id: uid(),
      role: "user",
      text: q,
      response: null,
    };

    setMessages((prev) => [...prev, userMessage]);
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

      const assistantText =
        data?.answer || data?.message || data?.ui?.summary || "تمت معالجة الطلب.";

      const assistantMessage: AssistantMessage = {
        id: uid(),
        role: "assistant",
        text: assistantText,
        response: data,
      };

      setMessages((prev) => [...prev, assistantMessage]);
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
        {
          id: uid(),
          role: "assistant",
          text: getErrorMessage(err),
          response: null,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: getWelcomeMessage(context),
        response: null,
      },
    ]);
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleNewChat}>
            {text.newChat}
          </Button>
        </div>
      }
      className="h-full"
    >
      <div className="space-y-4">
        {activeEntityLabel ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            <span className="font-semibold">{text.currentContext}</span> {activeEntityLabel}
          </div>
        ) : null}

        {!!insights.length && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
              {text.quickInsights}
            </div>

            <div className="space-y-2">
              {insights.map((item, idx) => (
                <div
                  key={`${item.type}-${idx}`}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm",
                    item.level === "warning" &&
                      "border-amber-300 bg-amber-50 text-amber-800",
                    item.level === "error" &&
                      "border-red-300 bg-red-50 text-red-800",
                    item.level !== "warning" &&
                      item.level !== "error" &&
                      "border-black/10 bg-black/[0.02] text-slate-700"
                  )}
                >
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-[420px] space-y-3 overflow-auto rounded-2xl border border-black/10 bg-black/[0.02] p-3">
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
                    "max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm",
                    m.role === "assistant"
                      ? "border border-black/10 bg-white text-black"
                      : "bg-black text-white"
                  )}
                >
                  <div className="mb-1 text-[11px] opacity-70">
                    {m.role === "assistant" ? text.assistant : text.you}
                  </div>

                  {response?.ui?.title ? (
                    <div className="mb-2 text-sm font-semibold">{response.ui.title}</div>
                  ) : null}

                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {response?.ui?.badges?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {response.ui.badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full bg-black/[0.05] px-2 py-1 text-[11px] font-medium text-slate-700"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {mode === "action" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {response?.action ? (
                        <span className="rounded-full bg-purple-100 px-2 py-1 text-[11px] font-medium text-purple-700">
                          {response.action}
                        </span>
                      ) : null}

                      {execLabel ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[11px] font-medium",
                            response?.execution?.status === "executed" &&
                              "bg-green-100 text-green-700",
                            response?.execution?.status === "ready_to_execute" &&
                              "bg-blue-100 text-blue-700",
                            response?.execution?.status === "needs_more_info" &&
                              "bg-amber-100 text-amber-700",
                            response?.execution?.status === "execution_failed" &&
                              "bg-red-100 text-red-700"
                          )}
                        >
                          {execLabel}
                        </span>
                      ) : null}

                      {response?.execution?.ready_to_execute ? (
                        <Button
                          className="!px-2.5 !py-1 text-xs"
                          onClick={() => ask("نفذ الآن", true)}
                        >
                          {text.executeNow}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {items.length > 0 ? <ResultsTable items={items} /> : null}
                </div>
              </div>
            );
          })}

          {loading ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black shadow-sm">
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
                  className="rounded-full border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-1.5 text-xs text-[rgb(var(--trex-fg))] hover:bg-black/[0.04]"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="text-xs text-slate-500">{getExamplesByContext(context)}</div>

          <div className="flex items-end gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={text.placeholder}
              className="trex-input min-h-[52px] max-h-[120px] flex-1 resize-none px-3 py-2 text-sm"
            />
            <Button onClick={() => ask()} isLoading={loading}>
              {text.send}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}