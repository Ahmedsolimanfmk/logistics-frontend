import { api } from "@/src/lib/api";
import type {
  Client,
  ClientDashboardResponse,
  ClientDetailsResponse,
  ClientPayload,
  ClientProfilePayload,
  ClientsListFilters,
  ClientsListResponse,
} from "@/src/types/clients.types";

function toNumberOr(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function unwrapApiBody<T = any>(raw: any): T {
  const body = raw?.data ?? raw;

  if (body && typeof body === "object" && "data" in body && body.data !== undefined) {
    return body.data as T;
  }

  return body as T;
}

function normalizeClient(raw: any): Client {
  const client = raw || {};

  return {
    id: String(client.id || ""),
    company_id: client.company_id ?? undefined,
    code: client.code ?? null,
    name: String(client.name || ""),

    phone: client.phone ?? null,

    email: client.email ?? client.billing_email ?? null,
    billing_email: client.billing_email ?? client.email ?? null,

    hq_address: client.hq_address ?? null,

    contact_name: client.contact_name ?? client.primary_contact_name ?? null,
    contact_phone: client.contact_phone ?? client.primary_contact_phone ?? null,
    contact_email: client.contact_email ?? client.primary_contact_email ?? null,

    primary_contact_name: client.primary_contact_name ?? client.contact_name ?? null,
    primary_contact_phone: client.primary_contact_phone ?? client.contact_phone ?? null,
    primary_contact_email: client.primary_contact_email ?? client.contact_email ?? null,

    tax_no: client.tax_no ?? null,
    notes: client.notes ?? null,

    is_active: Boolean(client.is_active),
    created_at: client.created_at ?? null,
    updated_at: client.updated_at ?? null,
    _count: client._count ?? undefined,
  };
}

function normalizeClientsList(raw: any): ClientsListResponse {
  const body = raw?.data ?? raw;

  const itemsRaw = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body?.data?.items)
      ? body.data.items
      : [];

  const items = itemsRaw.map(normalizeClient);

  const total = toNumberOr(body?.total, items.length);
  const page = toNumberOr(body?.meta?.page, 1);
  const limit = toNumberOr(body?.meta?.limit, 50);
  const pages = toNumberOr(
    body?.meta?.pages,
    Math.max(Math.ceil(total / Math.max(limit, 1)), 1)
  );

  return {
    items,
    total,
    meta: {
      page,
      limit,
      pages,
    },
  };
}

function normalizePayload(payload: ClientPayload | ClientProfilePayload) {
  const body: Record<string, unknown> = {};

  if ("name" in payload && payload.name !== undefined) {
    body.name = payload.name;
  }

  if ("code" in payload && payload.code !== undefined) {
    body.code = payload.code;
  }

  if ("phone" in payload && payload.phone !== undefined) {
    body.phone = payload.phone;
  }

  if ("email" in payload && payload.email !== undefined) {
    body.email = payload.email;
  }

  if ("billing_email" in payload && payload.billing_email !== undefined) {
    body.billing_email = payload.billing_email;
  }

  if ("hq_address" in payload && payload.hq_address !== undefined) {
    body.hq_address = payload.hq_address;
  }

  if ("contact_name" in payload && payload.contact_name !== undefined) {
    body.contact_name = payload.contact_name;
  }

  if ("contact_phone" in payload && payload.contact_phone !== undefined) {
    body.contact_phone = payload.contact_phone;
  }

  if ("contact_email" in payload && payload.contact_email !== undefined) {
    body.contact_email = payload.contact_email;
  }

  if ("primary_contact_name" in payload && payload.primary_contact_name !== undefined) {
    body.primary_contact_name = payload.primary_contact_name;
  }

  if ("primary_contact_phone" in payload && payload.primary_contact_phone !== undefined) {
    body.primary_contact_phone = payload.primary_contact_phone;
  }

  if ("primary_contact_email" in payload && payload.primary_contact_email !== undefined) {
    body.primary_contact_email = payload.primary_contact_email;
  }

  if ("tax_no" in payload && payload.tax_no !== undefined) {
    body.tax_no = payload.tax_no;
  }

  if ("notes" in payload && payload.notes !== undefined) {
    body.notes = payload.notes;
  }

  if ("is_active" in payload && payload.is_active !== undefined) {
    body.is_active = payload.is_active;
  }

  return body;
}

export const clientsService = {
  async list(filters: ClientsListFilters = {}): Promise<ClientsListResponse> {
    const params: Record<string, any> = {};

    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (typeof filters.is_active === "boolean") params.is_active = filters.is_active;

    const res = await api.get("/clients", { params });
    return normalizeClientsList(res);
  },

  async getById(id: string): Promise<Client> {
    const res = await api.get(`/clients/${id}`);
    return normalizeClient(unwrapApiBody<Client>(res));
  },

  async getDetails(id: string, month: string): Promise<ClientDetailsResponse> {
    const res = await api.get(`/clients/${id}/details`, {
      params: { month },
    });

    const data = unwrapApiBody<ClientDetailsResponse>(res);

    return {
      ...data,
      client: normalizeClient(data?.client),
      sites: Array.isArray(data?.sites) ? data.sites : [],
      contracts_summary: data?.contracts_summary || {
        total_contracts: 0,
        by_status: {},
      },
      recent_contracts: Array.isArray(data?.recent_contracts) ? data.recent_contracts : [],
      ar_summary: data?.ar_summary || {
        total_invoiced: 0,
        total_paid: 0,
        balance: 0,
      },
      trips_monthly_by_site: Array.isArray(data?.trips_monthly_by_site)
        ? data.trips_monthly_by_site
        : [],
      recent_invoices: Array.isArray(data?.recent_invoices) ? data.recent_invoices : [],
      recent_payments: Array.isArray(data?.recent_payments) ? data.recent_payments : [],
    };
  },

  async getDashboard(id: string, month: string): Promise<ClientDashboardResponse> {
    const res = await api.get(`/clients/${id}/dashboard`, {
      params: { month },
    });

    const data = unwrapApiBody<ClientDashboardResponse>(res);

    return {
      ...data,
      client: {
        id: String(data?.client?.id || ""),
        name: String(data?.client?.name || ""),
        is_active: Boolean(data?.client?.is_active),
      },
      financial: data?.financial || {
        total_invoiced: 0,
        total_paid: 0,
        balance: 0,
        monthly_trip_revenue: 0,
      },
      operations: data?.operations || {
        total_trips_this_month: 0,
        active_sites_count: 0,
        total_sites_count: 0,
      },
      contracts: data?.contracts || {
        by_status: {},
      },
      sites: Array.isArray(data?.sites) ? data.sites : [],
      month: String(data?.month || month || ""),
    };
  },

  async create(payload: ClientPayload): Promise<Client> {
    const res = await api.post("/clients", normalizePayload(payload));
    return normalizeClient(unwrapApiBody<Client>(res));
  },

  async update(id: string, payload: ClientPayload): Promise<Client> {
    const res = await api.put(`/clients/${id}`, normalizePayload(payload));
    return normalizeClient(unwrapApiBody<Client>(res));
  },

  async updateProfile(id: string, payload: ClientProfilePayload): Promise<Client> {
    const res = await api.put(`/clients/${id}/profile`, normalizePayload(payload));
    return normalizeClient(unwrapApiBody<Client>(res));
  },

  async toggle(id: string): Promise<Client> {
    const res = await api.patch(`/clients/${id}/toggle`);
    return normalizeClient(unwrapApiBody<Client>(res));
  },
};

export default clientsService;