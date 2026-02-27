"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { getReceipt } from "@/src/lib/receipts.api";

// ✅ Design System
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function formatDate(v: any) {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("ar-EG");
}

function Info({
  label,
  value,
}: {
  label: React.ReactNode;
  value: any;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm text-gray-900 break-words">{String(value ?? "—")}</div>
    </div>
  );
}

export default function ReceiptDetailsClientPage({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any>(null);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  useEffect(() => {
    const boot = async () => {
      if (!id) {
        setToast({ open: true, message: "Missing receipt id", type: "error" });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const r = await getReceipt(id);
        setRow(r);
      } catch (e: any) {
        setToast({
          open: true,
          message: e?.response?.data?.message || e?.message || t("common.failed"),
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const lines = useMemo(() => (Array.isArray(row?.lines) ? row.lines : []), [row]);

  const lineRows = useMemo(() => lines.map((x: any, i: number) => ({ ...x, __idx: i })), [lines]);
  

  const columns: DataTableColumn<any>[] = [
    {
      key: "part",
      label: "Part",
      render: (ln) => (
        <div>
          <div className="text-gray-900 font-semibold">{ln.parts?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">{shortId(ln.part_id)}</div>
        </div>
      ),
    },
    {
      key: "serial",
      label: "Serial",
      render: (ln) => (
        <span className="font-mono text-xs text-gray-800">
          {ln.part_items?.internal_serial ||
            ln.part_items?.manufacturer_serial ||
            ln.part_item_id ||
            "—"}
        </span>
      ),
    },
    {
      key: "qty",
      label: "Qty",
      render: (ln) => String(ln.qty ?? 1),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title={t("receipts.detailsTitle") || "تفاصيل الإضافة المخزنية"}
        subtitle={<span className="font-mono text-xs">{id}</span>}
        actions={
          <Button variant="secondary" onClick={() => router.back()}>
            {t("common.prev")}
          </Button>
        }
      />

      <Card
        title="Receipt"
        right={row?.status ? <StatusBadge status={row.status} /> : null}
      >
        {loading ? (
          <div className="text-sm text-gray-500">{t("common.loading")}</div>
        ) : !row ? (
          <div className="text-sm text-gray-500">{t("common.noData")}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Info label={t("common.status") || "الحالة"} value={row.status} />
              <Info label={t("receipts.invoiceNo") || "رقم الفاتورة"} value={row.invoice_no} />
              <Info
                label={t("receipts.vendor") || "المورد"}
                value={row.supplier_name || row.vendor_name || row.vendors?.name || row.supplier?.name}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Info label={t("receipts.total") || "الإجمالي"} value={row.total_amount ?? row.amount ?? "—"} />
              <Info label={t("receipts.warehouse") || "المخزن"} value={row.warehouses?.name || shortId(row.warehouse_id)} />
              <Info label={t("receipts.createdAt") || "تاريخ الإنشاء"} value={formatDate(row.created_at)} />
            </div>

            {/* Lines */}
            {Array.isArray(row.lines) ? (
              <DataTable
                title={t("receipts.lines") || "بنود الإضافة"}
                columns={columns}
                rows={lineRows}
                loading={false}
                emptyTitle={t("common.noData")}
                emptyHint="لا توجد بنود."
                minWidthClassName="min-w-[900px]"
              />
            ) : null}
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <Link href="/inventory/receipts">
          <Button variant="secondary">{t("receipts.backToList") || "الرجوع للقائمة"}</Button>
        </Link>
      </div>
    </div>
  );
}