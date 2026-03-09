"use client";

import React, { useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";

type ChatRole = "assistant" | "user";

type SectionKey =
  | "finance"
  | "ar"
  | "maintenance"
  | "inventory";

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

export default function AiAssistantPage() {
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);

  const role = String(user?.role || "").toUpperCase();

  const allowedSections =
    SECTIONS_BY_ROLE[role] || [];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      text:
        "مرحباً بك في المساعد الذكي.\nاختر القسم الذي تريد تحليل بياناته.",
    },
  ]);

  const [selectedSection, setSelectedSection] =
    useState<SectionKey | null>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const examples = useMemo(() => {
    if (!selectedSection) return [];
    return SECTION_EXAMPLES[selectedSection];
  }, [selectedSection]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q) return;

    setMessages((m) => [
      ...m,
      { id: uid(), role: "user", text: q },
    ]);

    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE}/ai-analytics/query`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
          text: data.answer,
          result: data.result,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: "حدث خطأ أثناء الاتصال بالمساعد.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--trex-bg))] p-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[280px_1fr] gap-6">

        {/* Sidebar */}
        <div className="bg-white/70 rounded-2xl border p-4 space-y-4">

          <div className="font-semibold">
            اختر القسم
          </div>

          {allowedSections.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className="w-full text-right px-3 py-2 rounded-lg border hover:bg-gray-50"
            >
              {SECTION_LABELS[sec]}
            </button>
          ))}

          {selectedSection && (
            <>
              <div className="text-sm font-semibold mt-4">
                أسئلة جاهزة
              </div>

              {examples.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="block w-full text-right text-sm px-3 py-2 rounded-lg border hover:bg-gray-50"
                >
                  {q}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Chat */}
        <div className="flex flex-col bg-white/70 rounded-2xl border overflow-hidden">

          <div className="p-4 border-b flex items-center gap-2">
            🤖
            <div>
              <div className="font-semibold">
                TREX AI Copilot
              </div>
              <div className="text-xs opacity-60">
                مساعد تحليل البيانات
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "assistant"
                    ? "text-left"
                    : "text-right"
                }
              >
                <div
                  className={
                    m.role === "assistant"
                      ? "inline-block bg-gray-100 rounded-xl px-4 py-2"
                      : "inline-block bg-blue-600 text-white rounded-xl px-4 py-2"
                  }
                >
                  {m.text}
                </div>

                {m.result?.data?.items?.length > 0 && (
                  <table className="mt-2 text-sm border">
                    <thead>
                      <tr>
                        {Object.keys(
                          m.result.data.items[0]
                        ).map((k) => (
                          <th
                            key={k}
                            className="px-2 py-1 border"
                          >
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {m.result.data.items.map(
                        (row: any, i: number) => (
                          <tr key={i}>
                            {Object.values(row).map(
                              (v: any, j) => (
                                <td
                                  key={j}
                                  className="px-2 py-1 border"
                                >
                                  {String(v)}
                                </td>
                              )
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            ))}

            {loading && (
              <div className="text-sm opacity-70">
                جاري التحليل...
              </div>
            )}
          </div>

          <div className="border-t p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              placeholder="اكتب سؤالك..."
              className="flex-1 border rounded-lg px-3 py-2"
            />

            <button
              onClick={() => {
                ask(input);
                setInput("");
              }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white"
            >
              إرسال
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}