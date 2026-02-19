// src/lib/partItems.api.ts
import { apiGet } from "@/src/lib/api";
import type { Warehouse, Part } from "@/src/lib/inventory.api";

export type PartItemStatus = "IN_STOCK" | "RESERVED" | "ISSUED" | "INSTALLED" | "SCRAPPED";

export type PartItem = {
  id: string;
  part_id: string;
  warehouse_id: string;

  internal_serial: string;
  manufacturer_serial: string;

  status: PartItemStatus;

  received_at?: string | null;
  last_moved_at?: string | null;

  installed_vehicle_id?: string | null;
  installed_at?: string | null;

  parts?: Part;
  warehouses?: Warehouse;
};

export async function listPartItems(params?: {
  q?: string;
  warehouse_id?: string;
  part_id?: string;
  status?: string;
}) {
  return apiGet<{ items: PartItem[] }>("/inventory/part-items", params);
}
