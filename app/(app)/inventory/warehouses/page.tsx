"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { DataTable } from "@/src/components/ui/DataTable";
import { apiGet, apiPost, apiPatch } from "@/src/lib/api";

type Warehouse = {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean;
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await apiGet("/inventory/warehouses");
      setWarehouses(res?.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleAdd() {
    setEditingId(null);
    setName("");
    setLocation("");
    setIsActive(true);
    setModalOpen(true);
  }

  function handleEdit(w: Warehouse) {
    setEditingId(w.id);
    setName(w.name);
    setLocation(w.location || "");
    setIsActive(w.is_active);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return alert("يجب إدخال اسم المخزن");

    setSaving(true);
    try {
      if (editingId) {
        await apiPatch(`/inventory/warehouses/${editingId}`, {
          name,
          location: location || null,
          is_active: isActive
        });
      } else {
        await apiPost("/inventory/warehouses", {
          name,
          location: location || null
        });
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "name", label: "اسم المخزن", render: (w: Warehouse) => <span className="font-bold">{w.name}</span> },
    { key: "location", label: "الموقع", render: (w: Warehouse) => w.location || "—" },
    { key: "is_active", label: "الحالة", render: (w: Warehouse) => (
      <span className={`px-2 py-1 rounded text-xs ${w.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
        {w.is_active ? "نشط" : "غير نشط"}
      </span>
    )},
    {
      key: "actions",
      label: "إجراءات",
      render: (w: Warehouse) => (
        <Button variant="ghost" onClick={() => handleEdit(w)}>تعديل</Button>
      )
    }
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader 
        title="إدارة المخازن" 
        subtitle="تعريف فروع المخازن وأماكنها" 
        right={
          <Button variant="primary" onClick={handleAdd}>+ إضافة مخزن جديد</Button>
        }
      />

      <Card>
        <DataTable 
          columns={columns} 
          rows={warehouses} 
          loading={loading}
          emptyTitle="لا توجد مخازن"
          emptyHint="قم بإضافة مخزن جديد لتبدأ العمل."
        />
      </Card>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  {editingId ? "تعديل بيانات المخزن" : "إضافة مخزن جديد"}
                </h2>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold">اسم المخزن</label>
                    <input 
                      type="text" 
                      className="border rounded p-2 focus:ring-2 outline-none" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      disabled={saving} 
                      required 
                      placeholder="مثال: المستودع الرئيسي"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-semibold">الموقع (اختياري)</label>
                    <input 
                      type="text" 
                      className="border rounded p-2 focus:ring-2 outline-none" 
                      value={location} 
                      onChange={e => setLocation(e.target.value)} 
                      disabled={saving} 
                      placeholder="العنوان التفصيلي أو الوصف"
                    />
                  </div>
                  {editingId && (
                    <label className="flex items-center gap-2 mt-4 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isActive} 
                        onChange={e => setIsActive(e.target.checked)} 
                        disabled={saving} 
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-semibold">المخزن نشط (يظهر في القوائم)</span>
                    </label>
                  )}
                </div>
                <div className="mt-6 flex gap-2">
                  <Button type="submit" variant="primary" isLoading={saving}>حفظ المخزن</Button>
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>إلغاء</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
