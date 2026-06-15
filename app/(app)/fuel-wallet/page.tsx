"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/ui/DataTable";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { fuelService, FuelWalletRecharge } from "@/src/services/fuel.service";
import { api } from "@/src/lib/api";

export default function FuelWalletPage() {
  const [balance, setBalance] = useState(0);
  const [recharges, setRecharges] = useState<FuelWalletRecharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ amount: "", payment_method: "BANK_TRANSFER", reference: "", notes: "" });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch balance from me/company or create an endpoint. 
      // For now we assume company profile has the balance.
      const meRes = await api.get("/companies/me");
      setBalance(meRes.data?.fuel_wallet_balance || 0);

      const data = await fuelService.listCompanyRecharges();
      setRecharges(data);
    } catch (e: any) {
      alert("Error loading wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!formData.amount) return alert("المبلغ مطلوب");
    try {
      await fuelService.requestRecharge({
        amount: Number(formData.amount),
        payment_method: formData.payment_method,
        reference: formData.reference,
        notes: formData.notes
      });
      setIsModalOpen(false);
      setFormData({ amount: "", payment_method: "BANK_TRANSFER", reference: "", notes: "" });
      fetchData();
    } catch (e: any) {
      alert("Error requesting recharge");
    }
  };

  const columns = [
    { key: "amount", label: "المبلغ", render: (r: any) => <strong className="text-emerald-600">{r.amount} ج.م</strong> },
    { key: "payment_method", label: "طريقة الدفع" },
    { key: "reference", label: "رقم المرجع" },
    { 
      key: "status", 
      label: "الحالة",
      render: (r: any) => {
        if (r.status === 'PENDING') return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">قيد المراجعة</span>;
        if (r.status === 'APPROVED') return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-sm">مقبول</span>;
        if (r.status === 'REJECTED') return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">مرفوض</span>;
        return r.status;
      }
    },
    { key: "created_at", label: "التاريخ", render: (r: any) => new Date(r.created_at).toLocaleString('ar-EG') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="محفظة الوقود"
        subtitle="إدارة رصيد الشركة لخدمات تموين الوقود الذكي"
        actions={
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>+ شحن المحفظة</Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-emerald-100 mb-2">الرصيد المتاح</h3>
            <div className="text-4xl font-bold">{balance.toLocaleString()} <span className="text-lg font-normal">ج.م</span></div>
          </div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white opacity-10 rounded-full"></div>
          <div className="absolute top-4 -right-4 w-16 h-16 bg-white opacity-10 rounded-full"></div>
        </Card>
      </div>

      <Card>
        <h3 className="p-4 font-bold border-b border-gray-100">سجل طلبات الشحن</h3>
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : (
          <DataTable columns={columns} rows={recharges} />
        )}
      </Card>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="طلب شحن محفظة">
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-bold">المبلغ المطلوب شحنه</label>
            <input 
              type="number" 
              className="w-full border p-2 rounded" 
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block mb-1 font-bold">طريقة الدفع</label>
            <select 
              className="w-full border p-2 rounded" 
              value={formData.payment_method}
              onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
            >
              <option value="BANK_TRANSFER">حوالة بنكية</option>
              <option value="CASH">كاش في المقر</option>
              <option value="CHECK">شيك بنكي</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-bold">رقم المرجع (الإيصال/الحوالة)</label>
            <input 
              type="text" 
              className="w-full border p-2 rounded" 
              value={formData.reference}
              onChange={e => setFormData({ ...formData, reference: e.target.value })}
            />
          </div>
          <div>
            <label className="block mb-1 font-bold">ملاحظات</label>
            <textarea 
              className="w-full border p-2 rounded" 
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            ></textarea>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>إلغاء</Button>
            <Button variant="primary" onClick={handleSave}>تقديم الطلب</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
