export type WorkOrderVehicleRef = {
  fleet_no?: string | null;
  plate_no?: string | null;
  display_name?: string | null;
} | null;

export type WorkOrderListItem = {
  id: string;
  status?: string | null;
  type?: string | null;
  vendor_name?: string | null;
  opened_at?: string | null;
  vehicle_id?: string | null;
  vehicles?: WorkOrderVehicleRef;
};

export type WorkOrdersListFilters = {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
};