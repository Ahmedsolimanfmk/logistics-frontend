"use client";

import { useEffect, useState } from "react";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter } from "next/navigation";

export default function SelectCompanyPage() {
  const router = useRouter();
  const { setAuth, user } = useAuth();

  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res: any = await apiAuthGet("/auth/my-companies");
    setCompanies(res.data || []);
  }

  async function selectCompany(c: any) {
    const res: any = await apiAuthPost("/auth/switch-company", {
      company_id: c.id,
    });

    if (!user) return;

    setAuth(res.token, {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      effective_role: user.effective_role,
      platform_role: user.platform_role,
      company_id: c.id,
      company_name: c.name,
    });

    router.replace("/dashboard");
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">اختر الشركة</h1>

      {companies.map((c) => (
        <button
          key={c.id}
          onClick={() => selectCompany(c)}
          className="block w-full border p-3 rounded"
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}