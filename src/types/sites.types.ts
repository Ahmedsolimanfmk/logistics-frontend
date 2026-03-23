export type SiteClientOption = {
  id: string;
  name?: string | null;
};

export type Site = {
  id: string;
  client_id?: string | null;
  name: string;
  address?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  clients?: {
    id: string;
    name?: string | null;
  } | null;
};

export type SiteListFilters = {
  search?: string;
  client_id?: string;
};

export type SitePayload = {
  name: string;
  address?: string | null;
  client_id?: string | null;
};