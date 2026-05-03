"use client";

import React, { useEffect, useState } from "react";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    useAuth.getState().hydrate();
    setReady(true);
  }, []);

  // 🔥 يمنع الشاشة البيضاء
  if (!ready) {
    return <div className="p-6">Loading App...</div>;
  }

  return (
    <div className="min-h-screen flex bg-[rgb(var(--trex-bg))] text-[rgb(var(--trex-fg))]">
      
      {/* ✅ Sidebar رجعناه */}
      <Sidebar />

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