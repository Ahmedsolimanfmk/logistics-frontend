"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { fetchJSON } from "@/src/lib/fetcher";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";

export default function AdminPage() {
  const router = useRouter();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const setAuth = useAuth((s) => s.setAuth);

  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
  });

  // =====================
  // حماية الصفحة + تحميل البيانات
  // =====================
  useEffect(() => {
    if (!token || !user) return;

    if (user.platform_role !== "SUPER_ADMIN") {
      router.push("/dashboard");
      return;
    }

    load();
  }, [token, user]);

  // =====================
  // Load data
  // =====================
  async function load() {
    if (!token) return;

    try {
      setLoading(true);

      const data = await fetchJSON("/admin/companies", token);

      const items = data.items || [];

      setCompanies(items);
      setSummary({
        total: data.total || 0,
        active: items.filter((c: any) => c.is_active).length,
      });
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }

  // =====================
  // Toggle company
  // =====================
  async function toggleCompany(id: string) {
    if (!token) return;

    try {
      await fetchJSON(`/admin/companies/${id}/toggle-status`, token, {
        method: "PATCH",
      });

      load();
    } catch (e) {
      console.error("Toggle error:", e);
    }
  }

  // =====================
  // Login as company (IMPERSIONATION)
  // =====================
  async function loginAsCompany(companyId: string) {
    if (!token || !user) return;

    try {
      const res = await fetchJSON("/auth/switch-company", token, {
        method: "POST",
        body: JSON.stringify({ company_id: companyId }),
      });

      // ✅ إصلاح TypeScript + user mapping
      setAuth(res.token, {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        platform_role: user.platform_role,
        company_id: res.company_id,
        company_name: res.company_name,
      });

      router.push("/dashboard");
    } catch (e) {
      console.error("Switch error:", e);
    }
  }

  // =====================
  // Loading
  // =====================
  if (!token || !user || loading) {
    return <div className="p-6">Loading...</div>;
  }

  // =====================
  // UI
  // =====================
  return (
    <div className="p-6 space-y-6" dir="rtl">
      <PageHeader 
        title="لوحة تحكم مدير النظام (Super Admin)" 
        subtitle="إدارة الشركات والاشتراكات"
        actions={
          <Button variant="danger" onClick={() => {
            logout();
          }}>
            تسجيل الخروج
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="إجمالي الشركات" value={summary.total} />
        <Card title="الشركات النشطة" value={summary.active} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-bold mb-4">الشركات</h2>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-right border-b">
              <th className="py-2">الاسم</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>

          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{c.name}</td>

                <td>
                  {c.is_active ? (
                    <span className="text-green-600 font-medium">نشطة</span>
                  ) : (
                    <span className="text-red-600 font-medium">متوقفة</span>
                  )}
                </td>

                <td className="space-x-2 space-x-reverse">
                  <button
                    onClick={() => router.push(`/admin/companies/${c.id}`)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 ml-2"
                  >
                    إدارة
                  </button>

                  <button
                    onClick={() => toggleCompany(c.id)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 ml-2"
                  >
                    تبديل الحالة
                  </button>

                  <button
                    onClick={() => loginAsCompany(c.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    دخول كشركة
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {companies.length === 0 && (
          <div className="text-center text-gray-500 py-6">
            لا توجد شركات
          </div>
        )}
      </div>
    </div>
  );
}

// =====================
// Card Component
// =====================
function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white p-4 rounded-2xl shadow">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}