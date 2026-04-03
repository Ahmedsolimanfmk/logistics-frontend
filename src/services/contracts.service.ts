// src/services/contracts.service.ts

import { api } from "@/src/lib/api";
import type {
  Contract,
  ContractListResponse,
  ContractPayload,
  ContractStatus,
} from "@/src/types/contracts.types";

function asArray(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function normalizeList(body: any): ContractListResponse {
  const items = asArray(body);

  const total =
    body?.total ??
    body?.meta?.total ??
    body?.count ??
    items.length;

  return {
    items,
    total: Number(total) || items.length,
    meta: {
      page: Number(body?.meta?.page || 1),
      limit: Number(body?.meta?.limit || 20),
      pages: Number(body?.meta?.pages || 1),
    },
  };
}

export const contractsService = {
  async list(params?: {
    client_id?: string;
    page?: number;
    limit?: number;
  }): Promise<ContractListResponse> {
    const res = await api.get("/contracts", { params });
    return normalizeList(res.data ?? res);
  },

  async getById(id: string): Promise<Contract> {
    const res = await api.get(`/contracts/${id}`);
    return (res.data ?? res) as Contract;
  },

  async create(payload: ContractPayload): Promise<Contract> {
    const res = await api.post("/contracts", payload);
    return (res.data ?? res) as Contract;
  },

  async update(id: string, payload: Partial<ContractPayload>): Promise<Contract> {
    const res = await api.patch(`/contracts/${id}`, payload);
    return (res.data ?? res) as Contract;
  },

  async setStatus(id: string, status: ContractStatus): Promise<Contract> {
    const res = await api.post(`/contracts/${id}/status`, { status });
    return (res.data ?? res) as Contract;
  },
};