// src/store/auth.ts
"use client";

import { create } from "zustand";

export type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export type AuthState = {
  token: string | null;
  user: User | null;

  setAuth: (token: string, user: User) => void;
  hydrate: () => void;
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  token: null,
  user: null,

  setAuth: (token, user) => {
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
      const user = userRaw ? (JSON.parse(userRaw) as User) : null;

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
