export type ToastType = "success" | "error";

export interface SupervisorUser {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SupervisorVehicle {
  id: string;
  fleet_no?: string | null;
  plate_no?: string | null;
  display_name?: string | null;
  status?: string | null;
  is_active?: boolean;
  supervisor_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateSupervisorPayload {
  full_name: string;
  phone?: string | null;
  email?: string | null;
  password: string;
  role: "FIELD_SUPERVISOR";
}

export interface UpdateVehicleSupervisorPayload {
  supervisor_id: string | null;
}