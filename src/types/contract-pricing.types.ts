export type TripType =
  | "DELIVERY"
  | "TRANSFER"
  | "RETURN"
  | "INTERNAL"
  | "OTHER";

export interface PricingClientRef {
  id: string;
  name?: string | null;
}

export interface PricingContractRef {
  id: string;
  contract_no?: string | null;
  status?: string | null;
}

export interface PricingRouteRef {
  id: string;
  code?: string | null;
  name?: string | null;
  distance_km?: number | null;
  client_id?: string | null;
  pickup_site_id?: string | null;
  dropoff_site_id?: string | null;
  origin_label?: string | null;
  destination_label?: string | null;
  notes?: string | null;
  is_active?: boolean;

  clients?: PricingClientRef | null;
  pickup_site?: PricingSiteRef | null;
  dropoff_site?: PricingSiteRef | null;
}
export interface RoutePayload {
  code?: string | null;
  name: string;
  client_id?: string | null;
  pickup_site_id?: string | null;
  dropoff_site_id?: string | null;
  origin_label?: string | null;
  destination_label?: string | null;
  distance_km?: number | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface RoutesFilters {
  q?: string;
  client_id?: string;
  pickup_site_id?: string;
  dropoff_site_id?: string;
  is_active?: boolean | "";
  page?: number;
  pageSize?: number;
}

export interface RoutesListResponse {
  items: PricingRouteRef[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface PricingSiteRef {
  id: string;
  name?: string | null;
}

export interface PricingZoneRef {
  id: string;
  code?: string | null;
  name?: string | null;
  is_active?: boolean;
}

export interface ZonePayload {
  code?: string | null;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface ZonesFilters {
  q?: string;
  is_active?: boolean | "";
  page?: number;
  pageSize?: number;
}

export interface ZonesListResponse {
  items: PricingZoneRef[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface VehicleClassRef {
  id: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface VehicleClassPayload {
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface VehicleClassesFilters {
  q?: string;
  is_active?: boolean | "";
  page?: number;
  pageSize?: number;
}

export interface VehicleClassesListResponse {
  items: VehicleClassRef[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface CargoTypeRef {
  id: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface PricingRule {
  id: string;

  contract_id: string;
  client_id: string;

  route_id?: string | null;
  pickup_site_id?: string | null;
  dropoff_site_id?: string | null;
  from_zone_id?: string | null;
  to_zone_id?: string | null;
  vehicle_class_id?: string | null;
  cargo_type_id?: string | null;

  trip_type?: TripType | null;

  min_weight?: number | null;
  max_weight?: number | null;

  base_price: number;
  currency?: string | null;
  price_per_ton?: number | null;
  price_per_km?: number | null;

  priority?: number | null;

  effective_from?: string | null;
  effective_to?: string | null;

  is_active?: boolean;
  notes?: string | null;

  created_at?: string;
  updated_at?: string;

  clients?: PricingClientRef;
  client_contracts?: PricingContractRef;
  routes?: PricingRouteRef;
  pickup_site?: PricingSiteRef;
  dropoff_site?: PricingSiteRef;
  from_zone?: PricingZoneRef;
  to_zone?: PricingZoneRef;
  vehicle_classes?: VehicleClassRef;
  cargo_types?: CargoTypeRef;
}

export interface PricingRulesFilters {
  q?: string;
  client_id?: string;
  contract_id?: string;
  route_id?: string;
  pickup_site_id?: string;
  dropoff_site_id?: string;
  vehicle_class_id?: string;
  cargo_type_id?: string;
  trip_type?: string;
  is_active?: boolean | "";
  page?: number;
  pageSize?: number;
}

export interface PricingRulePayload {
  contract_id: string;
  client_id: string;

  base_price: number;

  route_id?: string | null;
  pickup_site_id?: string | null;
  dropoff_site_id?: string | null;
  from_zone_id?: string | null;
  to_zone_id?: string | null;
  vehicle_class_id?: string | null;
  cargo_type_id?: string | null;

  trip_type?: TripType | null;

  min_weight?: number | null;
  max_weight?: number | null;

  currency?: string | null;
  price_per_ton?: number | null;
  price_per_km?: number | null;

  priority?: number | null;
  effective_from?: string | null;
  effective_to?: string | null;

  is_active?: boolean;
  notes?: string | null;
}

export interface PricingRulesListResponse {
  items: PricingRule[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}
export interface CargoTypePayload {
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CargoTypesFilters {
  q?: string;
  is_active?: boolean | "";
  page?: number;
  pageSize?: number;
}

export interface CargoTypesListResponse {
  items: CargoTypeRef[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}