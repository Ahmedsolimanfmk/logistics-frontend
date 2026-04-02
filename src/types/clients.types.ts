export interface Client {
  id: string;
  name: string;

  phone?: string | null;
  email?: string | null;
  hq_address?: string | null;

  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;

  tax_no?: string | null;
  notes?: string | null;

  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClientSite {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  site_type?: string | null;
  zone?: string | null;
  zone_id?: string | null;
  zone_name?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  trips_this_month?: number;
}

export interface ClientFinancialSummary {
  total_invoiced: number;
  total_paid: number;
  balance: number;
  monthly_trip_revenue?: number;
}

export interface ClientOperationsSummary {
  total_trips_this_month?: number;
  active_sites_count?: number;
  total_sites_count?: number;
}

export interface ClientsListFilters {
  search?: string;
  page?: number;
  limit?: number;
  is_active?: boolean;
}

export interface ClientsListResponse {
  items: Client[];
  total: number;
  meta: {
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ClientPayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  hq_address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  tax_no?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface ClientProfilePayload {
  phone?: string | null;
  email?: string | null;
  hq_address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  tax_no?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface ClientContractSummary {
  total_contracts: number;
  by_status: Record<string, number>;
}

export interface ClientRecentContract {
  id: string;
  contract_no?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  billing_cycle?: string | null;
  contract_value: number;
  currency?: string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface ClientRecentInvoice {
  id: string;
  invoice_no?: string | null;
  issue_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  total_amount: number;
  contract_id?: string | null;
}

export interface ClientRecentPayment {
  id: string;
  payment_date?: string | null;
  amount: number;
  method?: string | null;
  status?: string | null;
  reference?: string | null;
}

export interface ClientTripMonthlyBySite {
  site_id?: string | null;
  site_name?: string | null;
  month: string;
  trips_count: number;
}

export interface ClientDetailsData {
  client: Client;
  sites: ClientSite[];
  contracts_summary: ClientContractSummary;
  recent_contracts: ClientRecentContract[];
  ar_summary: ClientFinancialSummary;
  trips_monthly_by_site: ClientTripMonthlyBySite[];
  recent_invoices: ClientRecentInvoice[];
  recent_payments: ClientRecentPayment[];
}

export interface ClientDashboardData {
  client: Pick<Client, "id" | "name" | "is_active">;
  month: string;
  financial: ClientFinancialSummary;
  operations?: ClientOperationsSummary;
  contracts?: {
    by_status: Record<string, number>;
  };
  sites: ClientSite[];
}

export type ClientDetailsResponse = ClientDetailsData;
export type ClientDashboardResponse = ClientDashboardData;