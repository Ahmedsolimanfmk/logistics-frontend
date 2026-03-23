export type TripStatus =
  | "DRAFT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | string;

export type TripFinancialStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "CLOSED"
  | string;

export type TripClientRef = {
  id?: string;
  name?: string | null;
} | null;

export type TripSiteRef = {
  id?: string;
  name?: string | null;
  address?: string | null;
} | null;

export type TripVehicleRef = {
  id?: string;
  fleet_no?: string | null;
  plate_no?: string | null;
  plate_number?: string | null;
  display_name?: string | null;
  status?: string | null;
} | null;

export type TripDriverRef = {
  id?: string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
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
  created_at?: string | null;
  updated_at?: string | null;
  notes?: string | null;

  client_id?: string | null;
  site_id?: string | null;

  clients?: TripClientRef;
  sites?: TripSiteRef;
  trip_assignments?: TripAssignment[];
};

export type TripListFilters = {
  page?: number;
  pageSize?: number;
  status?: string;
};

export type TripCreatePayload = {
  client_id: string;
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
};

export type TripOptionVehicle = {
  id: string;
  fleet_no?: string | null;
  plate_no?: string | null;
  plate_number?: string | null;
  display_name?: string | null;
  status?: string | null;
  is_active?: boolean;
};

export type TripOptionDriver = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
};

export type TripOptionSupervisor = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};