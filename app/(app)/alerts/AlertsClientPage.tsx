"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";

import alertsService from "@/src/services/alerts.service";
import type {
  AlertRow,
  AreaFilter,
  ReadStatusFilter,
  SeverityFilter,
} from "@/src/types/alerts.types";
import {
  isValidArea,
  isValidReadStatus,
  isValidSeverity,
} from "@/src/types/alerts.types";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ar-EG");
}

function shortId(value: unknown): string {
  const s = String(value ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function severityLabel(severity?: string | null) {
  const s = String(severity || "").toLowerCase();
  if (s === "danger") return "خطر";
  if (s === "warn") return "تحذير";
  return "معلومة";
}

function areaLabel(area?: string | null) {
  const a = String(area || "").toLowerCase();
  if (a === "operations") return "العمليات";
  if (a === "finance") return "المالية";
  if (a === "maintenance") return "الصيانة";
  if (a === "compliance") return "الالتزام";
  return area || "—";
}

function SeverityBadge({ severity }: { severity?: string | null }) {
  const s = String(severity || "").toLowerCase();

  const cls =
    s === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : s === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-blue-100 bg-blue-50 text-blue-700";

  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", cls)}>
      {severityLabel(s)}
    </span>
  );
}

function StatCard({
  label,
  value,
  tone = "info",
}: {
  label: string;
  value: number;
  tone?: "danger" | "warn" | "info" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-4 shadow-sm",
        tone === "danger" && "border-red-100 bg-red-50",
        tone === "warn" && "border-amber-100 bg-amber-50",
        tone === "info" && "border-blue-100 bg-blue-50",
        tone === "neutral" && "border-black/10 bg-white"
      )}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-[rgb(var(--trex-fg))]">{value}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-slate-500">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/30"
      >
        {children}
      </select>
    </label>
  );
}

