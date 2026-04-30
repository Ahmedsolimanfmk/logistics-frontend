"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";
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

type ChatMode = "query" | "action" | "unknown" | "reference_followup";

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

const ORDINALS = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"];

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function toChatMode(value: unknown): ChatMode {
  if (value === "query") return "query";
  if (value === "action") return "action";
  if (value === "reference_followup") return "reference_followup";
  return "unknown";
}

function unwrap<T = any>(res: any): T {
  return (res?.data ?? res) as T;
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

  if (typeof v === "boolean") return v ? "نعم" : "لا";

  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return new Date(v).toLocaleDateString("ar-EG");
  }

  if (typeof v === "object") return "—";

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
    trip_code: "كود الرحلة",
    revenue: "الإيراد",
    expense: "المصروفات",
    profit: "الربح",
    margin_pct: "الهامش %",
    profit_status: "حالة الربح",
    created_at: "تاريخ الإنشاء",
    scheduled_at: "تاريخ التشغيل",
  };

  return labels[key] || key;
}

function getRowLabel(row: any) {
  return (
    row?.client_name ||
    row?.display_name ||
    row?.fleet_no ||
    row?.plate_no ||
    row?.site_name ||
    row?.trip_code ||
    row?.trip_id ||
    row?.part_name ||
    row?.vendor_name ||
    row?.expense_type ||
    "عنصر"
  );
}

function getPrimaryEntity(snapshot: any) {
  return snapshot?.entity_context?.primary_entity || null;
}

function getPrimaryEntityLabel(snapshot: any) {
  const entity = getPrimaryEntity(snapshot);
  if (!entity) return null;

  const typeMap: Record<string, string> = {
    client: "عميل",
    vehicle: "مركبة",
    trip: "رحلة",
    site: "موقع",
    work_order: "أمر عمل",
  };

  const label = entity.label || entity.id || null;
  if (!label) return null;

  return `${typeMap[String(entity.type || "")] || "العنصر"}: ${label}`;
}

