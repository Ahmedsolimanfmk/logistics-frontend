import { api } from "@/src/lib/api";
import type { ApiListResponse } from "@/src/types/api.types";
import type {
  UserRow,
  UsersListFilters,
  CreateUserPayload,
  ResetUserPasswordPayload,
  SetUserStatusPayload,
} from "@/src/types/users.types";

function normalizeUsersList(body: any): ApiListResponse<UserRow> {
  const items = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body)
    ? body
    : Array.isArray(body?.data?.items)
    ? body.data.items
    : [];

  const totalRaw =
    body?.meta?.total ??
    body?.total ??
    body?.count ??
    body?.data?.total ??
    body?.data?.count ??
    items.length;

  return {
    items,
    total: Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : items.length,
    page: Number(body?.meta?.page || 1),
    pages: Number(body?.meta?.pages || 1),
  };
}

export const usersService = {
  async list(filters: UsersListFilters = {}): Promise<ApiListResponse<UserRow>> {
    const params: Record<string, any> = {};

    if (filters.q?.trim()) params.q = filters.q.trim();
    if (filters.role?.trim()) params.role = filters.role.trim();
    if (filters.is_active === "true" || filters.is_active === "false") {
      params.is_active = filters.is_active;
    }
    if (typeof filters.take === "number") params.take = filters.take;
    if (typeof filters.skip === "number") params.skip = filters.skip;

    const res = await api.get("/users", { params });
    const body = res.data ?? res;
    return normalizeUsersList(body);
  },

  async create(payload: CreateUserPayload) {
    const res = await api.post("/users", payload);
    return res.data ?? res;
  },

  async setStatus(userId: string, is_active: boolean) {
    const payload: SetUserStatusPayload = { is_active };
    const res = await api.patch(`/users/${userId}/status`, payload);
    return res.data ?? res;
  },

  async resetPassword(userId: string, password: string) {
    const payload: ResetUserPasswordPayload = { password };
    const res = await api.post(`/users/${userId}/reset-password`, payload);
    return res.data ?? res;
  },
};