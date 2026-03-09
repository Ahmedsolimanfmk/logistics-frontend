"use client";

import React, { useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";

type ChatRole = "assistant" | "user";

type SectionKey = "finance" | "ar" | "maintenance" | "inventory";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  result?: any;
};

const SECTION_LABELS: Record<SectionKey, string> = {
  finance: "المالية",
  ar: "حسابات العملاء",
  maintenance: "الصيانة",
  inventory: "المخازن",
};

const SECTION_EXAMPLES: Record<SectionKey, string[]> = {
  finance: [
    "كم إجمالي المصروفات هذا الشهر؟",
    "وزع المصروفات حسب النوع هذا الشهر",
  ],
  ar: [
    "كم إجمالي مستحقات العملاء؟",
    "من أعلى 5 عملاء مديونية؟",
  ],
  maintenance: [
    "كم عدد أوامر العمل المفتوحة؟",
  ],
  inventory: [
    "ما أكثر 5 قطع صرفًا هذا الشهر؟",
    "ما القطع القريبة من النفاد؟",
  ],
};

const SECTIONS_BY_ROLE: Record<string, SectionKey[]> = {
  ADMIN: ["finance", "ar", "maintenance", "inventory"],
  ACCOUNTANT: ["finance", "ar"],
  STOREKEEPER: ["inventory"],
  FIELD_SUPERVISOR: ["finance", "maintenance"],
  HR: ["maintenance"],
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function AIAssistantWidget() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);

  const role = String(user?.role || "").toUpperCase();
  const allowedSections = SECTIONS_BY_ROLE[role] || [];

  const [open, setOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionKey | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      text: "مرحبًا بك في المساعد الذكي. اختر القسم الذي تريد تحليل بياناته.",
    },
  ]);

  const examples = useMemo(() => {
    if (!selectedSection) return [];
    return SECTION_EXAMPLES[selectedSection];
  }, [selectedSection]);

  async function ask(question: string) {
    const q = String(question || "").trim();
    if (!q || loading) return;

    setMessages((m) => [...m, { id: uid(), role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/ai-analytics/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ question: q }),
        }
      );

      const data = await res.json();

      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: data?.answer || data?.message || "تعذر الحصول على إجابة.",
          result: data?.result || null,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: "حدث خطأ أثناء الاتصال بالمساعد الذكي.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function renderItemsTable(items: any[]) {
    if (!Array.isArray(items) || !items.length) return null;

    const cols = Object.keys(items[0]).filter(
      (k) => !["id", "client_id", "part_id", "vehicle_id", "warehouse_id"].includes(k)
    );

    return (
      <div className="mt-2 overflow-x-auto rounded-xl border border-black/10">
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
                    {String(row[c] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 left-5 z-[1000] flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg hover:bg-blue-700"
        >
          <span>🤖</span>
          <span>المساعد الذكي</span>
        </button>
      )}

      {/* Popup */}
      {open && (
        <div className="fixed bottom-5 left-5 z-[1000] flex h-[680px] w-[390px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-lg">
                🤖
              </div>
              <div>
                <div className="font-semibold text-black">TREX AI Copilot</div>
                <div className="text-xs text-slate-500">مساعد تحليل البيانات</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-black/5"
            >
              ✕
            </button>
          </div>

          {/* Sections */}
          <div className="border-b border-black/10 px-3 py-3">
            <div className="mb-2 text-xs font-semibold text-slate-500">اختر القسم</div>
            <div className="flex flex-wrap gap-2">
              {allowedSections.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs",
                    selectedSection === sec
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-black/10 bg-white text-slate-700 hover:bg-black/5"
                  )}
                >
                  {SECTION_LABELS[sec]}
                </button>
              ))}
            </div>

            {!!examples.length && (
              <div className="mt-3">
                <div className="mb-2 text-xs font-semibold text-slate-500">أسئلة جاهزة</div>
                <div className="flex flex-wrap gap-2">
                  {examples.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => ask(q)}
                      className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-black/5"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-[rgb(248,250,252)] px-3 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "assistant" ? "justify-start" : "justify-end")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm",
                    m.role === "assistant"
                      ? "bg-white text-black border border-black/10"
                      : "bg-blue-600 text-white"
                  )}
                >
                  <div className="mb-1 text-[11px] opacity-70">
                    {m.role === "assistant" ? "المساعد الذكي" : "أنت"}
                  </div>

                  <div className="whitespace-pre-wrap">{m.text}</div>

                  {m.result?.data?.items?.length > 0 &&
                    renderItemsTable(m.result.data.items)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black shadow-sm">
                  جاري التحليل...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-black/10 bg-white p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك..."
                className="min-h-[52px] max-h-[120px] flex-1 resize-none rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-blue-500"
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