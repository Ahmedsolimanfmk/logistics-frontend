"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { apiGet, unwrapItems } from "@/src/lib/api";
import { receiptsService } from "@/src/services/receipts.service";
import { useVendorOptions } from "@/src/hooks/master-data/useVendorOptions";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

type Warehouse = { id: string; name?: string | null };

type PartCategory = {
  id: string;
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
};

type Part = {
  id: string;
  name: string;
  part_number: string;
  brand?: string | null;
  category?: PartCategory | null;
  category_id?: string | null;
  category_legacy?: string | null;
};

type DraftItem = {
  part_id: string;
  internal_serial: string;
  manufacturer_serial: string;
  unit_cost: string;
  notes: string;
};

type BulkItem = {
  part_id: string;
  qty: string;
  unit_cost: string;
  notes: string;
};

function cn(...v: any[]) {
  return v.filter(Boolean).join(" ");
}

function slugToken(v: string, max = 3) {
  return String(v || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, max);
}

function compactPartToken(part?: Part | null) {
  if (!part) return "PART";

  const pn = String(part.part_number || "").toUpperCase().trim();
  if (pn) {
    return (
      pn
        .replace(/^PART[-_]?/i, "")
        .replace(/[^A-Z0-9-]+/g, "")
        .slice(0, 12) || "PART"
    );
  }

  return slugToken(part.name || "PART", 8) || "PART";
}

