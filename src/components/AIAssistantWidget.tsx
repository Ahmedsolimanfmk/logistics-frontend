"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";

type ChatRole = "assistant" | "user";
type SectionKey = "finance" | "ar" | "maintenance" | "inventory";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  result?: any;
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
};

const SECTION_LABELS: Record<SectionKey, string> = {
  finance: "المالية",
  ar: "حسابات العملاء",
  maintenance: "الصيانة",
  inventory: "المخازن",
};

const SECTION_DESCRIPTIONS: Record<SectionKey, string> = {
  finance: "تحليل المصروفات والتكاليف المالية",
  ar: "تحليل مستحقات العملاء والمديونيات",
  maintenance: "تحليل أوامر العمل وتكاليف الصيانة",
  inventory: "تحليل حركة الأصناف والمخزون",
};

const SECTIONS_BY_ROLE: Record<string, SectionKey[]> = {
  ADMIN: ["finance", "ar", "maintenance", "inventory"],
  ACCOUNTANT: ["finance", "ar"],
  STOREKEEPER: ["inventory"],
  FIELD_SUPERVISOR: ["finance", "maintenance"],
  HR: ["maintenance"],
};

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
    path.startsWith("/analytics")
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
  if (context === "maintenance") return "مساعد تحليلات الصيانة";
  if (context === "inventory") return "مساعد تحليلات المخازن";
  return "مساعد تحليل البيانات";
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
    return `مرحبًا بك في TREX AI Copilot. أنت الآن داخل قسم ${SECTION_LABELS[section]}. يمكنك اختيار سؤال مقترح أو كتابة سؤالك مباشرة.`;
  }

  return "مرحبًا بك في TREX AI Copilot. اسألني عن المصروفات أو العملاء أو الصيانة أو المخزون.";
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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    resetConversation(effectiveSection);
    loadInitialData(effectiveSection);
  }, [open, effectiveSection]);

  function resetConversation(section: SectionKey | null) {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: getInitialAssistantMessage(section),
      },
    ]);
    setFollowUps([]);
  }

  async function loadInitialData(section: SectionKey | null) {
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

      setSuggestedQuestions(
        Array.isArray(suggestedRes?.questions) ? suggestedRes.questions : []
      );
      setInsights(Array.isArray(insightsRes?.insights) ? insightsRes.insights : []);
    } catch (err) {
      console.error("AI initial load error:", err);
      setSuggestedQuestions([]);
      setInsights([]);
    } finally {
      setLoadingInitial(false);
    }
  }

  async function ask(question: string) {
    const q = String(question || "").trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { id: uid(), role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiAuthPost<QueryResponse>("/ai-analytics/query", {
        question: q,
      });

      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: data?.answer || data?.message || "تعذر الحصول على إجابة.",
          result: data?.result || null,
        },
      ]);

      setFollowUps(Array.isArray(data?.followUps) ? data.followUps : []);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: getErrorMessage(err),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSectionChange(sec: SectionKey) {
    setSelectedSection(sec);
    setInput("");
    setSuggestedQuestions([]);
    setInsights([]);
    setFollowUps([]);
  }

  function handleNewChat() {
    resetConversation(effectiveSection);
    loadInitialData(effectiveSection);
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
        <div className="fixed bottom-5 left-5 z-[1000] flex h-[720px] w-[430px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-[rgb(var(--trex-card))] text-[rgb(var(--trex-fg))] shadow-2xl">
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
                <div className="text-xs font-semibold opacity-70">اختر القسم</div>
                {effectiveSection ? (
                  <div className="text-[11px] opacity-60">
                    {SECTION_DESCRIPTIONS[effectiveSection]}
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
                      "rounded-full border px-3 py-1.5 text-xs",
                      effectiveSection === sec
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-black/10 bg-transparent hover:bg-black/5"
                    )}
                  >
                    {SECTION_LABELS[sec]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-black/[0.02]">
            {loadingInitial && (
              <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm">
                جاري تحميل الاقتراحات والتحليلات الذكية...
              </div>
            )}

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
                <div className="text-sm font-semibold">أسئلة مقترحة</div>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.slice(0, 6).map((q) => (
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
                  {followUps.slice(0, 4).map((q) => (
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

            {!loadingInitial &&
              !insights.length &&
              !suggestedQuestions.length &&
              messages.length <= 1 && (
                <div className="rounded-xl border border-dashed border-black/10 bg-white/60 px-3 py-4 text-center text-sm opacity-70">
                  لا توجد اقتراحات جاهزة حاليًا لهذا القسم، لكن يمكنك كتابة سؤالك مباشرة.
                </div>
              )}
          </div>

          <div className="border-t border-black/10 bg-[rgb(var(--trex-card))] p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك..."
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