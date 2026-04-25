import { api } from "@/src/lib/api";

export type IssuedPartRow = {
  work_order_id: string;
  part_id: string;
  part?: {
    id: string;
    name?: string | null;
    part_number?: string | null;
    brand?: string | null;
    unit?: string | null;
  } | null;
  warehouse?: {
    id: string;
    name?: string | null;
    location?: string | null;
  } | null;
  vehicle?: {
    id: string;
    fleet_no?: string | null;
    plate_no?: string | null;
    display_name?: string | null;
  } | null;
  issued_qty: number;
  installed_qty: number;
  remaining_qty: number;
  issued_at?: string | null;
  last_installed_at?: string | null;
  status: "NOT_INSTALLED" | "PARTIAL" | "INSTALLED" | string;
  installations?: any[];
  serial_items?: any[];
};

function qs(params?: Record<string, any>) {
  const sp = new URLSearchParams();

  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      sp.append(k, String(v));
    }
  });

  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const maintenanceIssuedPartsService = {
  async list(params?: { work_order_id?: string; status?: string }) {
    const res = await api.get(`/maintenance/issued-parts${qs(params)}`);

    return {
      items: Array.isArray(res.data?.items)
        ? (res.data.items as IssuedPartRow[])
        : [],
    };
  },

  async install(workOrderId: string, partId: string, payload: any) {
    const res = await api.post(
      `/maintenance/issued-parts/work-orders/${workOrderId}/parts/${partId}/install`,
      payload
    );

    return res.data;
  },
};

export default maintenanceIssuedPartsService;