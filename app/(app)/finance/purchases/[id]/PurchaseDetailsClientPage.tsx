"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";

import receiptsService from "@/src/services/receipts.service";
import type {
  InventoryReceipt,
  ReceiptBulkLine,
  ReceiptItem,
} from "@/src/types/receipts.types";

function fmtMoney(value: unknown): string {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0.00";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ar-EG");
}

function shortId(id: unknown): string {
  const s = String(id ?? "");
  if (!s) return "—";
  if (s.length <= 18) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function receiptStatus(receipt: InventoryReceipt | null): string {
  return String(receipt?.status || "").toUpperCase();
}

function numberOrZero(v: unknown): number {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function estimateTotalFromReceipt(receipt: InventoryReceipt | null): number {
  if (!receipt) return 0;

  const itemsTotal = Array.isArray(receipt.items)
    ? receipt.items.reduce((sum, item) => {
        return sum + numberOrZero(item.unit_cost);
      }, 0)
    : 0;

  const bulkTotal = Array.isArray(receipt.bulk_lines)
    ? receipt.bulk_lines.reduce((sum, line) => {
        const explicitTotal = numberOrZero(line.total_cost);
        if (explicitTotal > 0) return sum + explicitTotal;

        const qty = numberOrZero(line.qty);
        const unitCost = numberOrZero(line.unit_cost);
        return sum + qty * unitCost;
      }, 0)
    : 0;

  return itemsTotal + bulkTotal;
}

function infoValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default function PurchaseDetailsClientPage() {
  const params = useParams();
  const id = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"submit" | "post" | "cancel" | null>(null);
  const [receipt, setReceipt] = useState<InventoryReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await receiptsService.getById(id);
      setReceipt(data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "فشل تحميل بيانات المشتريات";
      setError(msg);
      showToast("error", msg);
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      load();
    }
  }, [id]);

  async function handleSubmit() {
    if (!receipt?.id) return;

    try {
      setBusyAction("submit");
      await receiptsService.submit(receipt.id);
      showToast("success", "تم إرسال عملية الشراء للتأكيد");
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "فشل إرسال عملية الشراء"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePost() {
    if (!receipt?.id) return;

    try {
      setBusyAction("post");
      await receiptsService.post(receipt.id);
      showToast("success", "تم ترحيل عملية الشراء بنجاح");
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "فشل ترحيل عملية الشراء"
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancel() {
    if (!receipt?.id) return;

    try {
      setBusyAction("cancel");
      await receiptsService.cancel(receipt.id);
      showToast("success", "تم رفض/إلغاء عملية الشراء");
      await load();
    } catch (e: any) {
      showToast(
        "error",
        e?.response?.data?.message || e?.message || "فشل رفض عملية الشراء"
      );
    } finally {
      setBusyAction(null);
    }
  }

  const status = receiptStatus(receipt);
  const canSubmit = status === "DRAFT";
  const canPost = status === "SUBMITTED";
  const canCancel = status === "DRAFT" || status === "SUBMITTED";

  const serialItems = useMemo<ReceiptItem[]>(() => {
    return Array.isArray(receipt?.items) ? receipt.items : [];
  }, [receipt]);

  const bulkLines = useMemo<ReceiptBulkLine[]>(() => {
    return Array.isArray(receipt?.bulk_lines) ? receipt.bulk_lines : [];
  }, [receipt]);

  const displayedTotal = useMemo(() => {
    const apiTotal = numberOrZero(receipt?.total_amount);
    if (apiTotal > 0) return apiTotal;
    return estimateTotalFromReceipt(receipt);
  }, [receipt]);

  const mainDate = useMemo(() => {
    return receipt?.invoice_date || receipt?.created_at || null;
  }, [receipt]);

  const serialColumns: DataTableColumn<ReceiptItem>[] = [
    {
      key: "part",
      label: "الصنف",
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-gray-900">
            {row.part?.name || "—"}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {row.part?.part_number || shortId(row.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "internal_serial",
      label: "Internal Serial",
      render: (row) => (
        <span className="font-mono text-xs">
          {infoValue(row.internal_serial)}
        </span>
      ),
    },
    {
      key: "manufacturer_serial",
      label: "Manufacturer Serial",
      render: (row) => (
        <span className="font-mono text-xs">
          {infoValue(row.manufacturer_serial)}
        </span>
      ),
    },
    {
      key: "unit_cost",
      label: "التكلفة",
      render: (row) => fmtMoney(row.unit_cost),
    },
    {
      key: "notes",
      label: "ملاحظات",
      render: (row) => infoValue(row.notes),
    },
  ];

  const bulkColumns: DataTableColumn<ReceiptBulkLine>[] = [
    {
      key: "part",
      label: "الصنف",
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-medium text-gray-900">
            {row.part?.name || "—"}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {row.part?.part_number || shortId(row.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "qty",
      label: "الكمية",
      render: (row) => String(numberOrZero(row.qty)),
    },
    {
      key: "unit_cost",
      label: "تكلفة الوحدة",
      render: (row) => fmtMoney(row.unit_cost),
    },
    {
      key: "total_cost",
      label: "الإجمالي",
      render: (row) => {
        const explicitTotal = numberOrZero(row.total_cost);
        if (explicitTotal > 0) return fmtMoney(explicitTotal);
        return fmtMoney(numberOrZero(row.qty) * numberOrZero(row.unit_cost));
      },
    },
    {
      key: "notes",
      label: "ملاحظات",
      render: (row) => infoValue(row.notes),
    },
  ];

  if (loading) {
    return <div className="p-6">جار التحميل...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">⚠️ {error}</div>;
  }

  if (!receipt) {
    return <div className="p-6">لا يوجد بيانات</div>;
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <PageHeader
        title="تفاصيل المشتريات"
        subtitle={`ID: ${receipt.id}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canSubmit ? (
              <Button
                variant="secondary"
                onClick={handleSubmit}
                isLoading={busyAction === "submit"}
              >
                Submit
              </Button>
            ) : null}

            {canPost ? (
              <Button
                variant="primary"
                onClick={handlePost}
                isLoading={busyAction === "post"}
              >
                Post
              </Button>
            ) : null}

            {canCancel ? (
              <Button
                variant="danger"
                onClick={handleCancel}
                isLoading={busyAction === "cancel"}
              >
                Reject
              </Button>
            ) : null}

            <Link href="/finance/purchases">
              <Button variant="secondary">رجوع</Button>
            </Link>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <b>المخزن:</b> {receipt.warehouse?.name || "—"}
          </div>

          <div>
            <b>المورد:</b> {receipt.vendor?.name || "—"}
          </div>

          <div>
            <b>رقم الفاتورة:</b> {receipt.invoice_no || "—"}
          </div>

          <div>
            <b>التاريخ:</b> {fmtDate(mainDate)}
          </div>

          <div>
            <b>الإجمالي:</b> {fmtMoney(displayedTotal)}
          </div>

          <div>
            <b>الحالة:</b> <StatusBadge status={receipt.status || "DRAFT"} />
          </div>

          <div>
            <b>عدد العناصر المسلسلة:</b> {serialItems.length}
          </div>

          <div>
            <b>عدد البنود المجمعة:</b> {bulkLines.length}
          </div>

          <div>
            <b>تاريخ الإنشاء:</b> {fmtDate(receipt.created_at)}
          </div>

          <div>
            <b>معرّف العملية:</b> {shortId(receipt.id)}
          </div>
        </div>
      </Card>

      {serialItems.length > 0 ? (
        <DataTable<ReceiptItem>
          title="الأصناف المسلسلة"
          columns={serialColumns}
          rows={serialItems}
          loading={false}
          emptyTitle="لا توجد أصناف"
          emptyHint=""
        />
      ) : null}

      {bulkLines.length > 0 ? (
        <DataTable<ReceiptBulkLine>
          title="الأصناف المجمعة"
          columns={bulkColumns}
          rows={bulkLines}
          loading={false}
          emptyTitle="لا توجد بنود bulk"
          emptyHint=""
        />
      ) : null}

      {serialItems.length === 0 && bulkLines.length === 0 ? (
        <Card>
          <div className="text-sm text-gray-600">لا توجد أصناف داخل هذه العملية</div>
        </Card>
      ) : null}

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}