export interface SiteClientRef {
  id: string;
  name?: string | null;
}

export interface Site {
  id: string;
  client_id: string;

  name: string;
  address?: string | null;
  site_type?: string | null;
  city?: string | null;
  zone?: string | null;
  zone_id?: string | null;

  latitude?: number | string | null;
  longitude?: number | string | null;

  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;

  clients?: SiteClientRef | null;
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
  city?: string | null;
  site_type?: string | null;
  zone_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}