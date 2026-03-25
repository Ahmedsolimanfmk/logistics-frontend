"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { clientsService } from "@/src/services/clients.service";
import { contractsService } from "@/src/services/contracts.service";

import type { Client } from "@/src/types/clients.types";
import type { Contract } from "@/src/types/contracts.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

type ToastState =
  | {
      type: "success" | "error";
      msg: string;
    }
  | null;

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

export default function ClientDetailsPage() {
  const t = useT();
  const token = useAuth((s) => s.token);

  const params = useParams();
  const searchParams = useSearchParams();

  const id = String(params?.id || "");
  const month = monthValueOrCurrent(searchParams.get("month"));

  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [contractsLoading, setContractsLoading] = useState(true);

  const [client, setClient] = useState<Client | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsTotal, setContractsTotal] = useState(0);

  const [toast, setToast] = useState<ToastState>(null);

  async function loadClientAndDashboard() {
    if (!token || !id) return;

    setLoading(true);
    setDashboardLoading(true);

    try {
      const [detailsRes, dashboardRes] = await Promise.all([
        clientsService.getByIdFromDetails(id, month),
        clientsService.getDashboard(id, month),
      ]);

      const detailsBody: any = detailsRes as any;
      const dashboardBody: any = dashboardRes as any;

      setClient(
        detailsBody?.client ||
          detailsBody?.data?.client ||
          detailsBody?.data ||
          detailsBody ||
          null
      );

      setDashboard(dashboardBody?.data || dashboardBody || null);
    } catch (e: any) {
      setClient(null);
      setDashboard(null);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحميل بيانات العميل",
      });
    } finally {
      setLoading(false);
      setDashboardLoading(false);
    }
  }

  async function loadContracts() {
    if (!id) return;

    setContractsLoading(true);
    try {
      const res = await contractsService.list({
        client_id: id,
        page: 1,
        limit: 20,
      });

      setContracts(res.items || []);
      setContractsTotal(res.total || 0);
    } catch (e: any) {
      setContracts([]);
      setContractsTotal(0);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحميل العقود",
      });
    } finally {
      setContractsLoading(false);
    }
  }

  useEffect(() => {
    loadClientAndDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id, month]);

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const clientName = useMemo(() => {
    return client?.name || "تفاصيل العميل";
  }, [client]);

  const contractColumns: DataTableColumn<Contract>[] = useMemo(
    () => [
      {
        key: "contract_no",
        label: "رقم العقد",
        render: (row) => row.contract_no || "—",
      },
      {
        key: "start_date",
        label: "البداية",
        render: (row) => formatDate(row.start_date),
      },
      {
        key: "end_date",
        label: "النهاية",
        render: (row) => formatDate(row.end_date),
      },
      {
        key: "billing_cycle",
        label: "دورة الفاتورة",
        render: (row) => row.billing_cycle || "—",
      },
      {
        key: "contract_value",
        label: "القيمة",
        render: (row) => formatMoney(row.contract_value, row.currency),
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.status || "-"} />,
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Link href={`/contracts/${row.id}`}>
              <Button variant="secondary">عرض</Button>
            </Link>
            <Link href={`/contracts/${row.id}?mode=edit`}>
              <Button variant="secondary">تعديل</Button>
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  const sitesColumns: DataTableColumn<any>[] = useMemo(
    () => [
      {
        key: "name",
        label: "الموقع",
        render: (row) => row?.name || row?.site_name || "—",
      },
      {
        key: "location",
        label: "العنوان",
        render: (row) => row?.address || row?.location || "—",
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => (
          <span className={row?.is_active ? "text-emerald-700" : "text-red-700"}>
            {row?.is_active ? "نشط" : "غير نشط"}
          </span>
        ),
      },
    ],
    []
  );

  const sitesRows =
    dashboard?.sites ||
    dashboard?.data?.sites ||
    dashboard?.operations?.sites ||
    [];

  const totalTrips =
    dashboard?.operations?.total_trips_this_month ??
    dashboard?.total_trips_this_month ??
    0;

  const activeSites =
    dashboard?.operations?.active_sites_count ??
    dashboard?.active_sites_count ??
    0;

  const totalSites =
    dashboard?.operations?.total_sites_count ??
    dashboard?.total_sites_count ??
    (Array.isArray(sitesRows) ? sitesRows.length : 0);

  const totalRevenue =
    dashboard?.finance?.total_revenue ??
    dashboard?.total_revenue ??
    dashboard?.financial?.total_revenue ??
    null;

  if (loading && !client) {
    return <div className="p-6">جارٍ تحميل بيانات العميل...</div>;
  }

  if (!client) {
    return <div className="p-6">العميل غير موجود</div>;
  }

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title={clientName}
        subtitle="عرض بيانات العميل والعقود والمواقع والمؤشرات"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/clients">
              <Button variant="secondary">رجوع</Button>
            </Link>
            <Link href={`/clients/${id}/edit`}>
              <Button variant="secondary">تعديل العميل</Button>
            </Link>
            <Link href={`/contracts/new?client_id=${id}`}>
              <Button>إضافة عقد</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          label="إجمالي الرحلات هذا الشهر"
          value={totalTrips}
          formatValue
        />
        <KpiCard
          label="المواقع النشطة"
          value={activeSites}
          formatValue
        />
        <KpiCard
          label="إجمالي المواقع"
          value={totalSites}
          formatValue
        />
        <KpiCard
          label="إجمالي العقود"
          value={contractsTotal}
          formatValue
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">بيانات العميل</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500">الاسم</div>
              <div className="mt-1 font-medium">{client?.name || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">الحالة</div>
              <div className="mt-1">
                <span
                  className={
                    client?.is_active ? "text-emerald-700 font-medium" : "text-red-700 font-medium"
                  }
                >
                  {client?.is_active ? "نشط" : "غير نشط"}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-500">البريد الإلكتروني</div>
              <div className="mt-1 font-medium">{client?.email || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-slate-500">الهاتف</div>
              <div className="mt-1 font-medium">{client?.phone || "—"}</div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500">ملاحظات</div>
              <div className="mt-1 whitespace-pre-wrap font-medium">
                {(client as any)?.notes || "—"}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">ملخص مالي</h2>

          {dashboardLoading ? (
            <div className="text-sm text-slate-500">جارٍ تحميل المؤشرات...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500">إجمالي الإيراد</div>
                <div className="mt-1 font-medium">
                  {formatMoney(totalRevenue, "EGP")}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">الشهر</div>
                <div className="mt-1 font-medium">{month}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">إجمالي العقود</div>
                <div className="mt-1 font-medium">{contractsTotal}</div>
              </div>

              <div>
                <div className="text-xs text-slate-500">إجمالي المواقع</div>
                <div className="mt-1 font-medium">{totalSites}</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <DataTable
        title="عقود العميل"
        subtitle="العقود المرتبطة بهذا العميل"
        columns={contractColumns}
        rows={contracts}
        loading={contractsLoading}
        emptyTitle="لا توجد عقود"
        emptyHint="لم يتم إضافة أي عقود لهذا العميل حتى الآن."
        right={
          <div className="flex flex-wrap gap-2">
            <Link href={`/contracts?client_id=${id}`}>
              <Button variant="secondary">عرض الكل</Button>
            </Link>
            <Link href={`/contracts/new?client_id=${id}`}>
              <Button>إضافة عقد</Button>
            </Link>
          </div>
        }
      />

      <DataTable
        title="مواقع العميل"
        subtitle="المواقع التابعة لهذا العميل"
        columns={sitesColumns}
        rows={Array.isArray(sitesRows) ? sitesRows : []}
        loading={dashboardLoading}
        emptyTitle="لا توجد مواقع"
        emptyHint="لم يتم العثور على مواقع مرتبطة بهذا العميل."
      />

      <Toast
        open={!!toast}
        type={toast?.type || "success"}
        message={toast?.msg || ""}
        onClose={() => setToast(null)}
      />
    </div>
  );
}