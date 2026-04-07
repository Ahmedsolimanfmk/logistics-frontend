// src/services/receipts.service.ts

import { api } from "@/src/lib/api";
import type {
  InventoryReceipt,
  CreateReceiptPayload,
  ReceiptsFilters,
  ReceiptsListResult,
} from "@/src/types/receipts.types";

function compact(obj: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")
  );
}

export const receiptsService = {
  async list(filters: ReceiptsFilters = {}): Promise<ReceiptsListResult> {
    const res = await api.get("/inventory/receipts", {
      params: compact({
        status: filters.status,
        warehouse_id: filters.warehouse_id,
      }),
    });

    const data = res?.data ?? res;

    return {
      items: data?.items || [],
    };
  },

  async getById(id: string): Promise<InventoryReceipt> {
    const res = await api.get(`/inventory/receipts/${id}`);
    return res?.data ?? res;
  },

  async create(payload: CreateReceiptPayload): Promise<InventoryReceipt> {
    const res = await api.post("/inventory/receipts", payload);
    return res?.data ?? res;
  },

  async submit(id: string): Promise<void> {
    await api.post(`/inventory/receipts/${id}/submit`);
  },

  async post(id: string): Promise<void> {
    await api.post(`/inventory/receipts/${id}/post`);
  },
};

export default receiptsService;