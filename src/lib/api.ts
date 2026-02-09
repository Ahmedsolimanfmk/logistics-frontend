// src/lib/api.ts
import axios from "axios";

// =====================
// Runtime API base (safe + lazy)
// =====================
function cleanBase(v: any): string {
  const s = String(v || "").trim();
  if (!s) return "";
  // safety for unresolved placeholder strings
  if (s.includes("__NEXT_PUBLIC_API_BASE__")) return "";
  return s;
}

function getRuntimeApiBase(): string {
  // ✅ runtime env.js (preferred)
  if (typeof window !== "undefined") {
    const rt = cleanBase((window as any).__ENV__?.NEXT_PUBLIC_API_BASE);
    if (rt) return rt;
  }

  // ✅ build-time env (fallback)
  const v2 = cleanBase(process.env.NEXT_PUBLIC_API_BASE);
  if (v2) return v2;

  // ✅ last resort (local dev)
  return "http://localhost:3000";
}

// =====================
// Axios instance (NO baseURL here)
// =====================
export const api = axios.create({
  withCredentials: true,
});

// =====================
// Inject baseURL + token BEFORE every request
// =====================
api.interceptors.request.use((config) => {
  // ✅ baseURL lazily (env.js timing safe)
  const base = getRuntimeApiBase();
  if (base) config.baseURL = base;

  // ✅ attach token (works with AxiosHeaders)
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token");
    if (t) {
      const h: any = config.headers || {};

      // Axios v1 uses AxiosHeaders with .set()
      if (typeof h.set === "function") {
        h.set("Authorization", `Bearer ${t}`);
        config.headers = h;
      } else {
        config.headers = {
          ...(config.headers as any),
          Authorization: `Bearer ${t}`,
        };
      }
    }
  }

  return config;
});

// =====================
// Auth helper (explicit)
// =====================
export async function apiAuthGet<T = any>(path: string, params?: any): Promise<T> {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await api.get(path, {
    params,
    headers: t ? { Authorization: `Bearer ${t}` } : undefined,
  });

  return res.data as T;
}

// =====================
// Thin wrappers (legacy)
// =====================
export async function apiGet<T = any>(path: string, params?: any): Promise<T> {
  const res = await api.get(path, { params });
  return res.data as T;
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const res = await api.post(path, body);
  return res.data as T;
}

export async function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  const res = await api.patch(path, body);
  return res.data as T;
}

// =====================
// Helpers used by pages
// =====================
export function unwrapItems<T = any>(res: any): T[] {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(d?.items)) return d.items as T[];
  if (Array.isArray(d?.data?.items)) return d.data.items as T[];
  return [];
}

export function unwrapTotal(res: any): number {
  const d = res?.data ?? res;
  const t = d?.total ?? d?.count ?? d?.data?.total ?? d?.data?.count;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}
