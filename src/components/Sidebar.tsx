"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type NavItem = {
  labelKey: string;
  href: string;
  roles?: string[];
};

type NavGroup = {
  labelKey: string;
  key: string;
  roles?: string[];
  children: NavItem[];
};

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const logout = () => {
    const st: any = (useAuth as any).getState?.();
    if (st?.logout) st.logout();
    else {
      try {
        localStorage.removeItem("auth");
      } catch {}
    }
    router.push("/login");
  };

  const items = useMemo<(NavItem | NavGroup)[]>(
    () => [
      { labelKey: "sidebar.dashboard", href: "/dashboard" },
      { labelKey: "sidebar.trips", href: "/trips" },

      {
        labelKey: "sidebar.finance",
        key: "finance",
        roles: ["ADMIN", "ACCOUNTANT", "FIELD_SUPERVISOR"],
        children: [
          { labelKey: "sidebar.financeOverview", href: "/finance" },
          { labelKey: "sidebar.financeExpenses", href: "/finance/expenses" },
          { labelKey: "sidebar.financeAdvances", href: "/finance/advances" },

          // ✅ NEW: Purchases
          { labelKey: "sidebar.financePurchases", href: "/finance/purchases" },
        ],
      },

      { labelKey: "sidebar.clients", href: "/clients", roles: ["ADMIN", "HR"] },
      { labelKey: "sidebar.sites", href: "/sites", roles: ["ADMIN", "HR"] },
      { labelKey: "sidebar.vehicles", href: "/vehicles", roles: ["ADMIN", "HR"] },
      { labelKey: "sidebar.drivers", href: "/drivers", roles: ["ADMIN", "HR"] },

      { labelKey: "sidebar.cash", href: "/cash", roles: ["FIELD_SUPERVISOR"] },

      {
        labelKey: "sidebar.maintenance",
        key: "maintenance",
        roles: ["ADMIN", "HR", "ACCOUNTANT", "FIELD_SUPERVISOR"],
        children: [
          { labelKey: "sidebar.maintenanceRequests", href: "/maintenance/requests" },
          { labelKey: "sidebar.maintenanceWorkOrders", href: "/maintenance/work-orders" },
        ],
      },

      {
        labelKey: "sidebar.inventory",
        key: "inventory",
        roles: ["ADMIN", "STOREKEEPER", "ACCOUNTANT"],
        children: [
          { labelKey: "sidebar.inventoryReceipts", href: "/inventory/receipts" },
          { labelKey: "sidebar.inventoryRequests", href: "/inventory/requests" },
          { labelKey: "sidebar.inventoryIssues", href: "/inventory/issues" },
          { labelKey: "sidebar.inventoryPartItems", href: "/inventory/part-items" },
        ],
      },

      { labelKey: "sidebar.users", href: "/users", roles: ["ADMIN"] },
      {
        labelKey: "sidebar.supervisors",
        href: "/supervisors",
        roles: ["ADMIN", "HR", "GENERAL_SUPERVISOR"],
      },
    ],
    []
  );

  const canSee = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(role);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const [open, setOpen] = useState<Record<string, boolean>>({
    finance: false,
    maintenance: false,
    inventory: false,
  });

  useEffect(() => {
    if (pathname?.startsWith("/maintenance")) setOpen((p) => ({ ...p, maintenance: true }));
    if (pathname?.startsWith("/finance")) setOpen((p) => ({ ...p, finance: true }));
    if (pathname?.startsWith("/inventory")) setOpen((p) => ({ ...p, inventory: true }));
  }, [pathname]);

  return (
    <aside className="h-screen w-[260px] shrink-0 border-l border-black/10 bg-[rgb(var(--trex-sidebar))] text-[rgb(var(--trex-fg))] sticky top-0 flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="p-4 border-b border-black/10 bg-[rgba(var(--trex-card),0.7)]">
        <div className="text-lg font-bold tracking-wide">{t("sidebar.appName")}</div>
        <div className="mt-1 text-xs text-slate-500">
          {user?.full_name || user?.email || "—"} — <span className="text-slate-900">{role || "—"}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1 overflow-auto">
        {items
          .filter((it) => canSee((it as any).roles))
          .map((it) => {
            if ("children" in it) {
              const isOpen = !!open[it.key];
              const active = it.children.some((c) => isActive(c.href));

              return (
                <div key={it.key} className="space-y-1">
                  <button
                    onClick={() => setOpen((p) => ({ ...p, [it.key]: !p[it.key] }))}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm border transition",
                      active
                        ? "bg-[rgba(var(--trex-accent),0.12)] border-[rgba(var(--trex-accent),0.25)] text-slate-900"
                        : "text-slate-700 border-transparent hover:bg-black/5 hover:text-[rgb(var(--trex-accent))]"
                    )}
                  >
                    <span>{t(it.labelKey)}</span>
                    <span className={cn("text-xs transition", isOpen && "rotate-180")}>▾</span>
                  </button>

                  {isOpen && (
                    <div className="pr-2 space-y-1">
                      {it.children
                        .filter((c) => canSee(c.roles))
                        .map((c) => (
                          <Link
                            key={c.href}
                            href={c.href}
                            className={cn(
                              "block rounded-xl px-3 py-2 text-sm border-r-2 transition",
                              isActive(c.href)
                                ? "border-[rgb(var(--trex-accent))] bg-[rgba(var(--trex-accent),0.10)] text-slate-900"
                                : "border-transparent text-slate-700 hover:bg-black/5 hover:text-[rgb(var(--trex-accent))]"
                            )}
                          >
                            {t(c.labelKey)}
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "block rounded-xl px-3 py-2 text-sm border-r-2 transition",
                  isActive(it.href)
                    ? "border-[rgb(var(--trex-accent))] bg-[rgba(var(--trex-accent),0.12)] text-slate-900"
                    : "border-transparent text-slate-700 hover:bg-black/5 hover:text-[rgb(var(--trex-accent))]"
                )}
              >
                {t(it.labelKey)}
              </Link>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-black/10">
        <button
          onClick={logout}
          className="w-full px-3 py-2 rounded-xl border border-[rgba(var(--trex-accent),0.30)] bg-[rgba(var(--trex-accent),0.12)] hover:bg-[rgba(var(--trex-accent),0.18)] text-sm transition text-slate-900"
        >
          {t("common.logout")}
        </button>
      </div>
    </aside>
  );
}