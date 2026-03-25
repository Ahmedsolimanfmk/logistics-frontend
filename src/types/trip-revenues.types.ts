export type TripRevenueSource = "MANUAL" | "CONTRACT" | "INVOICE" | string;

export interface TripRevenueUser {
  id: string;
  full_name: string;
  email?: string | null;
  role?: string | null;
}

export interface TripRevenueContract {
  id: string;
  contract_no?: string | null;
  status?: string | null;
  currency?: string | null;
}

export interface TripRevenueInvoice {
  id: string;
  invoice_no?: string | null;
  status?: string | null;
  total_amount?: number | string | null;
}

export interface TripRevenuePricingRule {
  id: string;
  base_price?: number | string | null;
  currency?: string | null;
  priority?: number | null;
  is_active?: boolean | null;
}

export interface TripRevenue {
  id: string;
  trip_id: string;
  client_id: string;

  contract_id?: string | null;
  invoice_id?: string | null;
  pricing_rule_id?: string | null;

  amount: number | string;
  currency?: string | null;
  source: TripRevenueSource;

  entered_by?: string | null;
  approved_by?: string | null;
  replaced_by?: string | null;

  entered_at?: string | null;
  approved_at?: string | null;
  replaced_at?: string | null;

  is_current?: boolean;
  version_no?: number;
  is_approved?: boolean;
  approval_notes?: string | null;
  pricing_rule_snapshot?: any;
  notes?: string | null;

  users_entered?: TripRevenueUser | null;
  users_approved?: TripRevenueUser | null;
  users_replaced?: TripRevenueUser | null;

  client_contracts?: TripRevenueContract | null;
  ar_invoices?: TripRevenueInvoice | null;
  contract_pricing_rules?: TripRevenuePricingRule | null;
}

export interface TripRevenueResponse {
  success: boolean;
  message?: string;
  data: TripRevenue | null;
}

export interface TripRevenueHistoryResponse {
  success: boolean;
  message?: string;
  data: TripRevenue[];
}

export interface SaveTripRevenuePayload {
  amount: number;
  currency?: string;
  source?: TripRevenueSource;
  contract_id?: string | null;
  invoice_id?: string | null;
  pricing_rule_id?: string | null;
  notes?: string | null;
}

export interface ApproveTripRevenuePayload {
  approval_notes?: string | null;
}

export interface TripProfitability {
  trip_id: string;
  financial_status: string;

  revenue: number;
  expenses: number;
  pending_expenses?: number;

  company_expenses?: number;
  advance_expenses?: number;

  profit: number;
  profit_status?: "PROFIT" | "LOSS" | "BREAK_EVEN" | string;

  currency?: string | null;
  breakdown_by_type?: Record<string, number>;

  revenue_record?: TripRevenue | null;
  current_revenue_record?: TripRevenue | null;
  current_approved_revenue_record?: TripRevenue | null;
}

export interface TripProfitabilityResponse {
  success: boolean;
  message?: string;
  data: TripProfitability;
}