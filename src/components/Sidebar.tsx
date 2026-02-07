"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type NavItem = {
  label: string;
  href: string;
  roles?: string[]; // لو فاضية => تظهر للجميع
};

type NavGroup = {
  label: string;
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
      { label: "Dashboard", href: "/dashboard" },
      { label: "Trips", href: "/trips" },

      // ✅ Finance (Dropdown) - official finance entry point
      {
        label: "Finance",
        key: "finance",
        roles: ["ADMIN", "ACCOUNTANT", "FIELD_SUPERVISOR"],
        children: [
          { label: "Overview", href: "/finance" },
          { label: "Expenses", href: "/finance/expenses" },
          { label: "Advances", href: "/finance/advances" },
        ],
      },

      // Master Data
      { label: "Clients", href: "/clients", roles: ["ADMIN", "HR"] },
      { label: "Sites", href: "/sites", roles: ["ADMIN", "HR"] },
      { label: "Vehicles", href: "/vehicles", roles: ["ADMIN", "HR"] },
      { label: "Drivers", href: "/drivers", roles: ["ADMIN", "HR"] },

      // ✅ Cash (supervisor-only) - for logging supervisor cash expenses
      { label: "Cash", href: "/cash", roles: ["FIELD_SUPERVISOR"] },

      // ✅ Maintenance (Dropdown)
      {
        label: "Maintenance",
        key: "maintenance",
        roles: ["ADMIN", "HR", "ACCOUNTANT", "FIELD_SUPERVISOR"],
        children: [
          { label: "Requests", href: "/maintenance/requests" },
          { label: "Work Orders", href: "/maintenance/work-orders" },
        ],
      },

      // Admin
      { label: "Users", href: "/users", roles: ["ADMIN"] },
      { label: "Supervisors", href: "/supervisors", roles: ["ADMIN", "HR", "GENERAL_SUPERVISOR"] },
    ],
    []
  );

  const canSee = (roles?: string[]) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(role);
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // dropdown open state
  const [open, setOpen] = useState<Record<string, boolean>>({
    finance: false,
    maintenance: false,
  });

  // auto-open maintenance if user is inside /maintenance/*
  useEffect(() => {
    if (pathname?.startsWith("/maintenance")) {
      setOpen((p) => ({ ...p, maintenance: true }));
    }
  }, [pathname]);

  // auto-open finance if user is inside /finance/*
  useEffect(() => {
    if (pathname?.startsWith("/finance")) {
      setOpen((p) => ({ ...p, finance: true }));
    }
  }, [pathname]);

  return (
    <aside className="h-screen w-[260px] shrink-0 border-r border-white/10 bg-slate-950 text-white sticky top-0">
      <div className="p-4 border-b border-white/10">
        <div className="text-lg font-bold">Logistics</div>
        <div className="mt-1 text-xs text-slate-400">
          {user?.full_name || user?.email || "—"} —{" "}
          <span className="text-slate-200">{role || "—"}</span>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {items
          .filter((it) => ("children" in it ? canSee(it.roles) : canSee(it.roles)))
          .map((it) => {
            // group
            if ("children" in it) {
              const groupActive = it.children.some((c) => isActive(c.href));
              const isOpen = !!open[it.key];

              return (
                <div key={it.key} className="space-y-1">
                  <button
                    onClick={() => setOpen((p) => ({ ...p, [it.key]: !p[it.key] }))}
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm border transition",
                      groupActive
                        ? "bg-white/10 border-white/10 text-white"
                        : "text-slate-300 border-transparent hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span>{it.label}</span>
                    <span className={cn("text-xs opacity-80 transition", isOpen ? "rotate-180" : "")}>
                      ▾
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="pl-2 space-y-1">
                      {it.children.map((c) => (
                        <Link
                          key={c.href}
                          href={c.href}
                          className={cn(
                            "block rounded-xl px-3 py-2 text-sm border border-transparent",
                            isActive(c.href)
                              ? "bg-white/10 border-white/10 text-white"
                              : "text-slate-300 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {c.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            // normal item
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "block rounded-xl px-3 py-2 text-sm border border-transparent",
                  isActive(it.href)
                    ? "bg-white/10 border-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                {it.label}
              </Link>
            );
          })}
      </nav>

      <div className="mt-auto p-3 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
