export type TripRevenueSource = "MANUAL" | "CONTRACT" | "INVOICE" | string;

export type ProfitStatus = "PROFIT" | "LOSS" | "BREAK_EVEN" | string;

export interface TripRevenueUser {
  id: string;
  full_name?: string | null;
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

export interface TripRevenuePricingRuleRef {
  id: string;
  base_price?: number | string | null;
  currency?: string | null;
  priority?: number | null;
  is_active?: boolean | null;
}

export interface PricingRuleSnapshotData {
  id: string;
  contract_id?: string | null;
  client_id?: string | null;
  route_id?: string | null;
  pickup_site_id?: string | null;
  dropoff_site_id?: string | null;
  from_zone_id?: string | null;
  to_zone_id?: string | null;
  vehicle_class_id?: string | null;
  cargo_type_id?: string | null;
  trip_type?: string | null;
  min_weight?: number | null;
  max_weight?: number | null;
  base_price?: number | string | null;
  currency?: string | null;
  price_per_ton?: number | string | null;
  price_per_km?: number | string | null;
  priority?: number | null;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean | null;
  notes?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface PricingRuleSnapshotResolver {
  matched?: boolean;
  matched_rules_count?: number;
  resolved_amount?: number | null;
  resolved_currency?: string | null;
}

export interface PricingRuleSnapshot {
  rule_id: string;
  captured_at: string;
  resolver?: PricingRuleSnapshotResolver | null;
  data?: PricingRuleSnapshotData | null;
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
  version_no?: number | null;
  is_approved?: boolean;
  approval_notes?: string | null;

  pricing_rule_snapshot?: PricingRuleSnapshot | null;
  notes?: string | null;

  users_entered?: TripRevenueUser | null;
  users_approved?: TripRevenueUser | null;
  users_replaced?: TripRevenueUser | null;

  client_contracts?: TripRevenueContract | null;
  ar_invoices?: TripRevenueInvoice | null;
  contract_pricing_rules?: TripRevenuePricingRuleRef | null;
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

export interface AutoPriceTripRevenuePayload {
  contract_id?: string | null;
  notes?: string | null;
  auto_approve?: boolean;
}

export interface AutoPriceTripRevenueData {
  success?: boolean;
  trip_id?: string;
  resolver?: {
    trip?: Record<string, unknown>;
    matched?: boolean;
    matched_rules_count?: number;
    resolved_rule?: Record<string, unknown> | null;
    candidates?: Record<string, unknown>[];
  } | null;
  revenue?: TripRevenue | null;
}

export interface AutoPriceTripRevenueResponse {
  success: boolean;
  message?: string;
  data?: AutoPriceTripRevenueData | null;
}

export interface TripProfitabilityExpenseItem {
  id: string;
  amount: string | number;
  payment_source?: string | null;
  expense_type?: string | null;
  approval_status?: string | null;
  created_at?: string | null;
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
  profit_status?: ProfitStatus;

  currency?: string | null;
  breakdown_by_type?: Record<string, number>;

  revenue_record?: TripRevenue | null;
  current_revenue_record?: TripRevenue | null;
  current_approved_revenue_record?: TripRevenue | null;

  expenses_items?: TripProfitabilityExpenseItem[];
  pending_expenses_items?: TripProfitabilityExpenseItem[];
}

export interface TripProfitabilityResponse {
  success: boolean;
  message?: string;
  data: TripProfitability;
}