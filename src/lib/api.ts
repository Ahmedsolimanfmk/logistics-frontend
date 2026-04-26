import axios from "axios";

// =====================
// Runtime API base
// =====================
function cleanBase(v: any): string {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.includes("__NEXT_PUBLIC_API_BASE__")) return "";
  return s.replace(/\/+$/, "");
}

function getRuntimeApiBase(): string {
  if (typeof window !== "undefined") {
    const rt = cleanBase((window as any).__ENV__?.NEXT_PUBLIC_API_BASE);
    if (rt) return rt;
  }

  const envBase = cleanBase(process.env.NEXT_PUBLIC_API_BASE);
  if (envBase) return envBase;

  return "http://localhost:3000";
}

// =====================
// Auth / Company helpers
// =====================
function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem("token");
  } catch {
    return null;
  }
}

function getStoredCompanyId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const direct =
      localStorage.getItem("company_id") ||
      localStorage.getItem("companyId") ||
      localStorage.getItem("active_company_id");

    if (direct) return direct;

    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      const user = JSON.parse(userRaw);
      return (
        user?.company_id ||
        user?.companyId ||
        user?.active_company_id ||
        user?.company?.id ||
        null
      );
    }

    return null;
  } catch {
    return null;
  }
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch {
    // ignore
  }
}

function shouldRedirectToLogin(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname || "";
  return p !== "/login";
}

// =====================
// Axios instance
// =====================
export const api = axios.create({
  withCredentials: true,
});

// =====================
// Request interceptor
// =====================
api.interceptors.request.use((config) => {
  const base = getRuntimeApiBase();
  if (base) config.baseURL = base;

  const token = getStoredToken();
  const companyId = getStoredCompanyId();

  const h: any = config.headers || {};

  if (typeof h.set === "function") {
    if (token) h.set("Authorization", `Bearer ${token}`);
    if (companyId) h.set("x-company-id", companyId);
    config.headers = h;
  } else {
    config.headers = {
      ...(config.headers as any),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(companyId ? { "x-company-id": companyId } : {}),
    };
  }

  return config;
});

// =====================
// Response interceptor
// =====================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Unexpected error";

    if (status === 401) {
      clearStoredAuth();

      if (typeof window !== "undefined" && shouldRedirectToLogin()) {
        window.location.href = "/login";
      }
    }

    return Promise.reject({
      ...error,
      message,
      status,
    });
  }
);

// =====================
// Legacy explicit auth wrappers
// =====================
export async function apiAuthGet<T = any>(
  path: string,
  params?: any
): Promise<T> {
  const res = await api.get(path, { params });
  return res.data as T;
}

export async function apiAuthPost<T = any>(
  path: string,
  body?: any
): Promise<T> {
  const res = await api.post(path, body);
  return res.data as T;
}

export async function apiAuthPatch<T = any>(
  path: string,
  body?: any
): Promise<T> {
  const res = await api.patch(path, body);
  return res.data as T;
}

export async function apiAuthDelete<T = any>(path: string): Promise<T> {
  const res = await api.delete(path);
  return res.data as T;
}

// =====================
// Thin wrappers
// =====================
export async function apiGet<T = any>(
  path: string,
  params?: any
): Promise<T> {
  const res = await api.get(path, { params });
  return res.data as T;
}

export async function apiPost<T = any>(
  path: string,
  body?: any
): Promise<T> {
  const res = await api.post(path, body);
  return res.data as T;
}

export async function apiPatch<T = any>(
  path: string,
  body?: any
): Promise<T> {
  const res = await api.patch(path, body);
  return res.data as T;
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const res = await api.delete(path);
  return res.data as T;
}

// =====================
// Transitional helpers
// =====================
export function unwrapItems<T = any>(res: any): T[] {
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d as T[];
  if (Array.isArray(d?.items)) return d.items as T[];
  if (Array.isArray(d?.data?.items)) return d.data.items as T[];
  if (Array.isArray(d?.result)) return d.result as T[];
  return [];
}

export function unwrapTotal(res: any): number {
  const d = res?.data ?? res;

  const raw =
    d?.total ??
    d?.count ??
    d?.meta?.total ??
    d?.data?.total ??
    d?.data?.count ??
    d?.pagination?.total;

  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}