"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiAuthGet } from "@/src/lib/api";
import { useT } from "@/src/i18n/useT";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function getCurrentLocale(): string {
  if (typeof window === "undefined") return "ar-EG";
  const v = localStorage.getItem("app_lang");
  return v === "en" ? "en-US" : "ar-EG";
}

function fmtDate(d: unknown) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString(getCurrentLocale(), {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(id: unknown) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

type AlertRow = {
  id: string;
  type: string;
  severity: "danger" | "warn" | "info";
  area: string;
  title: string;
  message: string;
  entity_id?: string | null;
  href?: string | null;
  created_at: string;
};

type AlertsSummaryResponse = {
  total: number;
  by_severity: {
    danger: number;
    warn: number;
    info: number;
  };
  by_area: {
    operations: number;
    finance: number;
    maintenance: number;
    compliance: number;
  };
};

function areaLabel(area: string, t: any) {
  switch (String(area || "").toLowerCase()) {
    case "operations":
      return t("tabs.operations");
    case "finance":
      return t("tabs.finance");
    case "maintenance":
      return t("tabs.maintenance");
    case "compliance":
      return t("dashboard.compliance.title");
    default:
      return area || "—";
  }
}

export default function NotificationBell() {
  const t = useT();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [summary, setSummary] = useState<AlertsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      setLoading(true);

      const [listData, summaryData] = await Promise.all([
        apiAuthGet("/dashboard/alerts", { limit: 6 }),
        apiAuthGet("/dashboard/alerts/summary"),
      ]);

      setRows(Array.isArray(listData?.items) ? listData.items : []);
      setSummary(summaryData || null);
    } catch {
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const badgeCount = useMemo(() => {
    return Number(summary?.total ?? 0);
  }, [summary]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (!open) load();
        }}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
        aria-label={t("notifications.open")}
        title={t("notifications.open")}
      >
        <span className="text-lg">🔔</span>

        {badgeCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-rose-600 px-1.5 py-0.5 text-center text-[11px] font-bold text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 top-12 z-50 w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {t("notifications.title")}
              </div>
              <div className="text-xs text-gray-600">
                {t("notifications.subtitle")}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={load}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                {loading ? t("common.loading") : t("common.refresh")}
              </button>

              <Link
                href="/alerts"
                onClick={() => setOpen(false)}
                className="text-xs text-orange-700 underline"
              >
                {t("common.viewAll")}
              </Link>
            </div>
          </div>

          <div className="max-h-[420px] overflow-auto">
            {!rows.length ? (
              <div className="p-4 text-sm text-gray-600">
                {t("notifications.empty")}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const sev = String(r?.severity || "");
                  const sevCls =
                    sev === "danger"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : sev === "warn"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-gray-50 text-gray-700";

                  const sevText =
                    sev === "danger"
                      ? t("dashboard.alerts.severity.danger")
                      : sev === "warn"
                      ? t("dashboard.alerts.severity.warn")
                      : t("dashboard.alerts.severity.info");

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        if (r?.href) router.push(r.href);
                      }}
                      className="block w-full px-4 py-3 text-right transition hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center justify-end gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[11px]",
                              sevCls
                            )}
                          >
                            {sevText}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {areaLabel(r.area, t)}
                          </span>
                        </div>

                        <div className="truncate text-sm font-medium text-gray-900">
                          {r.title || "—"}
                        </div>

                        <div className="mt-1 text-xs text-gray-600">
                          {r.message || "—"}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                          <span>{fmtDate(r.created_at)}</span>
                          <span className="font-mono">
                            {r?.entity_id ? shortId(r.entity_id) : "—"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}