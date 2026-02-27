"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { apiGet } from "@/src/lib/api";

// ✅ Design System
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

type Receipt = any;

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

function unwrapReceipt(r: any): Receipt | null {
  // apiGet ممكن يرجّع:
  // 1) receipt object مباشرة
  // 2) { data: receipt }
  // 3) { receipt: {...} } أو { data: { receipt: {...} } }
  const x = r?.receipt ?? r?.data?.receipt ?? r?.data ?? r;
  if (x && typeof x === "object") return x;
  return null;
}

function unwrapItems(row: any): any[] {
  const arr = row?.items ?? row?.receipt_items ?? row?.data?.items ?? row?.data?.receipt_items ?? [];
  return Array.isArray(arr) ? arr : [];
}

function Info({ label, value, hint }: { label: React.ReactNode; value: any; hint?: any }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900 break-words">{String(value ?? "—")}</div>
      {hint ? (
        <div className="mt-1 text-xs text-gray-500 font-mono break-words">{String(hint ?? "")}</div>
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
  const [row, setRow] = useState<Receipt | null>(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const r = await apiGet<any>(`/inventory/receipts/${id}`);
        const unwrapped = unwrapReceipt(r);
        setRow(unwrapped);
      } catch (e: any) {
        setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
        setRow(null);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const items = useMemo(() => unwrapItems(row), [row]);

  const columns: DataTableColumn<any>[] = [
    {
      key: "part",
      label: "Part",
      render: (x) => (
        <div>
          <div className="text-gray-900 font-semibold">{x?.parts?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">{shortId(x?.part_id || x?.parts_id)}</div>
        </div>
      ),
    },
    {
      key: "internal",
      label: "Internal",
      render: (x) => (
        <span className="font-mono text-xs text-gray-800">
          {x?.internal_serial || x?.part_items?.internal_serial || "—"}
        </span>
      ),
    },
    {
      key: "mfg",
      label: "MFG",
      render: (x) => (
        <span className="font-mono text-xs text-gray-800">
          {x?.manufacturer_serial || x?.part_items?.manufacturer_serial || "—"}
        </span>
      ),
    },
    {
      key: "cost",
      label: "Cost",
      render: (x) => String(x?.unit_cost ?? "—"),
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
        title="تفاصيل الإضافة المخزنية"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Info label="المخزن" value={row?.warehouses?.name || "—"} hint={row?.warehouse_id ? shortId(row.warehouse_id) : ""} />
              <Info label="المورد" value={row?.supplier_name || row?.vendor_name || "—"} hint={row?.invoice_no || ""} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Info label="الحالة" value={row?.status || "—"} />
              <Info label="تاريخ الفاتورة" value={row?.invoice_date ? String(row.invoice_date).slice(0, 10) : "—"} />
              <Info label="تاريخ الإنشاء" value={formatDate(row?.created_at)} />
            </div>

            <DataTable
              title="العناصر"
              columns={columns}
              rows={items}
              loading={false}
              emptyTitle={t("common.noData")}
              emptyHint="لا توجد عناصر داخل الإضافة."
              minWidthClassName="min-w-[1100px]"
            />
          </div>
        )}
      </Card>
    </div>
  );
}