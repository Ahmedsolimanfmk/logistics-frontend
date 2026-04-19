import { api } from "@/src/lib/api";

// =====================
// Types (lightweight)
// =====================
export type UUID = string;

export type MaintenanceRequest = {
  id: UUID;
  vehicle_id: UUID;
  problem_title: string;
  problem_description?: string | null;
  status: "SUBMITTED" | "APPROVED" | "REJECTED" | string;
  requested_by: UUID;
  requested_at: string;
  created_at: string;
  updated_at: string;
};

export type ListParams = {
  page?: number;
  limit?: number;
  status?: string;
  vehicle_id?: UUID;
};

export type Paginated<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; pages: number };
};

export type CreateRequestPayload = {
  vehicle_id: UUID;
  problem_title: string;
  problem_description?: string;
};

export type ApprovePayload = {
  vendor_id?: UUID | null;
  maintenance_mode?: "INTERNAL" | "EXTERNAL";
  type?: "CORRECTIVE" | "PREVENTIVE";
  odometer?: number | null;
  notes?: string;
};

export type RejectPayload = {
  reason: string;
};

export type VehicleOption = { id: UUID; label: string; status: string };

export type Attachment = {
  id: UUID;
  request_id: UUID;
  type: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  uploaded_by?: UUID | null;
  created_at: string;
};

// =====================
// Helpers
// =====================
function qs(params?: Record<string, any>) {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// =====================
// Service
// =====================
export const maintenanceRequestsService = {
  // List
  async list(params?: ListParams): Promise<Paginated<MaintenanceRequest>> {
    const res = await api.get(`/maintenance/requests${qs(params)}`);
    return res.data;
  },

  // Get by id
  async getById(id: UUID): Promise<{ request: MaintenanceRequest }> {
    const res = await api.get(`/maintenance/requests/${id}`);
    return res.data;
  },

  // Create
  async create(payload: CreateRequestPayload): Promise<MaintenanceRequest> {
    const res = await api.post(`/maintenance/requests`, payload);
    return res.data;
  },

  // Approve
  async approve(id: UUID, payload: ApprovePayload) {
    const res = await api.post(`/maintenance/requests/${id}/approve`, payload);
    return res.data; // { request, work_order }
  },

  // Reject
  async reject(id: UUID, payload: RejectPayload) {
    const res = await api.post(`/maintenance/requests/${id}/reject`, payload);
    return res.data; // { request }
  },

  // Vehicle options
  async vehicleOptions(): Promise<{ items: VehicleOption[] }> {
    const res = await api.get(`/maintenance/vehicles/options`);
    return res.data;
  },

  // =====================
  // Attachments
  // =====================

  // List
  async listAttachments(requestId: UUID): Promise<{ items: Attachment[] }> {
    const res = await api.get(`/maintenance/requests/${requestId}/attachments`);
    return res.data;
  },

  // Upload (FormData)
  async uploadAttachments(requestId: UUID, files: File[], types?: string[]) {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    if (types && types.length) {
      types.forEach((t) => fd.append("types", t));
    }

    const res = await api.post(
      `/maintenance/requests/${requestId}/attachments`,
      fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return res.data; // { items }
  },

  // Delete
  async deleteAttachment(attachmentId: UUID) {
    const res = await api.delete(`/maintenance/attachments/${attachmentId}`);
    return res.data;
  },
};

export default maintenanceRequestsService;
