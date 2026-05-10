"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";
import { useRouter } from "next/navigation";

export default function CompanySwitcher() {
  const router = useRouter();

  const [companies, setCompanies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const user = useAuth((s) => s.user);
  const setAuth = useAuth((s) => s.setAuth);

  const currentCompany = user?.company_name || "اختر شركة";

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res: any = await apiAuthGet("/auth/my-companies");
    setCompanies(res.data || []);
  }

  async function switchCompany(c: any) {
    if (!user) return;

    const res: any = await apiAuthPost("/auth/switch-company", {
      company_id: c.id,
    });

    setAuth(res.token, {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      platform_role: user.platform_role,
      company_id: c.id,
      company_name: c.name,
    });

    setOpen(false);
    router.refresh(); // ✅ بدل reload
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}>
        {currentCompany}
      </button>

      {open && (
        <div>
          {companies.map((c) => (
            <button key={c.id} onClick={() => switchCompany(c)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}