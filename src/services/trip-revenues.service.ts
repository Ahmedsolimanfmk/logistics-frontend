import { api } from "@/src/lib/api";
import type {
  ApproveTripRevenuePayload,
  AutoPriceTripRevenuePayload,
  AutoPriceTripRevenueResponse,
  SaveTripRevenuePayload,
  TripProfitabilityResponse,
  TripRevenue,
  TripRevenueHistoryResponse,
  TripRevenueResponse,
} from "@/src/types/trip-revenues.types";

function normalizeOne(body: any): TripRevenue | null {
  if (body?.data !== undefined && !Array.isArray(body.data)) {
    return body.data as TripRevenue | null;
  }
  return (body ?? null) as TripRevenue | null;
}

function normalizeMany(body: any): TripRevenue[] {
  if (Array.isArray(body?.data)) return body.data as TripRevenue[];
  if (Array.isArray(body?.items)) return body.items as TripRevenue[];
  if (Array.isArray(body)) return body as TripRevenue[];
  return [];
}

function normalizeEnvelope<T>(body: any, data: T) {
  return {
    success: Boolean(body?.success ?? true),
    message: body?.message,
    data,
  };
}

export const tripRevenuesService = {
  async getByTrip(tripId: string): Promise<TripRevenueResponse> {
    const res = await api.get(`/trip-revenues/${tripId}/revenue`);
    const body = res.data ?? res;

    return normalizeEnvelope(body, normalizeOne(body));
  },

  async getHistory(tripId: string): Promise<TripRevenueHistoryResponse> {
    const res = await api.get(`/trip-revenues/${tripId}/revenue/history`);
    const body = res.data ?? res;

    return normalizeEnvelope(body, normalizeMany(body));
  },

  async save(
    tripId: string,
    payload: SaveTripRevenuePayload
  ): Promise<TripRevenueResponse> {
    const res = await api.put(`/trip-revenues/${tripId}/revenue`, payload);
    const body = res.data ?? res;

    return normalizeEnvelope(body, normalizeOne(body));
  },

  async approve(
    tripId: string,
    payload: ApproveTripRevenuePayload = {}
  ): Promise<TripRevenueResponse> {
    const res = await api.post(`/trip-revenues/${tripId}/revenue/approve`, payload);
    const body = res.data ?? res;

    return normalizeEnvelope(body, normalizeOne(body));
  },

  async getProfitability(tripId: string): Promise<TripProfitabilityResponse> {
    const res = await api.get(`/trip-revenues/${tripId}/profitability`);
    const body = res.data ?? res;

    return {
      success: Boolean(body?.success ?? true),
      message: body?.message,
      data: body?.data ?? body,
    } as TripProfitabilityResponse;
  },

  async autoPrice(
    tripId: string,
    payload: AutoPriceTripRevenuePayload = {}
  ): Promise<AutoPriceTripRevenueResponse> {
    const res = await api.post(`/trips/${tripId}/auto-price`, payload);
    const body = res.data ?? res;

    return {
      success: Boolean(body?.success ?? true),
      message: body?.message,
      data: body?.data ?? null,
    };
  },
};

export default tripRevenuesService;