"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";

export default function CompanySwitcher() {
  const router = useRouter();

  const [companies, setCompanies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const user = useAuth((s) => s.user);
  const setAuth = useAuth((s) => s.setAuth);

  useEffect(() => {
    async function load() {
      const res: any = await apiAuthGet("/auth/my-companies");
      setCompanies(res.data || []);
    }
    load();
  }, []);

  // 🔥 أهم سطر يحل المشكلة كلها
  if (!user) return null;

  const currentCompany = user.company_name || "اختر شركة";

  async function switchCompany(c: any) {
    // 🔥 Narrowing جوه الفنكشن
    if (!user) return;

    const res: any = await apiAuthPost("/auth/switch-company", {
      company_id: c.id,
    });

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

    setOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 border rounded"
      >
        {currentCompany}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => switchCompany(c)}
              className="block w-full px-3 py-2 hover:bg-gray-100 text-right"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}