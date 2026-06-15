"use client";

import { usePathname, useRouter } from "next/navigation";
import { Activity, Wrench, Wallet, Fuel, Menu } from "lucide-react";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";
import { canAccessRoute } from "@/src/config/routeRoles";

export function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const user = useAuth((s) => s.user);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const items = [
    {
      label: "التشغيل",
      icon: <Activity className="w-6 h-6" />,
      href: "/trips", // or /fleet-dashboard, using trips as the primary operation
    },
    {
      label: "صيانة",
      icon: <Wrench className="w-6 h-6" />,
      href: "/maintenance/requests/new",
    },
    {
      label: "عُهدة",
      icon: <Wallet className="w-6 h-6" />,
      href: "/finance/advances",
    },
    {
      label: "وقود",
      icon: <Fuel className="w-6 h-6" />,
      href: "/fuel-transactions",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 pb-safe md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around px-2 py-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center p-2 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <Menu className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-medium">القائمة</span>
        </button>

        {items
          .filter((it) => {
            const r = (user as any)?.role;
            const er = (user as any)?.effective_role || (user as any)?.platform_role;
            
            // Check feature flags if applicable
            if (it.href === "/fuel-transactions" && user?.features?.fuel_enabled === false) return false;
            if (it.href === "/finance/advances" && user?.features?.fleet_enabled === false) return false;

            return canAccessRoute(it.href, r, er);
          })
          .map((it) => {
          const active = isActive(it.href);
          return (
            <button
              key={it.href}
              type="button"
              onClick={() => router.push(it.href)}
              className={`flex flex-col items-center justify-center p-2 transition-all duration-300 ${
                active ? "text-[rgb(var(--trex-accent))] scale-105" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className={`mb-1 ${active ? "opacity-100" : "opacity-80"}`}>{it.icon}</div>
              <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
