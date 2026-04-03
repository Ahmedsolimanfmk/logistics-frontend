import { api } from "@/src/lib/api";
import type {
  CargoTypeRef,
  PricingRule,
  PricingRulePayload,
  PricingRulesFilters,
  PricingRulesListResponse,
  PricingRouteRef,
  VehicleClassPayload,
  VehicleClassRef,
  VehicleClassesFilters,
  VehicleClassesListResponse,
} from "@/src/types/contract-pricing.types";

function asArray(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function toNumberOr(value: any, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeSingle<T>(body: any): T {
  return (body?.data ?? body) as T;
}

function normalizePagination(body: any, itemsLength: number) {
  const total = toNumberOr(body?.total ?? body?.count ?? itemsLength, itemsLength);
  const page = toNumberOr(body?.page ?? body?.meta?.page ?? 1, 1);
  const pageSize = toNumberOr(
    body?.pageSize ?? body?.meta?.pageSize ?? body?.meta?.limit ?? 25,
    25
  );
  const pages = toNumberOr(
    body?.pages ?? body?.meta?.pages ?? Math.max(Math.ceil(total / Math.max(pageSize, 1)), 1),
    1
  );

  return { total, page, pageSize, pages };
}

function normalizeRulesList(body: any): PricingRulesListResponse {
  const items = asArray(body) as PricingRule[];
  const { total, page, pageSize, pages } = normalizePagination(body, items.length);

  return { items, total, page, pageSize, pages };
}

function normalizeVehicleClassesList(body: any): VehicleClassesListResponse {
  const items = asArray(body) as VehicleClassRef[];
  const { total, page, pageSize, pages } = normalizePagination(body, items.length);

  return { items, total, page, pageSize, pages };
}

function normalizeSimpleList<T>(body: any) {
  const items = asArray(body) as T[];
  const { total, page, pageSize, pages } = normalizePagination(body, items.length);

  return { items, total, page, pageSize, pages };
}

export const contractPricingService = {
  async listRules(filters: PricingRulesFilters = {}): Promise<PricingRulesListResponse> {
    const params: Record<string, any> = {};

    if (filters.q) params.q = filters.q;
    if (filters.client_id) params.client_id = filters.client_id;
    if (filters.contract_id) params.contract_id = filters.contract_id;
    if (filters.route_id) params.route_id = filters.route_id;
    if (filters.pickup_site_id) params.pickup_site_id = filters.pickup_site_id;
    if (filters.dropoff_site_id) params.dropoff_site_id = filters.dropoff_site_id;
    if (filters.vehicle_class_id) params.vehicle_class_id = filters.vehicle_class_id;
    if (filters.cargo_type_id) params.cargo_type_id = filters.cargo_type_id;
    if (filters.trip_type) params.trip_type = filters.trip_type;

    if (filters.is_active !== "" && filters.is_active !== undefined) {
      params.is_active = filters.is_active;
    }

    if (filters.page) params.page = filters.page;
    if (filters.pageSize) params.pageSize = filters.pageSize;

    const res = await api.get("/contract-pricing/rules", { params });
    return normalizeRulesList(res.data ?? res);
  },

  async getRuleById(id: string): Promise<PricingRule> {
    const res = await api.get(`/contract-pricing/rules/${id}`);
    return normalizeSingle<PricingRule>(res.data ?? res);
  },

  async createRule(payload: PricingRulePayload): Promise<PricingRule> {
    const res = await api.post("/contract-pricing/rules", payload);
    return normalizeSingle<PricingRule>(res.data ?? res);
  },

  async updateRule(id: string, payload: PricingRulePayload): Promise<PricingRule> {
    const res = await api.put(`/contract-pricing/rules/${id}`, payload);
    return normalizeSingle<PricingRule>(res.data ?? res);
  },

  async toggleRule(id: string): Promise<PricingRule> {
    const res = await api.patch(`/contract-pricing/rules/${id}/toggle`);
    return normalizeSingle<PricingRule>(res.data ?? res);
  },

  async listVehicleClasses(
    filters: VehicleClassesFilters = {}
  ): Promise<VehicleClassesListResponse> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 25,
    };

    if (filters.q) params.q = filters.q;
    if (filters.is_active !== "" && filters.is_active !== undefined) {
      params.is_active = filters.is_active;
    }

    const res = await api.get("/contract-pricing/vehicle-classes", { params });
    return normalizeVehicleClassesList(res.data ?? res);
  },

  async getVehicleClassById(id: string): Promise<VehicleClassRef> {
    const res = await api.get(`/contract-pricing/vehicle-classes/${id}`);
    return normalizeSingle<VehicleClassRef>(res.data ?? res);
  },

  async createVehicleClass(payload: VehicleClassPayload): Promise<VehicleClassRef> {
    const res = await api.post("/contract-pricing/vehicle-classes", payload);
    return normalizeSingle<VehicleClassRef>(res.data ?? res);
  },

  async updateVehicleClass(id: string, payload: VehicleClassPayload): Promise<VehicleClassRef> {
    const res = await api.put(`/contract-pricing/vehicle-classes/${id}`, payload);
    return normalizeSingle<VehicleClassRef>(res.data ?? res);
  },

  async toggleVehicleClass(id: string): Promise<VehicleClassRef> {
    const res = await api.patch(`/contract-pricing/vehicle-classes/${id}/toggle`);
    return normalizeSingle<VehicleClassRef>(res.data ?? res);
  },

  async listCargoTypes(params?: {
    q?: string;
    is_active?: boolean | "";
    page?: number;
    pageSize?: number;
  }) {
    const res = await api.get("/contract-pricing/cargo-types", { params });
    return normalizeSimpleList<CargoTypeRef>(res.data ?? res);
  },

  async listRoutes(params?: {
    q?: string;
    client_id?: string;
    is_active?: boolean | "";
    page?: number;
    pageSize?: number;
  }) {
    const res = await api.get("/contract-pricing/routes", { params });
    return normalizeSimpleList<PricingRouteRef>(res.data ?? res);
  },
};

export default contractPricingService;