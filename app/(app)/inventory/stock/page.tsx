"use client";

import { useEffect, useMemo, useState } from "react";
import stockService, { type StockItem } from "@/src/services/stock.service";
import { warehousesService } from "@/src/services/warehouses.service";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import {
  DataTable,
  type DataTableColumn,
} from "@/src/components/ui/DataTable";

type WarehouseOption = {
  id: string;
  name: string;
  location?: string | null;
};

function fmtQty(v: any) {
  const n = Number(v || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

export default function InventoryStockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);

  const [warehouseId, setWarehouseId] = useState("");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await stockService.list({
        warehouse_id: warehouseId || undefined,
        q: q.trim() || undefined,
      });

      setItems(res.items);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "فشل تحميل رصيد المخازن"
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadWarehouses() {
    try {
      const res = await warehousesService.listOptions();
      setWarehouses(res.items || []);
    } catch {
      setWarehouses([]);
    }
  }

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalQty = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.qty_on_hand || 0), 0);
  }, [items]);

  const lowStockCount = useMemo(() => {
    return items.filter((item: any) => {
      const min = Number(item.min_stock || 0);
      return min > 0 && Number(item.qty_on_hand || 0) <= min;
    }).length;
  }, [items]);

  const columns: DataTableColumn<StockItem>[] = [
    {
      key: "warehouse_name",
      label: "المخزن",
      render: (row) => (
        <div>
          <div className="font-medium">{row.warehouse_name || "—"}</div>
          {row.warehouse_location ? (
            <div className="text-xs text-slate-500">
              {row.warehouse_location}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "part_number",
      label: "رقم القطعة",
      render: (row) => (
        <span className="font-mono text-xs">
          {row.part_number || "—"}
        </span>
      ),
    },
    {
      key: "part_name",
      label: "اسم القطعة",
      render: (row) => (
        <div>
          <div className="font-medium">{row.part_name || "—"}</div>
          {row.brand ? (
            <div className="text-xs text-slate-500">{row.brand}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: "unit",
      label: "الوحدة",
      render: (row) => row.unit || "—",
    },
    {
      key: "qty_on_hand",
      label: "الرصيد الحالي",
      render: (row) => (
        <span className="font-semibold">
          {fmtQty(row.qty_on_hand)}
        </span>
      ),
    },
    {
      key: "min_stock",
      label: "الحد الأدنى",
      render: (row: any) => row.min_stock ?? "—",
    },
    {
      key: "status",
      label: "الحالة",
      render: (row: any) => {
        const min = Number(row.min_stock || 0);
        const qty = Number(row.qty_on_hand || 0);

        if (min > 0 && qty <= min) {
          return <span className="text-red-600">منخفض</span>;
        }

        return <span className="text-green-700">متاح</span>;
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900" dir="rtl">
      <div className="space-y-4">
        <PageHeader
          title="رصيد المخازن"
          subtitle="عرض محتويات كل مخزن من قطع الغيار والكميات المتاحة"
          actions={
            <Button onClick={load} isLoading={loading}>
              تحديث
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card>
            <div className="text-xs text-slate-500">عدد الأصناف</div>
            <div className="mt-1 text-2xl font-bold">{items.length}</div>
          </Card>

          <Card>
            <div className="text-xs text-slate-500">إجمالي الكميات</div>
            <div className="mt-1 text-2xl font-bold">{fmtQty(totalQty)}</div>
          </Card>

          <Card>
            <div className="text-xs text-slate-500">أصناف منخفضة</div>
            <div className="mt-1 text-2xl font-bold text-red-600">
              {lowStockCount}
            </div>
          </Card>
        </div>

        <Card>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-slate-500">بحث</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="trex-input w-full px-3 py-2 text-sm"
                placeholder="ابحث باسم القطعة أو رقمها أو البراند"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-500">المخزن</div>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="trex-input w-full px-3 py-2 text-sm"
              >
                <option value="">كل المخازن</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.location ? ` - ${w.location}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={load} isLoading={loading}>
                تطبيق
              </Button>

              <Button
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setWarehouseId("");
                  setTimeout(load, 0);
                }}
              >
                مسح
              </Button>
            </div>
          </div>
        </Card>

        {error ? (
          <Card>
            <div className="text-sm text-red-600">{error}</div>
          </Card>
        ) : null}

        <DataTable<StockItem>
          title="محتويات المخازن"
          columns={columns}
          rows={items}
          loading={loading}
          emptyTitle="لا يوجد رصيد مطابق"
          emptyHint="جرّب تغيير البحث أو المخزن"
        />
      </div>
    </div>
  );
}