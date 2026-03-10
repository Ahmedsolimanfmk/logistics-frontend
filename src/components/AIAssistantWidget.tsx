"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";

type ChatRole = "assistant" | "user";
type SectionKey = "finance" | "ar" | "maintenance" | "inventory";
type ChatMode = "query" | "action" | "unknown";
type AssistantViewMode = "menu" | "query" | "action";

type ExecutionStatus =
  | "needs_more_info"
  | "ready_to_execute"
  | "executed"
  | "execution_failed"
  | string;

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  result?: any;
  mode?: ChatMode;
  action?: string | null;
  executionStatus?: ExecutionStatus | null;
  originalQuestion?: string | null;
};

type InsightItem = {
  type: string;
  level: "info" | "warning" | "error" | string;
  text: string;
};

type SuggestedResponse = {
  ok: boolean;
  context: string | null;
  questions: string[];
};

type InsightsResponse = {
  ok: boolean;
  context: string | null;
  insights: InsightItem[];
};

type QueryResponse = {
  ok: boolean;
  answer?: string;
  result?: any;
  followUps?: string[];
  message?: string;
  mode?: ChatMode;
  action?: string;
  execution?: {
    status?: ExecutionStatus;
    ready_to_execute?: boolean;
    executed?: boolean;
    payload?: any;
    missing_fields?: string[];
  };
};

const SECTION_LABELS: Record<SectionKey, string> = {
  finance: "المالية",
  ar: "حسابات العملاء",
  maintenance: "الصيانة",
  inventory: "المخازن",
};

const SECTION_DESCRIPTIONS: Record<SectionKey, string> = {
  finance: "تحليل المصروفات وأوامر المصروفات",
  ar: "تحليل مديونيات العملاء والمستحقات",
  maintenance: "تحليل أوامر العمل وتكاليف الصيانة وتنفيذ أوامر الصيانة",
  inventory: "تحليل حركة الأصناف والمخزون",
};

const SECTION_SUPPORTED_QUESTIONS: Record<SectionKey, string[]> = {
  finance: [
    "كم إجمالي المصروفات هذا الشهر؟",
    "صرفنا كام هذا الشهر؟",
    "ما أعلى نوع مصروف هذا الشهر؟",
    "أكبر بند مصروف إيه هذا الشهر؟",
    "اعرض أعلى 5 أنواع مصروف هذا الشهر",
    "قارن مصروفات هذا الشهر بالشهر الماضي",
    "ما إجمالي المصروفات الشهر الماضي؟",
  ],
  ar: [
    "ما إجمالي مستحقات العملاء؟",
    "فلوسنا عند العملاء كام؟",
    "قيمة متأخرات العملاء كام؟",
    "من أعلى عميل مديونية؟",
    "اعرض أعلى 5 عملاء مديونية",
  ],
  maintenance: [
    "كم عدد أوامر العمل المفتوحة؟",
    "كام أمر عمل مفتوح؟",
    "ما أعلى مركبة تكلفة صيانة؟",
    "أنهي عربية صيانتها أعلى؟",
    "اعرض أعلى 5 مركبات تكلفة صيانة",
  ],
  inventory: [
    "ما أكثر قطع الغيار صرفاً؟",
    "أكثر صنف بيتصرف إيه؟",
    "اعرض أعلى 5 أصناف صرفًا",
    "ما الأصناف القريبة من النفاد؟",
    "إيه الأصناف اللي قربت تخلص؟",
    "كام عدد الأصناف منخفضة المخزون؟",
  ],
};

const SECTION_ACTION_COMMANDS: Partial<Record<SectionKey, string[]>> = {
  finance: [
    "سجل مصروف وقود 500 جنيه للمركبة TR-10",
    "سجل مصروف صيانة 1200 جنيه على أمر العمل 123",
    "سجل مصروف شراء 3000 جنيه من مورد النور تحويل بنكي",
  ],
  maintenance: [
    "افتح طلب صيانة للمركبة TR-12 يوجد عطل كهرباء",
    "أنشئ أمر عمل للمركبة Truck 8 صيانة فرامل",
    "أنشئ أمر عمل للمركبة TR-22 تغيير زيت",
  ],
};

