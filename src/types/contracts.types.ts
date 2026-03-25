// src/types/contracts.types.ts

export type ContractStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "EXPIRED"
  | string;

export type BillingCycle =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | string;

export type ContractClientRef = {
  id: string;
  name?: string | null;
};

export interface Contract {
  id: string;

  client_id: string;
  contract_no?: string | null;

  start_date: string;
  end_date?: string | null;

  billing_cycle?: BillingCycle;
  contract_value?: number | null;
  currency?: string | null;

  status?: ContractStatus;
  notes?: string | null;

  created_at?: string;
  updated_at?: string;

  clients?: ContractClientRef;
}

export interface ContractListResponse {
  items: Contract[];
  total: number;
  meta?: {
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ContractPayload {
  client_id: string;
  contract_no?: string | null;
  start_date: string;
  end_date?: string | null;
  billing_cycle?: BillingCycle;
  contract_value?: number | null;
  currency?: string | null;
  notes?: string | null;
  status?: ContractStatus;
}