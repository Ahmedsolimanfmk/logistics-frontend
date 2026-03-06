"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function fmtMoney(n: any) {
  return new Intl.NumberFormat("ar-EG", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number(n || 0));
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function vehicleLabel(v: any) {
  if (!v) return "—";
  const fleet = String(v?.fleet_no || "").trim();
  const plate = String(v?.plate_no || "").trim();
  const dn = String(v?.display_name || "").trim();

  if (fleet && plate) return `${fleet} — ${plate}${dn ? ` (${dn})` : ""}`;
  if (fleet) return `${fleet}${dn ? ` (${dn})` : ""}`;
  if (plate) return `${plate}${dn ? ` (${dn})` : ""}`;
  return dn || "—";
}

function licenseMeta(expiryDate: any) {
  if (!expiryDate) return { text: "—", tone: "neutral" as const, days: null as number | null };

  const dt = new Date(String(expiryDate));
  if (Number.isNaN(dt.getTime())) {
    return { text: "—", tone: "neutral" as const, days: null as number | null };
  }

  const now = new Date();
  const diff = dt.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { text: "منتهية", tone: "danger" as const, days };
  if (days <= 7) return { text: `${days} يوم`, tone: "warn" as const, days };
  return { text: `${days} يوم`, tone: "good" as const, days };
}

function LicenseBadge({ expiryDate }: { expiryDate: any }) {
  const meta = licenseMeta(expiryDate);

  const cls =
    meta.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : meta.tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : meta.tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs", cls)}>{meta.text}</span>;
}

function KpiCard({
  title,
  value,
  hint,
  tone = "neutral",
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "border-rose-200 bg-rose-50"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50"
      : tone === "good"
      ? "border-emerald-200 bg-emerald-50"
      : "border-gray-200 bg-white";

  return (
    <div className={cn("rounded-2xl border p-4", cls)}>
      <div className="text-xs text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-600">{hint}</div> : null}
    </div>
  );
}

