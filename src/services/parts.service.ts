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
    if (v !== undefined && v !== null && v !== "") sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const partsService = {
  async listOptions(params?: { q?: string; limit?: number }) {
    const res = await api.get(`/parts${qs({ q: params?.q, limit: params?.limit ?? 20 })}`);
    const body = res.data;

    const items = Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body)
      ? body
      : [];

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