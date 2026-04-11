"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { apiGet, unwrapItems } from "@/src/lib/api";
import { receiptsService } from "@/src/services/receipts.service";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";

type Warehouse = { id: string; name?: string | null };
type Vendor = { id: string; name?: string | null };

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
  category?:
    | PartCategory
    | null;
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

function cn(...v: any[]) {
  return v.filter(Boolean).join(" ");
}

function genInternalSerial(partId: string, rowIdx: number) {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${partId.slice(0, 4)}-${Date.now()}-${rowIdx}-${rand}`;
}

function partLabel(part: Part) {
  const name = part.name || "Unnamed";
  const partNumber = part.part_number ? ` — ${part.part_number}` : "";
  const brand = part.brand ? ` — ${part.brand}` : "";
  const categoryName = part.category?.name || part.category_legacy || "";
  const category = categoryName ? ` (${categoryName})` : "";
  return `${name}${partNumber}${brand}${category}`;
}

export default function NewReceiptPage() {
  const t = useT();
  const router = useRouter();

  const [warehouseId, setWarehouseId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
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

  const [partQuery, setPartQuery] = useState("");
  const [partsLoading, setPartsLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  useEffect(() => {
    (async () => {
      try {
        const w = unwrapItems(await apiGet("/inventory/warehouses"));
        setWarehouses(w);

        const v = unwrapItems(await apiGet("/vendors"));
        setVendors(v);

        const p = unwrapItems(await apiGet("/inventory/parts"));
        setParts(p);
      } catch (e: any) {
        setToast({
          open: true,
          message: e?.response?.data?.message || e?.message || t("common.failed"),
          type: "error",
        });
      }
    })();
  }, []);

  async function searchParts() {
    setPartsLoading(true);
    try {
      const p = unwrapItems(
        await apiGet("/inventory/parts", {
          q: partQuery.trim() || undefined,
        })
      );
      setParts(p);
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
    setItems((p) => [
      ...p,
      {
        part_id: "",
        internal_serial: "",
        manufacturer_serial: "",
        unit_cost: "",
        notes: "",
      },
    ]);

  const updateRow = (i: number, patch: Partial<DraftItem>) =>
    setItems((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeRow = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const onPickPart = (i: number, part_id: string) => {
    updateRow(i, {
      part_id,
      internal_serial: part_id ? genInternalSerial(part_id, i) : "",
    });
  };

  const hasItems = useMemo(
    () => items.some((x) => String(x.part_id || "").trim()),
    [items]
  );

  const onCreate = async () => {
    if (!warehouseId) {
      setToast({ open: true, message: "Warehouse required", type: "error" });
      return;
    }

    if (!vendorId) {
      setToast({ open: true, message: "Vendor required", type: "error" });
      return;
    }

    const preparedItems = items
      .map((it) => ({
        part_id: String(it.part_id || "").trim(),
        internal_serial: String(it.internal_serial || "").trim(),
        manufacturer_serial: String(it.manufacturer_serial || "").trim() || null,
        unit_cost: String(it.unit_cost || "").trim() || null,
        notes: String(it.notes || "").trim() || null,
      }))
      .filter((it) => it.part_id);

    if (!preparedItems.length || !hasItems) {
      setToast({ open: true, message: "Items required", type: "error" });
      return;
    }

    if (preparedItems.some((it) => !it.part_id || !it.internal_serial)) {
      setToast({
        open: true,
        message: "Each item must have a part and internal serial",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const created = await receiptsService.create({
        warehouse_id: warehouseId,
        vendor_id: vendorId,
        invoice_no: invoiceNo || null,
        invoice_date: invoiceDate || null,
        items: preparedItems,
      });

      router.push(`/inventory/receipts/${created.id}`);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || "Failed to create receipt",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const rows = items.map((x, i) => ({ ...x, __idx: i }));

  const columns: DataTableColumn<any>[] = [
    {
      key: "part",
      label: "Part",
      render: (r) => (
        <select
          value={items[r.__idx].part_id}
          onChange={(e) => onPickPart(r.__idx, e.target.value)}
          className="w-full rounded-xl border border-black/10 px-3 py-2"
        >
          <option value="">Select</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {partLabel(p)}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "serial",
      label: "Internal Serial",
      render: (r) => (
        <input
          value={items[r.__idx].internal_serial}
          readOnly
          className="w-full rounded-xl border border-black/10 px-3 py-2 bg-slate-50"
        />
      ),
    },
    {
      key: "mfg",
      label: "Manufacturer Serial",
      render: (r) => (
        <input
          value={items[r.__idx].manufacturer_serial}
          onChange={(e) => updateRow(r.__idx, { manufacturer_serial: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-3 py-2"
        />
      ),
    },
    {
      key: "cost",
      label: "Unit Cost",
      render: (r) => (
        <input
          value={items[r.__idx].unit_cost}
          onChange={(e) => updateRow(r.__idx, { unit_cost: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-3 py-2"
          placeholder="0.00"
        />
      ),
    },
    {
      key: "notes",
      label: "Notes",
      render: (r) => (
        <input
          value={items[r.__idx].notes}
          onChange={(e) => updateRow(r.__idx, { notes: e.target.value })}
          className="w-full rounded-xl border border-black/10 px-3 py-2"
          placeholder="optional"
        />
      ),
    },
    {
      key: "remove",
      label: "",
      render: (r) => (
        <Button variant="danger" onClick={() => removeRow(r.__idx)}>
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast {...toast} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <PageHeader
        title="New Receipt"
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
            <Button onClick={onCreate} isLoading={loading}>
              Create
            </Button>
          </>
        }
      />

      <Card title="Header">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className={cn("w-full rounded-xl border border-black/10 px-3 py-2")}
          >
            <option value="">Warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            className={cn("w-full rounded-xl border border-black/10 px-3 py-2")}
          >
            <option value="">Vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <input
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="Invoice No"
            className={cn("w-full rounded-xl border border-black/10 px-3 py-2")}
          />

          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className={cn("w-full rounded-xl border border-black/10 px-3 py-2")}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-slate-500">Search parts</div>
            <input
              value={partQuery}
              onChange={(e) => setPartQuery(e.target.value)}
              className="w-full rounded-xl border border-black/10 px-3 py-2"
              placeholder="Search by part number / name / brand"
            />
          </div>

          <div>
            <Button onClick={searchParts} isLoading={partsLoading}>
              Search Parts
            </Button>
          </div>
        </div>
      </Card>

      <DataTable
        title="Items"
        subtitle={`Rows: ${items.length}`}
        columns={columns}
        rows={rows}
        right={
          <>
            <Button variant="secondary" onClick={addRow}>
              Add Row
            </Button>
            <Button onClick={onCreate} isLoading={loading}>
              Create
            </Button>
          </>
        }
      />
    </div>
  );
}