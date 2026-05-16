"use client";

import { create } from "zustand";

export type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  platform_role?: string;
  company_id?: string | null;
  company_name?: string | null;
  is_impersonating?: boolean;
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

// 🔥 أهم حاجة هنا
function normalizeUser(u: any): User {
  return {
    id: String(u?.id || ""),
    full_name: String(u?.full_name || ""),
    email: String(u?.email || ""),

    role: String(u?.role || "").toUpperCase(),
    platform_role: String(u?.platform_role || "").toUpperCase(),

    company_id: u?.company_id || null,
    company_name: u?.company_name || null,

    is_impersonating: !!u?.is_impersonating,
  };
}
function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/`;
}

// 🔥 دي النقطة السحرية
export function getEffectiveRole(user: User | null): string {
  if (!user) return "";

  if (user.platform_role === "SUPER_ADMIN" && user.is_impersonating) {
    return user.role; // 👈 يتحول لدور الشركة
  }

  return user.platform_role || user.role;
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

setCookie("token", token);

if (user.company_id) {
  setCookie("company_id", user.company_id);
}
      localStorage.setItem("user", JSON.stringify(user));

      if (user.company_id) {
        localStorage.setItem("company_id", user.company_id);
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

      const parsed = userRaw ? JSON.parse(userRaw) : null;
      const user = parsed ? normalizeUser(parsed) : null;

      set({
        token,
        user,
        company_id: user?.company_id || null,
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
    localStorage.clear();

deleteCookie("token");
deleteCookie("company_id");

    set({
      token: null,
      user: null,
      company_id: null,
      hasHydrated: true,
    });

    window.location.href = "/login";
  },
}));