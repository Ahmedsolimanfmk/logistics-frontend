// src/types/contracts.types.ts

export type ContractStatus = "ACTIVE" | "EXPIRED" | "TERMINATED";

export type BillingCycle =
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY"
  | "ONE_OFF";

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
  signed_at?: string | null;
  terminated_at?: string | null;
  termination_reason?: string | null;
  document_url?: string | null;
  billing_cycle?: BillingCycle;
  contract_value?: number | null;
  currency?: string | null;
  status?: ContractStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  client?: ContractClientRef;
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
  signed_at?: string | null;
  terminated_at?: string | null;
  termination_reason?: string | null;
  document_url?: string | null;
  billing_cycle?: BillingCycle;
  contract_value?: number | null;
  currency?: string | null;
  notes?: string | null;
  status?: ContractStatus;
}