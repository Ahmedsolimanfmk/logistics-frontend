"use client";

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
  const effectiveRole = roleUpper((user as any)?.effective_role);
  const platformRole = roleUpper((user as any)?.platform_role);

  const isSuperAdmin =
    role === "SUPER_ADMIN" ||
    effectiveRole === "SUPER_ADMIN" ||
    platformRole === "SUPER_ADMIN";

  const logout = () => {
    const st: any = (useAuth as any).getState?.();
    if (st?.logout) st.logout();
    else {
      try {
        localStorage.removeItem("auth");
      } catch {}
      router.push("/login");
    }
  };

  const items = useMemo<(NavItem | NavGroup)[]>(
    () => [
      { labelKey: "sidebar.dashboard", href: "/dashboard" },
      { labelKey: "sidebar.trips", href: "/trips" },

      {
        labelKey: "sidebar.finance",
        key: "finance",
        roles: ["ADMIN", "ACCOUNTANT", "FIELD_SUPERVISOR", "SUPER_ADMIN"],
        children: [
          { labelKey: "sidebar.financeOverview", href: "/finance" },
          { labelKey: "sidebar.financeExpenses", href: "/finance/expenses" },
          { labelKey: "sidebar.financeAdvances", href: "/finance/advances" },
          { labelKey: "sidebar.financePurchases", href: "/finance/purchases" },
          { labelKey: "sidebar.financeARClients", href: "/finance/ar" },
          { labelKey: "sidebar.financeARInvoices", href: "/finance/ar/invoices" },
          { labelKey: "sidebar.financeARPayments", href: "/finance/ar/payments" },
          { labelKey: "sidebar.financeARLedger", href: "/finance/ar/ledger" },
        ],
      },

      {
        labelKey: "sidebar.clients",
        href: "/clients",
        roles: ["ADMIN", "HR", "SUPER_ADMIN"],
      },
      {
        labelKey: "sidebar.sites",
        href: "/sites",
        roles: ["ADMIN", "HR", "SUPER_ADMIN"],
      },

      {
        labelKey: "sidebar.contracts",
        href: "/contracts",
        roles: ["ADMIN", "HR", "ACCOUNTANT", "SUPER_ADMIN"],
      },
      {
        labelKey: "sidebar.contractPricing",
        href: "/contract-pricing",
        roles: ["ADMIN", "HR", "ACCOUNTANT", "SUPER_ADMIN"],
      },

      {
        labelKey: "sidebar.masterData",
        key: "masterData",
        roles: ["ADMIN", "CONTRACT_MANAGER", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
        children: [
          {
            labelKey: "sidebar.vehicleClasses",
            href: "/contract-pricing/vehicle-classes",
          },
          {
            labelKey: "sidebar.cargoTypes",
            href: "/contract-pricing/cargo-types",
          },
          {
            labelKey: "sidebar.zones",
            href: "/contract-pricing/zones",
          },
          {
            labelKey: "sidebar.routes",
            href: "/contract-pricing/routes",
          },
        ],
      },

      {
        labelKey: "sidebar.vehicles",
        href: "/vehicles",
        roles: ["ADMIN", "HR", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
      },
      {
        labelKey: "sidebar.drivers",
        href: "/drivers",
        roles: ["ADMIN", "HR", "SUPER_ADMIN"],
      },

      {
        labelKey: "sidebar.cash",
        href: "/cash",
        roles: ["FIELD_SUPERVISOR", "SUPER_ADMIN"],
      },

      {
        labelKey: "sidebar.maintenance",
        key: "maintenance",
        roles: [
          "ADMIN",
          "HR",
          "ACCOUNTANT",
          "FIELD_SUPERVISOR",
          "MAINTENANCE_MANAGER",
          "SUPER_ADMIN",
        ],
        children: [
          {
            labelKey: "sidebar.maintenanceRequests",
            href: "/maintenance/requests",
            roles: [
              "ADMIN",
              "HR",
              "ACCOUNTANT",
              "FIELD_SUPERVISOR",
              "MAINTENANCE_MANAGER",
              "SUPER_ADMIN",
            ],
          },
          {
            labelKey: "sidebar.maintenanceWorkOrders",
            href: "/maintenance/work-orders",
            roles: [
              "ADMIN",
              "ACCOUNTANT",
              "MAINTENANCE_MANAGER",
              "SUPER_ADMIN",
            ],
          },
           { labelKey: "sidebar.maintenanceIssuedParts", href: "/maintenance/issued-parts" },
        ],
      },

      {
        labelKey: "sidebar.vendors",
        href: "/vendors",
        roles: ["ADMIN", "ACCOUNTANT", "HR", "MAINTENANCE_MANAGER", "SUPER_ADMIN"],
      },

      {
        labelKey: "sidebar.inventory",
        key: "inventory",
        roles: [
          "ADMIN",
          "STOREKEEPER",
          "ACCOUNTANT",
          "MAINTENANCE_MANAGER",
          "SUPER_ADMIN",
        ],
        children: [
          { labelKey: "sidebar.inventoryReceipts", href: "/inventory/receipts" },
          { labelKey: "sidebar.inventoryRequests", href: "/inventory/requests" },
          { labelKey: "sidebar.inventoryIssues", href: "/inventory/issues" },
          { labelKey: "sidebar.inventoryParts", href: "/inventory/parts" },
          { labelKey: "sidebar.inventoryCategories", href: "/inventory/categories" },
          { labelKey: "sidebar.inventoryPartItems", href: "/inventory/part-items" },
          { labelKey: "sidebar.inventoryStock", href: "/inventory/stock" },
        ],
      },

      {
        labelKey: "sidebar.users",
        href: "/users",
        roles: ["ADMIN", "SUPER_ADMIN"],
      },
      {
        labelKey: "sidebar.supervisors",
        href: "/supervisors",
        roles: ["ADMIN", "HR", "GENERAL_SUPERVISOR", "SUPER_ADMIN"],
      },
    ],
    []
  );

  const canSee = (roles?: string[]) => {
    if (isSuperAdmin) return true;
    if (!roles || roles.length === 0) return true;

    const allowed = roles.map((x) => String(x).toUpperCase());
    return allowed.includes(role) || allowed.includes(effectiveRole);
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const [open, setOpen] = useState<Record<string, boolean>>({
    finance: false,
    maintenance: false,
    inventory: false,
    masterData: false,
  });

  useEffect(() => {
    if (pathname?.startsWith("/maintenance")) {
      setOpen((p) => ({ ...p, maintenance: true }));
    }
    if (pathname?.startsWith("/finance")) {
      setOpen((p) => ({ ...p, finance: true }));
    }
    if (pathname?.startsWith("/inventory")) {
      setOpen((p) => ({ ...p, inventory: true }));
    }
    if (
      pathname?.startsWith("/contract-pricing/vehicle-classes") ||
      pathname?.startsWith("/contract-pricing/cargo-types") ||
      pathname?.startsWith("/contract-pricing/zones") ||
      pathname?.startsWith("/contract-pricing/routes")
    ) {
      setOpen((p) => ({ ...p, masterData: true }));
    }
  }, [pathname]);

  const navigateTo = (href: string) => {
    if (!href || href === pathname) return;

    try {
      router.push(href);

      window.setTimeout(() => {
        if (window.location.pathname === pathname) {
          window.location.assign(href);
        }
      }, 250);
    } catch {
      window.location.assign(href);
    }
  };

  return (
    <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-l border-black/10 bg-[rgb(var(--trex-sidebar))] text-[rgb(var(--trex-fg))] shadow-[0_0_30px_rgba(0,0,0,0.06)]">
      <div className="border-b border-black/10 bg-[rgba(var(--trex-card),0.7)] p-4">
        <div className="text-lg font-bold tracking-wide">
          {t("sidebar.appName")}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {user?.full_name || user?.email || "—"} —{" "}
          <span className="text-slate-900">
            {effectiveRole || role || "—"}
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-auto p-3">
        {items
          .filter((it) => canSee((it as any).roles))
          .map((it) => {
            if ("children" in it) {
              const isOpen = !!open[it.key];
              const active = it.children.some((c) => isActive(c.href));

              return (
                <div key={it.key} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpen((p) => ({ ...p, [it.key]: !p[it.key] }))
                    }
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                      active
                        ? "border-[rgba(var(--trex-accent),0.25)] bg-[rgba(var(--trex-accent),0.12)] text-slate-900"
                        : "border-transparent text-slate-700 hover:bg-black/5 hover:text-[rgb(var(--trex-accent))]"
                    )}
                  >
                    <span>{t(it.labelKey)}</span>
                    <span
                      className={cn(
                        "text-xs transition",
                        isOpen && "rotate-180"
                      )}
                    >
                      ▾
                    </span>
                  </button>

                  {isOpen && (
                    <div className="space-y-1 pr-2">
                      {it.children
                        .filter((c) => canSee(c.roles))
                        .map((c) => (
                          <button
                            key={c.href}
                            type="button"
                            onClick={() => navigateTo(c.href)}
                            className={cn(
                              "block w-full rounded-xl border-r-2 px-3 py-2 text-right text-sm transition",
                              isActive(c.href)
                                ? "border-[rgb(var(--trex-accent))] bg-[rgba(var(--trex-accent),0.10)] text-slate-900"
                                : "border-transparent text-slate-700 hover:bg-black/5 hover:text-[rgb(var(--trex-accent))]"
                            )}
                          >
                            {t(c.labelKey)}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={it.href}
                type="button"
                onClick={() => navigateTo(it.href)}
                className={cn(
                  "block w-full rounded-xl border-r-2 px-3 py-2 text-right text-sm transition",
                  isActive(it.href)
                    ? "border-[rgb(var(--trex-accent))] bg-[rgba(var(--trex-accent),0.12)] text-slate-900"
                    : "border-transparent text-slate-700 hover:bg-black/5 hover:text-[rgb(var(--trex-accent))]"
                )}
              >
                {t(it.labelKey)}
              </button>
            );
          })}
      </nav>

      <div className="border-t border-black/10 p-3">
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-[rgba(var(--trex-accent),0.30)] bg-[rgba(var(--trex-accent),0.12)] px-3 py-2 text-sm text-slate-900 transition hover:bg-[rgba(var(--trex-accent),0.18)]"
        >
          {t("common.logout")}
        </button>
      </div>
    </aside>
  );
}