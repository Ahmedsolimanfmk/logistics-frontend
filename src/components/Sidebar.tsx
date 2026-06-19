"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { 
  Activity, Link2, Truck, BadgeDollarSign, 
  LayoutDashboard, LineChart, Route,
  Briefcase, MapPin, FileText, Database,
  Wrench, Package, Droplets, Users, Settings,
  UserSquare, Wallet, Users2, ShieldAlert,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";
import { ROUTE_PERMISSIONS } from "@/src/config/routeRoles";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type NavItem = {
  labelKey: string;
  href: string;
  roles?: string[];
  icon?: React.ReactNode;
  feature?: string;
};

type NavGroup = {
  labelKey: string;
  key: string;
  roles?: string[];
  icon?: React.ReactNode;
  feature?: string;
  children: NavItem[];
};

type NavSection = {
  sectionKey?: string;
  items: (NavItem | NavGroup)[];
};

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
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

  const sections = useMemo<NavSection[]>(
    () => [
      {
        items: [
          { labelKey: "sidebar.dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5 text-indigo-500" /> },
          { labelKey: "sidebar.analytics", href: "/analytics", icon: <LineChart className="w-5 h-5 text-indigo-500" /> },
        ]
      },
      {
        sectionKey: "tabs.operations",
        items: [
          { labelKey: "sidebar.trips", href: "/trips", icon: <Route className="w-5 h-5 text-indigo-500" /> },
          { labelKey: "sidebar.clients", href: "/clients", icon: <Briefcase className="w-5 h-5 text-indigo-500" />, roles: ROUTE_PERMISSIONS["/clients"] },
          { labelKey: "sidebar.sites", href: "/sites", icon: <MapPin className="w-5 h-5 text-indigo-500" />, roles: ROUTE_PERMISSIONS["/sites"] },
          { labelKey: "sidebar.contracts", href: "/contracts", icon: <FileText className="w-5 h-5 text-indigo-500" />, roles: ROUTE_PERMISSIONS["/contracts"] },
          { labelKey: "sidebar.contractPricing", href: "/contract-pricing", icon: <BadgeDollarSign className="w-5 h-5 text-indigo-500" />, roles: ROUTE_PERMISSIONS["/contract-pricing"] },
          {
            labelKey: "sidebar.masterData",
            key: "masterData",
            icon: <Database className="w-5 h-5 text-indigo-500" />,
            roles: ROUTE_PERMISSIONS["/contract-pricing/vehicle-classes"],
            feature: "fleet_enabled",
            children: [
              { labelKey: "sidebar.vehicleClasses", href: "/contract-pricing/vehicle-classes" },
              { labelKey: "sidebar.cargoTypes", href: "/contract-pricing/cargo-types" },
              { labelKey: "sidebar.zones", href: "/contract-pricing/zones" },
              { labelKey: "sidebar.routes", href: "/contract-pricing/routes" },
            ],
          },
        ]
      },
      {
        sectionKey: "sidebar.fleetDashboard",
        items: [
          { labelKey: "sidebar.fleetDashboard", icon: <Activity className="w-5 h-5 text-indigo-500" />, href: "/fleet-dashboard", roles: ROUTE_PERMISSIONS["/vehicles"], feature: "fleet_enabled" },
          { labelKey: "sidebar.vehicles", icon: <Truck className="w-5 h-5 text-indigo-500" />, href: "/vehicles", roles: ROUTE_PERMISSIONS["/vehicles"], feature: "fleet_enabled" },
          { labelKey: "sidebar.drivers", icon: <UserSquare className="w-5 h-5 text-indigo-500" />, href: "/drivers", roles: ROUTE_PERMISSIONS["/drivers"] },
          { labelKey: "sidebar.assignments", icon: <Link2 className="w-5 h-5 text-indigo-500" />, href: "/assignments", roles: ROUTE_PERMISSIONS["/vehicles"], feature: "fleet_enabled" },
          { labelKey: "sidebar.fleetExpenses", icon: <Wallet className="w-5 h-5 text-indigo-500" />, href: "/fleet-expenses", roles: ROUTE_PERMISSIONS["/vehicles"], feature: "fleet_enabled" },
        ]
      },
      {
        sectionKey: "tabs.finance",
        items: [
          {
            labelKey: "sidebar.finance",
            key: "finance",
            icon: <BadgeDollarSign className="w-5 h-5 text-indigo-500" />,
            roles: ROUTE_PERMISSIONS["/finance"],
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
          { labelKey: "sidebar.cash", icon: <Wallet className="w-5 h-5 text-indigo-500" />, href: "/cash", roles: ROUTE_PERMISSIONS["/cash"] },
          { labelKey: "sidebar.vendors", icon: <Users2 className="w-5 h-5 text-indigo-500" />, href: "/vendors", roles: ROUTE_PERMISSIONS["/vendors"] },
        ]
      },
      {
        sectionKey: "tabs.maintenance",
        items: [
          {
            labelKey: "sidebar.maintenance",
            key: "maintenance",
            icon: <Wrench className="w-5 h-5 text-indigo-500" />,
            roles: ROUTE_PERMISSIONS["/maintenance"],
            feature: "inventory_enabled",
            children: [
              { labelKey: "sidebar.maintenanceRequests", href: "/maintenance/requests", roles: ROUTE_PERMISSIONS["/maintenance/requests"] },
              { labelKey: "sidebar.maintenanceWorkOrders", href: "/maintenance/work-orders", roles: ROUTE_PERMISSIONS["/maintenance/work-orders"] },
              { labelKey: "sidebar.maintenanceIssuedParts", href: "/maintenance/issued-parts", roles: ROUTE_PERMISSIONS["/maintenance/issued-parts"] },
            ],
          },
          {
            labelKey: "sidebar.inventory",
            key: "inventory",
            icon: <Package className="w-5 h-5 text-indigo-500" />,
            roles: ROUTE_PERMISSIONS["/inventory"],
            feature: "inventory_enabled",
            children: [
              { labelKey: "sidebar.inventoryDashboard", href: "/inventory" },
              { labelKey: "sidebar.inventoryWarehouses", href: "/inventory/warehouses" },
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
            labelKey: "sidebar.fuel",
            key: "fuel",
            icon: <Droplets className="w-5 h-5 text-indigo-500" />,
            roles: ["ADMIN", "SUPER_ADMIN"],
            feature: "fuel_enabled",
            children: [
              { labelKey: "sidebar.fuelWallet", href: "/fuel-wallet" },
              { labelKey: "sidebar.fuelTransactions", href: "/fuel-transactions" },
            ],
          },
        ]
      },
      {
        sectionKey: "sidebar.settings",
        items: [
          { labelKey: "sidebar.users", icon: <Users className="w-5 h-5 text-indigo-500" />, href: "/users", roles: ROUTE_PERMISSIONS["/users"] },
          { labelKey: "sidebar.supervisors", icon: <ShieldAlert className="w-5 h-5 text-indigo-500" />, href: "/supervisors", roles: ROUTE_PERMISSIONS["/supervisors"] },
          { labelKey: "sidebar.settings", icon: <Settings className="w-5 h-5 text-indigo-500" />, href: "/settings", roles: ROUTE_PERMISSIONS["/settings"] || ["ADMIN", "SUPER_ADMIN", "HR"] },
        ]
      }
    ],
    []
  );

  const canSee = (roles?: string[], feature?: string) => {
    if (isSuperAdmin && !user?.is_impersonating) return true;
    
    if (feature && user?.features && (user.features as any)[feature] === false) {
      return false;
    }

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
    fuel: false,
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
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={onClose}
        />
      )}

      <aside 
        className={cn(
          "fixed md:sticky top-0 z-50 flex h-screen w-[260px] shrink-0 flex-col border-l border-slate-200/60 bg-[rgb(var(--trex-sidebar))] text-[rgb(var(--trex-fg))] shadow-[0_4px_30px_rgba(0,0,0,0.04)] transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0 right-0" : "translate-x-full right-0 md:right-auto"
        )}
      >
      <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md p-5">
        <div className="text-xl font-bold tracking-wide text-[rgb(var(--trex-accent))]">
          {t("sidebar.appName")}
        </div>
        <div className="mt-2 text-xs font-medium text-slate-500">
          {user?.full_name || user?.email || "—"}
        </div>
        <div className="mt-1 inline-block px-2 py-1 bg-slate-100 text-slate-700 text-[10px] rounded-full font-bold">
          {effectiveRole || role || "—"}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        {sections.map((sec, idx) => {
          const visibleItems = sec.items.filter((it) => {
            if (!canSee((it as any).roles, (it as any).feature)) return false;
            
            if ("children" in it) {
              const visibleChildren = it.children.filter(c => canSee(c.roles, c.feature));
              return visibleChildren.length > 0;
            }
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="mb-6">
              {sec.sectionKey && (
                <div className="px-4 mb-3 text-[11px] font-bold text-slate-400/90 uppercase tracking-wider">
                  {t(sec.sectionKey)}
                </div>
              )}
              <div className="space-y-1">
                {visibleItems.map((it) => {
                  if ("children" in it) {
                    const isOpen = !!open[it.key];
                    const active = it.children.some((c) => isActive(c.href));

                    return (
                      <div key={it.key} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setOpen((p) => ({ ...p, [it.key]: !p[it.key] }))}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition",
                            active
                              ? "border-[rgba(var(--trex-accent),0.25)] bg-[rgba(var(--trex-accent),0.12)] text-[rgb(var(--trex-accent))] font-medium"
                              : "border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {it.icon}
                            <span>{t(it.labelKey)}</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 text-slate-400 transition-transform",
                              isOpen && "rotate-180"
                            )}
                          />
                        </button>

                        {isOpen && (
                          <div className="space-y-1 pr-10 mt-1">
                            {it.children
                              .filter((c) => canSee(c.roles, c.feature))
                              .map((c) => (
                                <button
                                  key={c.href}
                                  type="button"
                                  onClick={() => navigateTo(c.href)}
                                  className={cn(
                                    "block w-full rounded-xl border-r-2 px-3 py-2 text-right text-[13px] transition",
                                    isActive(c.href)
                                      ? "border-[rgb(var(--trex-accent))] bg-[rgba(var(--trex-accent),0.10)] text-[rgb(var(--trex-accent))] font-medium"
                                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
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
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-sm transition",
                        isActive(it.href)
                          ? "border-[rgba(var(--trex-accent),0.25)] bg-[rgba(var(--trex-accent),0.12)] text-[rgb(var(--trex-accent))] font-medium"
                          : "border-transparent text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium"
                      )}
                    >
                      {it.icon}
                      <span>{t(it.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-black/10 p-4 space-y-2 bg-slate-50/50">
        {user?.is_impersonating && user?.platform_role === "SUPER_ADMIN" && (
          <button
            type="button"
            onClick={() => {
              const st: any = (useAuth as any).getState?.();
              if (st?.setAuth && st?.token) {
                st.setAuth(st.token, { ...user, is_impersonating: false, company_id: null, company_name: null });
                window.location.href = "/dashboard";
              }
            }}
            className="w-full rounded-xl border border-[rgba(var(--trex-success),0.30)] bg-[rgba(var(--trex-success),0.12)] px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[rgba(var(--trex-success),0.18)] shadow-sm"
          >
            العودة للوحة التحكم (SaaS)
          </button>
        )}
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 shadow-sm"
        >
          {t("common.logout")}
        </button>
      </div>
    </aside>
    </>
  );
}