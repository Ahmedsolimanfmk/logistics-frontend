"use client";

import React, { useEffect, useState } from "react";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter } from "next/navigation";

export default function SelectCompanyPage() {
  const router = useRouter();
  const { setAuth, token, user } = useAuth();

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      const res = await apiAuthGet("/auth/my-companies");
      setCompanies(res?.data || []);
    } catch (e) {
      console.log("LOAD COMPANIES ERROR", e);
    } finally {
      setLoading(false);
    }
  }

  async function selectCompany(company: any) {
  try {
    const res: any = await apiAuthPost("/auth/switch-company", {
      company_id: company.id,
    });

    if (!user || !user.id) return;

    setAuth(res.token, {
      id: user.id,
      full_name: user.full_name || "",
      email: user.email || "",
      role: user.role || "USER",
      effective_role: user.effective_role,
      platform_role: user.platform_role,

      company_id: company.id,      // ✅ هنا
      company_name: company.name,  // ✅ وهنا
    });

  } catch (e) {
    console.error("Switch failed", e);
  }
}

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">اختر الشركة</h1>

      {companies.map((c) => (
        <button
          key={c.id}
          onClick={() => selectCompany(c)}
          className="block w-full border p-3 rounded hover:bg-gray-100 text-left"
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}