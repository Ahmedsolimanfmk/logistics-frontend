import { api } from "@/src/lib/api";

export type WarehouseOption = {
  id: string;
  name: string;
  location?: string | null;
  is_active?: boolean;
};

export const warehousesService = {
  async listOptions() {
    const res = await api.get("/inventory/warehouses?active=1");

    const items = Array.isArray(res.data?.items) ? res.data.items : [];

    return {
      items: items.map((w: any) => ({
        id: w.id,
        name: w.name,
        location: w.location ?? null,
        is_active: w.is_active,
      })) as WarehouseOption[],
    };
  },
};

export default warehousesService;