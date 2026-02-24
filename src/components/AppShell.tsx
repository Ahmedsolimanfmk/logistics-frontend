"use client";

import React from "react";
import { Sidebar } from "@/src/components/Sidebar";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[rgb(var(--trex-bg))] text-[rgb(var(--trex-fg))]">
      <Sidebar />

      <main className="flex-1 min-w-0 relative">
        {/* subtle overlay (light) */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-black/[0.02] to-black/[0.03] pointer-events-none" />

        {/* Switcher */}
        <div className="absolute top-4 right-4 z-20">
          <LanguageSwitcher />
        </div>

        <div className="min-h-screen overflow-auto">
          <div className="p-6">
            {/* ✅ Light container */}
            <div className="rounded-3xl border border-black/10 bg-[rgba(var(--trex-surface),0.95)] backdrop-blur-xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}