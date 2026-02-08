"use client";

import React from "react";
import { Sidebar } from "@/src/components/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />
      <main className="flex-1 min-w-0">
<<<<<<< HEAD
=======
        {/* content area scroll */}
>>>>>>> adcc011 (Add i18n and language switcher)
        <div className="h-screen overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
