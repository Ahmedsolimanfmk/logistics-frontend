"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import maintenanceRequestsService, {
  type ApprovePayload,
  type Attachment,
  type CreateRequestPayload,
  type ListParams,
  type MaintenanceRequest,
  type RejectPayload,
  type VehicleOption,
} from "@/src/services/maintenance-requests.service";

type RequestsMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

const DEFAULT_META: RequestsMeta = {
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
};

export function useMaintenanceRequests(initialParams?: ListParams) {
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [meta, setMeta] = useState<RequestsMeta>(DEFAULT_META);

  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [attachmentsByRequest, setAttachmentsByRequest] = useState<
    Record<string, Attachment[]>
  >({});

  const [params, setParams] = useState<ListParams>({
    page: initialParams?.page ?? 1,
    limit: initialParams?.limit ?? 20,
    status: initialParams?.status ?? "",
    vehicle_id: initialParams?.vehicle_id ?? "",
  });

  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(
    async (nextParams?: Partial<ListParams>) => {
      setLoading(true);
      setError(null);

      try {
        const merged: ListParams = {
          ...params,
          ...nextParams,
        };

        const data = await maintenanceRequestsService.list(merged);

        setItems(Array.isArray(data?.items) ? data.items : []);
        setMeta(data?.meta ?? DEFAULT_META);
        setParams(merged);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "فشل في تحميل طلبات الصيانة"
        );
      } finally {
        setLoading(false);
      }
    },
    [params]
  );

  const fetchVehicleOptions = useCallback(async () => {
    setVehiclesLoading(true);
    setError(null);

    try {
      const data = await maintenanceRequestsService.vehicleOptions();
      setVehicleOptions(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "فشل في تحميل قائمة العربيات"
      );
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  const fetchAttachments = useCallback(async (requestId: string) => {
    setAttachmentsLoading(true);
    setError(null);

    try {
      const data = await maintenanceRequestsService.listAttachments(requestId);
      const list = Array.isArray(data?.items) ? data.items : [];

      setAttachmentsByRequest((prev) => ({
        ...prev,
        [requestId]: list,
      }));

      return list;
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "فشل في تحميل المرفقات"
      );
      return [];
    } finally {
      setAttachmentsLoading(false);
    }
  }, []);

  const createRequest = useCallback(
    async (payload: CreateRequestPayload) => {
      setError(null);

      try {
        const created = await maintenanceRequestsService.create(payload);
        await fetchRequests({ page: 1 });
        return created;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "فشل في إنشاء طلب الصيانة";
        setError(msg);
        throw new Error(msg);
      }
    },
    [fetchRequests]
  );

  const approveRequest = useCallback(
    async (id: string, payload: ApprovePayload) => {
      setError(null);

      try {
        const result = await maintenanceRequestsService.approve(id, payload);
        await fetchRequests();
        return result;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "فشل في اعتماد طلب الصيانة";
        setError(msg);
        throw new Error(msg);
      }
    },
    [fetchRequests]
  );

  const rejectRequest = useCallback(
    async (id: string, payload: RejectPayload) => {
      setError(null);

      try {
        const result = await maintenanceRequestsService.reject(id, payload);
        await fetchRequests();
        return result;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "فشل في رفض طلب الصيانة";
        setError(msg);
        throw new Error(msg);
      }
    },
    [fetchRequests]
  );

  const uploadAttachments = useCallback(
    async (requestId: string, files: File[], types?: string[]) => {
      setError(null);

      try {
        const result = await maintenanceRequestsService.uploadAttachments(
          requestId,
          files,
          types
        );

        await fetchAttachments(requestId);
        return result;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "فشل في رفع المرفقات";
        setError(msg);
        throw new Error(msg);
      }
    },
    [fetchAttachments]
  );

  const deleteAttachment = useCallback(
    async (requestId: string, attachmentId: string) => {
      setError(null);

      try {
        const result = await maintenanceRequestsService.deleteAttachment(
          attachmentId
        );

        setAttachmentsByRequest((prev) => ({
          ...prev,
          [requestId]: (prev[requestId] || []).filter(
            (item) => item.id !== attachmentId
          ),
        }));

        return result;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          "فشل في حذف المرفق";
        setError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  const setPage = useCallback(
    async (page: number) => {
      await fetchRequests({ page });
    },
    [fetchRequests]
  );

  const setFilters = useCallback(
    async (next: Partial<ListParams>) => {
      await fetchRequests({
        ...next,
        page: 1,
      });
    },
    [fetchRequests]
  );

  const refresh = useCallback(async () => {
    await fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchRequests(initialParams);
    fetchVehicleOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = useMemo(
    () => ({
      items,
      meta,
      params,
      vehicleOptions,
      attachmentsByRequest,
      loading,
      vehiclesLoading,
      attachmentsLoading,
      error,
      isEmpty: !loading && items.length === 0,
    }),
    [
      items,
      meta,
      params,
      vehicleOptions,
      attachmentsByRequest,
      loading,
      vehiclesLoading,
      attachmentsLoading,
      error,
    ]
  );

  const actions = useMemo(
    () => ({
      fetchRequests,
      fetchVehicleOptions,
      fetchAttachments,
      createRequest,
      approveRequest,
      rejectRequest,
      uploadAttachments,
      deleteAttachment,
      setPage,
      setFilters,
      refresh,
      setError,
    }),
    [
      fetchRequests,
      fetchVehicleOptions,
      fetchAttachments,
      createRequest,
      approveRequest,
      rejectRequest,
      uploadAttachments,
      deleteAttachment,
      setPage,
      setFilters,
      refresh,
    ]
  );

  return {
    ...state,
    ...actions,
  };
}

export default useMaintenanceRequests;