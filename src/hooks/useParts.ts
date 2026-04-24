"use client";

import { useCallback, useEffect, useState } from "react";
import partsService, { type PartOption } from "@/src/services/parts.service";

export function useParts() {
  const [items, setItems] = useState<PartOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    setError(null);

    try {
      const data = await partsService.listOptions({ q, limit: 30 });
      setItems(data.items);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "فشل تحميل قطع الغيار");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  return {
    items,
    loading,
    error,
    search: load,
  };
}

export default useParts;