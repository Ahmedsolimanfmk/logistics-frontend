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

function cn(...v: any[]) {
  return v.filter(Boolean).join(" ");
}

type Warehouse = { id: string; name?: string | null };
type Vendor = { id: string; name?: string | null };
type Part = { id: string; name: string; part_number: string };

type DraftItem = {
  part_id: string;
  internal_serial: string;
  manufacturer_serial: string;
  unit_cost: string;
  notes: string;
};

function genInternalSerial(partId: string, rowIdx: number) {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${partId.slice(0, 4)}-${Date.now()}-${rowIdx}-${rand}`;
}

export default function NewReceiptPage() {
  const t = useT();
  const router = useRouter();

  // ✅ header
  const [warehouseId, setWarehouseId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [parts, setParts] = useState<Part[]>([]);

  const [items, setItems] = useState<DraftItem[]>([
    { part_id: "", internal_serial: "", manufacturer_serial: "", unit_cost: "", notes: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" as any });

  // ================= LOAD =================
  useEffect(() => {
    (async () => {
      try {
        const w = unwrapItems(await apiGet("/inventory/warehouses"));
        setWarehouses(w);

        const v = unwrapItems(await apiGet("/vendors"));
        setVendors(v);
      } catch (e: any) {
        setToast({ open: true, message: e.message, type: "error" });
      }
    })();
  }, []);

  // ================= ITEMS =================
  const addRow = () =>
    setItems((p) => [...p, { part_id: "", internal_serial: "", manufacturer_serial: "", unit_cost: "", notes: "" }]);

  const updateRow = (i: number, patch: Partial<DraftItem>) =>
    setItems((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeRow = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));

  const onPickPart = (i: number, part_id: string) => {
    updateRow(i, {
      part_id,
      internal_serial: genInternalSerial(part_id, i),
    });
  };

  const hasItems = useMemo(() => items.some((x) => x.part_id), [items]);

  // ================= CREATE =================
  const onCreate = async () => {
    if (!warehouseId) return toastError("Warehouse required");
    if (!vendorId) return toastError("Vendor required");
    if (!hasItems) return toastError("Items required");

    setLoading(true);
    try {
      const created = await receiptsService.create({
        warehouse_id: warehouseId,
        vendor_id: vendorId,
        invoice_no: invoiceNo || null,
        invoice_date: invoiceDate || null,
        items: items.map((it) => ({
          part_id: it.part_id,
          internal_serial: it.internal_serial,
          manufacturer_serial: it.manufacturer_serial || null,
          unit_cost: it.unit_cost || null,
          notes: it.notes || null,
        })),
      });

      router.push(`/inventory/receipts/${created.id}`);
    } catch (e: any) {
      toastError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const toastError = (msg: string) =>
    setToast({ open: true, message: msg, type: "error" });

  // ================= TABLE =================
  const rows = items.map((x, i) => ({ ...x, __idx: i }));

  const columns: DataTableColumn<any>[] = [
    {
      key: "part",
      label: "Part",
      render: (r) => (
        <select
          value={items[r.__idx].part_id}
          onChange={(e) => onPickPart(r.__idx, e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "serial",
      label: "Internal Serial",
      render: (r) => <input value={items[r.__idx].internal_serial} readOnly className="border p-2 rounded" />,
    },
    {
      key: "mfg",
      label: "Manufacturer Serial",
      render: (r) => (
        <input
          value={items[r.__idx].manufacturer_serial}
          onChange={(e) => updateRow(r.__idx, { manufacturer_serial: e.target.value })}
          className="border p-2 rounded"
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

      <PageHeader title="New Receipt" />

      <Card title="Header">
        <div className="grid grid-cols-2 gap-3">
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">Warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>

          <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Invoice No" />
          <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
      </Card>

      <DataTable
        title="Items"
        columns={columns}
        rows={rows}
        right={
          <>
            <Button onClick={addRow}>Add Row</Button>
            <Button onClick={onCreate} isLoading={loading}>
              Create
            </Button>
          </>
        }
      />
    </div>
  );
}