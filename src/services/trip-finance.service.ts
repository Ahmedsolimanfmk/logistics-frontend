import { api } from "@/src/lib/api";
import type { TripFinanceSummary } from "@/src/types/trip-finance.types";

export const tripFinanceService = {
  async getSummary(tripId: string): Promise<TripFinanceSummary> {
    const res = await api.get(`/cash/trips/${tripId}/finance/summary`);
    return (res.data ?? res) as TripFinanceSummary;
  },

  async openReview(tripId: string) {
    const res = await api.post(`/cash/trips/${tripId}/finance/open-review`, {});
    return res.data ?? res;
  },

  async close(tripId: string, notes?: string) {
    const res = await api.post(`/cash/trips/${tripId}/finance/close`, {
      notes: notes?.trim() || undefined,
    });
    return res.data ?? res;
  },
};