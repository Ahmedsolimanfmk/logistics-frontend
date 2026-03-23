export type MaintenanceRequestStatus = "SUBMITTED" | "APPROVED" | "REJECTED" | string;

export type MaintenanceRequest = {
  id: string;
  vehicle_id: string;
  problem_title: string;
  problem_description?: string | null;
  status: MaintenanceRequestStatus;

  requested_by?: string | null;
  requested_at?: string | null;

  reviewed_by?: string | null;
  reviewed_at?: string | null;

  rejection_reason?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export type VehicleOption = {
  id: string;
  label: string;
  status?: string | null;
};

export type MaintenanceRequestsListFilters = {
  status?: string;
  vehicle_id?: string;
  q?: string;
  page?: number;
  limit?: number;
};

export type CreateMaintenanceRequestPayload = {
  vehicle_id: string;
  problem_title: string;
  problem_description?: string | null;
};

export type ApproveMaintenanceRequestPayload = {
  type?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  odometer?: number | null;
  notes?: string | null;
};

export type RejectMaintenanceRequestPayload = {
  reason: string;
};

export type ApproveMaintenanceRequestResponse = {
  work_order?: {
    id?: string;
  } | null;
  work_order_id?: string | null;
  id?: string | null;
};