"use client";

import { useCallback, useEffect, useState } from "react";
import { vendorsService } from "@/src/services/vendors.service";
import type { Vendor, VendorListFilters } from "@/src/types/vendors.types";

export function useVendorsList(filters: VendorListFilters) {
  const [items, setItems] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await vendorsService.list(filters);
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setPages(1);
      setError(e?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [
    filters.page,
    filters.pageSize,
    filters.q,
    filters.vendor_type,
    filters.classification,
    filters.status,
  ]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    items,
    total,
    pages,
    loading,
    error,
    reload,
  };
}