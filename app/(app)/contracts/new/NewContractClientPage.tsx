"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { contractsService } from "@/src/services/contracts.service";
import type {
  BillingCycle,
  ContractPayload,
  ContractStatus,
} from "@/src/types/contracts.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";

type ToastState =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

const CONTRACT_STATUSES: ContractStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
  "DRAFT",
  "CANCELLED",
];

export default function NewContractClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialValues = useMemo(() => {
    return {
      client_id: searchParams.get("client_id") || "",
    };
  }, [searchParams]);

  const [toast, setToast] = useState<ToastState>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ContractPayload>({
    client_id: "",
    contract_no: "",
    start_date: "",
    end_date: "",
    billing_cycle: "MONTHLY",
    contract_value: null,
    currency: "EGP",
    notes: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (initialValues.client_id) {
      setForm((prev) => ({
        ...prev,
        client_id: initialValues.client_id,
      }));
    }
  }, [initialValues]);

  function setField<K extends keyof ContractPayload>(key: K, value: ContractPayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.client_id) {
      setToast({ type: "error", message: "العميل مطلوب" });
      return;
    }

    if (!form.start_date) {
      setToast({ type: "error", message: "تاريخ البداية مطلوب" });
      return;
    }

    try {
      setSaving(true);

      const created = await contractsService.create({
        ...form,
        contract_no: form.contract_no || null,
        end_date: form.end_date || null,
        contract_value:
          form.contract_value === null ||
          form.contract_value === undefined ||
          form.contract_value === ("" as any)
            ? null
            : Number(form.contract_value),
        currency: form.currency || "EGP",
        notes: form.notes || null,
        status: form.status || "ACTIVE",
      });

      setToast({ type: "success", message: "تم إنشاء العقد بنجاح" });

      router.push(`/contracts/${created.id}`);
    } catch (error: any) {
      setToast({
        type: "error",
        message: error?.response?.data?.message || "فشل إنشاء العقد",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Toast
        open={!!toast}
        type={toast?.type || "success"}
        message={toast?.message || ""}
        onClose={() => setToast(null)}
      />

      <PageHeader
        title="إضافة عقد جديد"
        subtitle="إنشاء عقد جديد للعميل"
        actions={
          <Link href="/contracts">
            <Button variant="secondary">رجوع</Button>
          </Link>
        }
      />

      <Card className="p-6">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">معرف العميل</label>
            <input
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={form.client_id}
              onChange={(e) => setField("client_id", e.target.value)}
              placeholder="client_id"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">رقم العقد</label>
            <input
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={form.contract_no || ""}
              onChange={(e) => setField("contract_no", e.target.value)}
              placeholder="CNT-2026-001"
            />
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
              value={form.end_date || ""}
              onChange={(e) => setField("end_date", e.target.value || null)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">دورة الفاتورة</label>
            <select
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={form.billing_cycle || "MONTHLY"}
              onChange={(e) => setField("billing_cycle", e.target.value as BillingCycle)}
            >
              <option value="DAILY">يومي</option>
              <option value="WEEKLY">أسبوعي</option>
              <option value="MONTHLY">شهري</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">الحالة</label>
            <select
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={form.status || "ACTIVE"}
              onChange={(e) => setField("status", e.target.value as ContractStatus)}
            >
              {CONTRACT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">قيمة العقد</label>
            <input
              type="number"
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={form.contract_value ?? ""}
              onChange={(e) =>
                setField(
                  "contract_value",
                  e.target.value === "" ? null : Number(e.target.value)
                )
              }
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">العملة</label>
            <input
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={form.currency || ""}
              onChange={(e) => setField("currency", e.target.value)}
              placeholder="EGP"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">ملاحظات</label>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              value={form.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="ملاحظات إضافية عن العقد"
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <Link href="/contracts">
              <Button type="button" variant="secondary">
                إلغاء
              </Button>
            </Link>

            <Button type="submit" isLoading={saving}>
              حفظ العقد
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}