export default function DriverDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(message: string, type: "success" | "error" = "success") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
  }

  async function load() {
    if (!id) return;

    setLoading(true);
    setErr(null);
    try {
      const res: any = await api.get(`/drivers/${id}/financial-summary`);
      const body = res?.data ?? res;
      setData(body);
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "فشل تحميل بيانات السائق");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const driver = data?.driver || null;
  const summary = data?.summary || {};
  const recentTrips = Array.isArray(data?.recent_trips) ? data.recent_trips : [];
  const recentExpenses = Array.isArray(data?.recent_expenses) ? data.recent_expenses : [];

  const licenseInfo = useMemo(() => licenseMeta(driver?.license_expiry_date), [driver?.license_expiry_date]);

  const tripColumns: DataTableColumn<any>[] = [
    {
      key: "trip_id",
      label: "الرحلة",
      render: (r) => <span className="font-mono">{shortId(r.trip_id)}</span>,
    },
    {
      key: "trip_status",
      label: "الحالة",
      render: (r) => <StatusBadge status={String(r.trip_status || "—")} />,
    },
    {
      key: "financial_status",
      label: "المالية",
      render: (r) => <span>{r.financial_status || "—"}</span>,
    },
    {
      key: "client",
      label: "العميل",
      render: (r) => r.client || "—",
    },
    {
      key: "site",
      label: "الموقع",
      render: (r) => r.site || "—",
    },
    {
      key: "vehicle",
      label: "المركبة",
      render: (r) => vehicleLabel(r.vehicle),
    },
    {
      key: "assigned_at",
      label: "تاريخ الإسناد",
      render: (r) => fmtDate(r.assigned_at),
    },
  ];

  const expenseColumns: DataTableColumn<any>[] = [
    {
      key: "id",
      label: "المصروف",
      render: (r) => <span className="font-mono">{shortId(r.id)}</span>,
    },
    {
      key: "expense_type",
      label: "النوع",
      render: (r) => r.expense_type || "—",
    },
    {
      key: "amount",
      label: "القيمة",
      render: (r) => <span className="font-semibold">{fmtMoney(r.amount)}</span>,
    },
    {
      key: "approval_status",
      label: "الاعتماد",
      render: (r) => <StatusBadge status={String(r.approval_status || "—")} />,
    },
    {
      key: "payment_source",
      label: "مصدر الدفع",
      render: (r) => r.payment_source || "—",
    },
    {
      key: "client",
      label: "العميل",
      render: (r) => r.client || "—",
    },
    {
      key: "created_at",
      label: "التاريخ",
      render: (r) => fmtDate(r.created_at),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title={driver?.full_name || "تفاصيل السائق"}
          subtitle={driver ? "البيانات الأساسية + الحالة + الملخص المالي" : "تحميل البيانات..."}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => router.push("/drivers")}>
                رجوع
              </Button>
              <Button variant="secondary" onClick={load} isLoading={loading}>
                تحديث
              </Button>
            </div>
          }
        />

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
        ) : null}

        {loading ? (
          <Card>
            <div className="text-sm text-gray-700">جارٍ تحميل بيانات السائق...</div>
          </Card>
        ) : !driver ? (
          <Card>
            <div className="text-sm text-gray-700">السائق غير موجود</div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card title="البيانات الأساسية">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">الاسم</div>
                    <div className="font-medium text-gray-900">{driver.full_name || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">الحالة</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={String(driver.status || (driver.is_active ? "ACTIVE" : "INACTIVE"))} />
                      {driver.disable_reason ? (
                        <span className="text-xs text-rose-600">{String(driver.disable_reason)}</span>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">الهاتف</div>
                    <div className="text-gray-900">{driver.phone || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">هاتف إضافي</div>
                    <div className="text-gray-900">{driver.phone2 || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">الرقم القومي</div>
                    <div className="text-gray-900">{driver.national_id || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">تاريخ التعيين</div>
                    <div className="text-gray-900">{fmtDate(driver.hire_date)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">نشط؟</div>
                    <div className="text-gray-900">{driver.is_active ? "نعم" : "لا"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">المعرف</div>
                    <div className="font-mono text-gray-900">{shortId(driver.id)}</div>
                  </div>
                </div>
              </Card>

              <Card title="بيانات الرخصة">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">رقم الرخصة</div>
                    <div className="font-medium text-gray-900">{driver.license_no || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">تاريخ الإصدار</div>
                    <div className="text-gray-900">{fmtDate(driver.license_issue_date)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">تاريخ الانتهاء</div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">{fmtDate(driver.license_expiry_date)}</span>
                      <LicenseBadge expiryDate={driver.license_expiry_date} />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">الحالة الزمنية</div>
                    <div className="text-gray-900">
                      {licenseInfo.days == null
                        ? "—"
                        : licenseInfo.days < 0
                        ? `منتهية منذ ${Math.abs(licenseInfo.days)} يوم`
                        : `متبقي ${licenseInfo.days} يوم`}
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                title="إجراءات سريعة"
                right={
                  <Link href="/drivers" className="text-xs text-orange-700 underline">
                    رجوع للقائمة
                  </Link>
                }
              >
                <div className="flex flex-col gap-2">
                  <Button variant="secondary" onClick={() => router.push(`/drivers`)}>
                    فتح قائمة السائقين
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(String(driver.id || ""));
                        showToast("تم نسخ معرف السائق", "success");
                      } catch {
                        showToast("تعذر نسخ المعرف", "error");
                      }
                    }}
                  >
                    نسخ معرف السائق
                  </Button>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <KpiCard
                title="إجمالي الرحلات"
                value={summary.total_trips ?? 0}
                hint="كل الرحلات التي تم إسناد السائق لها"
                tone="neutral"
              />
              <KpiCard
                title="الرحلات المكتملة"
                value={summary.completed_trips ?? 0}
                hint="رحلات بحالة COMPLETED"
                tone="good"
              />
              <KpiCard
                title="الرحلات النشطة"
                value={summary.active_trips ?? 0}
                hint="إسنادات ما زالت فعالة"
                tone={Number(summary.active_trips ?? 0) > 0 ? "warn" : "good"}
              />
              <KpiCard
                title="إجمالي المصروفات"
                value={fmtMoney(summary.total_expenses ?? 0)}
                hint={`${summary.expenses_count ?? 0} حركة`}
                tone="neutral"
              />
              <KpiCard
                title="المصروفات المعلقة"
                value={fmtMoney(summary.pending_expenses ?? 0)}
                hint={`المعتمد: ${fmtMoney(summary.approved_expenses ?? 0)}`}
                tone={Number(summary.pending_expenses ?? 0) > 0 ? "warn" : "good"}
              />
            </div>

            <DataTable
              title="آخر الرحلات"
              columns={tripColumns}
              rows={recentTrips}
              loading={loading}
              emptyTitle="لا توجد رحلات"
              emptyHint="لم يتم إسناد هذا السائق إلى أي رحلة حتى الآن."
              onRowClick={(row) => {
                if (row?.trip_id) router.push(`/trips/${row.trip_id}`);
              }}
              minWidthClassName="min-w-[1200px]"
            />

            <DataTable
              title="آخر المصروفات المرتبطة برحلات السائق"
              columns={expenseColumns}
              rows={recentExpenses}
              loading={loading}
              emptyTitle="لا توجد مصروفات"
              emptyHint="لا توجد مصروفات مرتبطة برحلات هذا السائق حتى الآن."
              minWidthClassName="min-w-[1200px]"
            />
          </>
        )}
      </div>

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