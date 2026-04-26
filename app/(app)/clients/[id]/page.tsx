"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { clientsService } from "@/src/services/clients.service";
import type { Client } from "@/src/types/clients.types";

import { useT } from "@/src/i18n/useT";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";

function fmtMoney(value: unknown) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("ar-EG");
}

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function InfoItem({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.65)] p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-[rgb(var(--trex-fg))]">
        {value}
      </div>
    </div>
  );
}

type ClientDetailsResponse = {
  client?: Client;
  profile?: Client;
  financial?: {
    total_invoiced?: number;
    total_paid?: number;
    balance?: number;
    monthly_trip_revenue?: number;
  };
  operations?: {
    trips_this_month?: number;
    active_sites?: number;
    total_sites?: number;
  };
  summary?: {
    total_contracts?: number;
    active_sites?: number;
    total_sites?: number;
  };
  sites?: any[];
  contracts?: any[];
  invoices?: any[];
  payments?: any[];
};

export default function ClientDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const sp = useSearchParams();

  const id = String(params?.id || "");
  const month =
    sp.get("month") || new Date().toISOString().slice(0, 7);

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [details, setDetails] = useState<ClientDetailsResponse | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  function setMonth(value: string) {
    const query = new URLSearchParams(sp.toString());
    if (value) query.set("month", value);
    else query.delete("month");

    router.push(`/clients/${id}?${query.toString()}`);
  }

  async function load() {
    if (!id) return;

    setLoading(true);

    try {
      const res = await clientsService.getDetails(id, month );
      const body = res as ClientDetailsResponse;

      setDetails(body);
      setClient(body.client || body.profile || (body as any));
    } catch (err: any) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          t("clients.details.errors.loadFailed") ||
          "فشل تحميل تفاصيل العميل"
      );
      setDetails(null);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, month]);

  const financial = details?.financial || {};
  const operations = details?.operations || {};
  const summary = details?.summary || {};

  const sites = useMemo(() => details?.sites || [], [details]);
  const contracts = useMemo(() => details?.contracts || [], [details]);
  const invoices = useMemo(() => details?.invoices || [], [details]);
  const payments = useMemo(() => details?.payments || [], [details]);

  const siteColumns: DataTableColumn<any>[] = [
    {
      key: "name",
      label: t("clients.details.sites.table.name"),
      render: (row) => row.name || "—",
    },
    {
      key: "address",
      label: t("clients.details.sites.table.address"),
      render: (row) => row.address || "—",
    },
    {
      key: "city",
      label: t("clients.details.sites.table.city"),
      render: (row) => row.city || "—",
    },
    {
      key: "trips",
      label: t("clients.details.sites.table.tripsThisMonth"),
      render: (row) => String(row.trips_this_month || row.trips_count || 0),
    },
    {
      key: "status",
      label: t("clients.details.sites.table.status"),
      render: (row) => (
        <StatusBadge status={row.is_active === false ? "INACTIVE" : "ACTIVE"} />
      ),
    },
  ];

  const contractColumns: DataTableColumn<any>[] = [
    {
      key: "contract_no",
      label: t("clients.details.contracts.table.contractNo"),
      render: (row) => row.contract_no || row.contractNo || "—",
    },
    {
      key: "start_date",
      label: t("clients.details.contracts.table.startDate"),
      render: (row) => fmtDate(row.start_date),
    },
    {
      key: "end_date",
      label: t("clients.details.contracts.table.endDate"),
      render: (row) => fmtDate(row.end_date),
    },
    {
      key: "billing_cycle",
      label: t("clients.details.contracts.table.billingCycle"),
      render: (row) => row.billing_cycle || "—",
    },
    {
      key: "value",
      label: t("clients.details.contracts.table.value"),
      render: (row) => fmtMoney(row.contract_value || row.value),
    },
    {
      key: "status",
      label: t("clients.details.contracts.table.status"),
      render: (row) => <StatusBadge status={row.status || "—"} />,
    },
    {
      key: "actions",
      label: t("clients.details.contracts.table.actions"),
      render: (row) =>
        row.id ? (
          <Link href={`/contracts/${row.id}`}>
            <Button type="button" variant="secondary">
              {t("common.view")}
            </Button>
          </Link>
        ) : (
          "—"
        ),
    },
  ];

  const invoiceColumns: DataTableColumn<any>[] = [
    {
      key: "invoice_no",
      label: t("clients.details.invoices.table.invoiceNo"),
      render: (row) => row.invoice_no || row.invoiceNo || "—",
    },
    {
      key: "issue_date",
      label: t("clients.details.invoices.table.issueDate"),
      render: (row) => fmtDate(row.issue_date),
    },
    {
      key: "due_date",
      label: t("clients.details.invoices.table.dueDate"),
      render: (row) => fmtDate(row.due_date),
    },
    {
      key: "status",
      label: t("clients.details.invoices.table.status"),
      render: (row) => <StatusBadge status={row.status || "—"} />,
    },
    {
      key: "amount",
      label: t("clients.details.invoices.table.amount"),
      render: (row) => fmtMoney(row.total_amount || row.amount),
    },
  ];

  const paymentColumns: DataTableColumn<any>[] = [
    {
      key: "payment_date",
      label: t("clients.details.payments.table.paymentDate"),
      render: (row) => fmtDate(row.payment_date),
    },
    {
      key: "amount",
      label: t("clients.details.payments.table.amount"),
      render: (row) => fmtMoney(row.amount),
    },
    {
      key: "method",
      label: t("clients.details.payments.table.method"),
      render: (row) => row.method || row.payment_method || "—",
    },
    {
      key: "status",
      label: t("clients.details.payments.table.status"),
      render: (row) => <StatusBadge status={row.status || "—"} />,
    },
    {
      key: "reference",
      label: t("clients.details.payments.table.reference"),
      render: (row) => row.reference || "—",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <Card>
          <div className="text-sm text-slate-500">{t("common.loading")}</div>
        </Card>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4" dir="rtl">
        <Card>
          <div className="text-sm text-slate-500">
            {t("clients.details.empty.notFound") || "العميل غير موجود"}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        title={t("clients.details.title") || "تفاصيل العميل"}
        subtitle={client.name}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/clients")}
            >
              {t("clients.details.actions.backToList")}
            </Button>

            <Link href={`/clients/${id}/edit`}>
              <Button type="button" variant="primary">
                {t("common.edit")}
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">
              {t("clients.details.filters.month")}
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="trex-input w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <Button type="button" variant="secondary" onClick={load}>
              {t("common.refresh")}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KpiCard
          label={t("clients.details.kpi.totalInvoiced")}
          value={fmtMoney(financial.total_invoiced)}
        />
        <KpiCard
          label={t("clients.details.kpi.totalPaid")}
          value={fmtMoney(financial.total_paid)}
        />
        <KpiCard
          label={t("clients.details.kpi.balance")}
          value={fmtMoney(financial.balance)}
        />
        <KpiCard
          label={t("clients.details.kpi.monthlyTripRevenue")}
          value={fmtMoney(financial.monthly_trip_revenue)}
        />
        <KpiCard
          label={t("clients.details.kpi.totalTripsThisMonth")}
          value={String(operations.trips_this_month || 0)}
        />
        <KpiCard
          label={t("clients.details.kpi.activeSites")}
          value={String(operations.active_sites || summary.active_sites || 0)}
        />
        <KpiCard
          label={t("clients.details.kpi.totalSites")}
          value={String(operations.total_sites || summary.total_sites || 0)}
        />
        <KpiCard
          label={t("clients.details.summary.contracts")}
          value={String(summary.total_contracts || contracts.length || 0)}
        />
      </div>

      <Card title={t("clients.details.profile.title")}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InfoItem label={t("clients.details.profile.name")} value={client.name} />
          <InfoItem label={t("clients.details.profile.email")} value={valueOrDash(client.email || (client as any).billing_email)} />
          <InfoItem label={t("clients.details.profile.phone")} value={valueOrDash(client.phone)} />
          <InfoItem label={t("clients.details.profile.hqAddress")} value={valueOrDash(client.hq_address)} />
          <InfoItem label={t("clients.details.profile.contactName")} value={valueOrDash(client.contact_name || client.primary_contact_name)} />
          <InfoItem label={t("clients.details.profile.contactPhone")} value={valueOrDash(client.contact_phone || client.primary_contact_phone)} />
          <InfoItem label={t("clients.details.profile.contactEmail")} value={valueOrDash(client.contact_email || client.primary_contact_email)} />
          <InfoItem label={t("clients.details.profile.taxNo")} value={valueOrDash(client.tax_no)} />
          <InfoItem label={t("clients.details.profile.status")} value={<StatusBadge status={client.is_active === false ? "INACTIVE" : "ACTIVE"} />} />
          <InfoItem label={t("clients.details.profile.createdAt")} value={fmtDate(client.created_at)} />
          <InfoItem label={t("clients.details.profile.notes")} value={valueOrDash(client.notes)} />
        </div>
      </Card>

      <DataTable
        title={t("clients.details.sites.title")}
        subtitle={t("clients.details.sites.subtitle").replace("{month}", month)}
        columns={siteColumns}
        rows={sites}
        loading={false}
        emptyTitle={t("clients.details.sites.empty")}
        emptyHint={t("clients.details.sites.emptyHint")}
      />

      <DataTable
        title={t("clients.details.contracts.title")}
        subtitle={t("clients.details.contracts.subtitle")}
        columns={contractColumns}
        rows={contracts}
        loading={false}
        emptyTitle={t("clients.details.contracts.empty")}
        emptyHint={t("clients.details.contracts.emptyHint")}
      />

      <DataTable
        title={t("clients.details.invoices.title")}
        subtitle={t("clients.details.invoices.subtitle")}
        columns={invoiceColumns}
        rows={invoices}
        loading={false}
        emptyTitle={t("clients.details.invoices.empty")}
        emptyHint={t("clients.details.invoices.emptyHint")}
      />

      <DataTable
        title={t("clients.details.payments.title")}
        subtitle={t("clients.details.payments.subtitle")}
        columns={paymentColumns}
        rows={payments}
        loading={false}
        emptyTitle={t("clients.details.payments.empty")}
        emptyHint={t("clients.details.payments.emptyHint")}
      />

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        dir="rtl"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}