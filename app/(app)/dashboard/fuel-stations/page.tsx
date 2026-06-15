"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/ui/DataTable";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { fuelService, FuelStation } from "@/src/services/fuel.service";

export default function FuelStationsPage() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", contact_number: "" });

  const fetchStations = async () => {
    try {
      setLoading(true);
      const data = await fuelService.listStations();
      setStations(data);
    } catch (e: any) {
      alert("Error loading stations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  const handleSave = async () => {
    if (!formData.name) return alert("الاسم مطلوب");
    try {
      await fuelService.createStation(formData);
      setIsModalOpen(false);
      setFormData({ name: "", code: "", contact_number: "" });
      fetchStations();
    } catch (e: any) {
      alert("Error creating station");
    }
  };

  const columns = [
    { key: "name", label: "اسم المحطة" },
    { key: "code", label: "الكود" },
    { key: "contact_number", label: "رقم التواصل" },
    {
      key: "balance",
      label: "رصيد المحطة (مستحقات)",
      render: (r: FuelStation) => <strong className="text-emerald-600">{r.balance} ج.م</strong>
    },
    {
      key: "is_active",
      label: "الحالة",
      render: (r: FuelStation) => r.is_active ? <span className="text-emerald-500">نشط</span> : <span className="text-red-500">غير نشط</span>
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="محطات الوقود المتعاقدة"
        subtitle="إدارة شركاء تقديم خدمة الوقود ومتابعة مستحقاتهم"
        actions={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>+ إضافة محطة</Button>
        }
      />

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : (
          <DataTable columns={columns} rows={stations} />
        )}
      </Card>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="إضافة محطة وقود جديدة">
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-bold">اسم المحطة</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block mb-1 font-bold">كود المحطة (اختياري)</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
            />
          </div>
          <div>
            <label className="block mb-1 font-bold">رقم التواصل</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.contact_number}
              onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>حفظ وإضافة</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
