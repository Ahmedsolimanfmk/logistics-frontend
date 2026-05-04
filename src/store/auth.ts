"use client";

import { create } from "zustand";

export type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  effective_role?: string;
  platform_role?: string;
  company_id?: string | null;
  company_name?: string | null; // 🔥 NEW
};

export type AuthState = {
  token: string | null;
  user: User | null;
  company_id: string | null;
  hasHydrated: boolean;

  setAuth: (token: string, user: User) => void;
  hydrate: () => void;
  logout: () => void;
};
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}
function normalizeUser(u: any): User {
  const effectiveRole = String(
    u?.effective_role ||
      (String(u?.platform_role || "").toUpperCase() === "SUPER_ADMIN"
        ? "SUPER_ADMIN"
        : u?.role) ||
      ""
  ).toUpperCase();

  const platformRole = String(
    u?.platform_role || effectiveRole || ""
  ).toUpperCase();

  return {
    id: String(u?.id || ""),
    full_name: String(u?.full_name || ""),
    email: String(u?.email || ""),
    role: effectiveRole,
    effective_role: effectiveRole,
    platform_role: platformRole,

    company_id: u?.company_id || null,
    company_name: u?.company_name || null, // 🔥 NEW
  };
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  company_id: null,
  hasHydrated: false,

  setAuth: (token, userRaw) => {
  const user = normalizeUser(userRaw);

  try {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("company_id", user.company_id || "");

    // 🔥 مهم جدا للميدل وير
    setCookie("token", token);
    if (user.company_id) {
      setCookie("company_id", user.company_id);
    }
  } catch {}

  set({
    token,
    user,
    company_id: user.company_id || null,
    hasHydrated: true,
  });
},

  hydrate: () => {
    try {
      const token = localStorage.getItem("token");
      const userRaw = localStorage.getItem("user");
      const companyId = localStorage.getItem("company_id");
      const companyName = localStorage.getItem("company_name");

      const parsed = userRaw ? JSON.parse(userRaw) : null;
      const user = parsed ? normalizeUser(parsed) : null;

      if (user) {
        user.company_name = companyName || user.company_name || null;
      }

      set({
        token,
        user,
        company_id: companyId || user?.company_id || null,
        hasHydrated: true,
      });
    } catch {
      set({
        token: null,
        user: null,
        company_id: null,
        hasHydrated: true,
      });
    }
  },

  logout: () => {
  try {
    localStorage.clear();

    deleteCookie("token");
    deleteCookie("company_id");
  } catch {}

  set({
    token: null,
    user: null,
    company_id: null,
    hasHydrated: true,
  });

  window.location.href = "/login";
},
  
}));