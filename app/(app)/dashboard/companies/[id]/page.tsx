"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { superAdminService } from "@/src/services/super-admin.service";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { DashboardGrid, DashboardStatCard } from "@/src/components/dashboard/DashboardUi";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { useAuth } from "@/src/store/auth";

export default function CompanyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [company, setCompany] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [compRes, statsRes, paymentsRes] = await Promise.all([
        superAdminService.getCompanyById(id as string),
        superAdminService.getCompanyStats(id as string),
        superAdminService.getCompanyPayments(id as string)
      ]);
      setCompany(compRes);
      setStats(statsRes);
      setPayments(paymentsRes);
    } catch (err) {
      console.error(err);
      alert("Failed to load company details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const handleImpersonate = async () => {
    try {
      const res = await superAdminService.impersonateCompany(id as string);
      setAuth(res.token, res.user);
      window.location.href = "/dashboard";
    } catch (error: any) {
      alert(error.message || "Impersonation failed");
    }
  };

  if (loading) return <div className="p-8">جاري التحميل...</div>;
  if (!company) return <div className="p-8">الشركة غير موجودة</div>;

  const sub = company.subscriptions?.[0];
  const f = company.features;

  const usersColumns: DataTableColumn<any>[] = [
    { key: "full_name", label: "الاسم", render: (r) => <div className="font-semibold">{r.full_name}</div> },
    { key: "email", label: "البريد الإلكتروني" },
    { key: "company_role", label: "الدور", render: (r) => <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs">{r.company_role}</span> },
    { key: "is_active", label: "الحالة", render: (r) => r.is_active ? "نشط" : "مجمد" }
  ];

  const paymentsColumns: DataTableColumn<any>[] = [
    { key: "invoice_number", label: "رقم الفاتورة", render: (r) => <span className="font-bold">{r.invoice_number}</span> },
    { key: "payment_date", label: "تاريخ الدفع", render: (r) => new Date(r.payment_date).toLocaleDateString() },
    { key: "amount", label: "المبلغ", render: (r) => <span className="text-green-700 font-bold">{r.amount} {r.currency}</span> },
    { key: "payment_method", label: "طريقة الدفع", render: (r) => <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{r.payment_method}</span> },
    { key: "reference_number", label: "الرقم المرجعي", render: (r) => r.reference_number || "-" },
    {
      key: "actions", label: "إجراءات", render: (r) => (
        <Button variant="secondary" onClick={() => window.open(`http://localhost:8080/admin/companies/${company.id}/payments/${r.id}/invoice`, "_blank")}>
          طباعة الفاتورة
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center gap-4 border-b border-black/5 pb-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard")}>← عودة</Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-800">{company.name}</h1>
          <p className="text-slate-500">كود الشركة: {company.code}</p>
        </div>
        <Button variant="primary" onClick={handleImpersonate}>
          دخول كمدير للشركة
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <DashboardStatCard label="إجمالي الرحلات" value={stats?.trips || 0} icon="🚚" tone="info" />
        <DashboardStatCard label="إجمالي المركبات" value={stats?.vehicles || 0} icon="🚜" tone="warn" />
        <DashboardStatCard label="إجمالي السائقين" value={stats?.drivers || 0} icon="👷" tone="success" />
        <DashboardStatCard label="إجمالي الإيرادات" value={`${stats?.revenue || 0} ر.س`} icon="💰" tone="success" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Features */}
        <Card title="المميزات المفعلة" actions={<Button variant="secondary" onClick={() => setFeaturesOpen(true)}>تعديل المميزات</Button>}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>نظام الأسطول</span>
              <span className={f?.fleet_enabled ? "text-green-600 font-bold" : "text-gray-400"}>{f?.fleet_enabled ? "مفعل" : "معطل"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>نظام المخزون</span>
              <span className={f?.inventory_enabled ? "text-green-600 font-bold" : "text-gray-400"}>{f?.inventory_enabled ? "مفعل" : "معطل"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>نظام العُهد</span>
              <span className={f?.custody_enabled ? "text-green-600 font-bold" : "text-gray-400"}>{f?.custody_enabled ? "مفعل" : "معطل"}</span>
            </div>
          </div>
        </Card>

        {/* Subscription */}
        <Card title="بيانات الاشتراك" actions={<Button variant="secondary" onClick={() => setSubOpen(true)}>إدارة الاشتراك</Button>}>
          {sub ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>الباقة</span>
                <span className="font-bold">{sub.plan_code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>القيمة (MRR)</span>
                <span>{sub.amount} {sub.currency || "EGP"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>حد المستخدمين</span>
                <span>{sub.max_users || "غير محدود"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>حد المركبات</span>
                <span>{sub.max_vehicles || "غير محدود"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>تاريخ البدء</span>
                <span>{sub.starts_at ? new Date(sub.starts_at).toLocaleDateString() : "-"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>تاريخ الانتهاء</span>
                <span>{sub.ends_at ? new Date(sub.ends_at).toLocaleDateString() : "مفتوح"}</span>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 py-4 text-center">لا يوجد اشتراك نشط</div>
          )}
        </Card>
      </div>

      <Card title={`مستخدمين الشركة (${company.memberships?.length || 0})`}>
        <DataTable columns={usersColumns} rows={company.memberships || []} />
      </Card>

      <Card title="سجل المدفوعات" actions={<Button variant="primary" onClick={() => setPaymentOpen(true)}>تسجيل دفعة جديدة</Button>}>
        {payments.length > 0 ? (
          <DataTable columns={paymentsColumns} rows={payments} />
        ) : (
          <div className="text-gray-500 text-center py-6">لا يوجد أي مدفوعات مسجلة حتى الآن</div>
        )}
      </Card>

      {featuresOpen && (
        <EditFeaturesModal
          open={featuresOpen}
          company={company}
          saving={saving}
          onClose={() => setFeaturesOpen(false)}
          onSubmit={async (id, payload) => {
            setSaving(true);
            try {
              await superAdminService.updateFeatures(id, payload);
              await loadData();
              setFeaturesOpen(false);
            } catch(e) { alert("Error"); }
            finally { setSaving(false); }
          }}
        />
      )}

      {subOpen && (
        <EditSubscriptionModal
          open={subOpen}
          company={company}
          saving={saving}
          onClose={() => setSubOpen(false)}
          onSubmit={async (id, payload) => {
            setSaving(true);
            try {
              await superAdminService.updateSubscription(id, payload);
              await loadData();
              setSubOpen(false);
            } catch(e) { alert("Error"); }
            finally { setSaving(false); }
          }}
        />
      )}

      {paymentOpen && (
        <AddPaymentModal
          open={paymentOpen}
          company={company}
          saving={saving}
          onClose={() => setPaymentOpen(false)}
          onSubmit={async (id, payload) => {
            setSaving(true);
            try {
              await superAdminService.addCompanyPayment(id, payload);
              await loadData();
              setPaymentOpen(false);
            } catch(e) { alert("Error"); }
            finally { setSaving(false); }
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// Inline Modals (can be moved to shared later)
// ==========================================

function EditFeaturesModal({ open, company, saving, onClose, onSubmit }: any) {
  const [fleet, setFleet] = useState(false);
  const [inventory, setInventory] = useState(false);
  const [custody, setCustody] = useState(false);

  useEffect(() => {
    if (open && company) {
      const f = company.features || {};
      setFleet(!!f.fleet_enabled);
      setInventory(!!f.inventory_enabled);
      setCustody(!!f.custody_enabled);
    }
  }, [open, company]);

  if (!open || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(company.id, { fleet_enabled: fleet, inventory_enabled: inventory, custody_enabled: custody }); }}>
          <div className="p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-xl font-bold text-slate-800">تعديل مميزات: {company.name}</h2>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>✕</Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-slate-800 font-bold">نظام الأسطول (Fleet)</span>
                {fleet ? (
                  <Button type="button" variant="secondary" className="text-red-600 hover:text-red-700" onClick={() => setFleet(false)}>حذف الميزة</Button>
                ) : (
                  <Button type="button" variant="primary" onClick={() => setFleet(true)}>إضافة الميزة</Button>
                )}
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-slate-800 font-bold">نظام المخزون (Inventory)</span>
                {inventory ? (
                  <Button type="button" variant="secondary" className="text-red-600 hover:text-red-700" onClick={() => setInventory(false)}>حذف الميزة</Button>
                ) : (
                  <Button type="button" variant="primary" onClick={() => setInventory(true)}>إضافة الميزة</Button>
                )}
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-slate-800 font-bold">نظام العُهد (Custody)</span>
                {custody ? (
                  <Button type="button" variant="secondary" className="text-red-600 hover:text-red-700" onClick={() => setCustody(false)}>حذف الميزة</Button>
                ) : (
                  <Button type="button" variant="primary" onClick={() => setCustody(true)}>إضافة الميزة</Button>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button type="submit" variant="primary" isLoading={saving}>حفظ المميزات</Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>إلغاء</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditSubscriptionModal({ open, company, saving, onClose, onSubmit }: any) {
  const [planCode, setPlanCode] = useState("DEFAULT");
  const [amount, setAmount] = useState(0);
  const [maxUsers, setMaxUsers] = useState("");
  const [maxVehicles, setMaxVehicles] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    if (open && company) {
      const sub = company.subscriptions?.[0] || {};
      setPlanCode(sub.plan_code || "DEFAULT");
      setAmount(sub.amount || 0);
      setMaxUsers(sub.max_users || "");
      setMaxVehicles(sub.max_vehicles || "");
      setStartsAt(sub.starts_at ? new Date(sub.starts_at).toISOString().slice(0, 10) : "");
      setEndsAt(sub.ends_at ? new Date(sub.ends_at).toISOString().slice(0, 10) : "");
    }
  }, [open, company]);

  if (!open || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={(e) => {
            e.preventDefault();
            onSubmit(company.id, {
              plan_code: planCode,
              amount: Number(amount),
              max_users: maxUsers ? Number(maxUsers) : null,
              max_vehicles: maxVehicles ? Number(maxVehicles) : null,
              starts_at: startsAt || null,
              ends_at: endsAt || null
            });
          }}>
          <div className="p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-xl font-bold text-slate-800">إدارة اشتراك: {company.name}</h2>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>✕</Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">الباقة (Plan Code)</label>
                  <input className="border rounded p-2" value={planCode} onChange={(e) => setPlanCode(e.target.value)} disabled={saving} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">القيمة (MRR/Amount)</label>
                  <input className="border rounded p-2" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} disabled={saving} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">أقصى عدد مستخدمين (اختياري)</label>
                  <input className="border rounded p-2" type="number" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} disabled={saving} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">أقصى عدد مركبات (اختياري)</label>
                  <input className="border rounded p-2" type="number" value={maxVehicles} onChange={(e) => setMaxVehicles(e.target.value)} disabled={saving} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">تاريخ البدء</label>
                  <input className="border rounded p-2" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} disabled={saving} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">تاريخ الانتهاء</label>
                  <input className="border rounded p-2" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={saving} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button type="submit" variant="primary" isLoading={saving}>حفظ الاشتراك</Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>إلغاء</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddPaymentModal({ open, company, saving, onClose, onSubmit }: any) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  if (!open || !company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={(e) => {
            e.preventDefault();
            onSubmit(company.id, {
              amount: Number(amount),
              currency,
              payment_date: paymentDate,
              payment_method: paymentMethod,
              reference_number: referenceNumber,
              notes
            });
          }}>
          <div className="p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-xl font-bold text-slate-800">تسجيل دفعة جديدة: {company.name}</h2>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>✕</Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">المبلغ</label>
                  <input className="border rounded p-2" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={saving} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">العملة</label>
                  <input className="border rounded p-2" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={saving} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">تاريخ الدفع</label>
                  <input className="border rounded p-2" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} disabled={saving} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold">طريقة الدفع</label>
                  <select className="border rounded p-2" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={saving}>
                    <option value="CASH">كاش (نقدي)</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CREDIT_CARD">بطاقة ائتمانية</option>
                    <option value="CHEQUE">شيك</option>
                  </select>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-semibold">الرقم المرجعي / رقم الإيصال</label>
                  <input className="border rounded p-2" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} disabled={saving} />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-sm font-semibold">ملاحظات إضافية</label>
                  <textarea className="border rounded p-2 h-20" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving}></textarea>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button type="submit" variant="primary" isLoading={saving}>تأكيد التسجيل وإصدار فاتورة</Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>إلغاء</Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
