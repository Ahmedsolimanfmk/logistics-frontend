"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/src/components/Sidebar";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";
import NotificationBell from "@/src/components/NotificationBell";
import TrexAiCopilot from "@/src/components/ai/TrexAiCopilot";

function detectAiContext(pathname: string | null): "finance" | "ar" | "maintenance" | "inventory" | null {
  const path = String(pathname || "").toLowerCase();

  // AR / Clients
  if (
    path.startsWith("/finance/ar") ||
    path.startsWith("/clients") ||
    path.startsWith("/sites")
  ) {
    return "ar";
  }

  // Maintenance
  if (path.startsWith("/maintenance")) {
    return "maintenance";
  }

  // Inventory
  if (path.startsWith("/inventory")) {
    return "inventory";
  }

  // Finance / cash / expenses / analytics finance-oriented pages
  if (
    path.startsWith("/finance") ||
    path.startsWith("/cash") ||
    path.startsWith("/analytics")
  ) {
    return "finance";
  }

  return null;
}

function detectAiTitle(context: "finance" | "ar" | "maintenance" | "inventory" | null): string {
  if (context === "finance") return "TREX AI Copilot - Finance";
  if (context === "ar") return "TREX AI Copilot - AR";
  if (context === "maintenance") return "TREX AI Copilot - Maintenance";
  if (context === "inventory") return "TREX AI Copilot - Inventory";
  return "TREX AI Copilot";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const aiContext = useMemo(() => detectAiContext(pathname), [pathname]);
  const aiTitle = useMemo(() => detectAiTitle(aiContext), [aiContext]);

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

        {/* Smart AI Copilot */}
        <TrexAiCopilot context={aiContext} title={aiTitle} />
      </main>
    </div>
  );
}