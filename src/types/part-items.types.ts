export type ItemStatus =
  | "IN_STOCK"
  | "RESERVED"
  | "ISSUED"
  | "INSTALLED"
  | "SCRAPPED"
  | string;

export interface PartRef {
  id: string;
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  unit?: string | null;
  part_number?: string | null;
}

export interface WarehouseRef {
  id: string;
  name?: string | null;
  location?: string | null;
}

export interface PartItem {
  id: string;
  part_id: string;
  warehouse_id: string;

  status?: ItemStatus | null;

  internal_serial?: string | null;
  manufacturer_serial?: string | null;

  received_at?: string | null;
  last_moved_at?: string | null;

  part?: PartRef | null;
  warehouse?: WarehouseRef | null;

  // flattened for UI convenience
  name?: string | null;
  brand?: string | null;
  category?: string | null;
  unit?: string | null;
}

export interface PartItemsFilters {
  q?: string;
  warehouse_id?: string;
  part_id?: string;
  status?: string;
}