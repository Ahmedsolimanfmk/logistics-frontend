import { api } from "@/src/lib/api";

export type StockItem = {
  id: string;
  warehouse_id: string;
  warehouse_name: string | null;
  warehouse_location?: string | null;

  part_id: string;
  part_name: string | null;
  part_number: string | null;
  brand?: string | null;
  unit?: string | null;

  qty_on_hand: number;
};

function qs(params?: Record<string, any>) {
  const sp = new URLSearchParams();

  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      sp.append(k, String(v));
    }
  });

  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const stockService = {
  async list(params?: {
    warehouse_id?: string;
    part_id?: string;
    q?: string;
  }) {
    const res = await api.get(`/inventory/stock${qs(params)}`);
    return {
      items: Array.isArray(res.data?.items) ? (res.data.items as StockItem[]) : [],
    };
  },
};

export default stockService;