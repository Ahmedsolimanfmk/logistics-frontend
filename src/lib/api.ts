import axios, { AxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: false,
});

// =========================
// Request interceptor
// =========================
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    const companyId = localStorage.getItem("company_id");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (companyId) {
      config.headers["x-company-id"] = companyId;
    }
  }

  return config;
});

// =========================
// Helpers
// =========================

export async function apiGet<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await api.get(url, config);
  return res.data;
}

export async function apiPost<T = any>(
  url: string,
  body?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await api.post(url, body, config);
  return res.data;
}

export async function apiPatch<T = any>(
  url: string,
  body?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await api.patch(url, body, config);
  return res.data;
}

export async function apiDelete<T = any>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await api.delete(url, config);
  return res.data;
}

// =========================
// unwrapItems
// =========================

export function unwrapItems<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  return [];
}
// =========================
// Auth helpers
// =========================

export async function apiAuthGet<T = any>(
  url: string,
  tokenOrConfig?: any
): Promise<T> {
  let token: string | undefined;
  let config: any = {};

  // لو string → token
  if (typeof tokenOrConfig === "string") {
    token = tokenOrConfig;
  }

  // لو object → config
  else if (typeof tokenOrConfig === "object") {
    config = tokenOrConfig;
  }

  const res = await api.get(url, {
    ...config,
    headers: {
      ...(config?.headers || {}),
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
  });

  return res.data;
}

export async function apiAuthPost<T = any>(
  url: string,
  tokenOrBody?: any,
  maybeBody?: any
): Promise<T> {
  let token: string | undefined;
  let body: any;

  // support old signature
  if (
    typeof tokenOrBody === "object" ||
    tokenOrBody === undefined
  ) {
    body = tokenOrBody;
  } else {
    token = tokenOrBody;
    body = maybeBody;
  }

  const res = await api.post(url, body, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  return res.data;
}
export async function apiAuthPatch<T = any>(
  url: string,
  token?: string,
  body?: any
): Promise<T> {
  const res = await api.patch(url, body, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  return res.data;
}