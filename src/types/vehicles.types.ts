export type VehicleStatus =
  | "AVAILABLE"
  | "IN_USE"
  | "MAINTENANCE"
  | "DISABLED"
  | string;

export type Vehicle = {
  id: string;
  fleet_no: string;
  plate_no: string;
  display_name?: string | null;
  status?: VehicleStatus | null;
  is_active?: boolean;
  model?: string | null;
  year?: number | null;
  current_odometer?: number | null;
  gps_device_id?: string | null;

  license_no?: string | null;
  license_issue_date?: string | null;
  license_expiry_date?: string | null;

  disable_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type VehicleListFilters = {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  active?: string;
};

export type VehiclePayload = {
  fleet_no: string;
  plate_no: string;
  display_name?: string | null;
  status?: string;
  model?: string | null;
  year?: number | null;
  current_odometer?: number | null;
  gps_device_id?: string | null;
  license_no?: string | null;
  license_issue_date?: string | null;
  license_expiry_date?: string | null;
};

export type VehicleSummaryResponse = {
  vehicle: Vehicle | null;
  summary: {
    total_trips?: number;
    completed_trips?: number;
    active_trips?: number;
    total_expenses?: number;
    expenses_count?: number;
    approved_expenses?: number;
  };
  recent_trips: any[];
  recent_expenses: any[];
};