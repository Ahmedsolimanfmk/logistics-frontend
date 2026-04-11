import { api } from "@/src/lib/api";

function asArray<T = unknown>(body: any): T[] {
  if (Array.isArray(body)) return body as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.data?.items)) return body.data.items as T[];
  return [];
}

export const categoriesService = {
  async list(params?: { q?: string }) {
    const res = await api.get("/inventory/categories", {
      params,
    });

    return asArray(res?.data ?? res);
  },

  async create(data: { name: string; code?: string }) {
    const res = await api.post("/inventory/categories", data);
    return res?.data ?? res;
  },

  async update(id: string, data: Partial<{ name: string; code: string; is_active: boolean }>) {
    const res = await api.patch(`/inventory/categories/${id}`, data);
    return res?.data ?? res;
  },

  async delete(id: string) {
    const res = await api.delete(`/inventory/categories/${id}`);
    return res?.data ?? res;
  },
};