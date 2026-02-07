// src/lib/api.ts
import axios from "axios";
import { useAuth } from "@/src/store/auth";

function getToken(): string | null {
  // 1) من الـ store
  const s: any = useAuth.getState?.();
  const t1 = s?.token || s?.access_token || s?.accessToken || null;
  if (t1) return String(t1);

  // 2) fallback من localStorage
  if (typeof window !== "undefined") {
    const t2 =
      window.localStorage.getItem("token") ||
      window.localStorage.getItem("access_token") ||
      window.localStorage.getItem("accessToken");
    if (t2) return String(t2);
  }

  return null;
}

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ IMPORTANT: return data directly
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";
    return Promise.reject(new Error(msg));
  }
);
