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
  // ✅ استخدم نفس المتغير اللي بتحطه في Cloud Run
  // NEXT_PUBLIC_API_BASE=https://.../run.app
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000",
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

// ✅ unwrap items: يدعم [] أو {items: []} أو {data:{items:[]}} ... الخ
// ملاحظة: لأن interceptor بيرجع data مباشرة، فـ res هنا غالبًا هو "data"
export function unwrapItems<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res as T[];

  const items =
    res?.items ??
    res?.data?.items ??
    res?.result?.items ??
    res?.payload?.items ??
    null;

  if (Array.isArray(items)) return items as T[];

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

// =======================
// Convenience helpers
// =======================
// ✅ IMPORTANT: لأن interceptor بيرجع data مباشرة
// فـ api.get/post/.. بيرجع data وليس AxiosResponse
export async function apiGet<T = any>(path: string, config?: any): Promise<T> {
  return (await api.get(path, config)) as any as T;
}

export async function apiPost<T = any>(
  path: string,
  body?: any,
  config?: any
): Promise<T> {
  return (await api.post(path, body, config)) as any as T;
}

export async function apiPut<T = any>(
  path: string,
  body?: any,
  config?: any
): Promise<T> {
  return (await api.put(path, body, config)) as any as T;
}

export async function apiPatch<T = any>(
  path: string,
  body?: any,
  config?: any
): Promise<T> {
  return (await api.patch(path, body, config)) as any as T;
}

export async function apiDelete<T = any>(path: string, config?: any): Promise<T> {
  return (await api.delete(path, config)) as any as T;
}