export default function AlertsClientPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const severityParam = sp.get("severity");
  const areaParam = sp.get("area");
  const readParam = sp.get("read");
  const qParam = sp.get("q");

  const severity: SeverityFilter =
    severityParam === "all" || severityParam === null
      ? "all"
      : isValidSeverity(severityParam)
      ? severityParam
      : "all";

  const area: AreaFilter =
    areaParam === "all" || areaParam === null
      ? "all"
      : isValidArea(areaParam)
      ? areaParam
      : "all";

  const readStatus: ReadStatusFilter =
    readParam === null ? "all" : isValidReadStatus(readParam) ? readParam : "all";

  const q = qParam ?? "";

  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  function showToast(type: "success" | "error", message: string) {
    setToast({ open: true, message, type });
  }

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.push(qs ? `/alerts?${qs}` : "/alerts");
  }

  async function load() {
    setLoading(true);

    try {
      const response = await alertsService.list({
        limit: 200,
        area: area === "all" ? null : area,
        read_status: readStatus === "all" ? null : readStatus,
      });

      setRows(response.items);
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message || t("common.failed"))
          : t("common.failed");

      showToast("error", message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area, readStatus]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const severityOk = severity === "all" ? true : row.severity === severity;
      const qText =
        `${row.title} ${row.message} ${row.type} ${row.area} ${row.entity_id ?? ""}`.toLowerCase();
      const qOk = q.trim() ? qText.includes(q.trim().toLowerCase()) : true;
      return severityOk && qOk;
    });
  }, [rows, severity, q]);

  const summary = useMemo(
    () => alertsService.buildSummary(filteredRows),
    [filteredRows]
  );

  async function markRead(row: AlertRow) {
    if (!row.alert_key) return;

    try {
      await alertsService.markRead(row.alert_key);
      showToast("success", t("alerts.toast.markedRead") || "تم التحديث");
      await load();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message || t("common.failed"))
          : t("common.failed");

      showToast("error", message);
    }
  }

  async function markAllRead() {
    try {
      await alertsService.markAllRead(area === "all" ? null : area);
      showToast(
        "success",
        t("alerts.toast.markedAllRead") || "تم تعليم الكل كمقروء"
      );
      await load();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message || t("common.failed"))
          : t("common.failed");

      showToast("error", message);
    }
  }

  const priorityRows = filteredRows.slice(0, 3);

  const columns: DataTableColumn<AlertRow>[] = [
    {
      key: "severity",
      label: t("alerts.table.severity") || "الأولوية",
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: "title",
      label: t("alerts.table.alert") || "التنبيه",
      render: (row) => (
        <div className="max-w-xl space-y-1">
          <div className="font-semibold text-[rgb(var(--trex-fg))]">{row.title}</div>
          <div className="text-xs leading-5 text-slate-500">{row.message}</div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] text-slate-600">
              {row.type}
            </span>
            {row.entity_id ? (
              <span className="rounded-full bg-black/[0.04] px-2 py-0.5 font-mono text-[11px] text-slate-600">
                {shortId(row.entity_id)}
              </span>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      key: "area",
      label: t("alerts.table.area") || "المجال",
      render: (row) => areaLabel(row.area),
    },
    {
      key: "created_at",
      label: t("alerts.table.created") || "التاريخ",
      render: (row) => <span className="text-xs text-slate-600">{fmtDate(row.created_at)}</span>,
    },
    {
      key: "state",
      label: t("alerts.table.state") || "الحالة",
      render: (row) => (
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            row.is_read
              ? "bg-slate-100 text-slate-600"
              : "bg-emerald-50 text-emerald-700"
          )}
        >
          {row.is_read ? t("alerts.read") || "مقروء" : t("alerts.unread") || "غير مقروء"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-left",
      headerClassName: "text-left",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.href ? (
            <Link href={row.href}>
              <Button variant="secondary">{t("common.open") || "فتح"}</Button>
            </Link>
          ) : null}

          {!row.is_read && row.alert_key ? (
            <Button variant="ghost" onClick={() => markRead(row)}>
              {t("alerts.actions.markRead") || "تعليم كمقروء"}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PageHeader
        title={t("alerts.title") || "التنبيهات"}
        subtitle={
          t("alerts.subtitle") ||
          "متابعة التنبيهات التشغيلية والمالية حسب الأولوية والحالة."
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={load} isLoading={loading}>
              {t("common.refresh") || "تحديث"}
            </Button>
            <Button onClick={markAllRead}>
              {t("alerts.actions.markAllRead") || "تعليم الكل كمقروء"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <StatCard label={t("common.total") || "الإجمالي"} value={summary.total} tone="neutral" />
        <StatCard label={t("alerts.unread") || "غير مقروء"} value={summary.unread} tone="info" />
        <StatCard label={t("alerts.summary.danger") || "خطر"} value={summary.danger} tone="danger" />
        <StatCard label={t("alerts.summary.warn") || "تحذير"} value={summary.warn} tone="warn" />
        <StatCard label={t("alerts.summary.info") || "معلومة"} value={summary.info} tone="info" />
      </div>

      {priorityRows.length ? (
        <Card title="أهم التنبيهات الآن">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {priorityRows.map((row) => (
              <div
                key={row.alert_key || row.id}
                className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <SeverityBadge severity={row.severity} />
                  <span className="text-xs text-slate-500">{areaLabel(row.area)}</span>
                </div>
                <div className="font-semibold text-[rgb(var(--trex-fg))]">{row.title}</div>
                <div className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                  {row.message}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">{fmtDate(row.created_at)}</span>
                  {row.href ? (
                    <Link href={row.href}>
                      <Button variant="secondary">{t("common.open") || "فتح"}</Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title={t("alerts.filters.title") || "الفلاتر"}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect
            label={t("alerts.filters.severity") || "الأولوية"}
            value={severity}
            onChange={(v) => setParam("severity", v)}
          >
            <option value="all">{t("common.all") || "الكل"}</option>
            <option value="danger">{t("alerts.summary.danger") || "خطر"}</option>
            <option value="warn">{t("alerts.summary.warn") || "تحذير"}</option>
            <option value="info">{t("alerts.summary.info") || "معلومة"}</option>
          </FilterSelect>

          <FilterSelect
            label={t("alerts.filters.area") || "المجال"}
            value={area}
            onChange={(v) => setParam("area", v)}
          >
            <option value="all">{t("common.all") || "الكل"}</option>
            <option value="operations">{t("dashboard.tabs.operations") || "العمليات"}</option>
            <option value="finance">{t("dashboard.tabs.finance") || "المالية"}</option>
            <option value="maintenance">{t("dashboard.tabs.maintenance") || "الصيانة"}</option>
            <option value="compliance">{t("alerts.filters.compliance") || "الالتزام"}</option>
          </FilterSelect>

          <FilterSelect
            label={t("alerts.filters.read") || "القراءة"}
            value={readStatus}
            onChange={(v) => setParam("read", v)}
          >
            <option value="all">{t("common.all") || "الكل"}</option>
            <option value="unread">{t("alerts.unread") || "غير مقروء"}</option>
            <option value="read">{t("alerts.read") || "مقروء"}</option>
          </FilterSelect>

          <label className="block">
            <div className="mb-1.5 text-xs font-medium text-slate-500">
              {t("common.search") || "بحث"}
            </div>
            <input
              value={q}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder={t("alerts.filters.searchPlaceholder") || "ابحث في التنبيهات"}
              className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black/30"
            />
          </label>
        </div>
      </Card>

      <DataTable<AlertRow>
        title={t("alerts.table.title") || "قائمة التنبيهات"}
        columns={columns}
        rows={filteredRows}
        loading={loading}
        emptyTitle={t("alerts.empty.title") || "لا توجد تنبيهات"}
        emptyHint={t("alerts.empty.hint") || "جرّب تغيير الفلاتر."}
      />
    </div>
  );
}