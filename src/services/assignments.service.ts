import { apiAuthGet, apiAuthPost, apiAuthPatch } from "@/src/lib/api";

export const assignmentsService = {
  getActiveAssignments: async (params?: Record<string, any>) => {
    return apiAuthGet("/assignments", { params });
  },

  assignDriver: async (data: any) => {
    return apiAuthPost("/assignments", data);
  },

  unassignDriver: async (id: string) => {
    return apiAuthPatch(`/assignments/${id}/unassign`, {});
  },

  addCustodyItem: async (assignmentId: string, data: any) => {
    return apiAuthPost(`/assignments/${assignmentId}/custody`, data);
  },

  returnCustodyItem: async (id: string) => {
    return apiAuthPatch(`/assignments/custody/${id}/return`, {});
  }
};
