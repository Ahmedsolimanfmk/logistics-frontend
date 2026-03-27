"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  PartItem,
  ToastType,
} from "@/src/types/inventory-issues.types";

function shortId(id: unknown) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none text-gray-900 placeholder:text-gray-400 focus:border-gray-300";

const textareaCls =
  "w-full min-h-[90px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none text-gray-900 placeholder:text-gray-400 focus:border-gray-300";

export default function NewDirectIssueClientPage() {
  const t = useT();
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [notes, setNotes] = useState("");

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [stock, setStock] = useState<PartItem[]>([]);
  const [selected, setSelected] = useState<Record<string, PartItem>>({});

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

  function toggle(item: PartItem) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = item;
      return next;
    });
  }

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const selectedCount = selectedList.length;

  const canLoad = Boolean(warehouseId.trim());
  const canCreate =
    Boolean(warehouseId.trim()) &&
    Boolean(workOrderId.trim()) &&
    Boolean(notes.trim()) &&
    notes.trim().length >= 5 &&
    selectedCount > 0;

  async function loadStock() {
    if (!warehouseId.trim()) {
      showToast(t("directIssue.errWarehouse"), "error");
      return;
    }

    setLoading(true);
    try {
      const items = await inventoryIssuesService.listPartItems({
        warehouse_id: warehouseId.trim(),
        status: "IN_STOCK",
        q: q.trim() || undefined,
      });
      setStock(items);
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || error?.message || t("common.failed"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  async function onCreateDraft() {
    if (!warehouseId.trim()) {
      showToast(t("directIssue.errWarehouse"), "error");
      return;
    }
    if (!workOrderId.trim()) {
      showToast(t("directIssue.errWorkOrder"), "error");
      return;
    }
    if (!notes.trim() || notes.trim().length < 5) {
      showToast(t("directIssue.errNotes"), "error");
      return;
    }
    if (selectedCount === 0) {
      showToast(t("directIssue.errPick"), "error");
      return;
    }

    setLoading(true);
    try {
      const created = await inventoryIssuesService.createIssueDraft({
        warehouse_id: warehouseId.trim(),
        work_order_id: workOrderId.trim(),
        request_id: null,
        notes: notes.trim(),
        lines: selectedList.map((item) => ({
          part_id: item.part_id,
          part_item_id: item.id,
          qty: 1,
        })),
      });

      showToast(t("directIssue.createdOk"), "success");
      router.push(`/inventory/issues/${created.id}`);
    } catch (error: any) {
      showToast(
        error?.response?.data?.message || error?.message || t("common.failed"),
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  const columns: DataTableColumn<PartItem>[] = [
    {
      key: "pick",
      label: t("directIssue.colPick"),
      render: (item) => {
        const isSelected = Boolean(selected[item.id]);
        return (
          <Button
            variant={isSelected ? "primary" : "secondary"}
            onClick={() => toggle(item)}
            disabled={loading}
          >
            {isSelected ? t("directIssue.picked") : t("directIssue.pick")}
          </Button>
        );
      },
    },
    {
      key: "serial",
      label: t("directIssue.colSerial"),
      render: (item) => (
        <div>
          <div className="font-mono text-xs text-gray-900">
            {item.internal_serial || "—"}
          </div>
          <div className="font-mono text-xs text-gray-600">
            {item.manufacturer_serial || "—"}
          </div>
          <div className="font-mono text-[11px] text-gray-500">
            {shortId(item.id)}
          </div>
        </div>
      ),
    },
    {
      key: "part",
      label: t("directIssue.colPart"),
      render: (item) => (
        <div>
          <div className="text-gray-900">{item.parts?.name || "—"}</div>
          <div className="text-xs text-gray-600">{item.parts?.brand || ""}</div>
          <div className="text-xs text-gray-500 font-mono">
            {shortId(item.part_id)}
          </div>
        </div>
      ),
    },
    {
      key: "warehouse",
      label: t("directIssue.colWarehouse"),
      render: (item) => (
        <div>
          <div className="text-gray-900">{item.warehouses?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">
            {shortId(item.warehouse_id)}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: t("directIssue.colStatus"),
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />

      <PageHeader
        title={t("directIssue.title")}
        subtitle={t("directIssue.subtitle")}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              {t("common.prev")}
            </Button>
            <Button
              variant="primary"
              onClick={onCreateDraft}
              isLoading={loading}
              disabled={!canCreate}
            >
              {t("directIssue.createDraft")}
            </Button>
          </>
        }
      />

      <Card>
        <FiltersBar
          left={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
              <input
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                placeholder={t("directIssue.warehouseId") || "warehouse_id"}
                className={inputCls}
              />
              <input
                value={workOrderId}
                onChange={(e) => setWorkOrderId(e.target.value)}
                placeholder={t("directIssue.workOrderId") || "work_order_id"}
                className={inputCls}
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("directIssue.searchPh")}
                className={inputCls}
              />
            </div>
          }
          right={
            <>
              <Button
                variant="secondary"
                onClick={loadStock}
                isLoading={loading}
                disabled={!canLoad}
              >
                {t("directIssue.loadStock")}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setSelected({})}
                disabled={selectedCount === 0 || loading}
              >
                {t("common.clear")}
              </Button>
            </>
          }
        />

        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-1">{t("directIssue.notes")}</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("directIssue.notesPh")}
            className={textareaCls}
          />
        </div>

        <div className="mt-3 text-sm text-gray-700">
          {t("directIssue.selectedCount", { n: selectedCount })}{" "}
          {selectedCount ? (
            <span className="text-gray-500">
              ({selectedList
                .map((item) => shortId(item.id))
                .slice(0, 3)
                .join(", ")}
              {selectedCount > 3 ? "…" : ""})
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            variant="primary"
            onClick={onCreateDraft}
            isLoading={loading}
            disabled={!canCreate}
          >
            {t("directIssue.createDraft")}
          </Button>
          <Link href="/inventory/part-items">
            <Button variant="secondary">{t("partItems.title")}</Button>
          </Link>
        </div>
      </Card>

      <DataTable
        title={t("directIssue.stockTitle")}
        subtitle={t("directIssue.subtitle")}
        columns={columns}
        rows={stock}
        loading={loading}
        emptyTitle={t("directIssue.noStock")}
        emptyHint={t("directIssue.noStockHint") || "اختر مخزن ثم اضغط تحميل المتاح"}
        minWidthClassName="min-w-[1100px]"
      />
    </div>
  );
}