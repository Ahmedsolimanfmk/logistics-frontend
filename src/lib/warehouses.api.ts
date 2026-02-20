// src/lib/warehouses.api.ts
import { apiGet } from "@/src/lib/api";

export type Warehouse = {
  id: string;
  name: string;
};

export async function listWarehouses(): Promise<Warehouse[]> {
  return apiGet("/inventory/warehouses");
}
