"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { contractsService } from "@/src/services/contracts.service";
import { contractPricingService } from "@/src/services/contract-pricing.service";

import type {
  BillingCycle,
  Contract,
  ContractStatus,
} from "@/src/types/contracts.types";
import type { PricingRule } from "@/src/types/contract-pricing.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { KpiCard } from "@/src/components/ui/KpiCard";

type ToastState =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG").format(d);
}

function formatDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
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

function boolToStatus(isActive?: boolean) {
  return isActive ? "ACTIVE" : "INACTIVE";
}

function readText(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

const CONTRACT_STATUSES: ContractStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
  "DRAFT",
  "CANCELLED",
];

export default function ContractDetailsClientPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = String(params?.id || "");
  const editMode = searchParams.get("mode") === "edit";

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [rules, setRules] = useState<PricingRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesTotal, setRulesTotal] = useState(0);

  const [toast, setToast] = useState<ToastState>(null);

  const [form, setForm] = useState({
    contract_no: "",
    start_date: "",
    end_date: "",
    billing_cycle: "MONTHLY" as BillingCycle,
    contract_value: "",
    currency: "EGP",
    status: "ACTIVE" as ContractStatus,
    notes: "",
  });

  async function loadContract() {
    try {
      setLoading(true);
      const res = await contractsService.getById(id);
      setContract(res);

      setForm({
        contract_no: res.contract_no || "",
        start_date: formatDateInput(res.start_date),
        end_date: formatDateInput(res.end_date),
        billing_cycle: (res.billing_cycle || "MONTHLY") as BillingCycle,
        contract_value: res.contract_value == null ? "" : String(res.contract_value),
        currency: res.currency || "EGP",
        status: (res.status || "ACTIVE") as ContractStatus,
        notes: res.notes || "",
      });
    } catch (error: any) {
      setToast({
        type: "error",
        message: error?.response?.data?.message || "فشل تحميل بيانات العقد",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadRules() {
    if (!id) return;

    try {
      setRulesLoading(true);

      const res = await contractPricingService.listRules({
        contract_id: id,
        page: 1,
        pageSize: 50,
      });

      setRules(res.items || []);
      setRulesTotal(res.total || 0);
    } catch (error: any) {
      setRules([]);
      setRulesTotal(0);
      setToast({
        type: "error",
        message: error?.response?.data?.message || "فشل تحميل قواعد التسعير",
      });
    } finally {
      setRulesLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadContract();
      loadRules();
    }
  }, [id]);

  function setField(name: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.start_date) {
      setToast({ type: "error", message: "تاريخ البداية مطلوب" });
      return;
    }

    try {
      setSaving(true);

      const updated = await contractsService.update(id, {
        contract_no: form.contract_no || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        billing_cycle: form.billing_cycle as BillingCycle,
        contract_value: form.contract_value === "" ? null : Number(form.contract_value),
        currency: form.currency || null,
        status: form.status as ContractStatus,
        notes: form.notes || null,
      });

      setContract(updated);
      setToast({ type: "success", message: "تم تحديث العقد بنجاح" });
      router.push(`/contracts/${id}`);
    } catch (error: any) {
      setToast({
        type: "error",
        message: error?.response?.data?.message || "فشل تحديث العقد",
      });
    } finally {
      setSaving(false);
    }
  }

  async function quickSetStatus(nextStatus: ContractStatus) {
    try {
      const updated = await contractsService.setStatus(id, nextStatus);
      setContract(updated);
      setToast({ type: "success", message: "تم تحديث حالة العقد" });
    } catch (error: any) {
      setToast({
        type: "error",
        message: error?.response?.data?.message || "فشل تحديث الحالة",
      });
    }
  }

  async function toggleRuleStatus(ruleId: string) {
    try {
      const updated = await contractPricingService.toggleRule(ruleId);
      setRules((prev) => prev.map((x) => (x.id === ruleId ? updated : x)));
      setToast({ type: "success", message: "تم تحديث حالة قاعدة التسعير" });
    } catch (error: any) {
      setToast({
        type: "error",
        message: error?.response?.data?.message || "فشل تحديث حالة القاعدة",
      });
    }
  }

  const title = useMemo(() => {
    if (!contract) return "تفاصيل العقد";
    return contract.contract_no ? `العقد ${contract.contract_no}` : "تفاصيل العقد";
  }, [contract]);

  const activeRulesCount = useMemo(
    () => rules.filter((x) => x.is_active === true).length,
    [rules]
  );

  const inactiveRulesCount = useMemo(
    () => rules.filter((x) => x.is_active === false).length,
    [rules]
  );

  const pricingRuleColumns: DataTableColumn<PricingRule>[] = useMemo(
    () => [
      {
        key: "client",
        label: "العميل",
        render: (row) => row.clients?.name || row.client_id || "—",
      },
      {
        key: "route",
        label: "المسار",
        render: (row) => row.routes?.name || row.routes?.code || "—",
      },
      {
        key: "vehicle_class",
        label: "فئة السيارة",
        render: (row) =>
          row.vehicle_classes?.name || row.vehicle_classes?.code || "—",
      },
      {
        key: "cargo_type",
        label: "نوع المنقول",
        render: (row) =>
          row.cargo_types?.name || row.cargo_types?.code || "—",
      },
      {
        key: "trip_type",
        label: "نوع الرحلة",
        render: (row) => readText(row.trip_type),
      },
      {
        key: "base_price",
        label: "السعر الأساسي",
        render: (row) => formatMoney(row.base_price, row.currency),
      },
      {
        key: "priority",
        label: "الأولوية",
        render: (row) => readText(row.priority),
      },
      {
        key: "effective",
        label: "الفترة",
        render: (row) =>
          `${formatDate(row.effective_from)} → ${formatDate(row.effective_to)}`,
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={boolToStatus(row.is_active)} />,
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Link href={`/contract-pricing/${row.id}`}>
              <Button variant="secondary">عرض</Button>
            </Link>

            <Link href={`/contract-pricing/${row.id}?mode=edit`}>
              <Button variant="secondary">تعديل</Button>
            </Link>

            <Button
              type="button"
              variant="secondary"
              onClick={() => toggleRuleStatus(row.id)}
            >
              {row.is_active ? "تعطيل" : "تفعيل"}
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  if (loading) {
    return <div className="p-6">جارٍ التحميل...</div>;
  }

  if (!contract) {
    return <div className="p-6">العقد غير موجود</div>;
  }

  return (
    <div className="min-h-screen space-y-6">
      <Toast
        open={!!toast}
        type={toast?.type || "success"}
        message={toast?.message || ""}
        onClose={() => setToast(null)}
      />

      <PageHeader
        title={title}
        subtitle="عرض بيانات العقد وقواعد التسعير المرتبطة به"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/contracts">
              <Button variant="secondary">رجوع</Button>
            </Link>

            {!editMode ? (
              <Link href={`/contracts/${id}?mode=edit`}>
                <Button>تعديل</Button>
              </Link>
            ) : null}

            <Link
              href={`/contract-pricing/new?contract_id=${id}&client_id=${contract.client_id}`}
            >
              <Button variant="secondary">إضافة قاعدة تسعير</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="إجمالي القواعد" value={rulesTotal} formatValue />
        <KpiCard label="القواعد النشطة" value={activeRulesCount} formatValue />
        <KpiCard label="القواعد غير النشطة" value={inactiveRulesCount} formatValue />
        <KpiCard
          label="قيمة العقد"
          value={contract.contract_value ?? 0}
          formatValue={false}
          hint={contract.currency || "EGP"}
        />
      </div>

      {!editMode ? (
        <>
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">بيانات العقد</h2>
              <StatusBadge status={contract.status || "-"} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-slate-500">العميل</div>
                <div className="font-medium">{contract.clients?.name || contract.client_id}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">رقم العقد</div>
                <div className="font-medium">{contract.contract_no || "—"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">تاريخ البداية</div>
                <div className="font-medium">{formatDate(contract.start_date)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">تاريخ النهاية</div>
                <div className="font-medium">{formatDate(contract.end_date)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">دورة الفاتورة</div>
                <div className="font-medium">{contract.billing_cycle || "—"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">قيمة العقد</div>
                <div className="font-medium">
                  {formatMoney(contract.contract_value, contract.currency)}
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500">الحالة</div>
                <div className="font-medium">{contract.status || "—"}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">العملة</div>
                <div className="font-medium">{contract.currency || "—"}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-sm text-slate-500">ملاحظات</div>
                <div className="whitespace-pre-wrap font-medium">{contract.notes || "—"}</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">إجراءات سريعة</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => quickSetStatus("ACTIVE")}>
                تعيين ACTIVE
              </Button>
              <Button variant="secondary" onClick={() => quickSetStatus("INACTIVE")}>
                تعيين INACTIVE
              </Button>
              <Button variant="secondary" onClick={() => quickSetStatus("EXPIRED")}>
                تعيين EXPIRED
              </Button>
              <Button variant="secondary" onClick={() => quickSetStatus("DRAFT")}>
                تعيين DRAFT
              </Button>
              <Button variant="secondary" onClick={() => quickSetStatus("CANCELLED")}>
                تعيين CANCELLED
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-6">
          <form onSubmit={onSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">رقم العقد</label>
              <input
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={form.contract_no}
                onChange={(e) => setField("contract_no", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">الحالة</label>
              <select
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">تاريخ البداية</label>
              <input
                type="date"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">تاريخ النهاية</label>
              <input
                type="date"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={form.end_date}
                onChange={(e) => setField("end_date", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">دورة الفاتورة</label>
              <select
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={form.billing_cycle}
                onChange={(e) => setField("billing_cycle", e.target.value)}
              >
                <option value="DAILY">يومي</option>
                <option value="WEEKLY">أسبوعي</option>
                <option value="MONTHLY">شهري</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">قيمة العقد</label>
              <input
                type="number"
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={form.contract_value}
                onChange={(e) => setField("contract_value", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">العملة</label>
              <input
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">ملاحظات</label>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <Link href={`/contracts/${id}`}>
                <Button type="button" variant="secondary">
                  إلغاء
                </Button>
              </Link>

              <Button type="submit" isLoading={saving}>
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Card>
      )}

      <DataTable
        title="قواعد التسعير المرتبطة بالعقد"
        subtitle="كل قواعد التسعير المعرفة على هذا العقد"
        columns={pricingRuleColumns}
        rows={rules}
        loading={rulesLoading}
        emptyTitle="لا توجد قواعد تسعير"
        emptyHint="لم يتم إضافة أي قواعد تسعير لهذا العقد حتى الآن."
        right={
          <div className="flex flex-wrap gap-2">
            <Link href={`/contract-pricing?contract_id=${id}`}>
              <Button variant="secondary">عرض الكل</Button>
            </Link>

            <Link
              href={`/contract-pricing/new?contract_id=${id}&client_id=${contract.client_id}`}
            >
              <Button>إضافة قاعدة</Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}