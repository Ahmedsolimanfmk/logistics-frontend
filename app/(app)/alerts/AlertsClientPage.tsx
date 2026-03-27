"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";

import alertsService from "@/src/services/alerts.service";
import type {
  AlertArea,
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

function SeverityBadge({ severity }: { severity?: string | null }) {
  const s = String(severity || "").toLowerCase();

  const cls =
    s === "danger"
      ? "bg-red-500/10 text-red-700 border-red-500/20"
      : s === "warn"
      ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
      : "bg-sky-500/10 text-sky-700 border-sky-500/20";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs",
        cls
      )}
    >
      {s || "info"}
    </span>
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
    router.push(`/alerts?${params.toString()}`);
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

  const summary = useMemo(() => alertsService.buildSummary(filteredRows), [filteredRows]);

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
      showToast("success", t("alerts.toast.markedAllRead") || "تم تعليم الكل كمقروء");
      await load();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: string }).message || t("common.failed"))
          : t("common.failed");

      showToast("error", message);
    }
  }

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
        <div className="space-y-0.5">
          <div className="font-medium">{row.title}</div>
          <div className="text-xs text-slate-500">{row.message}</div>
        </div>
      ),
    },
    {
      key: "area",
      label: t("alerts.table.area") || "المجال",
      render: (row) => row.area || "—",
    },
    {
      key: "created_at",
      label: t("alerts.table.created") || "التاريخ",
      render: (row) => fmtDate(row.created_at),
    },
    {
      key: "state",
      label: t("alerts.table.state") || "الحالة",
      render: (row) =>
        row.is_read ? t("alerts.read") || "مقروء" : t("alerts.unread") || "غير مقروء",
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
          ) : row.entity_id ? (
            <span className="font-mono text-xs text-slate-500">{shortId(row.entity_id)}</span>
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
    <div className="space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PageHeader
        title={t("alerts.title") || "التنبيهات"}
        subtitle={t("alerts.subtitle") || "عرض ومتابعة التنبيهات حسب الأولوية والحالة"}
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
        <Card>
          <div className="text-xs text-slate-500">{t("common.total") || "الإجمالي"}</div>
          <div className="mt-1 text-xl font-semibold">{summary.total}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">{t("alerts.unread") || "غير مقروء"}</div>
          <div className="mt-1 text-xl font-semibold">{summary.unread}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">{t("alerts.summary.danger") || "خطر"}</div>
          <div className="mt-1 text-xl font-semibold">{summary.danger}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">{t("alerts.summary.warn") || "تحذير"}</div>
          <div className="mt-1 text-xl font-semibold">{summary.warn}</div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">{t("alerts.summary.info") || "معلومة"}</div>
          <div className="mt-1 text-xl font-semibold">{summary.info}</div>
        </Card>
      </div>

      <Card title={t("alerts.filters.title") || "الفلاتر"}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="mb-1 text-xs text-slate-500">
              {t("alerts.filters.severity") || "الأولوية"}
            </div>
            <select
              value={severity}
              onChange={(e) => setParam("severity", e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none"
            >
              <option value="all">{t("common.all") || "الكل"}</option>
              <option value="danger">{t("alerts.summary.danger") || "خطر"}</option>
              <option value="warn">{t("alerts.summary.warn") || "تحذير"}</option>
              <option value="info">{t("alerts.summary.info") || "معلومة"}</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-500">
              {t("alerts.filters.area") || "المجال"}
            </div>
            <select
              value={area}
              onChange={(e) => setParam("area", e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none"
            >
              <option value="all">{t("common.all") || "الكل"}</option>
              <option value="operations">{t("dashboard.tabs.operations") || "العمليات"}</option>
              <option value="finance">{t("dashboard.tabs.finance") || "المالية"}</option>
              <option value="maintenance">{t("dashboard.tabs.maintenance") || "الصيانة"}</option>
              <option value="compliance">{t("alerts.filters.compliance") || "الالتزام"}</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-500">
              {t("alerts.filters.read") || "القراءة"}
            </div>
            <select
              value={readStatus}
              onChange={(e) => setParam("read", e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none"
            >
              <option value="all">{t("common.all") || "الكل"}</option>
              <option value="unread">{t("alerts.unread") || "غير مقروء"}</option>
              <option value="read">{t("alerts.read") || "مقروء"}</option>
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-slate-500">
              {t("common.search") || "بحث"}
            </div>
            <input
              value={q}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder={t("alerts.filters.searchPlaceholder") || "ابحث في التنبيهات"}
              className="w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none"
            />
          </div>
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