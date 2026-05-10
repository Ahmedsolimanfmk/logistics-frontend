"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";

import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { EmptyState } from "@/src/components/ui/EmptyState";
import { PageHeader } from "@/src/components/ui/PageHeader";

export default function SelectCompanyPage() {
  const router = useRouter();
  const { setAuth, user } = useAuth();

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      const res = await apiAuthGet("/auth/my-companies");
      setCompanies(res?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function selectCompany(company: any) {
    try {
      setActiveId(company.id);

      const res: any = await apiAuthPost("/auth/switch-company", {
        company_id: company.id,
      });

      if (!user) return;

      setAuth(res.token, {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        platform_role: user.platform_role,
        company_id: company.id,
        company_name: company.name,
      });

      router.replace("/dashboard");
    } catch (e) {
      console.error(e);
      setActiveId(null);
    }
  }

  // 🔄 Loading
  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="اختيار الشركة"
          subtitle="جارى تحميل الشركات..."
        />
      </div>
    );
  }

  // ❌ Empty
  if (!companies.length) {
    return (
      <div className="p-6">
        <EmptyState
          title="لا توجد شركات"
          hint="لا يوجد شركات مرتبطة بهذا الحساب"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      <PageHeader
        title="اختيار الشركة"
        subtitle="اختر الشركة التي تريد العمل عليها"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {companies.map((c) => {
          const isActive = activeId === c.id;

          return (
            <div key={c.id} onClick={() => !activeId && selectCompany(c)}>
              <Card
                className="p-4 cursor-pointer hover:shadow-md transition"
                right={
                  <Button
                    disabled={!!activeId}
                    isLoading={isActive}
                    variant="primary"
                  >
                    دخول
                  </Button>
                }
              >
                <div>
                  <div className="font-semibold">
                    {c.name}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    {c.id.slice(0, 8)}...
                  </div>
                </div>
              </Card>
            </div>
          );
        })}

      </div>
    </div>
  );
}