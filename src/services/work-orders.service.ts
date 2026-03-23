import { api } from "@/src/lib/api";
import type { ApiListResponse } from "@/src/types/api.types";
import type { WorkOrderListItem, WorkOrdersListFilters } from "@/src/types/work-orders.types";

function normalizeWorkOrdersList(body: any): ApiListResponse<WorkOrderListItem> {
  const items = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.work_orders)
    ? body.work_orders
    : Array.isArray(body?.workOrders)
    ? body.workOrders
    : Array.isArray(body?.result)
    ? body.result
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
    page: Number(body?.meta?.page || body?.data?.meta?.page || 1),
    pages: Number(body?.meta?.pages || body?.data?.meta?.pages || 1),
  };
}

export const workOrdersService = {
  async list(filters: WorkOrdersListFilters = {}): Promise<ApiListResponse<WorkOrderListItem>> {
    const params: Record<string, any> = {};

    if (typeof filters.page === "number") params.page = filters.page;
    if (typeof filters.limit === "number") params.limit = filters.limit;
    if (filters.q?.trim()) params.q = filters.q.trim();
    if (filters.status?.trim()) params.status = filters.status.trim().toUpperCase();

    const res = await api.get("/maintenance/work-orders", { params });
    const body = res.data ?? res;
    return normalizeWorkOrdersList(body);
  },
};