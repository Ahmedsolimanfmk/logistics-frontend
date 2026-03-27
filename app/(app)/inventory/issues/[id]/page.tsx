"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

import { inventoryIssuesService } from "@/src/services/inventory-issues.service";
import type {
  InventoryIssue,
  InventoryIssueLine,
  ToastType,
} from "@/src/types/inventory-issues.types";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function shortId(id: unknown) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

const fmtMoney = (n: unknown) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(n ?? 0));

export default function IssueDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const router = useRouter();
  const t = useT();

  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<InventoryIssue | null>(null);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: ToastType;
  }>({
    open: false,
    message: "",
    type: "success",
  });

  function showToast(message: string, type: ToastType) {
    setToast({ open: true, message, type });
  }

  async function load() {
    if (!id) return;

    setLoading(true);
    try {
      const issue = await inventoryIssuesService.getIssue(id);
      setRow(issue);
    } catch (error: any) {
      showToast(error?.message || t("common.failed"), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const currentRow = row;
  const statusUpper = String(currentRow?.status || "").toUpperCase();
  const canPost = statusUpper === "DRAFT";

  const lines = useMemo<InventoryIssueLine[]>(
    () => currentRow?.inventory_issue_lines || [],
    [currentRow]
  );

  async function onPost() {
    if (!currentRow) return;

    setLoading(true);
    try {
      const next = await inventoryIssuesService.postIssue(currentRow.id);
      setRow(next);
      showToast(t("issues.postedOk"), "success");
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || error?.message || t("common.failed"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  const columns: DataTableColumn<InventoryIssueLine>[] = [
    {
      key: "part",
      label: t("issues.colPart"),
      render: (line) => (
        <div>
          <div className="text-gray-900">{line?.parts?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">
            {shortId(line?.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "part_item_id",
      label: t("issues.colPartItemId"),
      render: (line) => (
        <div className="font-mono text-xs text-gray-800">
          {line?.part_item_id || "—"}
        </div>
      ),
    },
    {
      key: "qty",
      label: t("issues.colQty"),
      render: (line) => <div className="text-gray-800">{line?.qty ?? 0}</div>,
    },
    {
      key: "unit_cost",
      label: t("issues.colUnitCost"),
      render: (line) => (
        <div className="text-gray-800">
          {line?.unit_cost == null ? "—" : fmtMoney(line.unit_cost)}
        </div>
      ),
    },
    {
      key: "total_cost",
      label: t("issues.colTotalCost"),
      render: (line) => (
        <div className="text-gray-800">
          {line?.total_cost == null ? "—" : fmtMoney(line.total_cost)}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PageHeader
        title={t("issues.detailsTitle")}
        subtitle={currentRow ? `#${shortId(currentRow.id)}` : `#${shortId(id)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              {t("common.prev")}
            </Button>

            <Button variant="secondary" onClick={load} disabled={loading}>
              {loading ? t("common.loading") : t("common.refresh")}
            </Button>

            <Button
              variant="primary"
              onClick={onPost}
              disabled={!canPost || loading}
              isLoading={loading}
            >
              {t("issues.post")}
            </Button>
          </>
        }
      />

      <Card>
        {!currentRow ? (
          <div className="text-sm text-gray-600">
            {loading ? t("common.loading") : t("common.noData")}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={currentRow.status} />
              <div className="text-xs text-gray-500">
                {t("issues.createdAt")}:{" "}
                <span className="text-gray-700">{fmtDate(currentRow.created_at)}</span>
              </div>
              {currentRow.posted_at ? (
                <div className="text-xs text-gray-500">
                  {t("issues.postedAt")}:{" "}
                  <span className="text-gray-700">{fmtDate(currentRow.posted_at)}</span>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">{t("issues.warehouseId")}</div>
                <div className="text-gray-900">{currentRow.warehouses?.name || "—"}</div>
                <div className="text-xs text-gray-500 font-mono">
                  {shortId(currentRow.warehouse_id)}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">{t("issues.workOrderId")}</div>
                <div className="text-gray-900 font-mono text-xs">
                  {currentRow.work_order_id || "—"}
                </div>

                {currentRow.work_order_id ? (
                  <Link
                    className="mt-2 inline-flex text-xs underline text-gray-700"
                    href={`/maintenance/work-orders/${currentRow.work_order_id}`}
                  >
                    {t("common.open") || "Open"} Work Order →
                  </Link>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">{t("issues.requestId")}</div>
                <div className="text-gray-900 font-mono text-xs">
                  {currentRow.request_id || "—"}
                </div>

                {currentRow.request_id ? (
                  <Link
                    className="mt-2 inline-flex text-xs underline text-gray-700"
                    href={`/inventory/requests/${currentRow.request_id}`}
                  >
                    {t("common.open") || "Open"} Request →
                  </Link>
                ) : null}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">{t("issues.notes")}</div>
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 whitespace-pre-wrap">
                {currentRow.notes || "—"}
              </div>
            </div>
          </div>
        )}
      </Card>

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