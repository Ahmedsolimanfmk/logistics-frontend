import { api } from "@/src/lib/api";
import type {
  TripFinanceSummary,
  TripFinanceSummaryResponse,
  TripFinanceActionResponse,
} from "@/src/types/trip-finance.types";

export const tripFinanceService = {
  async getSummary(tripId: string): Promise<TripFinanceSummary> {
    const res = await api.get(`/trips/${tripId}/finance/summary`);
    const body = res.data ?? res;
    return (body?.data ?? body) as TripFinanceSummary;
  },

  async openReview(tripId: string): Promise<TripFinanceActionResponse> {
    const res = await api.post(`/trips/${tripId}/finance/open-review`, {});
    return (res.data ?? res) as TripFinanceActionResponse;
  },

  async close(tripId: string, notes?: string): Promise<TripFinanceActionResponse> {
    const res = await api.post(`/trips/${tripId}/finance/close`, {
      notes: notes?.trim() || undefined,
    });
    return (res.data ?? res) as TripFinanceActionResponse;
  },
};