function warehouseToken(warehouseName?: string | null) {
  const words = String(warehouseName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "WH";

  const joined = words.map((w) => slugToken(w, 1)).join("");
  return (joined || slugToken(String(warehouseName || ""), 3) || "WH").slice(0, 4);
}

function ymd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function partLabel(part: Part) {
  const name = part.name || "Unnamed";
  const partNumber = part.part_number ? ` — ${part.part_number}` : "";
  const brand = part.brand ? ` — ${part.brand}` : "";
  const categoryName = part.category?.name || part.category_legacy || "";
  const category = categoryName ? ` (${categoryName})` : "";
  return `${name}${partNumber}${brand}${category}`;
}

function buildSerialForIndex(params: {
  items: DraftItem[];
  parts: Part[];
  warehouses: Warehouse[];
  warehouseId: string;
  rowIndex: number;
}) {
  const { items, parts, warehouses, warehouseId, rowIndex } = params;
  const row = items[rowIndex];
  const selectedPartId = String(row?.part_id || "").trim();

  if (!selectedPartId) return "";

  const part = parts.find((p) => p.id === selectedPartId);
  const warehouse = warehouses.find((w) => w.id === warehouseId);

  const partToken = compactPartToken(part);
  const whToken = warehouseToken(warehouse?.name);
  const dateToken = ymd();

  let seq = 0;
  for (let i = 0; i <= rowIndex; i += 1) {
    if (String(items[i]?.part_id || "").trim() === selectedPartId) {
      seq += 1;
    }
  }

  const seqToken = String(seq || rowIndex + 1).padStart(2, "0");
  return `${partToken}-${whToken}-${dateToken}-${seqToken}`;
}

function findDuplicateSerials(items: DraftItem[]) {
  const counts = new Map<string, number>();

  for (const row of items) {
    const serial = String(row.internal_serial || "").trim().toUpperCase();
    if (!serial) continue;
    counts.set(serial, (counts.get(serial) || 0) + 1);
  }

  const duplicates = new Set<string>();
  for (const [serial, count] of counts.entries()) {
    if (count > 1) duplicates.add(serial);
  }

  return duplicates;
}

export default function InventoryReceiptsPage() {
  const t = useT();
  const router = useRouter();

  const {
    options: vendorOptions,
    loading: vendorsLoading,
    error: vendorsError,
  } = useVendorOptions();

  const [mode, setMode] = useState<"SERIAL" | "BULK">("SERIAL");

  const [warehouseId, setWarehouseId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [parts, setParts] = useState<Part[]>([]);

  const [items, setItems] = useState<DraftItem[]>([
    {
      part_id: "",
      internal_serial: "",
      manufacturer_serial: "",
      unit_cost: "",
      notes: "",
    },
  ]);

  const [bulkItems, setBulkItems] = useState<BulkItem[]>([
    {
      part_id: "",
      qty: "",
      unit_cost: "",
      notes: "",
    },
  ]);

  const [partQuery, setPartQuery] = useState("");
  const [partsLoading, setPartsLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  useEffect(() => {
    async function loadMasterData() {
      try {
        const w = unwrapItems(await apiGet("/inventory/warehouses"));
        setWarehouses(Array.isArray(w) ? w : []);

        const p = unwrapItems(await apiGet("/inventory/parts"));
        setParts(Array.isArray(p) ? p : []);
      } catch (e: any) {
        setToast({
          open: true,
          message: e?.response?.data?.message || e?.message || t("common.failed"),
          type: "error",
        });
      }
    }

    loadMasterData();
  }, [t]);

  useEffect(() => {
    if (vendorsError) {
      setToast({
        open: true,
        message: vendorsError,
        type: "error",
      });
    }
  }, [vendorsError]);

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        value: w.id,
        label: w.name || w.id,
      })),
    [warehouses]
  );

  const partOptions = useMemo(
    () =>
      parts.map((p) => ({
        value: p.id,
        label: partLabel(p),
      })),
    [parts]
  );

  async function searchParts() {
    setPartsLoading(true);
    try {
      const p = unwrapItems(
        await apiGet("/inventory/parts", {
          q: partQuery.trim() || undefined,
        })
      );
      setParts(Array.isArray(p) ? p : []);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to search parts",
        type: "error",
      });
    } finally {
      setPartsLoading(false);
    }
  }

  const addRow = () =>
    setItems((prev) => [
      ...prev,
      {
        part_id: "",
        internal_serial: "",
        manufacturer_serial: "",
        unit_cost: "",
        notes: "",
      },
    ]);

  const updateRow = (i: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeRow = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const onPickPart = (i: number, part_id: string) => {
    setItems((prev) => {
      const next = prev.map((r, idx) =>
        idx === i
          ? {
              ...r,
              part_id,
            }
          : r
      );

      next[i] = {
        ...next[i],
        internal_serial: part_id
          ? buildSerialForIndex({
              items: next,
              parts,
              warehouses,
              warehouseId,
              rowIndex: i,
            })
          : "",
      };

      return next;
    });
  };

  const regenerateAllSerials = () => {
    setItems((prev) =>
      prev.map((row, index) => ({
        ...row,
        internal_serial: row.part_id
          ? buildSerialForIndex({
              items: prev,
              parts,
              warehouses,
              warehouseId,
              rowIndex: index,
            })
          : "",
      }))
    );

    setToast({
      open: true,
      message: "Serials regenerated",
      type: "success",
    });
  };

  const addBulkRow = () =>
    setBulkItems((prev) => [
      ...prev,
      { part_id: "", qty: "", unit_cost: "", notes: "" },
    ]);

  const updateBulkRow = (i: number, patch: Partial<BulkItem>) =>
    setBulkItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeBulkRow = (i: number) =>
    setBulkItems((prev) => prev.filter((_, idx) => idx !== i));

  const duplicateSerials = useMemo(() => findDuplicateSerials(items), [items]);

  const hasSerialItems = useMemo(
    () => items.some((x) => String(x.part_id || "").trim()),
    [items]
  );

  const hasBulkItems = useMemo(
    () =>
      bulkItems.some(
        (x) => String(x.part_id || "").trim() && Number(x.qty || 0) > 0
      ),
    [bulkItems]
  );

  const selectedWarehouseName = useMemo(
    () => warehouses.find((w) => w.id === warehouseId)?.name || null,
    [warehouses, warehouseId]
  );

  const serialRows = items.map((x, i) => ({ ...x, __idx: i }));
  const bulkRows = bulkItems.map((x, i) => ({ ...x, __idx: i }));

  const serialColumns: DataTableColumn<any>[] = [
    {
      key: "part",
      label: t("receipts.colPart"),
      render: (r) => (
        <TrexSelect
          value={items[r.__idx].part_id}
          onChange={(value) => onPickPart(r.__idx, value)}
          options={partOptions}
          placeholderText="اختر القطعة"
        />
      ),
    },
    {
      key: "serial",
      label: t("receipts.colInternalSerial"),
      render: (r) => {
        const value = String(items[r.__idx].internal_serial || "");
        const isDuplicate = duplicateSerials.has(value.trim().toUpperCase());

        return (
          <div className="space-y-1">
            <TrexInput
              value={value}
              onChange={(e) =>
                updateRow(r.__idx, { internal_serial: e.target.value })
              }
              className={isDuplicate ? "border-red-400 bg-red-50" : "bg-slate-50"}
            />
            <div className={cn("text-xs", isDuplicate ? "text-red-600" : "text-slate-500")}>
              {isDuplicate ? "Duplicate serial in form" : "Preview / editable"}
            </div>
          </div>
        );
      },
    },
    {
      key: "mfg",
      label: t("receipts.colManufacturerSerial"),
      render: (r) => (
        <TrexInput
          value={items[r.__idx].manufacturer_serial}
          onChange={(e) =>
            updateRow(r.__idx, { manufacturer_serial: e.target.value })
          }
        />
      ),
    },
    {
      key: "cost",
      label: t("receipts.colUnitCost"),
      render: (r) => (
        <TrexInput
          value={items[r.__idx].unit_cost}
          onChange={(e) => updateRow(r.__idx, { unit_cost: e.target.value })}
          placeholder="0.00"
        />
      ),
    },
    {
      key: "notes",
      label: t("receipts.colNotes"),
      render: (r) => (
        <TrexInput
          value={items[r.__idx].notes}
          onChange={(e) => updateRow(r.__idx, { notes: e.target.value })}
          placeholder={t("common.optional")}
        />
      ),
    },
    {
      key: "remove",
      label: "",
      render: (r) => (
        <Button variant="danger" onClick={() => removeRow(r.__idx)}>
          {t("receipts.remove")}
        </Button>
      ),
    },
  ];

  const bulkColumns: DataTableColumn<any>[] = [
    {
      key: "part",
      label: t("receipts.colPart"),
      render: (r) => (
        <TrexSelect
          value={bulkItems[r.__idx].part_id}
          onChange={(value) => updateBulkRow(r.__idx, { part_id: value })}
          options={partOptions}
          placeholderText="اختر القطعة"
        />
      ),
    },
    {
      key: "qty",
      label: "Qty",
      render: (r) => (
        <TrexInput
          value={bulkItems[r.__idx].qty}
          onChange={(e) => updateBulkRow(r.__idx, { qty: e.target.value })}
          placeholder="1"
        />
      ),
    },
    {
      key: "cost",
      label: t("receipts.colUnitCost"),
      render: (r) => (
        <TrexInput
          value={bulkItems[r.__idx].unit_cost}
          onChange={(e) => updateBulkRow(r.__idx, { unit_cost: e.target.value })}
          placeholder="0.00"
        />
      ),
    },
    {
      key: "notes",
      label: t("receipts.colNotes"),
      render: (r) => (
        <TrexInput
          value={bulkItems[r.__idx].notes}
          onChange={(e) => updateBulkRow(r.__idx, { notes: e.target.value })}
          placeholder={t("common.optional")}
        />
      ),
    },
    {
      key: "remove",
      label: "",
      render: (r) => (
        <Button variant="danger" onClick={() => removeBulkRow(r.__idx)}>
          {t("receipts.remove")}
        </Button>
      ),
    },
  ];

  const onCreate = async () => {
    if (!warehouseId) {
      setToast({ open: true, message: t("receipts.errWarehouse"), type: "error" });
      return;
    }

    if (!vendorId) {
      setToast({ open: true, message: "Vendor required", type: "error" });
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        warehouse_id: warehouseId,
        vendor_id: vendorId,
        invoice_no: invoiceNo || null,
        invoice_date: invoiceDate || null,
      };

      if (mode === "SERIAL") {
        const preparedItems = items
          .map((it) => ({
            part_id: String(it.part_id || "").trim(),
            internal_serial: String(it.internal_serial || "").trim(),
            manufacturer_serial:
              String(it.manufacturer_serial || "").trim() || null,
            unit_cost: String(it.unit_cost || "").trim() || null,
            notes: String(it.notes || "").trim() || null,
          }))
          .filter((it) => it.part_id);

        if (!preparedItems.length || !hasSerialItems) {
          setToast({ open: true, message: t("receipts.errItems"), type: "error" });
          setLoading(false);
          return;
        }

        if (preparedItems.some((it) => !it.part_id || !it.internal_serial)) {
          setToast({
            open: true,
            message: "Each item must have a part and internal serial",
            type: "error",
          });
          setLoading(false);
          return;
        }

        if (duplicateSerials.size > 0) {
          setToast({
            open: true,
            message: "There are duplicate internal serials in the form",
            type: "error",
          });
          setLoading(false);
          return;
        }

        payload.items = preparedItems;
      }

      if (mode === "BULK") {
        const preparedBulk = bulkItems
          .map((b) => ({
            part_id: String(b.part_id || "").trim(),
            qty: Number(b.qty || 0),
            unit_cost: String(b.unit_cost || "").trim() || null,
            notes: String(b.notes || "").trim() || null,
          }))
          .filter((b) => b.part_id && b.qty > 0);

        if (!preparedBulk.length || !hasBulkItems) {
          setToast({ open: true, message: "Bulk lines required", type: "error" });
          setLoading(false);
          return;
        }

        payload.bulk_lines = preparedBulk;
      }

      const created = await receiptsService.create(payload);
      router.push(`/inventory/receipts/${created.id}`);
    } catch (e: any) {
      setToast({
        open: true,
        message:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to create receipt",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <Toast
        {...toast}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title={t("receipts.newTitle")}
        subtitle={t("receipts.newSubtitle")}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              {t("common.back")}
            </Button>
            <Button onClick={onCreate} isLoading={loading}>
              {t("receipts.createDraft")}
            </Button>
          </>
        }
      />

      <Card title={t("receipts.header")}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TrexSelect
            label="receipts.warehouse"
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouseOptions}
            placeholderText="اختر المخزن"
          />

          <TrexSelect
            label="receipts.vendorSelect"
            value={vendorId}
            onChange={setVendorId}
            options={vendorOptions}
            loading={vendorsLoading}
            emptyText={t("receipts.vendorsEmpty")}
            placeholderText="اختر المورد"
          />

          <TrexInput
            label="receipts.invoiceNo"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder={t("receipts.invoiceNoPh")}
          />

          <TrexInput
            label="receipts.invoiceDate"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <TrexInput
              label="receipts.searchParts"
              value={partQuery}
              onChange={(e) => setPartQuery(e.target.value)}
              placeholder={t("receipts.searchPartsPlaceholder")}
            />
          </div>

          <div>
            <Button onClick={searchParts} isLoading={partsLoading}>
              {t("receipts.searchParts")}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant={mode === "SERIAL" ? "primary" : "secondary"}
            onClick={() => setMode("SERIAL")}
          >
            {t("receipts.serialMode")}
          </Button>

          <Button
            variant={mode === "BULK" ? "primary" : "secondary"}
            onClick={() => setMode("BULK")}
          >
            {t("receipts.bulkMode")}
          </Button>

          {mode === "SERIAL" ? (
            <>
              <Button variant="secondary" onClick={regenerateAllSerials}>
                {t("receipts.regenerateSerials")}
              </Button>

              <div className="text-xs text-slate-500">
                Warehouse token:{" "}
                <span className="font-mono text-slate-700">
                  {warehouseToken(selectedWarehouseName)}
                </span>
              </div>

              <div className="text-xs text-slate-500">
                Date token:{" "}
                <span className="font-mono text-slate-700">{ymd()}</span>
              </div>

              {duplicateSerials.size > 0 ? (
                <div className="text-xs text-red-600">
                  Duplicate serials detected: {duplicateSerials.size}
                </div>
              ) : (
                <div className="text-xs text-emerald-600">
                  No duplicate serials in form
                </div>
              )}
            </>
          ) : null}
        </div>
      </Card>

      {mode === "SERIAL" ? (
        <DataTable
          title={t("receipts.serialItems")}
          subtitle={`Rows: ${items.length}`}
          columns={serialColumns}
          rows={serialRows}
          right={
            <>
              <Button variant="secondary" onClick={addRow}>
                {t("receipts.addRow")}
              </Button>
              <Button variant="secondary" onClick={regenerateAllSerials}>
                {t("receipts.regenerateSerials")}
              </Button>
              <Button onClick={onCreate} isLoading={loading}>
                {t("receipts.createDraft")}
              </Button>
            </>
          }
        />
      ) : (
        <DataTable
          title={t("receipts.bulkItems")}
          subtitle={`Rows: ${bulkItems.length}`}
          columns={bulkColumns}
          rows={bulkRows}
          right={
            <>
              <Button variant="secondary" onClick={addBulkRow}>
                {t("receipts.addRow")}
              </Button>
              <Button onClick={onCreate} isLoading={loading}>
                {t("receipts.createDraft")}
              </Button>
            </>
          }
        />
      )}
    </div>
  );
}