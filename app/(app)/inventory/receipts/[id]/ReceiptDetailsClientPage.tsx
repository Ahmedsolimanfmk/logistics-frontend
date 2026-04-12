"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { receiptsService } from "@/src/services/receipts.service";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

import type {
  InventoryReceipt,
  ReceiptItem,
  ReceiptBulkLine,
} from "@/src/types/receipts.types";

function shortId(id: any) {
  const s = String(id ?? "");
  if (!s) return "—";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function formatDate(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("ar-EG");
}

function formatMoney(v: any) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Info({
  label,
  value,
  hint,
}: {
  label: React.ReactNode;
  value: any;
  hint?: any;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900 break-words">
        {String(value ?? "—")}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-gray-500 font-mono break-words">
          {String(hint ?? "")}
        </div>
      ) : null}
    </div>
  );
}

export default function ReceiptDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [row, setRow] = useState<InventoryReceipt | null>(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  async function load() {
    if (!id) return;

    setLoading(true);
    try {
      const data = await receiptsService.getById(id);
      setRow(data);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
      setRow(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function submitReceipt() {
    if (!id) return;

    setSubmitting(true);
    try {
      await receiptsService.submit(id);
      setToast({
        open: true,
        message: "Receipt submitted successfully",
        type: "success",
      });
      await load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to submit receipt",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function postReceipt() {
    if (!id) return;

    setPosting(true);
    try {
      await receiptsService.post(id);
      setToast({
        open: true,
        message: "Receipt posted successfully",
        type: "success",
      });
      await load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to post receipt",
        type: "error",
      });
    } finally {
      setPosting(false);
    }
  }

  const items = useMemo<ReceiptItem[]>(() => {
    return Array.isArray(row?.items) ? row.items : [];
  }, [row]);

  const bulkLines = useMemo<ReceiptBulkLine[]>(() => {
    return Array.isArray(row?.bulk_lines) ? row.bulk_lines : [];
  }, [row]);

  const itemColumns: DataTableColumn<ReceiptItem>[] = [
    {
      key: "part",
      label: "Part",
      render: (x) => (
        <div>
          <div className="text-gray-900 font-semibold">{x?.part?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">
            {x?.part?.part_number || shortId(x?.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "internal",
      label: "Internal Serial",
      render: (x) => (
        <span className="font-mono text-xs text-gray-800">
          {x?.internal_serial || "—"}
        </span>
      ),
    },
    {
      key: "mfg",
      label: "Manufacturer Serial",
      render: (x) => (
        <span className="font-mono text-xs text-gray-800">
          {x?.manufacturer_serial || "—"}
        </span>
      ),
    },
    {
      key: "cost",
      label: "Unit Cost",
      render: (x) => formatMoney(x?.unit_cost),
    },
    {
      key: "notes",
      label: "Notes",
      render: (x) => x?.notes || "—",
    },
  ];

  const bulkColumns: DataTableColumn<ReceiptBulkLine>[] = [
    {
      key: "part",
      label: "Part",
      render: (x) => (
        <div>
          <div className="text-gray-900 font-semibold">{x?.part?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">
            {x?.part?.part_number || shortId(x?.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "qty",
      label: "Qty",
      render: (x) => String(x?.qty ?? 0),
    },
    {
      key: "unit_cost",
      label: "Unit Cost",
      render: (x) => formatMoney(x?.unit_cost),
    },
    {
      key: "total_cost",
      label: "Total Cost",
      render: (x) => formatMoney(x?.total_cost),
    },
    {
      key: "notes",
      label: "Notes",
      render: (x) => x?.notes || "—",
    },
  ];

  const statusUpper = String(row?.status || "").toUpperCase();
  const canSubmit = statusUpper === "DRAFT";
  const canPost = statusUpper === "SUBMITTED";

  return (
    <div className="p-6 space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title="تفاصيل الإضافة المخزنية"
        subtitle={<span className="font-mono text-xs">{id}</span>}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              {t("common.prev")}
            </Button>

            {canSubmit ? (
              <Button onClick={submitReceipt} isLoading={submitting}>
                Submit
              </Button>
            ) : null}

            {canPost ? (
              <Button onClick={postReceipt} isLoading={posting}>
                Post
              </Button>
            ) : null}
          </>
        }
      />

      <Card
        title="Receipt"
        right={row?.status ? <StatusBadge status={String(row.status)} /> : null}
      >
        {loading ? (
          <div className="text-sm text-gray-500">{t("common.loading")}</div>
        ) : !row ? (
          <div className="text-sm text-gray-500">{t("common.noData")}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Info
                label="المخزن"
                value={row?.warehouse?.name || "—"}
                hint={row?.warehouse_id ? shortId(row.warehouse_id) : ""}
              />
              <Info
                label="المورد"
                value={row?.vendor?.name || "—"}
                hint={row?.vendor_id ? shortId(row.vendor_id) : row?.invoice_no || ""}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Info label="الحالة" value={row?.status || "—"} />
              <Info
                label="تاريخ الفاتورة"
                value={row?.invoice_date ? String(row.invoice_date).slice(0, 10) : "—"}
              />
              <Info label="تاريخ الإنشاء" value={formatDate(row?.created_at)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Info label="رقم الفاتورة" value={row?.invoice_no || "—"} />
              <Info label="عدد العناصر المسلسلة" value={items.length} />
              <Info label="عدد البنود المجمعة" value={bulkLines.length} />
              <Info label="الإجمالي" value={formatMoney(row?.total_amount)} />
            </div>

            {items.length > 0 ? (
              <DataTable
                title="Serial Items"
                columns={itemColumns}
                rows={items}
                loading={false}
                emptyTitle={t("common.noData")}
                emptyHint="لا توجد عناصر مسلسلة داخل الإضافة."
                minWidthClassName="min-w-[1100px]"
              />
            ) : null}

            {bulkLines.length > 0 ? (
              <DataTable
                title="Bulk Items"
                columns={bulkColumns}
                rows={bulkLines}
                loading={false}
                emptyTitle={t("common.noData")}
                emptyHint="لا توجد بنود مجمعة داخل الإضافة."
                minWidthClassName="min-w-[1000px]"
              />
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}