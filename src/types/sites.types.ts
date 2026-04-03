export interface SiteClientRef {
  id: string;
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
}

export interface SiteZoneRef {
  id: string;
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
}

export interface Site {
  id: string;
  client_id: string;
  zone_id?: string | null;
  company_id?: string;

  code?: string | null;
  name: string;
  address?: string | null;

  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;

  client?: SiteClientRef | null;
  zone?: SiteZoneRef | null;
}

export interface SiteClientOption {
  id: string;
  name?: string | null;
}

export interface SiteZoneOption {
  id: string;
  name?: string | null;
  code?: string | null;
}

export interface SitesListFilters {
  page?: number;
  limit?: number;
  search?: string;
  client_id?: string;
  zone_id?: string;
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
  zone_id?: string | null;
  address?: string | null;
  code?: string | null;
  is_active?: boolean;
}