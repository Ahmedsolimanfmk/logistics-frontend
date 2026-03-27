import { api } from "@/src/lib/api";
import type {
  PartItem,
  PartItemsFilters,
} from "@/src/types/part-items.types";

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
    name: item.name ?? item.parts?.name ?? null,
    brand: item.brand ?? item.parts?.brand ?? null,
    category: item.category ?? item.parts?.category ?? null,
    unit: item.unit ?? item.parts?.unit ?? null,
  };
}

export const partItemsService = {
  async list(filters: PartItemsFilters = {}): Promise<PartItem[]> {
    const res = await api.get("/inventory/part-items", {
      params: filters,
    });

    return asArray<PartItem>(res.data ?? res).map(normalizePartItem);
  },
};

export default partItemsService;