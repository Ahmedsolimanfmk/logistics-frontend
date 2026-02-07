// src/lib/api.ts
import axios from "axios";
import { useAuth } from "@/src/store/auth";

// =====================
// Token helper
// =====================
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

// =====================
// Axios instance
// =====================
export const api = axios.create({
  // ✅ خليك موحّد: NEXT_PUBLIC_API_URL
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});

// Request: attach token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response: return data directly + normalize errors
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

// =====================
// Helpers (UI pages)
// =====================

// ✅ unwrap items: يدعم {items: []} أو [] أو {data:{items:[]}} ... الخ
export function unwrapItems<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];

  const items =
    res?.items ??
    res?.data?.items ??
    res?.result?.items ??
    res?.payload?.items ??
    null;

  if (Array.isArray(items)) return items as T[];

  // fallback آمن
  return [];
}

// ✅ unwrap total: يدعم total في مستويات مختلفة
export function unwrapTotal(res: any): number {
  const v =
    res?.total ??
    res?.meta?.total ??
    res?.data?.total ??
    res?.data?.meta?.total ??
    res?.result?.total ??
    0;

  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
