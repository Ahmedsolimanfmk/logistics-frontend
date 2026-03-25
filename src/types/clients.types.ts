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
}

export interface ClientsListResponse {
  items: Client[];
  total: number;
  meta?: {
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
}

export interface ClientDetailsResponse {
  client: Client;
  sites: ClientSite[];
  ar_summary: ClientFinancialSummary;
  trips_monthly_by_site: Array<{
    site_id?: string | null;
    site_name?: string | null;
    month: string;
    trips_count: number;
  }>;
  recent_invoices: Array<{
    id: string;
    invoice_no?: string | null;
    issue_date?: string | null;
    due_date?: string | null;
    status?: string | null;
    total_amount: number;
  }>;
  recent_payments: Array<{
    id: string;
    payment_date?: string | null;
    amount: number;
    method?: string | null;
    status?: string | null;
    reference?: string | null;
  }>;
}

export interface ClientDashboardResponse {
  client: Client;
  month: string;
  financial: ClientFinancialSummary;
  operations?: ClientOperationsSummary;
  sites: ClientSite[];
}