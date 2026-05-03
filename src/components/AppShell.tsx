"use client";

import React, { useEffect } from "react";
import { Sidebar } from "@/src/components/Sidebar";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";
import NotificationBell from "@/src/components/NotificationBell";
import AIAssistantWidget from "@/src/components/AIAssistantWidget";
import { useAuth } from "@/src/store/auth";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ hydrate ONCE (بدون loop)
  useEffect(() => {
    const state = useAuth.getState();
    if (!state.hasHydrated) {
      state.hydrate();
    }
  }, []);

  // ✅ نقرأ القيم بعد الهيدريشن
  const hasHydrated = useAuth((s) => s.hasHydrated);
  const user = useAuth((s) => s.user);

  // ⛔ حماية من crash قبل hydration
  if (!hasHydrated) {
    return (
      <div className="p-6 text-center text-gray-500">
        Loading app...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex bg-[rgb(var(--trex-bg))] text-[rgb(var(--trex-fg))]">
      
      {/* 🧪 Debug: لو شاكك إن المشكلة من Sidebar اقفله */}
      <Sidebar />

      <main className="flex-1 min-w-0">
        <div className="p-6">

          {/* Top bar */}
          <div className="mb-4 flex items-center justify-end gap-2">
            <NotificationBell />
            <LanguageSwitcher />
          </div>

          {/* محتوى الصفحات */}
          {children}

        </div>
      </main>

      {/* AI Widget */}
      <AIAssistantWidget />
    </div>
  );
}