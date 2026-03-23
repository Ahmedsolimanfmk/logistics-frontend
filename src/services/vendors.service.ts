import { api } from "@/src/lib/api";
import type { ApiListResponse } from "@/src/types/api.types";
import type {
  Vendor,
  VendorListFilters,
  VendorOption,
  VendorPayload,
} from "@/src/types/vendors.types";

function normalizeVendorsList(body: any): ApiListResponse<Vendor> {
  const items = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body)
    ? body
    : Array.isArray(body?.data?.items)
    ? body.data.items
    : Array.isArray(body?.data)
    ? body.data
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
    page: Number(body?.meta?.page || body?.page || body?.data?.meta?.page || 1),
    pages: Number(body?.meta?.pages || body?.pages || body?.data?.meta?.pages || 1),
  };
}

function normalizeVendorOptions(body: any): VendorOption[] {
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

export const vendorsService = {
  async list(filters: VendorListFilters = {}): Promise<ApiListResponse<Vendor>> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 25,
      limit: filters.pageSize || 25,
    };

    if (filters.q?.trim()) params.q = filters.q.trim();
    if (filters.vendor_type) params.vendor_type = filters.vendor_type;
    if (filters.classification) params.classification = filters.classification;
    if (filters.status) params.status = filters.status;

    const res = await api.get("/vendors", { params });
    const body = res.data ?? res;
    return normalizeVendorsList(body);
  },

  async listOptions(): Promise<VendorOption[]> {
    const res = await api.get("/vendors/options/list");
    const body = res.data ?? res;
    return normalizeVendorOptions(body);
  },

  async getById(id: string): Promise<Vendor> {
    const res = await api.get(`/vendors/${id}`);
    const body = res.data ?? res;
    return (body?.data || body?.item || body?.vendor || body) as Vendor;
  },

  async create(payload: VendorPayload) {
    const res = await api.post("/vendors", payload);
    return res.data ?? res;
  },

  async update(id: string, payload: VendorPayload) {
    const res = await api.put(`/vendors/${id}`, payload);
    return res.data ?? res;
  },

  async toggle(id: string) {
    const res = await api.patch(`/vendors/${id}/toggle`, {});
    return res.data ?? res;
  },
};