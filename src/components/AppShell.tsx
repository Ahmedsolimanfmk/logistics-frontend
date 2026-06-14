"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/src/components/Sidebar";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";
import NotificationBell from "@/src/components/NotificationBell";
import AIAssistantWidget from "@/src/components/AIAssistantWidget";
import { useAuth } from "@/src/store/auth";
import { usePathname } from "next/navigation";
import { canAccessRoute } from "@/src/config/routeRoles";
import { useT } from "@/src/i18n/useT";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const t = useT();

  useEffect(() => {
    useAuth.getState().hydrate();
    setReady(true);
  }, []);

  // 🔥 يمنع الشاشة البيضاء
  if (!ready) {
    return <div className="p-6">Loading App...</div>;
  }

  // 🔒 RBAC Check
  const isAllowed = canAccessRoute(
    pathname,
    user?.role,
    (user as any)?.effective_role || (user as any)?.platform_role
  );

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--trex-bg))] text-[rgb(var(--trex-fg))]">
        <div className="max-w-md text-center p-8 bg-white shadow-xl rounded-2xl border border-red-100">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">403 Access Denied</h1>
          <p className="text-slate-600 mb-6">
            عذراً، أنت لا تملك الصلاحيات الكافية للوصول إلى هذه الصفحة.
          </p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-2 bg-[rgb(var(--trex-accent))] text-white rounded-lg hover:opacity-90 transition font-medium"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[rgb(var(--trex-bg))] text-[rgb(var(--trex-fg))]">
      
      {/* ✅ Hide Sidebar for SUPER_ADMIN if not impersonating */}
      {!(user?.platform_role === "SUPER_ADMIN" && !user?.is_impersonating) && (
        <Sidebar />
      )}

      <main className="flex-1 min-w-0">
        <div className="p-6">

          <div className="mb-4 flex justify-end gap-2">
            <NotificationBell />
            <LanguageSwitcher />
          </div>

          {children}

        </div>

        <AIAssistantWidget />
      </main>
    </div>
  );
}