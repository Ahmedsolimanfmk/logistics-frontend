export type TripStatus =
  | "DRAFT"
  | "APPROVED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | string;

export type TripFinancialStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "CLOSED"
  | string;

export type TripProfitStatus =
  | "PROFIT"
  | "LOSS"
  | "BREAK_EVEN"
  | string;

export type TripClientRef = {
  id?: string;
  name?: string | null;
} | null;

export type TripSiteRef = {
  id?: string;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  client_id?: string | null;
} | null;

export type TripContractRef = {
  id?: string;
  contract_no?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  currency?: string | null;
} | null;

export type TripRouteRef = {
  id?: string;
  code?: string | null;
  name?: string | null;
  origin_label?: string | null;
  destination_label?: string | null;
  distance_km?: number | string | null;
} | null;

export type TripCargoTypeRef = {
  id?: string;
  code?: string | null;
  name?: string | null;
} | null;

export type TripVehicleRef = {
  id?: string;
  fleet_no?: string | null;
  plate_no?: string | null;
  plate_number?: string | null;
  display_name?: string | null;
  status?: string | null;
  is_active?: boolean;
  vehicle_class_id?: string | null;
} | null;

export type TripDriverRef = {
  id?: string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
} | null;

export type TripSupervisorRef = {
  id?: string;
  full_name?: string | null;
  email?: string | null;
} | null;

export type TripAssignment = {
  id?: string;
  trip_id?: string;
  vehicle_id?: string | null;
  driver_id?: string | null;
  field_supervisor_id?: string | null;
  assigned_at?: string | null;
  is_active?: boolean;
  unassigned_at?: string | null;
  vehicles?: TripVehicleRef;
  drivers?: TripDriverRef;
  users_trip_assignments_supervisor?: TripSupervisorRef;
};

export type Trip = {
  id: string;
  trip_code?: string | null;

  status?: TripStatus | null;
  financial_status?: TripFinancialStatus | null;

  scheduled_at?: string | null;
  actual_departure_at?: string | null;
  actual_arrival_at?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
  notes?: string | null;

  client_id?: string | null;
  contract_id?: string | null;
  site_id?: string | null;
  pickup_site_id?: string | null;
  dropoff_site_id?: string | null;
  route_id?: string | null;
  cargo_type_id?: string | null;

  trip_type?: string | null;
  origin?: string | null;
  destination?: string | null;
  cargo_weight?: number | string | null;

  agreed_revenue?: number | string | null;
  revenue_currency?: string | null;
  revenue_entry_mode?: string | null;

  revenue?: number;
  expenses?: number;
  company_expenses?: number;
  advance_expenses?: number;
  profit?: number;
  profit_status?: TripProfitStatus | null;
  currency?: string | null;

  clients?: TripClientRef;
  site?: TripSiteRef;
  sites?: TripSiteRef; // fallback for old responses
  pickup_site?: TripSiteRef;
  dropoff_site?: TripSiteRef;
  routes?: TripRouteRef;
  cargo_types?: TripCargoTypeRef;
  client_contracts?: TripContractRef;
  contract?: TripContractRef;

  trip_assignments?: TripAssignment[];
};

export type TripListFilters = {
  page?: number;
  pageSize?: number;
  status?: string;
  client_id?: string;
  route_id?: string;
};

export type TripCreatePayload = {
  client_id: string;
  contract_id?: string | null;
  site_id: string;
  scheduled_at?: string | null;
  notes?: string | null;
};

export type TripAssignPayload = {
  vehicle_id: string;
  driver_id: string;
  field_supervisor_id?: string | null;
};

export type TripOptionClient = {
  id: string;
  name?: string | null;
};

export type TripOptionSite = {
  id: string;
  name?: string | null;
  address?: string | null;
  city?: string | null;
  client_id?: string | null;
};

export type TripOptionVehicle = {
  id: string;
  fleet_no?: string | null;
  plate_no?: string | null;
  plate_number?: string | null;
  display_name?: string | null;
  status?: string | null;
  is_active?: boolean;
  vehicle_class_id?: string | null;
};

export type TripOptionDriver = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
};

export type TripOptionSupervisor = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};