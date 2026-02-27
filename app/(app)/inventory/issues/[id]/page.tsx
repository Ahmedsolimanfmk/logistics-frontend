"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { getIssue, postIssue, type InventoryIssue } from "@/src/lib/issues.api";

// ✅ Design System
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

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

const fmtMoney = (n: any) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n ?? 0));

export default function IssueDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const router = useRouter();
  const t = useT();

  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<InventoryIssue | null>(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showError = (msg: string) => setToast({ open: true, message: msg, type: "error" });
  const showOk = (msg: string) => setToast({ open: true, message: msg, type: "success" });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await getIssue(id);
      setRow(r);
    } catch (e: any) {
      showError(e?.message || t("common.failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const statusUpper = String((row as any)?.status || "").toUpperCase();
  const canPost = statusUpper === "DRAFT";

  const lines = useMemo(() => (row as any)?.inventory_issue_lines || [], [row]);

  const onPost = async () => {
    if (!row) return;
    setLoading(true);
    try {
      const res = await postIssue(row.id);
      // بعض APIs بترجع { issue }, وبعضها بيرجع issue مباشرة
      const next = (res as any)?.issue || res;
      setRow(next);
      showOk(t("issues.postedOk"));
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.message || t("common.failed"));
    } finally {
      setLoading(false);
    }
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "part",
      label: t("issues.colPart"),
      render: (ln) => (
        <div>
          <div className="text-gray-900">{ln?.parts?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">{shortId(ln?.part_id)}</div>
        </div>
      ),
    },
    {
      key: "part_item_id",
      label: t("issues.colPartItemId"),
      render: (ln) => <div className="font-mono text-xs text-gray-800">{ln?.part_item_id || "—"}</div>,
    },
    {
      key: "qty",
      label: t("issues.colQty"),
      render: (ln) => <div className="text-gray-800">{ln?.qty ?? 0}</div>,
    },
    {
      key: "unit_cost",
      label: t("issues.colUnitCost"),
      render: (ln) => <div className="text-gray-800">{ln?.unit_cost == null ? "—" : fmtMoney(ln.unit_cost)}</div>,
    },
    {
      key: "total_cost",
      label: t("issues.colTotalCost"),
      render: (ln) => <div className="text-gray-800">{ln?.total_cost == null ? "—" : fmtMoney(ln.total_cost)}</div>,
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
        title={t("issues.detailsTitle")}
        subtitle={row ? `#${shortId(row.id)}` : `#${shortId(id)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              {t("common.prev")}
            </Button>

            <Button variant="secondary" onClick={load} disabled={loading}>
              {loading ? t("common.loading") : t("common.refresh")}
            </Button>

            <Button variant="primary" onClick={onPost} disabled={!canPost || loading} isLoading={loading}>
              {t("issues.post")}
            </Button>
          </>
        }
      />

      {/* Summary */}
      <Card>
        {!row ? (
          <div className="text-sm text-gray-600">{loading ? t("common.loading") : t("common.noData")}</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={row.status} />
              <div className="text-xs text-gray-500">
                {t("issues.createdAt")}: <span className="text-gray-700">{fmtDate((row as any)?.created_at)}</span>
              </div>
              {(row as any)?.posted_at ? (
                <div className="text-xs text-gray-500">
                  {t("issues.postedAt")}: <span className="text-gray-700">{fmtDate((row as any)?.posted_at)}</span>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">{t("issues.warehouseId")}</div>
                <div className="text-gray-900">{(row as any)?.warehouses?.name || "—"}</div>
                <div className="text-xs text-gray-500 font-mono">{shortId((row as any)?.warehouse_id)}</div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">{t("issues.workOrderId")}</div>
                <div className="text-gray-900 font-mono text-xs">{(row as any)?.work_order_id || "—"}</div>

                {(row as any)?.work_order_id ? (
                  <Link
                    className="mt-2 inline-flex text-xs underline text-gray-700"
                    href={`/maintenance/work-orders/${(row as any)?.work_order_id}`}
                  >
                    {t("common.open") || "Open"} Work Order →
                  </Link>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">{t("issues.requestId")}</div>
                <div className="text-gray-900 font-mono text-xs">{(row as any)?.request_id || "—"}</div>

                {(row as any)?.request_id ? (
                  <Link
                    className="mt-2 inline-flex text-xs underline text-gray-700"
                    href={`/inventory/requests/${(row as any)?.request_id}`}
                  >
                    {t("common.open") || "Open"} Request →
                  </Link>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">{t("issues.notes")}</div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 whitespace-pre-wrap">
                {(row as any)?.notes || "—"}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Lines */}
      <DataTable
        title={t("issues.lines")}
        subtitle={`${t("common.count") || "Count"}: ${lines.length}`}
        columns={columns}
        rows={lines}
        loading={loading}
        emptyTitle={t("common.noData")}
        minWidthClassName="min-w-[1100px]"
      />
    </div>
  );
}