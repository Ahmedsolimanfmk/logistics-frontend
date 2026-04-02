"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { clientsService } from "@/src/services/clients.service";
import type {
  ClientDashboardResponse,
  ClientDetailsResponse,
  ClientRecentContract,
  ClientRecentInvoice,
  ClientRecentPayment,
  ClientSite,
} from "@/src/types/clients.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG").format(d);
}

function formatMoney(value?: number | null, currency?: string | null) {
  if (value == null) return "—";

  try {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: currency || "EGP",
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${value} ${currency || "EGP"}`;
  }
}

function monthValueOrCurrent(v: string | null) {
  if (v && /^\d{4}-\d{2}$/.test(v)) return v;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function StatusText({ active }: { active?: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-2 text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-600" />
      نشط
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-red-700">
      <span className="h-2 w-2 rounded-full bg-red-600" />
      غير نشط
    </span>
  );
}

export default function ClientDetailsPage() {
  const t = useT();
  const token = useAuth((s) => s.token);

  const params = useParams();
  const searchParams = useSearchParams();

  const id = String(params?.id || "");
  const month = monthValueOrCurrent(searchParams.get("month"));

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<ClientDetailsResponse | null>(null);
  const [dashboard, setDashboard] = useState<ClientDashboardResponse | null>(null);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  async function load() {
    if (!token || !id) return;

    setLoading(true);
    try {
      const [detailsRes, dashboardRes] = await Promise.all([
        clientsService.getDetails(id, month),
        clientsService.getDashboard(id, month),
      ]);

      setDetails(detailsRes);
      setDashboard(dashboardRes);
    } catch (e: any) {
      setDetails(null);
      setDashboard(null);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || t("clients.details.errors.loadFailed"),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    if (!id) return;

    setToggleLoading(true);
    try {
      await clientsService.toggle(id);
      setToast({
        type: "success",
        msg: t("clients.toast.toggled") || "تم تحديث حالة العميل بنجاح",
      });
      setToggleOpen(false);
      await load();
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || t("clients.errors.toggleFailed"),
      });
    } finally {
      setToggleLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, month]);

  const client = details?.client || null;
  const sites = details?.sites || [];
  const financial = dashboard?.financial || details?.ar_summary || null;
  const operations = dashboard?.operations || {};
  const recentContracts = details?.recent_contracts || [];
  const recentInvoices = details?.recent_invoices || [];
  const recentPayments = details?.recent_payments || [];

  const siteColumns: DataTableColumn<ClientSite>[] = useMemo(
    () => [
      {
        key: "name",
        label: t("clients.details.sites.table.name") || "الموقع",
        render: (row) => row?.name || "—",
      },
      {
        key: "address",
        label: t("clients.details.sites.table.address") || "العنوان",
        render: (row) => row?.address || "—",
      },
      {
        key: "city",
        label: t("clients.details.sites.table.city") || "المدينة",
        render: (row) => row?.city || "—",
      },
      {
        key: "trips",
        label: t("clients.details.sites.table.tripsThisMonth") || "رحلات الشهر",
        render: (row) => <span className="font-semibold">{row?.trips_this_month ?? 0}</span>,
      },
      {
        key: "status",
        label: t("clients.details.sites.table.status") || "الحالة",
        render: (row) => <StatusText active={!!row?.is_active} />,
      },
    ],
    [t]
  );

  const contractsColumns: DataTableColumn<ClientRecentContract>[] = useMemo(
    () => [
      {
        key: "contract_no",
        label: t("clients.details.contracts.table.contractNo") || "رقم العقد",
        render: (row) => row?.contract_no || "—",
      },
      {
        key: "start_date",
        label: t("clients.details.contracts.table.startDate") || "البداية",
        render: (row) => formatDate(row?.start_date),
      },
      {
        key: "end_date",
        label: t("clients.details.contracts.table.endDate") || "النهاية",
        render: (row) => formatDate(row?.end_date),
      },
      {
        key: "billing_cycle",
        label: t("clients.details.contracts.table.billingCycle") || "دورة الفاتورة",
        render: (row) => row?.billing_cycle || "—",
      },
      {
        key: "contract_value",
        label: t("clients.details.contracts.table.value") || "القيمة",
        render: (row) => formatMoney(row?.contract_value, row?.currency),
      },
      {
        key: "status",
        label: t("clients.details.contracts.table.status") || "الحالة",
        render: (row) => row?.status || "—",
      },
      {
        key: "actions",
        label: t("clients.details.contracts.table.actions") || "الإجراءات",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Link href={`/contracts/${row.id}`}>
              <Button variant="secondary">{t("common.view") || "عرض"}</Button>
            </Link>
          </div>
        ),
      },
    ],
    [t]
  );

  const invoicesColumns: DataTableColumn<ClientRecentInvoice>[] = useMemo(
    () => [
      {
        key: "invoice_no",
        label: t("clients.details.invoices.table.invoiceNo") || "رقم الفاتورة",
        render: (row) => row?.invoice_no || "—",
      },
      {
        key: "issue_date",
        label: t("clients.details.invoices.table.issueDate") || "تاريخ الإصدار",
        render: (row) => formatDate(row?.issue_date),
      },
      {
        key: "due_date",
        label: t("clients.details.invoices.table.dueDate") || "الاستحقاق",
        render: (row) => formatDate(row?.due_date),
      },
      {
        key: "status",
        label: t("clients.details.invoices.table.status") || "الحالة",
        render: (row) => row?.status || "—",
      },
      {
        key: "amount",
        label: t("clients.details.invoices.table.amount") || "القيمة",
        render: (row) => formatMoney(row?.total_amount, "EGP"),
      },
    ],
    [t]
  );

  const paymentsColumns: DataTableColumn<ClientRecentPayment>[] = useMemo(
    () => [
      {
        key: "payment_date",
        label: t("clients.details.payments.table.paymentDate") || "تاريخ السداد",
        render: (row) => formatDate(row?.payment_date),
      },
      {
        key: "amount",
        label: t("clients.details.payments.table.amount") || "المبلغ",
        render: (row) => formatMoney(row?.amount, "EGP"),
      },
      {
        key: "method",
        label: t("clients.details.payments.table.method") || "الطريقة",
        render: (row) => row?.method || "—",
      },
      {
        key: "status",
        label: t("clients.details.payments.table.status") || "الحالة",
        render: (row) => row?.status || "—",
      },
      {
        key: "reference",
        label: t("clients.details.payments.table.reference") || "المرجع",
        render: (row) => row?.reference || "—",
      },
    ],
    [t]
  );

  if (loading && !client) {
    return <div className="p-6">جارٍ تحميل بيانات العميل...</div>;
  }

  if (!client) {
    return <div className="p-6">العميل غير موجود</div>;
  }

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title={client.name || t("clients.details.title")}
        subtitle={t("clients.details.subtitle") || "عرض بيانات العميل ومؤشراته"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/clients">
              <Button variant="secondary">{t("common.back") || "رجوع"}</Button>
            </Link>

            <Link href={`/clients/${id}/edit`}>
              <Button variant="secondary">{t("common.edit") || "تعديل"}</Button>
            </Link>

            <Button
              variant={client.is_active ? "danger" : "primary"}
              onClick={() => setToggleOpen(true)}
            >
              {client.is_active
                ? t("common.disable") || "تعطيل"
                : t("common.enable") || "تفعيل"}
            </Button>
          </div>
        }
      />

      <FiltersBar
        left={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="text-xs text-slate-500">
              {t("clients.details.filters.month") || "الشهر"}
            </div>

            <input
              value={month}
              readOnly
              className={cn(
                "w-full sm:w-[140px] px-3 py-2 rounded-xl",
                "bg-slate-50 border border-slate-200 outline-none text-sm"
              )}
            />

            <div className="text-[11px] text-slate-500">
              {t("clients.details.filters.monthHint") || "يتم الحساب حسب الشهر المحدد في الرابط"}
            </div>
          </div>
        }
        right={
          <div className="text-xs text-slate-500">
            {(t("clients.details.profile.status") || "الحالة")}:{" "}
            <span className="font-semibold text-slate-900">
              {client?.is_active ? t("common.active") || "نشط" : t("common.disabled") || "غير نشط"}
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          label={t("clients.details.kpi.totalInvoiced") || "إجمالي المفوتر"}
          value={formatMoney(financial?.total_invoiced ?? 0, "EGP")}
          hint={t("clients.details.kpi.hintInvoices") || ""}
        />
        <KpiCard
          label={t("clients.details.kpi.totalPaid") || "إجمالي المسدد"}
          value={formatMoney(financial?.total_paid ?? 0, "EGP")}
          hint={t("clients.details.kpi.hintPayments") || ""}
        />
        <KpiCard
          label={t("clients.details.kpi.balance") || "الرصيد"}
          value={formatMoney(financial?.balance ?? 0, "EGP")}
          hint={t("clients.details.kpi.hintBalance") || ""}
        />
        <KpiCard
          label={t("clients.details.kpi.monthlyTripRevenue") || "إيراد الرحلات بالشهر"}
          value={formatMoney(financial?.monthly_trip_revenue ?? 0, "EGP")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          label={t("clients.details.kpi.totalTripsThisMonth") || "إجمالي الرحلات هذا الشهر"}
          value={String(operations?.total_trips_this_month ?? 0)}
        />
        <KpiCard
          label={t("clients.details.kpi.activeSites") || "المواقع النشطة"}
          value={String(operations?.active_sites_count ?? 0)}
        />
        <KpiCard
          label={t("clients.details.kpi.totalSites") || "إجمالي المواقع"}
          value={String(operations?.total_sites_count ?? sites.length)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {t("clients.details.profile.title") || "بيانات العميل"}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.name") || "الاسم"}
              </div>
              <div className="mt-1 font-medium">{client.name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.status") || "الحالة"}
              </div>
              <div className="mt-1">
                <StatusText active={client.is_active} />
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.email") || "البريد الإلكتروني"}
              </div>
              <div className="mt-1 font-medium">{client.email || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.phone") || "الهاتف"}
              </div>
              <div className="mt-1 font-medium">{client.phone || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.hqAddress") || "العنوان الرئيسي"}
              </div>
              <div className="mt-1 font-medium">{client.hq_address || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.taxNo") || "الرقم الضريبي"}
              </div>
              <div className="mt-1 font-medium">{client.tax_no || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.contactName") || "اسم المسؤول"}
              </div>
              <div className="mt-1 font-medium">{client.contact_name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.contactPhone") || "هاتف المسؤول"}
              </div>
              <div className="mt-1 font-medium">{client.contact_phone || "—"}</div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.contactEmail") || "بريد المسؤول"}
              </div>
              <div className="mt-1 font-medium">{client.contact_email || "—"}</div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500">
                {t("clients.details.profile.notes") || "ملاحظات"}
              </div>
              <div className="mt-1 whitespace-pre-wrap font-medium">
                {client.notes || "—"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {t("clients.details.summary.title") || "ملخص إضافي"}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.summary.month") || "الشهر"}
              </div>
              <div className="mt-1 font-medium">{dashboard?.month || month}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.summary.contracts") || "إجمالي العقود"}
              </div>
              <div className="mt-1 font-medium">
                {details?.contracts_summary?.total_contracts ?? 0}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.summary.sites") || "إجمالي المواقع"}
              </div>
              <div className="mt-1 font-medium">{sites.length}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">
                {t("clients.details.summary.activeSites") || "المواقع النشطة"}
              </div>
              <div className="mt-1 font-medium">
                {sites.filter((x) => x.is_active).length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <DataTable
        title={t("clients.details.sites.title") || "مواقع العميل"}
        subtitle={(t("clients.details.sites.subtitle") || "المواقع التابعة للعميل في {month}").replace(
          "{month}",
          month
        )}
        columns={siteColumns}
        rows={sites}
        loading={loading}
        emptyTitle={t("clients.details.sites.empty") || "لا توجد مواقع"}
        emptyHint={t("clients.details.sites.emptyHint") || ""}
      />

      <DataTable
        title={t("clients.details.contracts.title") || "العقود الأخيرة"}
        subtitle={t("clients.details.contracts.subtitle") || "آخر العقود المرتبطة بالعميل"}
        columns={contractsColumns}
        rows={recentContracts}
        loading={loading}
        emptyTitle={t("clients.details.contracts.empty") || "لا توجد عقود"}
        emptyHint={t("clients.details.contracts.emptyHint") || ""}
        right={
          <div className="flex flex-wrap gap-2">
            <Link href={`/contracts?client_id=${id}`}>
              <Button variant="secondary">{t("common.viewAll") || "عرض الكل"}</Button>
            </Link>
            <Link href={`/contracts/new?client_id=${id}`}>
              <Button>{t("clients.actions.addContract") || "إضافة عقد"}</Button>
            </Link>
          </div>
        }
      />

      <DataTable
        title={t("clients.details.invoices.title") || "آخر الفواتير"}
        subtitle={t("clients.details.invoices.subtitle") || "آخر الفواتير الخاصة بالعميل"}
        columns={invoicesColumns}
        rows={recentInvoices}
        loading={loading}
        emptyTitle={t("clients.details.invoices.empty") || "لا توجد فواتير"}
        emptyHint={t("clients.details.invoices.emptyHint") || ""}
      />

      <DataTable
        title={t("clients.details.payments.title") || "آخر المدفوعات"}
        subtitle={t("clients.details.payments.subtitle") || "آخر المدفوعات الخاصة بالعميل"}
        columns={paymentsColumns}
        rows={recentPayments}
        loading={loading}
        emptyTitle={t("clients.details.payments.empty") || "لا توجد مدفوعات"}
        emptyHint={t("clients.details.payments.emptyHint") || ""}
      />

      <ConfirmDialog
        open={toggleOpen}
        title={t("common.confirm") || "تأكيد"}
        description={
          client.is_active
            ? t("clients.confirm.disableDesc") || "هل تريد تعطيل هذا العميل؟"
            : t("clients.confirm.enableDesc") || "هل تريد تفعيل هذا العميل؟"
        }
        confirmText={
          client.is_active
            ? t("common.disable") || "تعطيل"
            : t("common.enable") || "تفعيل"
        }
        cancelText={t("common.cancel") || "إلغاء"}
        tone="warning"
        isLoading={toggleLoading}
        onClose={() => {
          if (toggleLoading) return;
          setToggleOpen(false);
        }}
        onConfirm={handleToggle}
      />

      {toast && (
        <Toast open type={toast.type} message={toast.msg} onClose={() => setToast(null)} />
      )}
    </div>
  );
}