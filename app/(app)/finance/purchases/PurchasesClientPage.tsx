// app/(app)/finance/purchases/PurchasesClientPage.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
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

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

type ReceiptStatus = "DRAFT" | "SUBMITTED" | "POSTED" | "CANCELLED" | "ALL";

type ReceiptRow = {
  id: string;
  status?: string | null;
  supplier_name?: string | null;
  invoice_no?: string | null;
  invoice_date?: string | null;
  total_amount?: number | null;
  created_at?: string | null;
  posted_at?: string | null;

  warehouses?: { name?: string | null } | null;
  items?: Array<{ id: string }> | null;

  // optional
  cash_expenses?: Array<{ id: string; approval_status?: string | null; amount?: number | null }> | null;
};

export default function PurchasesClientPage(): React.ReactElement {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);
  const canPost = role === "ADMIN" || role === "ACCOUNTANT";

  // Query params
  const status = (sp.get("status") || "SUBMITTED").toUpperCase() as ReceiptStatus;
  const q = sp.get("q") || "";
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10) || 25, 10), 200);

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    router.push(`/finance/purchases?${p.toString()}`);
  };

  const qsKey = useMemo(() => `${status}|${q}|${page}|${pageSize}`, [status, q, page, pageSize]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [total, setTotal] = useState(0);

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  // ConfirmDialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<React.ReactNode>("تأكيد");
  const [confirmDesc, setConfirmDesc] = useState<React.ReactNode>("");
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void> | void)>(null);

  function openConfirm(opts: { title: React.ReactNode; description?: React.ReactNode; action: () => Promise<void> | void }) {
    setConfirmTitle(opts.title);
    setConfirmDesc(opts.description ?? "");
    setConfirmAction(() => opts.action);
    setConfirmOpen(true);
  }

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function normStatus(x: any) {
    return String(x?.status || "").toUpperCase();
  }

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      // NOTE: backend receipts list currently supports status + warehouse_id only.
      // We'll implement client-side search filtering (q) for now.
      const res = await api.get("/inventory/receipts", {
        params: {
          status: status === "ALL" ? undefined : status,
        },
      });

      const data = (res as any)?.data ?? res;
      const items: ReceiptRow[] = Array.isArray(data) ? data : (data as any)?.items || [];

      // client-side search
      const qq = q.trim().toLowerCase();
      const filtered = !qq
        ? items
        : items.filter((r) => {
            const s =
              [
                r.id,
                r.supplier_name,
                r.invoice_no,
                r.warehouses?.name,
                r.status,
                String(r.total_amount ?? ""),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase() || "";
            return s.includes(qq);
          });

      // simple pagination client-side
      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);

      setRows(paged);
      setTotal(filtered.length);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load receipts";
      setErr(msg);
      setRows([]);
      setTotal(0);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qsKey]);

  // KPI
  const kpi = useMemo(() => {
    const all = rows || [];
    const submittedCount = all.filter((x) => normStatus(x) === "SUBMITTED").length;
    const postedCount = all.filter((x) => normStatus(x) === "POSTED").length;
    const submittedSum = all
      .filter((x) => normStatus(x) === "SUBMITTED")
      .reduce((acc, x) => acc + Number(x.total_amount || 0), 0);
    const postedSum = all
      .filter((x) => normStatus(x) === "POSTED")
      .reduce((acc, x) => acc + Number(x.total_amount || 0), 0);

    return { submittedCount, postedCount, submittedSum, postedSum };
  }, [rows]);

  async function postReceipt(receiptId: string) {
    if (!canPost) return;

    openConfirm({
      title: "Post Receipt",
      description: "سيتم إدخال القطع للمخزن وإنشاء مصروف (COMPANY) بحالة Pending للمراجعة.",
      action: async () => {
        setConfirmBusy(true);
        setBusy(true);
        try {
          await api.post(`/inventory/receipts/${receiptId}/post`, {});
          showToast("success", "تم Post بنجاح");
          await load();
        } catch (e: any) {
          showToast("error", e?.response?.data?.message || e?.message || "Failed to post receipt");
        } finally {
          setBusy(false);
          setConfirmBusy(false);
          setConfirmOpen(false);
        }
      },
    });
  }

  const columns: DataTableColumn<ReceiptRow>[] = [
    {
      key: "id",
      label: "ID",
      render: (x) => <span className="font-mono text-xs">{shortId(x.id)}</span>,
    },
    {
      key: "warehouse",
      label: "المخزن",
      render: (x) => x.warehouses?.name || "—",
    },
    {
      key: "supplier",
      label: "المورد",
      render: (x) => x.supplier_name || "—",
    },
    {
      key: "invoice",
      label: "فاتورة",
      render: (x) => (
        <div className="space-y-0.5">
          <div className="text-sm">{x.invoice_no || "—"}</div>
          <div className="text-xs text-gray-500">{fmtDate(x.invoice_date)}</div>
        </div>
      ),
    },
    {
      key: "items",
      label: "Items",
      render: (x) => <span className="text-sm">{Array.isArray(x.items) ? x.items.length : 0}</span>,
    },
    {
      key: "total",
      label: "الإجمالي",
      render: (x) => <span className="font-semibold">{fmtMoney(x.total_amount)}</span>,
    },
    {
      key: "status",
      label: "الحالة",
      render: (x) => <StatusBadge status={normStatus(x)} />,
    },
    {
      key: "created",
      label: "تاريخ الإنشاء",
      render: (x) => <span className="text-gray-600">{fmtDate(x.created_at)}</span>,
    },
    {
      key: "actions",
      label: "إجراءات",
      headerClassName: "text-left",
      className: "text-left",
      render: (x) => {
        const st = normStatus(x);
        return (
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={`/finance/purchases/${x.id}`}>
              <Button variant="secondary">عرض</Button>
            </Link>

            {canPost && st === "SUBMITTED" ? (
              <Button variant="primary" onClick={() => postReceipt(x.id)} disabled={busy}>
                Post
              </Button>
            ) : null}

            {st === "POSTED" ? (
              <span className="text-xs text-gray-500">posted: {fmtDate(x.posted_at)}</span>
            ) : null}
          </div>
        );
      },
    },
  ];

  const statusTabs: Array<{ key: ReceiptStatus; label: string }> = [
    { key: "SUBMITTED", label: "Submitted" },
    { key: "POSTED", label: "Posted" },
    { key: "DRAFT", label: "Draft" },
    { key: "ALL", label: "All" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title="مشتريات قطع الغيار"
          subtitle={
            <span className="text-sm text-gray-600">
              role: <span className="font-semibold text-gray-900">{role || "—"}</span>{" "}
              {!canPost ? <span className="text-gray-500">(view only)</span> : null}
            </span>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/finance">
                <Button variant="secondary">المالية</Button>
              </Link>

              <Button variant="secondary" onClick={load} disabled={loading || busy} isLoading={loading || busy}>
                تحديث
              </Button>
            </div>
          }
        />

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {statusTabs.map((x) => {
            const active = status === x.key;
            return (
              <button
                key={x.key}
                onClick={() => setParam("status", x.key)}
                className={
                  active
                    ? "px-3 py-2 rounded-xl text-sm border bg-gray-900 text-white border-gray-900"
                    : "px-3 py-2 rounded-xl text-sm border bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }
              >
                {x.label}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <FiltersBar
              left={
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">بحث</div>
                    <input
                      value={q}
                      onChange={(e) => setParam("q", e.target.value)}
                      placeholder="supplier / invoice / id / warehouse"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div className="flex items-end">
                    <div className="text-xs text-gray-500">
                      total: <span className="font-semibold text-gray-900">{total}</span> — page{" "}
                      <span className="font-semibold text-gray-900">
                        {page}/{totalPages}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end justify-start gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">rows</span>
                      <select
                        value={String(pageSize)}
                        onChange={(e) => setParam("pageSize", e.target.value)}
                        className="rounded-xl border border-gray-200 bg-white px-2 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                      >
                        <option value="10">10</option>
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                      </select>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setParam("q", "");
                        setParam("status", "SUBMITTED");
                        setParam("pageSize", "25");
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              }
            />
          </div>
        </div>

        {/* KPI */}
        {!loading && !err ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Submitted Count (هذه الصفحة)" value={String(kpi.submittedCount)} />
            <KpiCard label="Submitted Sum (هذه الصفحة)" value={fmtMoney(kpi.submittedSum)} />
            <KpiCard label="Posted Count (هذه الصفحة)" value={String(kpi.postedCount)} />
            <KpiCard label="Posted Sum (هذه الصفحة)" value={fmtMoney(kpi.postedSum)} />
          </div>
        ) : null}

        {err ? <div className="text-sm text-red-600">⚠️ {err}</div> : null}

        <DataTable<ReceiptRow>
          title="Receipts"
          columns={columns}
          rows={rows}
          loading={loading}
          total={total}
          page={page}
          pages={totalPages}
          onPrev={page <= 1 ? undefined : () => setParam("page", String(page - 1))}
          onNext={page >= totalPages ? undefined : () => setParam("page", String(page + 1))}
          emptyTitle="لا توجد مشتريات"
          emptyHint="جرّب تغيير الحالة أو البحث."
          onRowClick={(row) => router.push(`/finance/purchases/${row.id}`)}
        />

        <ConfirmDialog
          open={confirmOpen}
          title={confirmTitle}
          description={confirmDesc}
          confirmText="تأكيد"
          cancelText="إلغاء"
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
    </div>
  );
}