export interface SiteClientRef {
  id: string;
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
}

export interface SiteTripRef {
  id: string;
  trip_code?: string | null;
  status?: string | null;
  financial_status?: string | null;
  created_at?: string | null;
  scheduled_at?: string | null;
  origin?: string | null;
  destination?: string | null;
  agreed_revenue?: number | null;
  revenue_currency?: string | null;
}

export interface Site {
  id: string;
  company_id?: string;
  client_id: string;

  code?: string | null;
  name: string;
  address?: string | null;

  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;

  clients?: SiteClientRef | null;
  site_trips?: SiteTripRef[];
}

export interface SiteClientOption {
  id: string;
  name?: string | null;
}

export interface SitesListFilters {
  page?: number;
  limit?: number;
  search?: string;
  client_id?: string;
  code?: string;
  is_active?: boolean;
}

export interface SitesListResponse {
  items: Site[];
  total: number;
  meta?: {
    page: number;
    limit: number;
    pages: number;
  };
}

export interface SitePayload {
  name: string;
  client_id: string;
  address?: string | null;
  code?: string | null;
  is_active?: boolean;
}