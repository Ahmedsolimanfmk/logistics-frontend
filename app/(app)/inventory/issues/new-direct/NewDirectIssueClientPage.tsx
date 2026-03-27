"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

import { inventoryIssuesService } from "@/src/services/inventory-issues.service";
import type {
  InventoryRequest,
  PartItem,
  ToastType,
} from "@/src/types/inventory-issues.types";

function shortId(id: unknown) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export default function NewDirectIssueClientPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const requestId = sp.get("requestId") || "";
  const showRequest = Boolean(requestId);

  const [loading, setLoading] = useState(false);
  const [requestRow, setRequestRow] = useState<InventoryRequest | null>(null);

  const [warehouseId, setWarehouseId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [notes, setNotes] = useState("");

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

  const reservedItems = useMemo<PartItem[]>(() => {
    const reservations = requestRow?.reservations || [];
    return reservations
      .map((reservation) => reservation?.part_items || null)
      .filter(Boolean) as PartItem[];
  }, [requestRow]);

  useEffect(() => {
    async function boot() {
      if (!requestId) return;

      setLoading(true);
      try {
        const request =
          await inventoryIssuesService.getInventoryRequest(requestId);
        setRequestRow(request);
        setWarehouseId(request?.warehouse_id || "");
        setWorkOrderId(request?.work_order_id || "");
      } catch (error: any) {
        showToast(error?.message || t("common.failed"), "error");
      } finally {
        setLoading(false);
      }
    }

    boot();
  }, [requestId, t]);

  async function onCreate() {
    if (!warehouseId.trim()) {
      showToast(t("issues.errWarehouse"), "error");
      return;
    }

    if (!workOrderId.trim()) {
      showToast(t("issues.errWorkOrder"), "error");
      return;
    }

    if (!requestId) {
      showToast(t("issues.errRequestId"), "error");
      return;
    }

    if (reservedItems.length === 0) {
      showToast(t("issues.errNoReserved"), "error");
      return;
    }

    setLoading(true);
    try {
      const created =
        await inventoryIssuesService.createIssueDraft({
          warehouse_id: warehouseId.trim(),
          work_order_id: workOrderId.trim(),
          request_id: requestId,
          notes: notes.trim() ? notes.trim() : null,
          lines: reservedItems.map((item) => ({
            part_id: item.part_id,
            part_item_id: item.id,
            qty: 1,
          })),
        });

      showToast(t("issues.createdOk"), "success");
      router.push(`/inventory/issues/${created.id}`);
    } catch (error: any) {
      showToast(
        error?.response?.data?.message ||
          error?.message ||
          t("common.failed"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  const columns: DataTableColumn<PartItem>[] = [
    {
      key: "part",
      label: t("issues.colPart"),
      render: (item) => (
        <div>
          <div className="text-gray-900">
            {item?.parts?.name || "—"}
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {shortId(item?.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "serial",
      label: t("issues.colSerial"),
      render: (item) => (
        <div className="font-mono text-xs text-gray-900">
          {item?.internal_serial ||
            item?.manufacturer_serial ||
            item?.id ||
            "—"}
        </div>
      ),
    },
    {
      key: "status",
      label: t("issues.colStatus"),
      render: (item) => <StatusBadge status={item?.status} />,
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
        title={t("issues.newTitle")}
        subtitle={t("issues.newSubtitle")}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              {t("common.prev")}
            </Button>
            <Button variant="primary" onClick={onCreate} isLoading={loading}>
              {t("issues.createDraft")}
            </Button>
          </>
        }
      />

      <Card>
        {showRequest ? (
          <div className="text-sm text-gray-700">
            <div className="text-xs text-gray-500">
              {t("issues.requestId")}
            </div>
            <div className="font-mono">{requestId}</div>
            <div className="mt-1 text-xs text-gray-500">
              {t("issues.reservedCount", { n: reservedItems.length })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            {t("issues.noRequest")}
          </div>
        )}

        <div className="mt-4">
          <FiltersBar
            left={
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                <input
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  placeholder={
                    t("issues.warehouseId") || "warehouse_id"
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                />
                <input
                  value={workOrderId}
                  onChange={(e) => setWorkOrderId(e.target.value)}
                  placeholder={
                    t("issues.workOrderId") || "work_order_id"
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
            }
            right={
              <>
                {requestId ? (
                  <Link href={`/inventory/requests/${requestId}`}>
                    <Button variant="secondary">
                      {t("common.open") || "Open Request"}
                    </Button>
                  </Link>
                ) : null}

                <Button
                  variant="primary"
                  onClick={onCreate}
                  isLoading={loading}
                >
                  {t("issues.createDraft")}
                </Button>
              </>
            }
          />
        </div>

        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">
            {t("issues.notes")}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("issues.notesPh")}
            className="w-full min-h-[90px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="mt-3 text-xs text-gray-500">
          warehouse_id:{" "}
          <span className="font-mono">
            {warehouseId ? shortId(warehouseId) : "—"}
          </span>
          {workOrderId ? (
            <>
              {" "}
              • work_order_id:{" "}
              <span className="font-mono">
                {shortId(workOrderId)}
              </span>
            </>
          ) : null}
        </div>
      </Card>

      <DataTable
        title={t("issues.linesPreview")}
        subtitle={
          showRequest
            ? t("issues.reservedCount", {
                n: reservedItems.length,
              })
            : t("issues.noRequest")
        }
        columns={columns}
        rows={reservedItems}
        loading={loading}
        emptyTitle={
          showRequest
            ? t("issues.noReserved")
            : t("issues.noRequest")
        }
        emptyHint={showRequest ? t("issues.noReservedHint") || "" : ""}
        minWidthClassName="min-w-[900px]"
      />
    </div>
  );
}