const SECTIONS_BY_ROLE: Record<string, SectionKey[]> = {
  ADMIN: ["finance", "ar", "maintenance", "inventory"],
  ACCOUNTANT: ["finance", "ar"],
  STOREKEEPER: ["inventory"],
  FIELD_SUPERVISOR: ["finance", "maintenance"],
  HR: ["maintenance"],
};

const QUESTION_SECTION_HINTS: Array<{ section: SectionKey; terms: string[] }> = [
  {
    section: "finance",
    terms: [
      "مصروف",
      "المصروفات",
      "نوع مصروف",
      "بند مصروف",
      "الصرف",
      "تكلفه",
      "تكلفة",
      "قارن",
      "مقارنة",
      "مورد",
      "شراء",
      "بنكي",
      "تحويل",
      "كاش",
      "نقد",
    ],
  },
  {
    section: "ar",
    terms: [
      "مستحقات",
      "مديونيه",
      "مديونية",
      "مديونيات",
      "العملاء",
      "عميل",
      "متاخرات",
      "متأخرات",
    ],
  },
  {
    section: "maintenance",
    terms: [
      "صيانه",
      "صيانة",
      "اوامر العمل",
      "أوامر العمل",
      "امر عمل",
      "طلب صيانة",
      "طلب صيانه",
      "مركبه",
      "مركبة",
      "عربيه",
      "عربية",
    ],
  },
  {
    section: "inventory",
    terms: ["مخزون", "اصناف", "أصناف", "قطع", "صرف", "نفاد", "الصنف"],
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function money(n: any) {
  const value = Number(n || 0);
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeArabic(text: string) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

function detectContextFromPath(pathname: string | null): SectionKey | null {
  const path = String(pathname || "").toLowerCase();

  if (
    path.startsWith("/finance/ar") ||
    path.startsWith("/clients") ||
    path.startsWith("/sites")
  ) {
    return "ar";
  }

  if (path.startsWith("/maintenance")) {
    return "maintenance";
  }

  if (path.startsWith("/inventory")) {
    return "inventory";
  }

  if (
    path.startsWith("/finance") ||
    path.startsWith("/cash") ||
    path.startsWith("/analytics") ||
    path.startsWith("/dashboard")
  ) {
    return "finance";
  }

  return null;
}

function getTitleByContext(context: SectionKey | null) {
  if (context === "finance") return "TREX AI Copilot - Finance";
  if (context === "ar") return "TREX AI Copilot - AR";
  if (context === "maintenance") return "TREX AI Copilot - Maintenance";
  if (context === "inventory") return "TREX AI Copilot - Inventory";
  return "TREX AI Copilot";
}

function getSubtitleByContext(context: SectionKey | null) {
  if (context === "finance") return "مساعد التحليل المالي";
  if (context === "ar") return "مساعد حسابات العملاء";
  if (context === "maintenance") return "مساعد تحليلات وأوامر الصيانة";
  if (context === "inventory") return "مساعد تحليلات المخازن";
  return "مساعد تحليل ذكي للنظام";
}

function normalizeSection(
  smartContext: SectionKey | null,
  selectedSection: SectionKey | null,
  allowedSections: SectionKey[]
): SectionKey | null {
  if (selectedSection && allowedSections.includes(selectedSection)) {
    return selectedSection;
  }

  if (smartContext && allowedSections.includes(smartContext)) {
    return smartContext;
  }

  return allowedSections[0] || null;
}

function getErrorMessage(err: any): string {
  return (
    err?.response?.data?.message ||
    err?.message ||
    "حدث خطأ أثناء الاتصال بالمساعد الذكي."
  );
}

function getInitialAssistantMessage(section: SectionKey | null) {
  if (section) {
    return `مرحبًا بك في TREX AI Copilot. اختر هل تريد تحليل بيانات أم تنفيذ أمر داخل قسم ${SECTION_LABELS[section]}.`;
  }

  return "مرحبًا بك في TREX AI Copilot. اختر القسم الذي تريد العمل داخله.";
}

function pickItems(result: any): any[] {
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data)) return result.data;
  return [];
}

function extractSummaryRows(result: any): Array<{ label: string; value: string }> {
  if (!result) return [];

  const data = result?.data ?? result;
  const rows: Array<{ label: string; value: string }> = [];

  const mapping: Array<[string, string]> = [
    ["total_expense", "إجمالي المصروفات"],
    ["total_outstanding", "إجمالي المستحقات"],
    ["overdue_amount", "المتأخرات"],
    ["total_open_work_orders", "أوامر العمل المفتوحة"],
    ["count", "العدد"],
    ["total", "الإجمالي"],
    ["this_month_total", "هذا الشهر"],
    ["last_month_total", "الشهر الماضي"],
    ["difference", "الفرق"],
    ["amount", "القيمة"],
  ];

  for (const [key, label] of mapping) {
    if (data?.[key] != null) {
      const raw = data[key];
      const num = Number(raw);
      rows.push({
        label,
        value: Number.isFinite(num) ? money(num) : String(raw),
      });
    }
  }

  return rows;
}

function formatCellValue(v: any) {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return money(v);
  return String(v);
}

function detectQuestionSection(question: string): SectionKey | null {
  const q = normalizeArabic(question);

  for (const item of QUESTION_SECTION_HINTS) {
    if (item.terms.some((term) => q.includes(normalizeArabic(term)))) {
      return item.section;
    }
  }

  return null;
}

function filterFollowUpsForSection(
  items: string[],
  section: SectionKey | null
): string[] {
  const list = Array.isArray(items) ? items : [];
  if (!section) return list.slice(0, 4);

  return list
    .filter((q) => {
      const detected = detectQuestionSection(q);
      return !detected || detected === section;
    })
    .slice(0, 4);
}

function renderActionLabel(action?: string | null) {
  if (action === "create_work_order") return "إنشاء أمر عمل";
  if (action === "create_maintenance_request") return "إنشاء طلب صيانة";
  if (action === "create_expense") return "تسجيل مصروف";
  return "تنفيذ أمر";
}

function renderExecutionStatus(status?: ExecutionStatus | null) {
  if (status === "needs_more_info") return "يحتاج بيانات إضافية";
  if (status === "ready_to_execute") return "جاهز للتنفيذ";
  if (status === "executed") return "تم التنفيذ";
  if (status === "execution_failed") return "فشل التنفيذ";
  return null;
}

function shouldShowExecuteButton(message: ChatMessage) {
  return message.mode === "action" && message.executionStatus === "ready_to_execute";
}

export default function AIAssistantWidget() {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);

  const role = String(user?.role || "").toUpperCase();
  const allowedSections = SECTIONS_BY_ROLE[role] || [];

  const smartContext = useMemo(
    () => detectContextFromPath(pathname),
    [pathname]
  );

  const [open, setOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionKey | null>(null);
  const [viewMode, setViewMode] = useState<AssistantViewMode>("menu");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const loadSeqRef = useRef(0);

  const effectiveSection = useMemo(
    () => normalizeSection(smartContext, selectedSection, allowedSections),
    [smartContext, selectedSection, allowedSections]
  );

  const title = useMemo(
    () => getTitleByContext(effectiveSection),
    [effectiveSection]
  );

  const subtitle = useMemo(
    () => getSubtitleByContext(effectiveSection),
    [effectiveSection]
  );

  const supportedQuestions = useMemo(() => {
    if (!effectiveSection) return [];
    return SECTION_SUPPORTED_QUESTIONS[effectiveSection] || [];
  }, [effectiveSection]);

  const actionCommands = useMemo(() => {
    if (!effectiveSection) return [];
    return SECTION_ACTION_COMMANDS[effectiveSection] || [];
  }, [effectiveSection]);

  useEffect(() => {
    if (!selectedSection && smartContext && allowedSections.includes(smartContext)) {
      setSelectedSection(smartContext);
    }
  }, [smartContext, selectedSection, allowedSections]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open, followUps]);

  useEffect(() => {
    if (!open) return;
    if (!effectiveSection && allowedSections.length === 0) return;

    resetConversation(effectiveSection);
    void loadInitialData(effectiveSection);
  }, [open, effectiveSection, allowedSections.length]);

  function resetConversation(section: SectionKey | null) {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: getInitialAssistantMessage(section),
        mode: "unknown",
      },
    ]);
    setFollowUps([]);
    setViewMode("menu");
  }

  async function loadInitialData(section: SectionKey | null) {
    const seq = ++loadSeqRef.current;

    try {
      setLoadingInitial(true);
      setSuggestedQuestions([]);
      setInsights([]);
      setFollowUps([]);

      const suggestedUrl = section
        ? `/ai-analytics/suggested?context=${encodeURIComponent(section)}`
        : "/ai-analytics/suggested";

      const insightsUrl = section
        ? `/ai-analytics/insights?context=${encodeURIComponent(section)}`
        : "/ai-analytics/insights";

      const [suggestedRes, insightsRes] = await Promise.all([
        apiAuthGet<SuggestedResponse>(suggestedUrl),
        apiAuthGet<InsightsResponse>(insightsUrl),
      ]);

      if (seq !== loadSeqRef.current) return;

      const responseContext = (suggestedRes?.context || section || "")
        .toString()
        .toLowerCase();

      if (section && responseContext && responseContext !== section) {
        setSuggestedQuestions(SECTION_SUPPORTED_QUESTIONS[section] || []);
      } else {
        setSuggestedQuestions(
          Array.isArray(suggestedRes?.questions) ? suggestedRes.questions : []
        );
      }

      setInsights(Array.isArray(insightsRes?.insights) ? insightsRes.insights : []);
    } catch (err) {
      if (seq !== loadSeqRef.current) return;

      console.error("AI initial load error:", err);
      setSuggestedQuestions(section ? SECTION_SUPPORTED_QUESTIONS[section] || [] : []);
      setInsights([]);
    } finally {
      if (seq === loadSeqRef.current) {
        setLoadingInitial(false);
      }
    }
  }

  async function ask(question: string, autoExecute = false) {
    const q = String(question || "").trim();
    if (!q || loading) return;

    const detectedSection = detectQuestionSection(q);

    if (
      effectiveSection &&
      detectedSection &&
      detectedSection !== effectiveSection
    ) {
      setMessages((m) => [
        ...m,
        { id: uid(), role: "user", text: q, originalQuestion: q },
        {
          id: uid(),
          role: "assistant",
          text: `هذا السؤال يبدو أقرب إلى قسم ${SECTION_LABELS[detectedSection]} وليس ${SECTION_LABELS[effectiveSection]}. يمكنك التبديل إلى هذا القسم أو اختيار عنصر مناسب من القائمة الحالية.`,
          mode: "unknown",
        },
      ]);
      setInput("");
      setFollowUps(SECTION_SUPPORTED_QUESTIONS[effectiveSection].slice(0, 4));
      return;
    }

    setMessages((m) => [...m, { id: uid(), role: "user", text: q, originalQuestion: q }]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiAuthPost<QueryResponse>("/ai-analytics/query", {
        question: q,
        auto_execute: autoExecute,
      });

      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: data?.answer || data?.message || "تعذر الحصول على إجابة.",
          result: data?.result || null,
          mode: data?.mode || "unknown",
          action: data?.action || null,
          executionStatus: data?.execution?.status || null,
          originalQuestion: q,
        },
      ]);

      setFollowUps(
        filterFollowUpsForSection(
          Array.isArray(data?.followUps) ? data.followUps : [],
          effectiveSection
        )
      );
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: getErrorMessage(err),
          mode: "unknown",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSectionChange(sec: SectionKey) {
    if (sec === effectiveSection) return;

    setSelectedSection(sec);
    setInput("");
    setSuggestedQuestions([]);
    setInsights([]);
    setFollowUps([]);
    setLoadingInitial(true);
    setViewMode("menu");
  }

  function handleNewChat() {
    resetConversation(effectiveSection);
    void loadInitialData(effectiveSection);
    setInput("");
  }

  function renderItemsTable(items: any[]) {
    if (!Array.isArray(items) || !items.length) return null;

    const cols = Object.keys(items[0]).filter(
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
        ].includes(k)
    );

    return (
      <div className="mt-3 overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="min-w-full text-right text-xs">
          <thead className="bg-black/5">
            <tr>
              {cols.map((c) => (
                <th key={c} className="px-2 py-2 font-semibold whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={i} className="border-t border-black/10">
                {cols.map((c) => (
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

  function renderSummary(result: any) {
    const rows = extractSummaryRows(result);
    if (!rows.length) return null;

    return (
      <div className="mt-3 rounded-xl border border-black/10 bg-white p-3">
        <div className="mb-2 text-xs font-semibold text-slate-500">ملخص سريع</div>
        <div className="grid grid-cols-1 gap-2">
          {rows.map((row) => (
            <div
              key={`${row.label}-${row.value}`}
              className="flex items-center justify-between rounded-lg bg-black/[0.03] px-3 py-2 text-xs"
            >
              <span className="opacity-70">{row.label}</span>
              <span className="font-semibold">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderAssistantFooter(message: ChatMessage) {
    if (message.role !== "assistant") return null;

    if (message.mode === "action") {
      const statusLabel = renderExecutionStatus(message.executionStatus);
      const actionLabel = renderActionLabel(message.action);

      return (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-purple-100 px-2 py-1 text-[11px] font-medium text-purple-700">
              أمر تنفيذي
            </span>

            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700">
              {actionLabel}
            </span>

            {statusLabel ? (
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[11px] font-medium",
                  message.executionStatus === "executed" && "bg-green-100 text-green-700",
                  message.executionStatus === "ready_to_execute" && "bg-blue-100 text-blue-700",
                  message.executionStatus === "needs_more_info" && "bg-amber-100 text-amber-700",
                  message.executionStatus === "execution_failed" && "bg-red-100 text-red-700"
                )}
              >
                {statusLabel}
              </span>
            ) : null}
          </div>

          {shouldShowExecuteButton(message) && message.originalQuestion ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => ask(message.originalQuestion || "", true)}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                تنفيذ الآن
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (message.mode === "query") {
      return (
        <div className="mt-3">
          <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700">
            تحليل بيانات
          </span>
        </div>
      );
    }

    return null;
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-[1000] flex items-center gap-2 rounded-full border border-black/10 bg-[rgb(var(--trex-card))] px-4 py-3 text-sm font-medium text-[rgb(var(--trex-fg))] shadow-lg hover:opacity-95"
        >
          <span>🤖</span>
          <span>
            {effectiveSection ? `${SECTION_LABELS[effectiveSection]} AI` : "المساعد الذكي"}
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 left-5 z-[1000] flex h-[780px] w-[470px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-[rgb(var(--trex-card))] text-[rgb(var(--trex-fg))] shadow-2xl">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5 text-lg">
                🤖
              </div>
              <div>
                <div className="font-semibold">{title}</div>
                <div className="text-xs opacity-70">{subtitle}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewChat}
                className="rounded-lg border border-black/10 px-2.5 py-1 text-xs hover:bg-black/5"
              >
                محادثة جديدة
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm opacity-70 hover:bg-black/5"
              >
                ✕
              </button>
            </div>
          </div>

          {!!allowedSections.length && (
            <div className="border-b border-black/10 px-3 py-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold opacity-70">الأقسام المتاحة</div>
                {effectiveSection ? (
                  <div className="text-[11px] opacity-60">
                    القسم الحالي: {SECTION_LABELS[effectiveSection]}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {allowedSections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleSectionChange(sec)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition",
                      effectiveSection === sec
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-black/10 bg-transparent hover:bg-black/5"
                    )}
                  >
                    {SECTION_LABELS[sec]}
                  </button>
                ))}
              </div>

              {effectiveSection ? (
                <div className="mt-3 text-[11px] opacity-70">
                  {SECTION_DESCRIPTIONS[effectiveSection]}
                </div>
              ) : null}

              {effectiveSection ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("menu")}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs",
                      viewMode === "menu"
                        ? "border-slate-500 bg-slate-100 text-slate-700"
                        : "border-black/10 hover:bg-black/5"
                    )}
                  >
                    اختيار النوع
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("query")}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs",
                      viewMode === "query"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-black/10 hover:bg-black/5"
                    )}
                  >
                    تحليل بيانات
                  </button>

                  {!!actionCommands.length && (
                    <button
                      type="button"
                      onClick={() => setViewMode("action")}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs",
                        viewMode === "action"
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-black/10 hover:bg-black/5"
                      )}
                    >
                      تنفيذ أمر
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-black/[0.02]">
            {loadingInitial && (
              <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm">
                جاري تحميل الاقتراحات والتحليلات الذكية...
              </div>
            )}

            {!!effectiveSection && viewMode === "menu" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="mb-2 text-sm font-semibold">ماذا تريد أن تفعل داخل قسم {SECTION_LABELS[effectiveSection]}؟</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("query")}
                      className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 hover:bg-blue-100"
                    >
                      تحليل بيانات
                    </button>

                    {!!actionCommands.length && (
                      <button
                        type="button"
                        onClick={() => setViewMode("action")}
                        className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm text-purple-700 hover:bg-purple-100"
                      >
                        تنفيذ أمر
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!!effectiveSection && viewMode === "query" && (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-semibold">الأسئلة التي أفهمها الآن</div>
                  <div className="flex flex-wrap gap-2">
                    {supportedQuestions.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => ask(q)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-100"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {!loadingInitial && !!insights.length && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">Insights</div>

                    {insights.map((item, idx) => (
                      <div
                        key={`${item.type}-${idx}`}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm",
                          item.level === "warning" && "border-amber-400/60 bg-amber-50/40",
                          item.level === "error" && "border-red-400/60 bg-red-50/40",
                          item.level !== "warning" &&
                            item.level !== "error" &&
                            "border-black/10 bg-white"
                        )}
                      >
                        {item.text}
                      </div>
                    ))}
                  </div>
                )}

                {!loadingInitial && !!suggestedQuestions.length && (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold">أسئلة مقترحة لهذا القسم</div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.slice(0, 8).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => ask(q)}
                          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs hover:bg-black/5"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!!effectiveSection && viewMode === "action" && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">أوامر التنفيذ المدعومة</div>
                <div className="flex flex-wrap gap-2">
                  {actionCommands.length ? (
                    actionCommands.map((cmd) => (
                      <button
                        key={cmd}
                        type="button"
                        onClick={() => ask(cmd)}
                        className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-100"
                      >
                        {cmd}
                      </button>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-black/10 bg-white/70 px-3 py-3 text-sm opacity-70">
                      لا توجد أوامر تنفيذ جاهزة لهذا القسم حاليًا.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {messages.map((m) => {
                const items = pickItems(m.result);
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.role === "assistant" ? "justify-start" : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm",
                        m.role === "assistant"
                          ? "border border-black/10 bg-white text-black"
                          : "bg-blue-600 text-white"
                      )}
                    >
                      <div className="mb-1 text-[11px] opacity-70">
                        {m.role === "assistant" ? "المساعد الذكي" : "أنت"}
                      </div>

                      <div className="whitespace-pre-wrap">{m.text}</div>

                      {m.role === "assistant" && renderSummary(m.result)}
                      {m.role === "assistant" && items.length > 0 && renderItemsTable(items)}
                      {renderAssistantFooter(m)}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black shadow-sm">
                    جاري التحليل...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {!!followUps.length && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">متابعة مقترحة</div>
                <div className="flex flex-wrap gap-2">
                  {followUps.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        const isExecuteNow = q.includes("نفذ");
                        if (
                          isExecuteNow &&
                          messages.length > 0 &&
                          messages[messages.length - 1]?.originalQuestion
                        ) {
                          ask(messages[messages.length - 1].originalQuestion || "", true);
                        } else {
                          ask(q);
                        }
                      }}
                      className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs hover:bg-black/5"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-black/10 bg-[rgb(var(--trex-card))] p-3">
            <div className="mb-2 flex flex-wrap gap-2 text-[11px] opacity-60">
              <button
                type="button"
                onClick={() => setViewMode("menu")}
                className="rounded-full border border-black/10 px-3 py-1 hover:bg-black/5"
              >
                العودة لاختيار النوع
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSection(null);
                  setViewMode("menu");
                  setFollowUps([]);
                }}
                className="rounded-full border border-black/10 px-3 py-1 hover:bg-black/5"
              >
                العودة للأقسام
              </button>
            </div>

            <div className="mb-2 text-[11px] opacity-60">
              يمكنك كتابة سؤال تحليلي أو أمر تنفيذي مباشرة. ولو كان الأمر جاهزًا للتنفيذ سيظهر لك زر تنفيذ الآن.
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  effectiveSection
                    ? `اكتب سؤالك في قسم ${SECTION_LABELS[effectiveSection]}...`
                    : "اختر القسم ثم اكتب سؤالك..."
                }
                className="min-h-[52px] max-h-[120px] flex-1 resize-none rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => ask(input)}
                disabled={!input.trim() || loading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                إرسال
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}