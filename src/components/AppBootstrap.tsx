"use client";

import React, { useEffect } from "react";
import { Sidebar } from "@/src/components/Sidebar";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";
import NotificationBell from "@/src/components/NotificationBell";
import AIAssistantWidget from "@/src/components/AIAssistantWidget";
import { useAuth } from "@/src/store/auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useAuth.getState().hydrate(); // 🔥 أهم سطر في المشروع كله
  }, []);

  return (
    <div className="min-h-screen w-full overflow-hidden flex bg-[rgb(var(--trex-bg))] text-[rgb(var(--trex-fg))]">
      <Sidebar />

      <main className="relative flex-1 min-w-0 min-h-screen overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-end gap-2">
              <NotificationBell />
              <LanguageSwitcher />
            </div>

            {children}
          </div>
        </div>

        {/* Smart AI Assistant */}
        <AIAssistantWidget />
      </main>
    </div>
  );
}