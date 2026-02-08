// src/lib/api.ts
import axios from "axios";
import { useAuth } from "@/src/store/auth";

declare global {
  interface Window {
    __ENV__?: Record<string, any>;
  }
}

// =====================
// Token helper
// =====================
function getToken(): string | null {
  const s: any = useAuth.getState?.();
  const t1 = s?.token || s?.access_token || s?.accessToken || null;
  if (t1) return String(t1);

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
// API base (runtime first)
// =====================
function getRuntimeApiBase(): string {
  if (typeof window !== "undefined") {
    const w: any = window;
    const v =
      w?.__ENV__?.NEXT_PUBLIC_API_BASE ||
      w?.__ENV__?.NEXT_PUBLIC_API_URL ||
      null;
    if (v) return String(v);
  }

  return (
    process.env.NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:3000"
  );
}

// =====================
// Axios instance (ONE ONLY)
// =====================
export const api = axios.create({
  baseURL: getRuntimeApiBase(),
  withCredentials: true,
  timeout: 30000,
});

// attach token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

// normalize response
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Request failed";
    return Promise.reject(new Error(String(msg)));
  }
);

// =====================
// helpers
// =====================
export function unwrapItems<T = any>(res: any): T[] {
  if (Array.isArray(res)) return res;
  const items =
    res?.items ??
    res?.data?.items ??
    res?.result?.items ??
    res?.payload?.items ??
    null;
  return Array.isArray(items) ? items : [];
}

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

// convenience
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
