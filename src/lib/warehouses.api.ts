// src/lib/warehouses.api.ts
import { apiGet, unwrapItems } from "@/src/lib/api";

export type Warehouse = {
  id: string;
  name: string;
  location?: string | null;
  is_active?: boolean;
};

export async function listWarehouses(): Promise<Warehouse[]> {
  const res = await apiGet("/inventory/warehouses");
  return unwrapItems<Warehouse>(res);
}