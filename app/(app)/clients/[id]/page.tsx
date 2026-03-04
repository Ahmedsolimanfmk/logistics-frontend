// app/(app)/clients/[id]/page.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { Button } from "@/src/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { KpiCard } from "@/src/components/ui/KpiCard";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtMoney(v: any) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return v;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function currentMonthYYYYMM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

type DashboardPayload = {
  month: string;
  client: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    hq_address?: string | null;
    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    tax_no?: string | null;
    notes?: string | null;
    is_active: boolean;
    created_at?: string | null;
  };
  financial: {
    total_invoiced: number;
    total_paid: number;
    balance: number;
  };
  sites: Array<{
    id: string;
    name: string;
    address?: string | null;
    is_active: boolean;
    trips_this_month: number;
  }>;
};

export default function ClientDetailsPage() {
  const t = useT();
  const token = useAuth((s) => s.token);
  const params = useParams();
  const id = String((params as any)?.id || "");

  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(currentMonthYYYYMM());
  const [data, setData] = useState<DashboardPayload | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function load() {
    if (!token || !id) return;
    setLoading(true);
    try {
      const res = await api.get(`/clients/${id}/dashboard?month=${encodeURIComponent(month)}`);
      const payload = (res as any)?.data ?? res;
      setData(payload);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.response?.data?.message || e?.message || t("clients.details.errors.loadFailed") });
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, month]);

  const client = data?.client;

  const siteColumns: DataTableColumn<DashboardPayload["sites"][number]>[] = useMemo(
    () => [
      {
        key: "name",
        label: t("clients.details.sites.table.name"),
        render: (row) => row?.name || "—",
      },
      {
        key: "address",
        label: t("clients.details.sites.table.address"),
        render: (row) => row?.address || "—",
      },
      {
        key: "trips",
        label: t("clients.details.sites.table.tripsThisMonth"),
        render: (row) => <span className="font-semibold">{row?.trips_this_month ?? 0}</span>,
      },
      {
        key: "status",
        label: t("clients.details.sites.table.status"),
        render: (row) =>
          row?.is_active ? (
            <span className="inline-flex items-center gap-2 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              {t("common.active")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              {t("common.disabled")}
            </span>
          ),
      },
    ],
    [t]
  );

  return (
    <div className="min-h-screen">
      <PageHeader
        title={t("clients.details.title")}
        subtitle={client ? client.name : t("clients.details.subtitle")}
        actions={
          <Link href="/clients">
            <Button variant="secondary">{t("clients.details.actions.backToList")}</Button>
          </Link>
        }
      />

      <FiltersBar
        left={
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">{t("clients.details.filters.month")}</div>
            <input
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="YYYY-MM"
              className={cn(
                "w-[140px] px-3 py-2 rounded-xl",
                "bg-white border border-slate-200 outline-none text-sm",
                "focus:ring-2 focus:ring-slate-200"
              )}
            />
            <Button variant="secondary" onClick={() => setMonth(currentMonthYYYYMM())}>
              {t("clients.details.filters.thisMonth")}
            </Button>
            <div className="text-[11px] text-slate-500">{t("clients.details.filters.monthHint")}</div>
          </div>
        }
        right={
          <div className="text-xs text-slate-500">
            {t("clients.details.profile.status")}:{" "}
            <span className="font-semibold text-slate-900">
              {client?.is_active ? t("common.active") : t("common.disabled")}
            </span>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <KpiCard
          label={t("clients.details.kpi.totalInvoiced")}
          value={fmtMoney(data?.financial?.total_invoiced ?? 0)}
          hint={t("clients.details.kpi.hintInvoices")}
        />
        <KpiCard
          label={t("clients.details.kpi.totalPaid")}
          value={fmtMoney(data?.financial?.total_paid ?? 0)}
          hint={t("clients.details.kpi.hintPayments")}
        />
        <KpiCard
          label={t("clients.details.kpi.balance")}
          value={fmtMoney(data?.financial?.balance ?? 0)}
          hint={t("clients.details.kpi.hintBalance")}
        />
      </div>

      {/* Profile */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
        <div className="text-sm font-semibold mb-3">{t("clients.details.profile.title")}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">{t("clients.details.profile.name")}</div>
            <div className="mt-1 font-medium">{client?.name || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">{t("clients.details.profile.email")}</div>
            <div className="mt-1 font-medium">{client?.email || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">{t("clients.details.profile.phone")}</div>
            <div className="mt-1 font-medium">{client?.phone || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">{t("clients.details.profile.hqAddress")}</div>
            <div className="mt-1 font-medium">{client?.hq_address || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">{t("clients.details.profile.contactName")}</div>
            <div className="mt-1 font-medium">{client?.contact_name || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">{t("clients.details.profile.contactPhone")}</div>
            <div className="mt-1 font-medium">{client?.contact_phone || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">{t("clients.details.profile.contactEmail")}</div>
            <div className="mt-1 font-medium">{client?.contact_email || "—"}</div>
          </div>

          <div>
            <div className="text-xs text-slate-500">{t("clients.details.profile.taxNo")}</div>
            <div className="mt-1 font-medium">{client?.tax_no || "—"}</div>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs text-slate-500">{t("clients.details.profile.notes")}</div>
            <div className="mt-1 font-medium">{client?.notes || "—"}</div>
          </div>
        </div>
      </div>

      {/* Sites */}
      <DataTable
        title={t("clients.details.sites.title")}
        subtitle={t("clients.details.sites.subtitle").replace("{month}", month)}
        columns={siteColumns}
        rows={data?.sites || []}
        loading={loading}
        emptyTitle={t("clients.details.sites.empty")}
        emptyHint={t("clients.details.sites.emptyHint") || ""}
      />

      {toast && <Toast open type={toast.type} message={toast.msg} onClose={() => setToast(null)} />}
    </div>
  );
}