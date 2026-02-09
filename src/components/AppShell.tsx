"use client";

import React from "react";
import { Sidebar } from "@/src/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <Sidebar />
      <main className="flex-1 min-w-0">


        {/* content area scroll */}
        <div className="h-screen overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
