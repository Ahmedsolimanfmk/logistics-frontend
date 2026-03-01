"use client";

import React from "react";
import { Sidebar } from "@/src/components/Sidebar";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-hidden flex bg-[rgb(var(--trex-bg))] text-[rgb(var(--trex-fg))]">
      <Sidebar />

      <main className="flex-1 min-w-0 min-h-screen overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-end">
              <LanguageSwitcher />
            </div>

            {children}
          </div>
        </div>
      </main>
    </div>
  );
}