"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { clientsService } from "@/src/services/clients.service";
import { contractsService } from "@/src/services/contracts.service";
import type {
  BillingCycle,
  ContractPayload,
  ContractStatus,
} from "@/src/types/contracts.types";
import type { Client } from "@/src/types/clients.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

type ToastState =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

const CONTRACT_STATUSES: ContractStatus[] = [
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
];

const BILLING_CYCLES: BillingCycle[] = [
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "ONE_OFF",
];

export default function NewContractClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialClientId = useMemo(
    () => searchParams.get("client_id") || "",
    [searchParams]
  );

  const [toast, setToast] = useState<ToastState>(null);
  const [saving, setSaving] = useState(false);

  const [clientsLoading, setClientsLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState<ContractPayload>({
    client_id: "",
    contract_no: "",
    start_date: "",
    end_date: "",
    signed_at: "",
    terminated_at: "",
    termination_reason: "",
    document_url: "",
    billing_cycle: "MONTHLY",
    contract_value: null,
    currency: "EGP",
    notes: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (initialClientId) {
      setForm((prev) => ({
        ...prev,
        client_id: initialClientId,
      }));
    }
  }, [initialClientId]);

  useEffect(() => {
    let mounted = true;

    async function loadClients() {
      setClientsLoading(true);

      try {
        const res = await clientsService.list({
          page: 1,
          limit: 200,
          is_active: true,
        });

        if (mounted) {
          setClients(res.items || []);
        }
      } catch (error: any) {
        if (mounted) {
          setClients([]);
          setToast({
            type: "error",
            message:
              error?.response?.data?.message ||
              error?.message ||
              "فشل تحميل العملاء",
          });
        }
      } finally {
        if (mounted) setClientsLoading(false);
      }
    }

    loadClients();

    return () => {
      mounted = false;
    };
  }, []);

  function setField<K extends keyof ContractPayload>(
    key: K,
    value: ContractPayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.client_id) {
      setToast({ type: "error", message: "العميل مطلوب" });
      return;
    }

    if (!form.start_date) {
      setToast({ type: "error", message: "تاريخ البداية مطلوب" });
      return;
    }

    setSaving(true);

    try {
      const created = await contractsService.create({
        ...form,
        contract_no: form.contract_no || null,
        end_date: form.end_date || null,
        signed_at: form.signed_at || null,
        terminated_at: form.terminated_at || null,
        termination_reason: form.termination_reason || null,
        document_url: form.document_url || null,
        contract_value:
          form.contract_value === null || form.contract_value === undefined
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
        message:
          error?.response?.data?.message ||
          error?.message ||
          "فشل إنشاء العقد",
      });
    } finally {
      setSaving(false);
    }
  }

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name || client.code || client.id,
  }));

  return (
    <div className="space-y-6" dir="rtl">
      <Toast
        open={!!toast}
        type={toast?.type || "success"}
        message={toast?.message || ""}
        dir="rtl"
        onClose={() => setToast(null)}
      />

      <PageHeader
        title="إضافة عقد جديد"
        subtitle="إنشاء عقد جديد للعميل"
        actions={
          <Link href="/contracts">
            <Button type="button" variant="secondary">
              رجوع
            </Button>
          </Link>
        }
      />

      <Card>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TrexSelect
            labelText="العميل"
            value={form.client_id}
            onChange={(value) => setField("client_id", value)}
            options={clientOptions}
            loading={clientsLoading}
            placeholderText="اختر العميل"
            emptyText="لا يوجد عملاء"
            disabled={saving}
          />

          <TrexInput
            labelText="رقم العقد"
            value={form.contract_no || ""}
            onChange={(e) => setField("contract_no", e.target.value)}
            placeholder="CNT-2026-001"
            disabled={saving}
          />

          <TrexInput
            labelText="تاريخ البداية"
            type="date"
            value={form.start_date}
            onChange={(e) => setField("start_date", e.target.value)}
            disabled={saving}
            required
          />

          <TrexInput
            labelText="تاريخ النهاية"
            type="date"
            value={form.end_date || ""}
            onChange={(e) => setField("end_date", e.target.value || null)}
            disabled={saving}
          />

          <TrexInput
            labelText="تاريخ التوقيع"
            type="date"
            value={form.signed_at || ""}
            onChange={(e) => setField("signed_at", e.target.value || null)}
            disabled={saving}
          />

          <TrexSelect
            labelText="الحالة"
            value={form.status || "ACTIVE"}
            onChange={(value) => setField("status", value as ContractStatus)}
            options={CONTRACT_STATUSES.map((status) => ({
              value: status,
              label: status,
            }))}
            disabled={saving}
          />

          <TrexSelect
            labelText="دورة الفاتورة"
            value={form.billing_cycle || "MONTHLY"}
            onChange={(value) => setField("billing_cycle", value as BillingCycle)}
            options={BILLING_CYCLES.map((cycle) => ({
              value: cycle,
              label: cycle,
            }))}
            disabled={saving}
          />

          <TrexInput
            labelText="قيمة العقد"
            type="number"
            value={form.contract_value ?? ""}
            onChange={(e) =>
              setField(
                "contract_value",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            placeholder="0"
            disabled={saving}
          />

          <TrexInput
            labelText="العملة"
            value={form.currency || ""}
            onChange={(e) => setField("currency", e.target.value)}
            placeholder="EGP"
            disabled={saving}
          />

          <TrexInput
            labelText="رابط المستند"
            value={form.document_url || ""}
            onChange={(e) => setField("document_url", e.target.value)}
            placeholder="https://..."
            disabled={saving}
          />

          <div className="md:col-span-2">
            <label className="grid gap-2 text-sm">
              <span className="text-[rgb(var(--trex-fg))] opacity-80">
                ملاحظات
              </span>

              <textarea
                className="trex-input min-h-[120px] w-full px-3 py-2 text-sm"
                value={form.notes || ""}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="ملاحظات إضافية عن العقد"
                disabled={saving}
              />
            </label>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <Link href="/contracts">
              <Button type="button" variant="secondary" disabled={saving}>
                إلغاء
              </Button>
            </Link>

            <Button type="submit" isLoading={saving} disabled={saving}>
              حفظ العقد
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}