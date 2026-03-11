"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";

type AiMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  ui?: {
    mode?: string;
    title?: string;
    summary?: string;
    badges?: string[];
    result_type?: string;
    has_items?: boolean;
  } | null;
};

type SuggestedResponse = {
  ok: boolean;
  context: string | null;
  questions: string[];
};

type InsightItem = {
  type: string;
  level: "info" | "warning" | "error" | string;
  text: string;
};

type InsightsResponse = {
  ok: boolean;
  context: string | null;
  insights: InsightItem[];
};

type QueryResponse = {
  ok: boolean;
  answer?: string;
  followUps?: string[];
  insights?: InsightItem[];
  parsed?: any;
  ui?: {
    mode?: string;
    title?: string;
    summary?: string;
    badges?: string[];
    result_type?: string;
    has_items?: boolean;
  };
};

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getErrorMessage(err: any) {
  return (
    err?.response?.data?.message ||
    err?.message ||
    "حدث خطأ أثناء التواصل مع المساعد الذكي."
  );
}

export default function TrexAiCopilot({
  context = null,
  title = "TREX AI Copilot",
}: {
  context?: "finance" | "ar" | "maintenance" | "inventory" | null;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [sending, setSending] = useState(false);

  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: uid(),
      role: "assistant",
      text: "مرحبًا، أنا TREX AI Copilot. اسألني عن المصروفات أو العملاء أو الصيانة أو المخزون.",
    },
  ]);

  const [input, setInput] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [insights, setInsights] = useState<InsightItem[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    if (initializedRef.current) return;

    initializedRef.current = true;
    loadInitialData();
  }, [open]);

  async function loadInitialData() {
    try {
      setLoadingInitial(true);

      const suggestedUrl = context
        ? `/ai-analytics/suggested?context=${encodeURIComponent(context)}`
        : `/ai-analytics/suggested`;

      const insightsUrl = context
        ? `/ai-analytics/insights?context=${encodeURIComponent(context)}`
        : `/ai-analytics/insights`;

      const [suggestedRes, insightsRes] = await Promise.all([
        apiAuthGet<SuggestedResponse>(suggestedUrl),
        apiAuthGet<InsightsResponse>(insightsUrl),
      ]);

      setSuggested(Array.isArray(suggestedRes?.questions) ? suggestedRes.questions : []);
      setInsights(Array.isArray(insightsRes?.insights) ? insightsRes.insights : []);
    } catch (err) {
      console.error("AI initial load error:", err);
    } finally {
      setLoadingInitial(false);
    }
  }

  async function askQuestion(question: string) {
    const q = String(question || "").trim();
    if (!q || sending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: uid(),
        role: "user",
        text: q,
      },
    ]);

    setInput("");
    setSending(true);

    try {
      const res = await apiAuthPost<QueryResponse>("/ai-analytics/query", {
        question: q,
        context,
      });

      const answer =
        String(res?.answer || "").trim() ||
        "تم تنفيذ الطلب ولكن لم يتم تكوين إجابة نصية.";

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: answer,
          ui: res?.ui || null,
        },
      ]);

      setFollowUps(Array.isArray(res?.followUps) ? res.followUps : []);
      setInsights(Array.isArray(res?.insights) ? res.insights : []);
    } catch (err) {
      const msg = getErrorMessage(err);

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: msg,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    askQuestion(input);
  }

  const visibleSuggestions = useMemo(() => suggested.slice(0, 6), [suggested]);
  const visibleFollowUps = useMemo(() => followUps.slice(0, 4), [followUps]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 left-5 z-[1000] rounded-full px-4 py-3 shadow-lg border bg-[rgb(var(--trex-card))] text-[rgb(var(--trex-fg))] hover:opacity-95"
      >
        {open ? "إغلاق المساعد" : "TREX AI"}
      </button>

      {open ? (
        <div className="fixed bottom-20 left-5 z-[1000] w-[380px] max-w-[calc(100vw-24px)] rounded-2xl border bg-[rgb(var(--trex-card))] text-[rgb(var(--trex-fg))] shadow-2xl overflow-hidden">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{title}</div>
              <div className="text-xs opacity-70">
                {context ? `السياق الحالي: ${context}` : "مساعد تحليلي ذكي للنظام"}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 border text-sm"
            >
              ✕
            </button>
          </div>

          <div className="h-[520px] overflow-y-auto px-3 py-3 space-y-3">
            {loadingInitial ? (
              <div className="rounded-xl border px-3 py-2 text-sm opacity-80">
                جاري تحميل الاقتراحات والتحليلات الذكية...
              </div>
            ) : null}

            {insights.length > 0 ? (
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
            ) : null}

            {visibleSuggestions.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold">أسئلة مقترحة</div>
                <div className="flex flex-wrap gap-2">
                  {visibleSuggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => askQuestion(q)}
                      className="rounded-full border px-3 py-1.5 text-sm hover:bg-black/5"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 whitespace-pre-wrap",
                    msg.role === "user"
                      ? "ms-auto border bg-black/5"
                      : "me-auto border bg-white"
                  )}
                >
                  {msg.ui?.title ? (
                    <div className="mb-2 font-semibold">{msg.ui.title}</div>
                  ) : null}

                  {msg.text}

                  {Array.isArray(msg.ui?.badges) && msg.ui.badges.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.ui.badges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full bg-slate-100 px-2 py-1 text-[11px]"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {visibleFollowUps.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold">متابعة مقترحة</div>
                <div className="flex flex-wrap gap-2">
                  {visibleFollowUps.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => askQuestion(q)}
                      className="rounded-full border px-3 py-1.5 text-sm hover:bg-black/5"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="border-t p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اكتب سؤالك هنا..."
                className="flex-1 rounded-xl border px-3 py-2 bg-transparent outline-none"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
              >
                {sending ? "جاري..." : "إرسال"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}