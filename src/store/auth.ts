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

  setAuth: (token: string, user: User) => void;
  hydrate: () => void;
  logout: () => void;
};

function normalizeUser(u: any): User {
  const role = String(
    u?.effective_role ||
      (u?.platform_role === "SUPER_ADMIN" ? "SUPER_ADMIN" : u?.role) ||
      ""
  ).toUpperCase();

  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,

    role,
    effective_role: role,
    platform_role: u?.platform_role || role,
  };
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,

  setAuth: (token, userRaw) => {
    const user = normalizeUser(userRaw);

    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    } catch {}

    set({ token, user });
  },

  hydrate: () => {
    try {
      const token = localStorage.getItem("token");
      const userRaw = localStorage.getItem("user");

      const parsed = userRaw ? JSON.parse(userRaw) : null;
      const user = parsed ? normalizeUser(parsed) : null;

      set({ token, user });
    } catch {
      set({ token: null, user: null });
    }
  },

  logout: () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("auth");
      localStorage.removeItem("persist:auth");
    } catch {}

    set({ token: null, user: null });

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
}));