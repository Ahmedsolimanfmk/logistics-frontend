"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import maintenanceIssuedPartsService, {
  type IssuedPartRow,
} from "@/src/services/maintenance-issued-parts.service";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG");
}

function fmtQty(v: any) {
  const n = Number(v || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

function statusLabel(status: string) {
  const s = String(status || "").toUpperCase();

  if (s === "NOT_INSTALLED") return "غير مركبة";
  if (s === "PARTIAL") return "مركبة جزئيًا";
  if (s === "INSTALLED") return "مركبة بالكامل";

  return status || "—";
}

function statusClass(status: string) {
  const s = String(status || "").toUpperCase();

  if (s === "NOT_INSTALLED") return "text-red-600";
  if (s === "PARTIAL") return "text-amber-700";
  if (s === "INSTALLED") return "text-green-700";

  return "text-slate-700";
}

export default function MaintenanceIssuedPartsPage() {
  const [items, setItems] = useState<IssuedPartRow[]>([]);
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [qtyByKey, setQtyByKey] = useState<Record<string, number>>({});
  const [notesByKey, setNotesByKey] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await maintenanceIssuedPartsService.list({
        status: status === "ALL" ? undefined : status,
      });

      setItems(res.items);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "فشل تحميل القطع المصروفة"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    const term = q.trim().toLowerCase();

    if (!term) return items;

    return items.filter((row) => {
      const partName = row.part?.name || "";
      const partNo = row.part?.part_number || "";
      const brand = row.part?.brand || "";
      const warehouse = row.warehouse?.name || "";
      const vehicle =
        row.vehicle?.fleet_no ||
        row.vehicle?.plate_no ||
        row.vehicle?.display_name ||
        "";
      const wo = row.work_order_id || "";

      return [partName, partNo, brand, warehouse, vehicle, wo]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [items, q]);

  const totals = useMemo(() => {
    return {
      issued: items.reduce((s, x) => s + Number(x.issued_qty || 0), 0),
      installed: items.reduce((s, x) => s + Number(x.installed_qty || 0), 0),
      remaining: items.reduce((s, x) => s + Number(x.remaining_qty || 0), 0),
    };
  }, [items]);

  async function handleInstall(row: IssuedPartRow) {
    const key = `${row.work_order_id}:${row.part_id}`;
    const qty = Number(qtyByKey[key] || row.remaining_qty || 0);

    if (!qty || qty <= 0) return;
    if (qty > Number(row.remaining_qty || 0)) return;

    setActionKey(key);

    try {
      await maintenanceIssuedPartsService.install(row.work_order_id, row.part_id, {
        qty_installed: qty,
        notes: notesByKey[key] || null,
      });

      setQtyByKey((prev) => ({ ...prev, [key]: 0 }));
      setNotesByKey((prev) => ({ ...prev, [key]: "" }));

      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "فشل تركيب القطعة"
      );
    } finally {
      setActionKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900" dir="rtl">
      <div className="space-y-4">
        <PageHeader
          title="القطع المصروفة للصيانة"
          subtitle="متابعة القطع المصروفة والمركبة والمتبقية لكل أمر شغل"
          actions={
            <Button onClick={load} isLoading={loading}>
              تحديث
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card>
            <div className="text-xs text-slate-500">إجمالي المصروف</div>
            <div className="mt-1 text-2xl font-bold">
              {fmtQty(totals.issued)}
            </div>
          </Card>

          <Card>
            <div className="text-xs text-slate-500">إجمالي المركب</div>
            <div className="mt-1 text-2xl font-bold text-green-700">
              {fmtQty(totals.installed)}
            </div>
          </Card>

          <Card>
            <div className="text-xs text-slate-500">المتبقي للتركيب</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">
              {fmtQty(totals.remaining)}
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
                placeholder="بحث باسم القطعة / رقم القطعة / المخزن / أمر الشغل"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-500">الحالة</div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="trex-input w-full px-3 py-2 text-sm"
              >
                <option value="ALL">الكل</option>
                <option value="NOT_INSTALLED">غير مركبة</option>
                <option value="PARTIAL">مركبة جزئيًا</option>
                <option value="INSTALLED">مركبة بالكامل</option>
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
                  setStatus("ALL");
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

        <Card title="دفتر القطع المصروفة">
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="min-w-[1250px] w-full text-sm">
              <thead className="bg-black/[0.03] text-slate-600">
                <tr>
                  <th className="p-3 text-right">أمر الشغل</th>
                  <th className="p-3 text-right">المركبة</th>
                  <th className="p-3 text-right">المخزن</th>
                  <th className="p-3 text-right">القطعة</th>
                  <th className="p-3 text-right">مصروف</th>
                  <th className="p-3 text-right">مركب</th>
                  <th className="p-3 text-right">متبقي</th>
                  <th className="p-3 text-right">تاريخ الصرف</th>
                  <th className="p-3 text-right">آخر تركيب</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">كمية التركيب</th>
                  <th className="p-3 text-right">ملاحظات</th>
                  <th className="p-3 text-right">إجراء</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="p-4 text-slate-500">
                      جاري التحميل...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-4 text-slate-500">
                      لا توجد قطع مصروفة مطابقة.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((row) => {
                    const key = `${row.work_order_id}:${row.part_id}`;
                    const remaining = Number(row.remaining_qty || 0);
                    const inputQty = Number(qtyByKey[key] || remaining || 0);
                    const overQty = inputQty > remaining;
                    const isLoading = actionKey === key;

                    return (
                      <tr key={key} className="border-t border-black/10">
                        <td className="p-3">
                          <Link
                            href={`/maintenance/work-orders/${row.work_order_id}`}
                            className="font-mono text-xs text-blue-700 hover:underline"
                          >
                            {row.work_order_id}
                          </Link>
                        </td>

                        <td className="p-3">
                          <div className="font-medium">
                            {row.vehicle?.fleet_no ||
                              row.vehicle?.plate_no ||
                              row.vehicle?.display_name ||
                              "—"}
                          </div>
                          {row.vehicle?.plate_no ? (
                            <div className="text-xs text-slate-500">
                              {row.vehicle.plate_no}
                            </div>
                          ) : null}
                        </td>

                        <td className="p-3">
                          <div className="font-medium">
                            {row.warehouse?.name || "—"}
                          </div>
                          {row.warehouse?.location ? (
                            <div className="text-xs text-slate-500">
                              {row.warehouse.location}
                            </div>
                          ) : null}
                        </td>

                        <td className="p-3">
                          <div className="font-semibold">
                            {row.part?.name || "—"}
                          </div>
                          <div className="font-mono text-xs text-slate-500">
                            {row.part?.part_number || "—"}
                          </div>
                          {row.part?.brand ? (
                            <div className="text-xs text-slate-500">
                              {row.part.brand}
                            </div>
                          ) : null}
                        </td>

                        <td className="p-3 font-semibold">
                          {fmtQty(row.issued_qty)}
                        </td>

                        <td className="p-3 text-green-700 font-semibold">
                          {fmtQty(row.installed_qty)}
                        </td>

                        <td className="p-3 text-amber-700 font-semibold">
                          {fmtQty(row.remaining_qty)}
                        </td>

                        <td className="p-3">{fmtDate(row.issued_at)}</td>

                        <td className="p-3">
                          {fmtDate(row.last_installed_at)}
                        </td>

                        <td className="p-3">
                          <span className={statusClass(row.status)}>
                            {statusLabel(row.status)}
                          </span>
                        </td>

                        <td className="p-3">
                          <input
                            type="number"
                            min={1}
                            max={remaining}
                            value={qtyByKey[key] ?? remaining}
                            onChange={(e) =>
                              setQtyByKey((prev) => ({
                                ...prev,
                                [key]: Number(e.target.value),
                              }))
                            }
                            disabled={remaining <= 0 || isLoading}
                            className="trex-input w-24 px-3 py-2 text-sm"
                          />

                          {overQty ? (
                            <div className="mt-1 text-xs text-red-600">
                              أكبر من المتبقي
                            </div>
                          ) : null}
                        </td>

                        <td className="p-3">
                          <input
                            value={notesByKey[key] || ""}
                            onChange={(e) =>
                              setNotesByKey((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            disabled={remaining <= 0 || isLoading}
                            className="trex-input w-40 px-3 py-2 text-sm"
                            placeholder="اختياري"
                          />
                        </td>

                        <td className="p-3">
                          <Button
                            type="button"
                            variant="primary"
                            onClick={() => handleInstall(row)}
                            isLoading={isLoading}
                            disabled={
                              isLoading ||
                              remaining <= 0 ||
                              inputQty <= 0 ||
                              overQty
                            }
                          >
                            تركيب
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}