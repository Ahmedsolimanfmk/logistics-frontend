"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { contractsService } from "@/src/services/contracts.service";
import type { Contract, ContractStatus } from "@/src/types/contracts.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG").format(d);
}

function fmtMoney(value?: number | null, currency?: string | null) {
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

function InfoBox({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.72)] p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-[rgb(var(--trex-fg))]">
        {value || "—"}
      </div>
    </div>
  );
}

function normalizeStatus(value?: string | null) {
  return String(value || "").toUpperCase();
}

export default function ContractDetailsClientPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
  }

  async function load() {
    if (!id) return;

    setLoading(true);

    try {
      const res = await contractsService.getById(id);
      setContract(res);
    } catch (error: any) {
      showToast(
        "error",
        error?.response?.data?.message ||
          error?.message ||
          "فشل تحميل بيانات العقد"
      );
      setContract(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(status: ContractStatus) {
    if (!contract?.id) return;

    setBusy(true);

    try {
      await contractsService.setStatus(contract.id, status);
      showToast("success", "تم تحديث حالة العقد");
      await load();
    } catch (error: any) {
      showToast(
        "error",
        error?.response?.data?.message ||
          error?.message ||
          "فشل تحديث حالة العقد"
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <Card>
          <div className="text-sm text-slate-500">جار تحميل العقد...</div>
        </Card>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="space-y-4" dir="rtl">
        <Card>
          <div className="text-sm text-slate-500">لا يوجد بيانات لهذا العقد</div>
        </Card>

        <Toast
          open={!!toast}
          type={toast?.type || "success"}
          message={toast?.message || ""}
          dir="rtl"
          onClose={() => setToast(null)}
        />
      </div>
    );
  }

  const status = normalizeStatus(contract.status);

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
        title="تفاصيل العقد"
        subtitle={contract.contract_no || contract.id}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/contracts")}
            >
              رجوع للقائمة
            </Button>

            <Link href={`/contracts/${contract.id}?mode=edit`}>
              <Button type="button" variant="secondary">
                تعديل
              </Button>
            </Link>

            {status !== "ACTIVE" ? (
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                isLoading={busy}
                onClick={() => changeStatus("ACTIVE")}
              >
                تفعيل العقد
              </Button>
            ) : null}

            {status !== "TERMINATED" ? (
              <Button
                type="button"
                variant="danger"
                disabled={busy}
                isLoading={busy}
                onClick={() => changeStatus("TERMINATED")}
              >
                إنهاء العقد
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KpiCard label="قيمة العقد" value={fmtMoney(contract.contract_value, contract.currency)} />
        <KpiCard label="دورة الفاتورة" value={contract.billing_cycle || "—"} />
        <KpiCard label="العملة" value={contract.currency || "EGP"} />
        <KpiCard label="الحالة" value={<StatusBadge status={contract.status || "—"} />} />
      </div>

      <Card title="بيانات العقد">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InfoBox label="رقم العقد" value={contract.contract_no || "—"} />
          <InfoBox label="العميل" value={contract.client?.name || contract.client_id || "—"} />
          <InfoBox label="الحالة" value={<StatusBadge status={contract.status || "—"} />} />

          <InfoBox label="تاريخ البداية" value={fmtDate(contract.start_date)} />
          <InfoBox label="تاريخ النهاية" value={fmtDate(contract.end_date)} />
          <InfoBox label="تاريخ التوقيع" value={fmtDate((contract as any).signed_at)} />

          <InfoBox label="دورة الفاتورة" value={contract.billing_cycle || "—"} />
          <InfoBox label="قيمة العقد" value={fmtMoney(contract.contract_value, contract.currency)} />
          <InfoBox label="العملة" value={contract.currency || "EGP"} />

          <InfoBox label="رابط المستند" value={(contract as any).document_url || "—"} />
          <InfoBox label="سبب الإنهاء" value={(contract as any).termination_reason || "—"} />
          <InfoBox label="تاريخ الإنهاء" value={fmtDate((contract as any).terminated_at)} />
        </div>
      </Card>

      <Card title="ملاحظات">
        <div className="whitespace-pre-wrap text-sm text-slate-700">
          {contract.notes || "لا توجد ملاحظات"}
        </div>
      </Card>
    </div>
  );
}