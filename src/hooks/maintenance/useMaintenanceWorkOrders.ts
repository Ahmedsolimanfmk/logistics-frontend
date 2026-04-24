"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import workOrdersService, {
  type UUID,
  type IssueLine,
  type InstallationLine,
} from "@/src/services/work-orders.service";

type ListParams = {
  page?: number;
  limit?: number;
  status?: string;
  vehicle_id?: string;
  request_id?: string;
  vendor_id?: string;
  q?: string;
};

type Meta = {
  page: number;
  limit: number;
  total: number;
};

const DEFAULT_META: Meta = {
  page: 1,
  limit: 20,
  total: 0,
};

export function useMaintenanceWorkOrders(initialParams?: ListParams) {
  const [items, setItems] = useState<any[]>([]);
  const [meta, setMeta] = useState<Meta>(DEFAULT_META);
  const [params, setParams] = useState<ListParams>({
    page: initialParams?.page ?? 1,
    limit: initialParams?.limit ?? 20,
    status: initialParams?.status ?? "",
    vehicle_id: initialParams?.vehicle_id ?? "",
    request_id: initialParams?.request_id ?? "",
    vendor_id: initialParams?.vendor_id ?? "",
    q: initialParams?.q ?? "",
  });

  const [selected, setSelected] = useState<any | null>(null);
  const [report, setReport] = useState<any | null>(null);
  const [installations, setInstallations] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [installationsLoading, setInstallationsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const readError = (err: any, fallback: string) =>
    err?.response?.data?.message || err?.message || fallback;

  const fetchWorkOrders = useCallback(
    async (nextParams?: Partial<ListParams>) => {
      setLoading(true);
      setError(null);

      try {
        const merged = {
          ...params,
          ...nextParams,
        };

        const data = await workOrdersService.list(merged);

        setItems(Array.isArray(data?.items) ? data.items : []);
        setMeta({
          page: Number(data?.page || merged.page || 1),
          limit: Number(data?.limit || merged.limit || 20),
          total: Number(data?.total || 0),
        });
        setParams(merged);
      } catch (err: any) {
        setError(readError(err, "فشل في تحميل أوامر الشغل"));
      } finally {
        setLoading(false);
      }
    },
    [params]
  );

  const fetchWorkOrderById = useCallback(async (id: UUID) => {
    setDetailsLoading(true);
    setError(null);

    try {
      const data = await workOrdersService.getById(id);
      const row = data?.work_order ?? data;
      setSelected(row);
      return row;
    } catch (err: any) {
      const msg = readError(err, "فشل في تحميل أمر الشغل");
      setError(msg);
      throw new Error(msg);
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async (id: UUID) => {
    setReportLoading(true);
    setError(null);

    try {
      const data = await workOrdersService.getReport(id);
      setReport(data);
      return data;
    } catch (err: any) {
      const msg = readError(err, "فشل في تحميل تقرير أمر الشغل");
      setError(msg);
      throw new Error(msg);
    } finally {
      setReportLoading(false);
    }
  }, []);

  const savePostReport = useCallback(
    async (id: UUID, payload: any) => {
      setActionLoading(true);
      setError(null);

      try {
        const data = await workOrdersService.saveReport(id, payload);
        await fetchReport(id);
        return data;
      } catch (err: any) {
        const msg = readError(err, "فشل في حفظ تقرير ما بعد الصيانة");
        setError(msg);
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [fetchReport]
  );

  const completeWorkOrder = useCallback(
    async (id: UUID) => {
      setActionLoading(true);
      setError(null);

      try {
        const data = await workOrdersService.complete(id);
        await fetchWorkOrders();
        await fetchWorkOrderById(id);
        return data;
      } catch (err: any) {
        const msg = readError(err, "فشل في إغلاق أمر الشغل");
        setError(msg);
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [fetchWorkOrders, fetchWorkOrderById]
  );

  const createIssue = useCallback(async (workOrderId: UUID) => {
    setActionLoading(true);
    setError(null);

    try {
      return await workOrdersService.createIssue(workOrderId);
    } catch (err: any) {
      const msg = readError(err, "فشل في إنشاء صرف مخزني لأمر الشغل");
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const addIssueLines = useCallback(async (issueId: UUID, lines: IssueLine[]) => {
    setActionLoading(true);
    setError(null);

    try {
      return await workOrdersService.addIssueLines(issueId, lines);
    } catch (err: any) {
      const msg = readError(err, "فشل في إضافة أصناف الصرف");
      setError(msg);
      throw new Error(msg);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const fetchInstallations = useCallback(async (workOrderId: UUID) => {
    setInstallationsLoading(true);
    setError(null);

    try {
      const data = await workOrdersService.listInstallations(workOrderId);
      const rows = Array.isArray(data?.items) ? data.items : [];
      setInstallations(rows);
      return rows;
    } catch (err: any) {
      const msg = readError(err, "فشل في تحميل التركيبات");
      setError(msg);
      throw new Error(msg);
    } finally {
      setInstallationsLoading(false);
    }
  }, []);

  const addInstallations = useCallback(
    async (workOrderId: UUID, lines: InstallationLine[]) => {
      setActionLoading(true);
      setError(null);

      try {
        const data = await workOrdersService.addInstallations(workOrderId, lines);
        await fetchInstallations(workOrderId);
        await fetchReport(workOrderId);
        return data;
      } catch (err: any) {
        const msg = readError(err, "فشل في إضافة التركيبات");
        setError(msg);
        throw new Error(msg);
      } finally {
        setActionLoading(false);
      }
    },
    [fetchInstallations, fetchReport]
  );

  const setPage = useCallback(
    async (page: number) => {
      await fetchWorkOrders({ page });
    },
    [fetchWorkOrders]
  );

  const setFilters = useCallback(
    async (next: Partial<ListParams>) => {
      await fetchWorkOrders({
        ...next,
        page: 1,
      });
    },
    [fetchWorkOrders]
  );

  const refresh = useCallback(async () => {
    await fetchWorkOrders();
  }, [fetchWorkOrders]);

  useEffect(() => {
    fetchWorkOrders(initialParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pages = useMemo(() => {
    return Math.max(1, Math.ceil(meta.total / meta.limit));
  }, [meta.total, meta.limit]);

  return {
    items,
    meta: {
      ...meta,
      pages,
    },
    params,
    selected,
    report,
    installations,

    loading,
    detailsLoading,
    reportLoading,
    installationsLoading,
    actionLoading,
    error,
    isEmpty: !loading && items.length === 0,

    fetchWorkOrders,
    fetchWorkOrderById,
    fetchReport,
    savePostReport,
    completeWorkOrder,
    createIssue,
    addIssueLines,
    fetchInstallations,
    addInstallations,
    setPage,
    setFilters,
    refresh,
    setError,
  };
}

export default useMaintenanceWorkOrders;