import { api } from "@/src/lib/api";
import type {
  PartItem,
  PartItemsFilters,
} from "@/src/types/part-items.types";

function compact(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== "")
  );
}

function asArray<T = unknown>(body: any): T[] {
  if (Array.isArray(body)) return body as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.data?.items)) return body.data.items as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  return [];
}

function normalizePartItem(item: PartItem): PartItem {
  return {
    ...item,
    name: item.name ?? item.part?.name ?? null,
    brand: item.brand ?? item.part?.brand ?? null,
    category: item.category ?? item.part?.category ?? null,
    unit: item.unit ?? item.part?.unit ?? null,
  };
}

export const partItemsService = {
  async list(filters: PartItemsFilters = {}): Promise<PartItem[]> {
    const rawStatus = String(filters.status || "").trim().toUpperCase();
    const status = rawStatus && rawStatus !== "ALL" ? rawStatus : undefined;

    const res = await api.get("/inventory/part-items", {
      params: compact({
        q: filters.q,
        warehouse_id: filters.warehouse_id,
        part_id: filters.part_id,
        status,
      }),
    });

    return asArray<PartItem>(res?.data ?? res).map(normalizePartItem);
  },
};

export default partItemsService;