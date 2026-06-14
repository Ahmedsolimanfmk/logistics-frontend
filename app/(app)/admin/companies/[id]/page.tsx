"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { DataTable } from "@/src/components/ui/DataTable";
import { superAdminService } from "@/src/services/super-admin.service";
import { Modal } from "@/src/components/ui/Modal";

export default function AdminCompanyPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"FEATURES" | "SUBSCRIPTION" | "PAYMENTS">("FEATURES");

  // Subscriptions & Payments state
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ amount: "", payment_method: "CASH", notes: "" });

  const [features, setFeatures] = useState({
    fleet_enabled: false,
    inventory_enabled: false,
    custody_enabled: false
  });

  const [subscription, setSubscription] = useState({
    plan_code: "BASIC",
    status: "ACTIVE",
    ends_at: ""
  });

  const loadCompany = async () => {
    try {
      setLoading(true);
      const res = await superAdminService.getCompanyById(id);
      setCompany(res);
      
      if (res.features) {
        setFeatures({
          fleet_enabled: res.features.fleet_enabled,
          inventory_enabled: res.features.inventory_enabled,
          custody_enabled: res.features.custody_enabled
        });
      }

      if (res.subscriptions?.length > 0) {
        const sub = res.subscriptions[0];
        setSubscription({
          plan_code: sub.plan_code,
          status: sub.status,
          ends_at: sub.ends_at ? sub.ends_at.split("T")[0] : ""
        });
      }

      loadPayments();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const res = await superAdminService.getCompanyPayments(id);
      setPayments(res.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (id) loadCompany();
  }, [id]);

  const saveFeatures = async () => {
    try {
      await superAdminService.updateFeatures(id, features);
      alert("تم تحديث المميزات بنجاح");
    } catch (e) {
      console.error(e);
      alert("خطأ أثناء تحديث المميزات");
    }
  };

  const saveSubscription = async () => {
    try {
      await superAdminService.updateSubscription(id, subscription);
      alert("تم تحديث الاشتراك بنجاح");
    } catch (e) {
      console.error(e);
      alert("خطأ أثناء تحديث الاشتراك");
    }
  };

  const submitPayment = async () => {
    try {
      await superAdminService.addCompanyPayment(id, {
        amount: Number(newPayment.amount),
        payment_method: newPayment.payment_method,
        notes: newPayment.notes
      });
      alert("تم تسجيل الدفعة وإصدار الفاتورة");
      setPaymentModalOpen(false);
      setNewPayment({ amount: "", payment_method: "CASH", notes: "" });
      loadPayments();
    } catch (e) {
      console.error(e);
      alert("خطأ في تسجيل الدفعة");
    }
  };

  const downloadInvoice = async (paymentId: string) => {
    // Navigate or fetch the text invoice directly
    // Using a direct link to the backend or fetch and download blob
    try {
      const token = localStorage.getItem("auth-storage") ? JSON.parse(localStorage.getItem("auth-storage") as string).state.token : "";
      const res = await fetch(`/api/admin/companies/${id}/payments/${paymentId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to download invoice");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice_${paymentId}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      alert("فشل تحميل الفاتورة");
    }
  };

  if (loading) return <div className="p-6">جاري التحميل...</div>;
  if (!company) return <div className="p-6">الشركة غير موجودة</div>;

  const paymentColumns = [
    { key: "invoice_number", label: "رقم الفاتورة" },
    { key: "amount", label: "المبلغ", render: (r: any) => `${r.amount} ${r.currency}` },
    { key: "payment_date", label: "تاريخ الدفع", render: (r: any) => new Date(r.payment_date).toLocaleDateString() },
    { key: "payment_method", label: "طريقة الدفع" },
    { 
      key: "actions", 
      label: "إجراءات", 
      render: (r: any) => (
        <Button variant="secondary" onClick={() => downloadInvoice(r.id)}>
          تحميل الفاتورة
        </Button>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="secondary" onClick={() => router.push("/admin")}>&larr; رجوع</Button>
        <PageHeader title={`إدارة شركة: ${company.name}`} subtitle={`كود: ${company.code}`} />
      </div>

      <div className="flex gap-4 border-b">
        <button 
          className={`py-2 px-4 ${tab === "FEATURES" ? "border-b-2 border-indigo-600 text-indigo-600 font-bold" : ""}`}
          onClick={() => setTab("FEATURES")}
        >
          المميزات
        </button>
        <button 
          className={`py-2 px-4 ${tab === "SUBSCRIPTION" ? "border-b-2 border-indigo-600 text-indigo-600 font-bold" : ""}`}
          onClick={() => setTab("SUBSCRIPTION")}
        >
          الاشتراك
        </button>
        <button 
          className={`py-2 px-4 ${tab === "PAYMENTS" ? "border-b-2 border-indigo-600 text-indigo-600 font-bold" : ""}`}
          onClick={() => setTab("PAYMENTS")}
        >
          المدفوعات والفواتير
        </button>
      </div>

      {tab === "FEATURES" && (
        <Card>
          <div className="space-y-4 max-w-sm">
            <h3 className="font-bold text-lg mb-4">التحكم في أقسام النظام</h3>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={features.fleet_enabled} onChange={e => setFeatures({...features, fleet_enabled: e.target.checked})} className="w-5 h-5" />
              <span>نظام إدارة الأسطول (Fleet)</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={features.inventory_enabled} onChange={e => setFeatures({...features, inventory_enabled: e.target.checked})} className="w-5 h-5" />
              <span>نظام إدارة المخازن (Inventory)</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={features.custody_enabled} onChange={e => setFeatures({...features, custody_enabled: e.target.checked})} className="w-5 h-5" />
              <span>نظام إدارة العهد (Custody)</span>
            </label>

            <Button onClick={saveFeatures} variant="primary" className="mt-4 w-full">حفظ المميزات</Button>
          </div>
        </Card>
      )}

      {tab === "SUBSCRIPTION" && (
        <Card>
          <div className="space-y-4 max-w-sm">
            <h3 className="font-bold text-lg mb-4">بيانات الاشتراك</h3>

            <div>
              <label className="block mb-1 font-bold">خطة الاشتراك</label>
              <select value={subscription.plan_code} onChange={e => setSubscription({...subscription, plan_code: e.target.value})} className="w-full border p-2 rounded">
                <option value="BASIC">أساسي (Basic)</option>
                <option value="PRO">احترافي (Pro)</option>
                <option value="ENTERPRISE">مؤسسات (Enterprise)</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-bold">الحالة</label>
              <select value={subscription.status} onChange={e => setSubscription({...subscription, status: e.target.value})} className="w-full border p-2 rounded">
                <option value="ACTIVE">نشط</option>
                <option value="EXPIRED">منتهي</option>
                <option value="CANCELED">ملغي</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 font-bold">تاريخ الانتهاء</label>
              <input type="date" value={subscription.ends_at} onChange={e => setSubscription({...subscription, ends_at: e.target.value})} className="w-full border p-2 rounded" />
            </div>

            <Button onClick={saveSubscription} variant="primary" className="mt-4 w-full">حفظ التعديلات</Button>
          </div>
        </Card>
      )}

      {tab === "PAYMENTS" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">سجل المدفوعات</h3>
            <Button onClick={() => setPaymentModalOpen(true)} variant="primary">+ تسجيل دفعة جديدة</Button>
          </div>

          <Card>
            <DataTable columns={paymentColumns} data={payments} />
          </Card>
        </div>
      )}

      {paymentModalOpen && (
        <Modal title="تسجيل دفعة وإصدار فاتورة" onClose={() => setPaymentModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-bold">المبلغ</label>
              <input type="number" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} className="w-full border p-2 rounded" />
            </div>
            <div>
              <label className="block mb-1 font-bold">طريقة الدفع</label>
              <select value={newPayment.payment_method} onChange={e => setNewPayment({...newPayment, payment_method: e.target.value})} className="w-full border p-2 rounded">
                <option value="CASH">كاش</option>
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="CREDIT_CARD">بطاقة ائتمان</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-bold">ملاحظات الفاتورة</label>
              <textarea value={newPayment.notes} onChange={e => setNewPayment({...newPayment, notes: e.target.value})} className="w-full border p-2 rounded" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>إلغاء</Button>
              <Button variant="primary" onClick={submitPayment}>تسجيل وإصدار فاتورة</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
