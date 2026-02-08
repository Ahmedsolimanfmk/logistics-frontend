import { apiGet, apiPost, apiPatch } from "@/src/lib/api";

export type UserRow = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ListUsersParams = {
  q?: string;
  role?: string;
  is_active?: "true" | "false" | "";
  take?: number;
  skip?: number;
};

export async function listUsers(params: ListUsersParams) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.role) sp.set("role", params.role);
  if (params.is_active) sp.set("is_active", params.is_active);
  if (typeof params.take === "number") sp.set("take", String(params.take));
  if (typeof params.skip === "number") sp.set("skip", String(params.skip));

  const qs = sp.toString();
  return await apiGet<{ items: UserRow[]; total: number }>(
    `/users${qs ? `?${qs}` : ""}`
  );
}

export async function createUser(body: {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  role: string;
  password: string;
}) {
  return await apiPost<{ data: UserRow }>(`/users`, body);
}

export async function setUserStatus(id: string, is_active: boolean) {
  return await apiPatch<{ data: UserRow }>(`/users/${id}/status`, { is_active });
}

export async function resetUserPassword(id: string, newPassword: string) {
  return await apiPost<{ ok: true }>(`/users/${id}/reset-password`, { newPassword });
}
