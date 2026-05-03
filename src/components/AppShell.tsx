"use client";

import React, { useEffect } from "react";
import { Sidebar } from "@/src/components/Sidebar";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";
import NotificationBell from "@/src/components/NotificationBell";
import AIAssistantWidget from "@/src/components/AIAssistantWidget";
import { useAuth } from "@/src/store/auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const hydrate = useAuth((s) => s.hydrate);
  const hasHydrated = useAuth((s) => s.hasHydrated);

  useEffect(() => {
    hydrate();
  }, []);

  // 🔥 أهم سطر
  if (!hasHydrated) return null;

  return (
    <div className="min-h-screen w-full flex bg-[rgb(var(--trex-bg))] text-[rgb(var(--trex-fg))]">
      {/* <Sidebar /> */}

      <main className="flex-1">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-end gap-2">
            <NotificationBell />
            <LanguageSwitcher />
          </div>

          {children}
        </div>
      </main>

      <AIAssistantWidget />
    </div>
  );
}