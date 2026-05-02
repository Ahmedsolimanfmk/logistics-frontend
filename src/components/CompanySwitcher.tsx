"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { apiAuthGet, apiAuthPost } from "@/src/lib/api";
import { useRouter } from "next/navigation";

export default function CompanySwitcher() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const user = useAuth((s) => s.user);
  const setAuth = useAuth((s) => s.setAuth);

  const currentCompany = user?.company_name || "اختر شركة";
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const res: any = await apiAuthGet("/auth/my-companies");
        setCompanies(res.data || []);
      } catch (e) {
        console.error("Failed to load companies", e);
      }
    }

    load();
  }, []);

  async function switchCompany(c: any) {
    try {
      const res: any = await apiAuthPost("/auth/switch-company", {
        company_id: c.id,
      });

      if (!user) return;

setAuth(res.token, {
  id: user.id, // 🔥 مهم جدًا
  full_name: user.full_name,
  email: user.email,
  role: user.role,
  effective_role: user.effective_role,
  platform_role: user.platform_role,

  company_id: c.id,
  company_name: c.name,
});

      setOpen(false);

      // optional refresh
      router.replace("/dashboard");
    } catch (e) {
      console.error("Switch failed", e);
    }
  }

  return (
    <div className="relative">
      {/* Button */}
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50"
      >
        {currentCompany}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded shadow z-50">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => switchCompany(c)}
              className="block w-full text-right px-3 py-2 hover:bg-gray-100 text-sm"
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}