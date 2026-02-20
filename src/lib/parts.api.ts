import { apiGet } from "@/src/lib/api";

export type Part = {
  id: string;
  name: string;
  brand?: string | null;
  internal_code?: string | null;
};

export async function listParts(): Promise<Part[]> {
  // backend route: GET /inventory/parts
  return apiGet("/inventory/parts");
}
