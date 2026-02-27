"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { unwrapItems } from "@/src/lib/api";
import { listPartItems, type PartItem } from "@/src/lib/partItems.api";
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

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none " +
  "text-gray-900 placeholder:text-gray-400 focus:border-gray-300";

const textareaCls =
  "w-full min-h-[90px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none " +
  "text-gray-900 placeholder:text-gray-400 focus:border-gray-300";

export default function NewDirectIssueClientPage() {
  const t = useT();
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [notes, setNotes] = useState("");

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [stock, setStock] = useState<PartItem[]>([]);
  const [selected, setSelected] = useState<Record<string, PartItem>>({}); // part_item_id -> item

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showError = (msg: string) => setToast({ open: true, message: msg, type: "error" });
  const showOk = (msg: string) => setToast({ open: true, message: msg, type: "success" });

  const toggle = (it: PartItem) => {
    setSelected((p) => {
      const next = { ...p };
      if (next[it.id]) delete next[it.id];
      else next[it.id] = it;
      return next;
    });
  };

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const selectedCount = selectedList.length;

  const loadStock = async () => {
    if (!warehouseId.trim()) return showError(t("directIssue.errWarehouse"));

    setLoading(true);
    try {
      const res = await listPartItems({
        warehouse_id: warehouseId.trim(),
        status: "IN_STOCK",
        q: q.trim() || undefined,
      });
      setStock(unwrapItems<PartItem>(res));
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.message || t("common.failed"));
    } finally {
      setLoading(false);
    }
  };

  const onCreateDraft = async () => {
    if (!warehouseId.trim()) return showError(t("directIssue.errWarehouse"));
    if (!workOrderId.trim()) return showError(t("directIssue.errWorkOrder"));
    if (!notes.trim() || notes.trim().length < 5) return showError(t("directIssue.errNotes"));
    if (selectedCount === 0) return showError(t("directIssue.errPick"));

    setLoading(true);
    try {
      const created = await createIssueDraft({
        warehouse_id: warehouseId.trim(),
        work_order_id: workOrderId.trim(),
        request_id: null,
        notes: notes.trim(),
        lines: selectedList.map((pi) => ({
          part_id: pi.part_id,
          part_item_id: pi.id,
          qty: 1,
        })),
      });

      showOk(t("directIssue.createdOk"));
      router.push(`/inventory/issues/${created.id}`);
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.message || t("common.failed"));
    } finally {
      setLoading(false);
    }
  };

  const columns: DataTableColumn<PartItem>[] = [
    {
      key: "pick",
      label: t("directIssue.colPick"),
      render: (pi) => {
        const isSel = !!selected[pi.id];
        return (
          <Button variant={isSel ? "primary" : "secondary"} onClick={() => toggle(pi)} disabled={loading}>
            {isSel ? t("directIssue.picked") : t("directIssue.pick")}
          </Button>
        );
      },
    },
    {
  key: "serial",
  label: t("directIssue.colSerial"),
  render: (pi) => (
    <div>
      <div className="font-mono text-xs text-gray-900">{pi.internal_serial || "—"}</div>
      <div className="font-mono text-xs text-gray-600">{pi.manufacturer_serial || "—"}</div>
      <div className="font-mono text-[11px] text-gray-500">{shortId(pi.id)}</div>
    </div>
  ),
},
{
  key: "part",
  label: t("directIssue.colPart"),
  render: (pi) => (
    <div>
      <div className="text-gray-900">{pi.parts?.name || "—"}</div>
      <div className="text-xs text-gray-600">{pi.parts?.brand || ""}</div>
      <div className="text-xs text-gray-500 font-mono">{shortId(pi.part_id)}</div>
    </div>
  ),
},
{
  key: "warehouse",
  label: t("directIssue.colWarehouse"),
  render: (pi) => (
    <div>
      <div className="text-gray-900">{pi.warehouses?.name || "—"}</div>
      <div className="text-xs text-gray-500 font-mono">{shortId(pi.warehouse_id)}</div>
    </div>
  ),
},
    {
      key: "status",
      label: t("directIssue.colStatus"),
      render: (pi) => <StatusBadge status={pi.status} />,
    },
  ];

  return (
    <div className="space-y-4">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <PageHeader
        title={t("directIssue.title")}
        subtitle={t("directIssue.subtitle")}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              {t("common.prev")}
            </Button>
            <Button variant="primary" onClick={onCreateDraft} isLoading={loading}>
              {t("directIssue.createDraft")}
            </Button>
          </>
        }
      />

      <Card>
        <FiltersBar
          left={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
              <input value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder={t("directIssue.warehouseId") || "warehouse_id"} className={inputCls} />
              <input value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} placeholder={t("directIssue.workOrderId") || "work_order_id"} className={inputCls} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("directIssue.searchPh")} className={inputCls} />
            </div>
          }
          right={
            <>
              <Button variant="secondary" onClick={loadStock} isLoading={loading}>
                {t("directIssue.loadStock")}
              </Button>

              <Button
                variant="secondary"
                onClick={() => setSelected({})}
                disabled={selectedCount === 0 || loading}
              >
                {t("common.clear") || "Clear"}
              </Button>
            </>
          }
        />

        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-1">{t("directIssue.notes")}</div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("directIssue.notesPh")} className={textareaCls} />
        </div>

        <div className="mt-3 text-sm text-gray-700">
          {t("directIssue.selectedCount", { n: selectedCount })}{" "}
          {selectedCount ? (
            <span className="text-gray-500">
              ({selectedList.map((x) => shortId(x.id)).slice(0, 3).join(", ")}
              {selectedCount > 3 ? "…" : ""})
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2">
          <Button variant="primary" onClick={onCreateDraft} isLoading={loading}>
            {t("directIssue.createDraft")}
          </Button>
          <Link href="/inventory/part-items">
            <Button variant="secondary">{t("partItems.title") || "Part Items"}</Button>
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
        emptyHint={t("directIssue.noStockHint") || "اختر مخزن ثم اضغط تحميل المخزون."}
        minWidthClassName="min-w-[1100px]"
      />
    </div>
  );
}