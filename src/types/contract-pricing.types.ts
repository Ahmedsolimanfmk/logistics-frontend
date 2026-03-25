export type PricingRuleStatus = boolean | null;

export type TripType =
  | "DELIVERY"
  | "TRANSFER"
  | "RETURN"
  | "INTERNAL"
  | "OTHER"
  | string;

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
}

export interface PricingSiteRef {
  id: string;
  name?: string | null;
}

export interface PricingZoneRef {
  id: string;
  code?: string | null;
  name?: string | null;
}

export interface VehicleClassRef {
  id: string;
  code?: string | null;
  name?: string | null;
  is_active?: boolean;
}

export interface CargoTypeRef {
  id: string;
  code?: string | null;
  name?: string | null;
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

export interface PricingRulesListResponse {
  items: PricingRule[];
  total: number;
  meta: {
    page: number;
    pageSize: number;
    pages: number;
  };
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

  route_id?: string | null;
  pickup_site_id?: string | null;
  dropoff_site_id?: string | null;
  from_zone_id?: string | null;
  to_zone_id?: string | null;
  vehicle_class_id?: string | null;
  cargo_type_id?: string | null;

  trip_type?: string | null;

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
}

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
  is_active?: boolean;
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

export interface VehicleClassRef {
  id: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CargoTypeRef {
  id: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
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

export interface PricingRulesListResponse {
  items: PricingRule[];
  total: number;
  meta: {
    page: number;
    pageSize: number;
    pages: number;
  };
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

  route_id?: string | null;
  pickup_site_id?: string | null;
  dropoff_site_id?: string | null;
  from_zone_id?: string | null;
  to_zone_id?: string | null;
  vehicle_class_id?: string | null;
  cargo_type_id?: string | null;

  trip_type?: string | null;

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
  pages: number;
}

export interface VehicleClassPayload {
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}