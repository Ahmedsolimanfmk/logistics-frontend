import { api } from "@/src/lib/api";
import type {
  CreateSupervisorPayload,
  SupervisorUser,
  SupervisorVehicle,
  UpdateVehicleSupervisorPayload,
} from "@/src/types/supervisors.types";

function asArray<T = unknown>(body: any): T[] {
  if (Array.isArray(body)) return body as T[];
  if (Array.isArray(body?.items)) return body.items as T[];
  if (Array.isArray(body?.data?.items)) return body.data.items as T[];
  if (Array.isArray(body?.data)) return body.data as T[];
  return [];
}

function normalizeSingle<T>(body: any): T {
  return (body?.data ?? body) as T;
}

export const supervisorsService = {
  async listUsers(): Promise<SupervisorUser[]> {
    const res = await api.get("/users");
    return asArray<SupervisorUser>(res.data ?? res);
  },

  async listVehicles(): Promise<SupervisorVehicle[]> {
    const res = await api.get("/vehicles", {
      params: { limit: 200 },
    });
    return asArray<SupervisorVehicle>(res.data ?? res);
  },

  async createSupervisor(payload: CreateSupervisorPayload): Promise<SupervisorUser> {
    const res = await api.post("/users", payload);
    return normalizeSingle<SupervisorUser>(res.data ?? res);
  },

  async updateVehicleSupervisor(
    vehicleId: string,
    supervisorId: string | null
  ): Promise<SupervisorVehicle> {
    const payload: UpdateVehicleSupervisorPayload = {
      supervisor_id: supervisorId,
    };

    const res = await api.patch(`/vehicles/${vehicleId}`, payload);
    return normalizeSingle<SupervisorVehicle>(res.data ?? res);
  },
};

export default supervisorsService;