function insightStyle(level: string) {
  if (level === "error") return "border-red-200 bg-red-50 text-red-800";
  if (level === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-100 bg-blue-50 text-blue-800";
}

function ResultsTable({
  items,
  onSelectIndex,
}: {
  items: any[];
  onSelectIndex?: (index: number) => void;
}) {
  if (!items.length) return null;

  const hidden = new Set([
    "id",
    "client_id",
    "part_id",
    "vehicle_id",
    "warehouse_id",
    "site_id",
    "raw",
  ]);

  const columns = Object.keys(items[0]).filter(
    (k) => !hidden.has(k) && typeof items[0]?.[k] !== "object"
  );

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="border-b border-black/10 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        اضغط على أي صف لاختياره، أو استخدم: الأول / الثاني
      </div>

      <div className="max-h-72 overflow-auto">
        <table className="min-w-full text-right text-xs">
          <thead className="sticky top-0 bg-slate-50 text-slate-600">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 font-semibold">اختيار</th>
              {columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">
                  {translateColumnLabel(c)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {items.map((row, i) => (
              <tr
                key={i}
                onClick={() => onSelectIndex?.(i)}
                className="cursor-pointer border-t border-black/10 transition hover:bg-blue-50"
              >
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    {ORDINALS[i] || `${i + 1}`}
                  </span>
                </td>

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

export function DashboardAssistantPanel({
  context = "finance",
  externalQuestion,
  onExternalQuestionHandled,
  onSessionSnapshotChange,
}: {
  context?: DashboardAssistantContext;
  externalQuestion?: string | null;
  onExternalQuestionHandled?: () => void;
  onSessionSnapshotChange?: (snapshot: any) => void;
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
      currentContext: get("dashboardAssistant.currentContext", "المحدد حاليًا:"),
      quickQuestions: get("dashboardAssistant.quickQuestions", "أسئلة مقترحة"),
      assistant: get("dashboardAssistant.assistant", "المساعد"),
      you: get("dashboardAssistant.you", "أنت"),
      executeNow: get("dashboardAssistant.executeNow", "تنفيذ الآن"),
      analyzing: get("dashboardAssistant.analyzing", "جاري التحليل..."),
      suggestedFollowups: get("dashboardAssistant.suggestedFollowups", "متابعة مقترحة"),
      placeholder: get("dashboardAssistant.placeholder", "اكتب سؤالك هنا..."),
      send: get("dashboardAssistant.send", "إرسال"),
      error: get("dashboardAssistant.error", "حدث خطأ أثناء الاتصال بالمساعد الذكي."),
      emptySuggestions: get("dashboardAssistant.emptySuggestions", "لا توجد أسئلة مقترحة حاليًا."),
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
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionSnapshot, setSessionSnapshot] = useState<any>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: uid(),
      role: "assistant",
      text: text.welcome[context],
      response: null,
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  function updateSnapshot(snapshot: any) {
    setSessionSnapshot(snapshot || null);
    onSessionSnapshotChange?.(snapshot || null);
  }

  useEffect(() => {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: text.welcome[context],
        response: null,
      },
    ]);

    setConversationId(null);
    updateSnapshot(null);
    setFollowUps([]);
    setInsights([]);
    setQuestion("");
  }, [context]);

  useEffect(() => {
    let alive = true;

    async function loadSuggestions() {
      setSuggestionsLoading(true);

      try {
        const res = await apiAuthGet("/ai-analytics/suggested", { context });
        const body = unwrap<any>(res);
        const list = Array.isArray(body?.questions) ? body.questions : [];

        if (alive) {
          setSuggestions(list.slice(0, 12));
        }
      } catch {
        if (alive) setSuggestions([]);
      } finally {
        if (alive) setSuggestionsLoading(false);
      }
    }

    loadSuggestions();

    return () => {
      alive = false;
    };
  }, [context]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [messages.length, loading]);

  useEffect(() => {
    const q = String(externalQuestion || "").trim();
    if (!q || loading) return;

    ask(q);
    onExternalQuestionHandled?.();
  }, [externalQuestion]);

  const activeEntityLabel = useMemo(
    () => getPrimaryEntityLabel(sessionSnapshot),
    [sessionSnapshot]
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

      const answer =
        data?.answer ||
        data?.message ||
        data?.ui?.summary ||
        "تمت معالجة الطلب.";

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: answer,
          response: data,
        },
      ]);

      setConversationId(data?.conversation_id || conversationId || null);
      updateSnapshot(data?.session_snapshot || null);
      setFollowUps(Array.isArray(data?.followUps) ? data.followUps : []);
      setInsights(Array.isArray(data?.insights) ? data.insights : []);
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
        text: text.welcome[context],
        response: null,
      },
    ]);

    setConversationId(null);
    updateSnapshot(null);
    setFollowUps([]);
    setInsights([]);
    setQuestion("");
  }

  function askByIndex(index: number) {
    const ordinal = ORDINALS[index] || String(index + 1);
    ask(ordinal);
  }

  function renderMessage(m: AssistantMessage) {
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
            "max-w-[94%] rounded-3xl px-4 py-3 text-sm leading-7 shadow-sm",
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

          <ResultsTable items={items} onSelectIndex={askByIndex} />

          {items.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {items.slice(0, 5).map((row, idx) => (
                <button
                  key={`${idx}-${getRowLabel(row)}`}
                  type="button"
                  onClick={() => askByIndex(idx)}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                >
                  اختار {ORDINALS[idx]}: {getRowLabel(row)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm text-slate-600">{text.subtitle}</div>
              <div className="mt-2 text-xs text-slate-500">{text.examples[context]}</div>
            </div>

            <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {context.toUpperCase()}
            </span>
          </div>
        </div>

        {activeEntityLabel ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <span className="font-semibold">{text.currentContext}</span> {activeEntityLabel}
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
              {text.quickQuestions}
            </div>

            {suggestionsLoading ? (
              <div className="text-xs text-slate-400">تحميل...</div>
            ) : null}
          </div>

          {suggestions.length ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : !suggestionsLoading ? (
            <div className="rounded-2xl border border-dashed border-black/10 px-4 py-3 text-sm text-slate-500">
              {text.emptySuggestions}
            </div>
          ) : null}
        </div>

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

        <div className="max-h-[500px] space-y-3 overflow-auto rounded-3xl border border-black/10 bg-slate-50/80 p-4">
          {messages.map(renderMessage)}

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
                  className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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
            disabled={loading}
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