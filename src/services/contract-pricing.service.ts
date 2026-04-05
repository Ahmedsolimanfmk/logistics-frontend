import { api } from "@/src/lib/api";
import type {
  CargoTypePayload,
  CargoTypeRef,
  CargoTypesFilters,
  CargoTypesListResponse,
  PricingRule,
  PricingRulePayload,
  PricingRulesFilters,
  PricingRulesListResponse,
  PricingRouteRef,
  PricingZoneRef,
  RoutePayload,
  RoutesFilters,
  RoutesListResponse,
  VehicleClassPayload,
  VehicleClassRef,
  VehicleClassesFilters,
  VehicleClassesListResponse,
  ZonePayload,
  ZonesFilters,
  ZonesListResponse,
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
function normalizeCargoTypesList(body: any): CargoTypesListResponse {
  const items = asArray(body) as CargoTypeRef[];
  const { total, page, pageSize, pages } = normalizePagination(body, items.length);

  return { items, total, page, pageSize, pages };
}
function normalizeZonesList(body: any): ZonesListResponse {
  const items = asArray(body) as PricingZoneRef[];
  const { total, page, pageSize, pages } = normalizePagination(body, items.length);

  return { items, total, page, pageSize, pages };
}
function normalizeRoutesList(body: any): RoutesListResponse {
  const items = asArray(body) as PricingRouteRef[];
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

    async listCargoTypes(
    filters: CargoTypesFilters = {}
  ): Promise<CargoTypesListResponse> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 25,
    };

    if (filters.q) params.q = filters.q;
    if (filters.is_active !== "" && filters.is_active !== undefined) {
      params.is_active = filters.is_active;
    }

    const res = await api.get("/contract-pricing/cargo-types", { params });
    return normalizeCargoTypesList(res.data ?? res);
  },
  
  async listZones(
    filters: ZonesFilters = {}
  ): Promise<ZonesListResponse> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 25,
    };

    if (filters.q) params.q = filters.q;
    if (filters.is_active !== "" && filters.is_active !== undefined) {
      params.is_active = filters.is_active;
    }

    const res = await api.get("/contract-pricing/zones", { params });
    return normalizeZonesList(res.data ?? res);
  },

  async getZoneById(id: string): Promise<PricingZoneRef> {
    const res = await api.get(`/contract-pricing/zones/${id}`);
    return normalizeSingle<PricingZoneRef>(res.data ?? res);
  },

  async createZone(payload: ZonePayload): Promise<PricingZoneRef> {
    const res = await api.post("/contract-pricing/zones", payload);
    return normalizeSingle<PricingZoneRef>(res.data ?? res);
  },

  async updateZone(id: string, payload: ZonePayload): Promise<PricingZoneRef> {
    const res = await api.put(`/contract-pricing/zones/${id}`, payload);
    return normalizeSingle<PricingZoneRef>(res.data ?? res);
  },

  async toggleZone(id: string): Promise<PricingZoneRef> {
    const res = await api.patch(`/contract-pricing/zones/${id}/toggle`);
    return normalizeSingle<PricingZoneRef>(res.data ?? res);
  },

  async getCargoTypeById(id: string): Promise<CargoTypeRef> {
    const res = await api.get(`/contract-pricing/cargo-types/${id}`);
    return normalizeSingle<CargoTypeRef>(res.data ?? res);
  },

  async createCargoType(payload: CargoTypePayload): Promise<CargoTypeRef> {
    const res = await api.post("/contract-pricing/cargo-types", payload);
    return normalizeSingle<CargoTypeRef>(res.data ?? res);
  },

  async updateCargoType(id: string, payload: CargoTypePayload): Promise<CargoTypeRef> {
    const res = await api.put(`/contract-pricing/cargo-types/${id}`, payload);
    return normalizeSingle<CargoTypeRef>(res.data ?? res);
  },

  async toggleCargoType(id: string): Promise<CargoTypeRef> {
    const res = await api.patch(`/contract-pricing/cargo-types/${id}/toggle`);
    return normalizeSingle<CargoTypeRef>(res.data ?? res);
  },
    async listRoutes(
    filters: RoutesFilters = {}
  ): Promise<RoutesListResponse> {
    const params: Record<string, any> = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 25,
    };

    if (filters.q) params.q = filters.q;
    if (filters.client_id) params.client_id = filters.client_id;
    if (filters.pickup_site_id) params.pickup_site_id = filters.pickup_site_id;
    if (filters.dropoff_site_id) params.dropoff_site_id = filters.dropoff_site_id;

    if (filters.is_active !== "" && filters.is_active !== undefined) {
      params.is_active = filters.is_active;
    }

    const res = await api.get("/contract-pricing/routes", { params });
    return normalizeRoutesList(res.data ?? res);
  },

  async getRouteById(id: string): Promise<PricingRouteRef> {
    const res = await api.get(`/contract-pricing/routes/${id}`);
    return normalizeSingle<PricingRouteRef>(res.data ?? res);
  },

  async createRoute(payload: RoutePayload): Promise<PricingRouteRef> {
    const res = await api.post("/contract-pricing/routes", payload);
    return normalizeSingle<PricingRouteRef>(res.data ?? res);
  },

  async updateRoute(id: string, payload: RoutePayload): Promise<PricingRouteRef> {
    const res = await api.put(`/contract-pricing/routes/${id}`, payload);
    return normalizeSingle<PricingRouteRef>(res.data ?? res);
  },

  async toggleRoute(id: string): Promise<PricingRouteRef> {
    const res = await api.patch(`/contract-pricing/routes/${id}/toggle`);
    return normalizeSingle<PricingRouteRef>(res.data ?? res);
  },
};

export default contractPricingService;