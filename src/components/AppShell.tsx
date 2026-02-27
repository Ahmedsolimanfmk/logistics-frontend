"use client";

import React from "react";
import { Sidebar } from "@/src/components/Sidebar";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[rgb(var(--trex-bg))] text-[rgb(var(--trex-fg))]">
      <Sidebar />

      <main className="flex-1 min-w-0 relative">
        {/* Switcher */}
        <div className="absolute top-4 right-4 z-20">
          <LanguageSwitcher />
        </div>

        {/* ✅ Page area (no forced card, no blur glass) */}
        <div className="min-h-screen overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}