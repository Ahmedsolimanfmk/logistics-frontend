"use client";

import { create } from "zustand";

export type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  effective_role?: string;
  platform_role?: string;
};

export type AuthState = {
  token: string | null;
  user: User | null;
  hasHydrated: boolean;

  setAuth: (token: string, user: User) => void;
  hydrate: () => void;
  logout: () => void;
};

function normalizeUser(u: any): User {
  const effectiveRole = String(
    u?.effective_role ||
      (String(u?.platform_role || "").toUpperCase() === "SUPER_ADMIN"
        ? "SUPER_ADMIN"
        : u?.role) ||
      ""
  ).toUpperCase();

  const platformRole = String(u?.platform_role || effectiveRole || "").toUpperCase();

  return {
    id: String(u?.id || ""),
    full_name: String(u?.full_name || ""),
    email: String(u?.email || ""),
    role: effectiveRole,
    effective_role: effectiveRole,
    platform_role: platformRole,
  };
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  hasHydrated: false,

  setAuth: (token, userRaw) => {
    const user = normalizeUser(userRaw);

    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    } catch {}

    set({ token, user, hasHydrated: true });
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
        hasHydrated: true,
      });
    } catch {
      set({
        token: null,
        user: null,
        hasHydrated: true,
      });
    }
  },

  logout: () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("auth");
      localStorage.removeItem("persist:auth");
    } catch {}

    set({ token: null, user: null, hasHydrated: true });

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
}));