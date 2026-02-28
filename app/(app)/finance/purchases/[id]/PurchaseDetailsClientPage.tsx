"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/Toast";

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

function fmtMoney(n: any) {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

type ReceiptItem = {
  id: string;
  part_id?: string | null;
  internal_serial?: string | null;
  manufacturer_serial?: string | null;
  unit_cost?: number | null;
  notes?: string | null;
  parts?: { name?: string | null; part_number?: string | null; brand?: string | null } | null;
};

type ReceiptDetails = {
  id: string;
  status?: string | null;
  warehouse_id?: string | null;
  supplier_name?: string | null;
  invoice_no?: string | null;
  invoice_date?: string | null;
  total_amount?: number | null;
  notes?: string | null;
  created_at?: string | null;
  posted_at?: string | null;

  warehouses?: { name?: string | null } | null;
  items?: ReceiptItem[] | null;

  cash_expense?: { id: string; approval_status?: string | null; amount?: number | null; type?: string | null } | null;
  cash_expenses?: Array<{ id: string; approval_status?: string | null; amount?: number | null; type?: string | null }> | null;
};

export default function PurchaseDetailsClientPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const id = String((params as any)?.id || "");

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);
  const canPost = role === "ADMIN" || role === "ACCOUNTANT";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ReceiptDetails | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const showToast = (type: "success" | "error", msg: string) => {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  };

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void> | void)>(null);

  const status = String(data?.status || "").toUpperCase();

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get(`/inventory/receipts/${id}`);
      const d = (res as any)?.data ?? res;
      setData(d);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t("financePurchases.errors.detailsLoadFailed");
      setErr(msg);
      setData(null);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const items = data?.items || [];
  const itemsCount = items.length;
  const itemsSum = useMemo(() => items.reduce((acc, x) => acc + Number(x.unit_cost || 0), 0), [items]);

  const cash = data?.cash_expense || (Array.isArray(data?.cash_expenses) ? data?.cash_expenses?.[0] : null);

  async function postReceipt() {
    if (!canPost) return;
    setConfirmAction(() => async () => {
      setConfirmBusy(true);
      setBusy(true);
      try {
        await api.post(`/inventory/receipts/${id}/post`, {});
        showToast("success", t("financePurchases.toast.postedOk"));
        await load();
      } catch (e: any) {
        showToast("error", e?.response?.data?.message || e?.message || t("financePurchases.errors.postFailed"));
      } finally {
        setBusy(false);
        setConfirmBusy(false);
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  }

  const columns: DataTableColumn<ReceiptItem>[] = [
    {
      key: "part",
      label: t("financePurchases.details.table.part"),
      render: (x) => (
        <div className="space-y-0.5">
          <div className="text-sm font-medium">{x.parts?.name || "—"}</div>
          <div className="text-xs text-gray-500">
            {(x.parts?.part_number ? `${x.parts.part_number} • ` : "") + (x.parts?.brand || "")}
          </div>
        </div>
      ),
    },
    { key: "internal", label: t("financePurchases.details.table.internalSerial"), render: (x) => <span className="font-mono text-xs">{x.internal_serial || "—"}</span> },
    { key: "manufacturer", label: t("financePurchases.details.table.manufacturerSerial"), render: (x) => <span className="font-mono text-xs">{x.manufacturer_serial || "—"}</span> },
    { key: "unitCost", label: t("financePurchases.details.table.unitCost"), render: (x) => <span className="font-semibold">{fmtMoney(x.unit_cost)}</span> },
    { key: "notes", label: t("financePurchases.details.table.notes"), render: (x) => <span className="text-gray-700">{x.notes || "—"}</span> },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <PageHeader
        title={t("financePurchases.details.title")}
        subtitle={
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              {t("financePurchases.details.id")}: <span className="font-mono">{id}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{t("common.status")}:</span>
              <StatusBadge status={status || "—"} />
              <span className="text-gray-400">•</span>
              <span>{t("common.role")}:</span>
              <span className="font-semibold text-gray-900">{role || "—"}</span>
            </div>
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/finance/purchases">
              <Button variant="secondary">{t("common.back")}</Button>
            </Link>
            <Button variant="secondary" onClick={load} disabled={loading || busy} isLoading={loading || busy}>
              {t("common.refresh")}
            </Button>
            {canPost && status === "SUBMITTED" ? (
              <Button variant="primary" onClick={postReceipt} disabled={busy}>
                {t("financePurchases.actions.post")}
              </Button>
            ) : null}
          </div>
        }
      />

      {err ? <div className="text-sm text-red-600">⚠️ {err}</div> : null}

      {!loading && data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label={t("financePurchases.details.kpi.items")} value={String(itemsCount)} />
            <KpiCard label={t("financePurchases.details.kpi.itemsSum")} value={fmtMoney(itemsSum)} />
            <KpiCard label={t("financePurchases.details.kpi.total")} value={fmtMoney(data.total_amount)} />
            <KpiCard label={t("financePurchases.details.kpi.cashExpense")} value={cash ? fmtMoney(cash.amount) : "—"} />
          </div>

          <Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">{t("financePurchases.details.fields.warehouse")}</div>
                <div className="font-medium">{data.warehouses?.name || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t("financePurchases.details.fields.supplier")}</div>
                <div className="font-medium">{data.supplier_name || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t("financePurchases.details.fields.invoice")}</div>
                <div className="font-medium">
                  {data.invoice_no || "—"} <span className="text-gray-400">•</span> {fmtDate(data.invoice_date)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t("financePurchases.details.fields.createdAt")}</div>
                <div className="font-medium">{fmtDate(data.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t("financePurchases.details.fields.postedAt")}</div>
                <div className="font-medium">{fmtDate(data.posted_at)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">{t("financePurchases.details.fields.notes")}</div>
                <div className="font-medium">{data.notes || "—"}</div>
              </div>
            </div>
          </Card>

          <DataTable<ReceiptItem>
            title={t("financePurchases.details.table.title")}
            columns={columns}
            rows={items}
            loading={false}
            total={items.length}
            page={1}
            pages={1}
            emptyTitle={t("financePurchases.details.empty.title")}
            emptyHint={t("financePurchases.details.empty.hint")}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title={t("financePurchases.confirm.postTitle")}
        description={t("financePurchases.confirm.postDesc")}
        confirmText={t("common.yes")}
        cancelText={t("common.no")}
        tone="warning"
        isLoading={confirmBusy}
        dir="rtl"
        onClose={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={async () => {
          if (!confirmAction) return;
          await confirmAction();
        }}
      />

      <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
    </div>
  );
}