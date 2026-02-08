import axios from "axios";

// =====================
// API base (runtime first)
// =====================
function getRuntimeApiBase(): string {
  if (typeof window !== "undefined") {
    const rt = (window as any).__ENV__?.NEXT_PUBLIC_API_BASE;
    const v = String(rt || "").trim();
    if (v) return v;
  }

  const v2 = String(process.env.NEXT_PUBLIC_API_BASE || "").trim();
  if (v2) return v2;

  return "http://localhost:3000";
}

export const api = axios.create({
  baseURL: getRuntimeApiBase(),
  withCredentials: true,
});

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
