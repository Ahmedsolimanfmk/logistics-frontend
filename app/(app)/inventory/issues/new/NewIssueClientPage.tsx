"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { getInventoryRequest, type InventoryRequest } from "@/src/lib/inventory.api";
import { createIssueDraft } from "@/src/lib/issues.api";

// ✅ Design System
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export default function NewIssueClientPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const requestId = sp.get("requestId") || "";
  const showRequest = !!requestId;

  const [loading, setLoading] = useState(false);
  const [reqRow, setReqRow] = useState<InventoryRequest | null>(null);

  const [warehouseId, setWarehouseId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [notes, setNotes] = useState("");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showError = (msg: string) => setToast({ open: true, message: msg, type: "error" });
  const showOk = (msg: string) => setToast({ open: true, message: msg, type: "success" });

  const reservedItems = useMemo(() => {
    const res: any[] = (reqRow as any)?.reservations || [];
    return res
      .map((r) => r?.part_items)
      .filter(Boolean)
      .map((x) => x!);
  }, [reqRow]);

  useEffect(() => {
    const boot = async () => {
      if (!requestId) return;

      setLoading(true);
      try {
        const r = await getInventoryRequest(requestId);
        setReqRow(r);
        setWarehouseId((r as any)?.warehouse_id || "");
        setWorkOrderId((r as any)?.work_order_id || "");
      } catch (e: any) {
        showError(e?.message || t("common.failed"));
      } finally {
        setLoading(false);
      }
    };

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const onCreate = async () => {
    if (!warehouseId.trim()) return showError(t("issues.errWarehouse"));
    if (!workOrderId.trim()) return showError(t("issues.errWorkOrder"));
    if (!requestId) return showError(t("issues.errRequestId"));
    if (reservedItems.length === 0) return showError(t("issues.errNoReserved"));

    setLoading(true);
    try {
      const created = await createIssueDraft({
        warehouse_id: warehouseId.trim(),
        work_order_id: workOrderId.trim(),
        request_id: requestId,
        notes: notes.trim() ? notes.trim() : null,
        lines: reservedItems.map((pi: any) => ({
          part_id: pi.part_id,
          part_item_id: pi.id,
          qty: 1,
        })),
      });

      showOk(t("issues.createdOk"));
      router.push(`/inventory/issues/${created.id}`);
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
      render: (pi) => (
        <div>
          <div className="text-gray-900">{pi?.parts?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">{shortId(pi?.part_id)}</div>
        </div>
      ),
    },
    {
      key: "serial",
      label: t("issues.colSerial"),
      render: (pi) => (
        <div className="font-mono text-xs text-gray-900">
          {pi?.internal_serial || pi?.manufacturer_serial || pi?.id || "—"}
        </div>
      ),
    },
    {
      key: "status",
      label: t("issues.colStatus"),
      render: (pi) => <StatusBadge status={pi?.status} />,
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

      {/* Form */}
      <Card>
        {showRequest ? (
          <div className="text-sm text-gray-700">
            <div className="text-xs text-gray-500">{t("issues.requestId")}</div>
            <div className="font-mono">{requestId}</div>
            <div className="mt-1 text-xs text-gray-500">
              {t("issues.reservedCount", { n: reservedItems.length })}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">{t("issues.noRequest")}</div>
        )}

        <div className="mt-4">
          <FiltersBar
            left={
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                <input
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  placeholder={t("issues.warehouseId") || "warehouse_id"}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                />
                <input
                  value={workOrderId}
                  onChange={(e) => setWorkOrderId(e.target.value)}
                  placeholder={t("issues.workOrderId") || "work_order_id"}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                />
              </div>
            }
            right={
              <>
                {requestId ? (
                  <Link href={`/inventory/requests/${requestId}`}>
                    <Button variant="secondary">{t("common.open") || "Open Request"}</Button>
                  </Link>
                ) : null}

                <Button variant="primary" onClick={onCreate} isLoading={loading}>
                  {t("issues.createDraft")}
                </Button>
              </>
            }
          />
        </div>

        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">{t("issues.notes")}</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("issues.notesPh")}
            className="w-full min-h-[90px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
          />
        </div>

        <div className="mt-3 text-xs text-gray-500">
          warehouse_id: <span className="font-mono">{warehouseId ? shortId(warehouseId) : "—"}</span>
          {workOrderId ? (
            <>
              {" "}
              • work_order_id: <span className="font-mono">{shortId(workOrderId)}</span>
            </>
          ) : null}
        </div>
      </Card>

      {/* Preview reserved items */}
      <DataTable
        title={t("issues.linesPreview")}
        subtitle={
          showRequest
            ? t("issues.reservedCount", { n: reservedItems.length })
            : t("issues.noRequest")
        }
        columns={columns}
        rows={reservedItems}
        loading={loading}
        emptyTitle={showRequest ? t("issues.noReserved") : t("issues.noRequest")}
        emptyHint={showRequest ? t("issues.noReservedHint") || "" : ""}
        minWidthClassName="min-w-[900px]"
      />
    </div>
  );
}