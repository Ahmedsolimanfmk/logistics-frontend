import { api } from "@/src/lib/api";

export type PartOption = {
  id: string;
  name: string;
  part_number?: string | null;
  brand?: string | null;
  unit?: string | null;
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

export const partsService = {
  async listOptions(params?: { q?: string; limit?: number }) {
    const res = await api.get(
      `/inventory/parts${qs({
        q: params?.q,
        active: 1,
      })}`
    );

    const items = Array.isArray(res.data?.items) ? res.data.items : [];

    return {
      items: items.map((p: any) => ({
        id: p.id,
        name: p.name,
        part_number: p.part_number ?? null,
        brand: p.brand ?? null,
        unit: p.unit ?? null,
      })) as PartOption[],
    };
  },
};

export default partsService;