"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { superAdminService } from "@/src/services/super-admin.service";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { DashboardGrid, DashboardStatCard } from "@/src/components/dashboard/DashboardUi";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Button } from "@/src/components/ui/Button";
import { Toast } from "@/src/components/Toast";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { Card } from "@/src/components/ui/Card";

function AddCompanyModal({
  open,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              name,
              code,
              admin_name: adminName,
              admin_email: adminEmail,
              admin_phone: adminPhone,
              admin_password: adminPassword,
            });
          }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-xl font-bold text-slate-800">إضافة شركة جديدة</h2>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                ✕
              </Button>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-800">بيانات الشركة</h3>
              <div className="grid grid-cols-2 gap-4">
                <TrexInput
                  labelText="اسم الشركة"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={saving}
                  required
                />
                <TrexInput
                  labelText="كود الشركة (اختياري)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={saving}
                />
              </div>

              <hr />
              <h3 className="font-semibold text-slate-800">بيانات مدير النظام للشركة (ADMIN)</h3>
              <div className="grid grid-cols-2 gap-4">
                <TrexInput
                  labelText="اسم المدير"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  disabled={saving}
                  required
                />
                <TrexInput
                  labelText="رقم الهاتف"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  disabled={saving}
                  required
                />
                <TrexInput
                  labelText="البريد الإلكتروني"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={saving}
                  required
                  dir="ltr"
                  className="text-left"
                />
                <TrexInput
                  labelText="كلمة المرور"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={saving}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <Button type="submit" variant="primary" isLoading={saving}>
                إنشاء الشركة
              </Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
                إلغاء
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}



function shortId(value: unknown): string {
  const s = String(value ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

export function SuperAdminDashboard() {
  const t = useT();
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);

  const [stats, setStats] = useState<any>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, msg: "", type: "success" as "success" | "error" });

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, compsRes] = await Promise.all([
        superAdminService.getSystemStats(),
        superAdminService.getCompanies()
      ]);
      setStats(statsRes);
      setCompanies(compsRes.items || []);
    } catch (err: any) {
      setToast({ open: true, msg: err.message || "Failed to load", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleImpersonate = async (companyId: string) => {
    try {
      const res = await superAdminService.impersonateCompany(companyId);
      // set auth and reload the app
      setAuth(res.token, res.user);
      window.location.href = "/dashboard";
    } catch (error: any) {
      setToast({ open: true, msg: error.message || "Impersonation failed", type: "error" });
    }
  };

  const handleToggleStatus = async (companyId: string) => {
    if (!confirm("Are you sure you want to toggle the status of this company?")) return;
    try {
      await superAdminService.toggleCompanyStatus(companyId);
      setToast({ open: true, msg: "Company status updated", type: "success" });
      load();
    } catch (error: any) {
      setToast({ open: true, msg: error.message || "Failed to toggle status", type: "error" });
    }
  };

  const handleAddCompany = async (payload: any) => {
    setSaving(true);
    try {
      await superAdminService.addCompany(payload);
      setToast({ open: true, msg: "تم إنشاء الشركة بنجاح", type: "success" });
      setAddModalOpen(false);
      load();
    } catch (error: any) {
      setToast({ open: true, msg: error.message || "فشل إنشاء الشركة", type: "error" });
    } finally {
      setSaving(false);
    }
  };



  const columns: DataTableColumn<any>[] = [
    {
      key: "actions",
      label: "إجراءات",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => handleImpersonate(row.id)}>
            دخول كمدير
          </Button>
          <Button variant="secondary" onClick={() => handleToggleStatus(row.id)}>
            {row.is_active ? "تجميد" : "تفعيل"}
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/companies/${row.id}`)}>
            إدارة الشركة
          </Button>
        </div>
      )
    },
    {
      key: "name",
      label: "الشركة",
      render: (row) => (
        <div>
          <div className="font-semibold">{row.name}</div>
          <div className="text-xs text-gray-500">{row.code}</div>
        </div>
      )
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) => (
        <span className={`px-2 py-1 text-xs rounded-full ${row.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {row.is_active ? "نشط" : "مجمد"}
        </span>
      )
    },
    {
      key: "users",
      label: "المستخدمين",
      render: (row) => row._count?.memberships || 0
    },
    {
      key: "subscription",
      label: "الباقة الحالية",
      render: (row) => {
        const sub = row.subscriptions?.[0];
        if (!sub) return <span className="text-gray-400">لا يوجد اشتراك نشط</span>;
        return (
          <div>
            <div className="font-semibold text-sm">{sub.plan_code}</div>
            <div className="text-xs text-gray-500">القيمة: {sub.amount}</div>
          </div>
        );
      }
    },
    {
      key: "features",
      label: "المميزات",
      render: (row) => {
        const f = row.features;
        if (!f) return "—";
        const list = [];
        if (f.fleet_enabled) list.push("أسطول");
        if (f.inventory_enabled) list.push("مخزون");
        if (f.custody_enabled) list.push("عُهد");
        return list.join(" ، ");
      }
    }
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="لوحة تحكم مالك النظام (SaaS Admin)"
        subtitle="إدارة الشركات والمشتركين والاشتراكات والنظام المالي للمنصة"
        actions={
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => {
              setAuth(null, null);
              window.location.href = "/login";
            }}>
              تسجيل الخروج
            </Button>
            <Button variant="primary" onClick={() => setAddModalOpen(true)} isLoading={loading}>
              إضافة شركة جديدة
            </Button>
          </div>
        }
      />

      {stats && (
        <DashboardGrid cols={4}>
          <DashboardStatCard
            label="إجمالي الشركات"
            value={stats.total_companies}
            tone="neutral"
          />
          <DashboardStatCard
            label="الشركات النشطة"
            value={stats.active_companies}
            tone="success"
          />
          <DashboardStatCard
            label="إجمالي المستخدمين"
            value={stats.total_users}
            tone="info"
          />
          <DashboardStatCard
            label="إجمالي الإيرادات (MRR)"
            value={`${stats.total_mrr} EGP`}
            tone="warn"
          />
        </DashboardGrid>
      )}

      <DataTable
        title="الشركات والمشتركين"
        columns={columns}
        rows={companies}
        loading={loading}
        emptyTitle="لا يوجد شركات"
      />

      <Toast
        open={toast.open}
        message={toast.msg}
        type={toast.type}
        dir="rtl"
        onClose={() => setToast({ ...toast, open: false })}
      />

      <AddCompanyModal
        open={addModalOpen}
        saving={saving}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddCompany}
      />
    </div>
  );
}
