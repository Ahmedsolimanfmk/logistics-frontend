"use client";

import { useEffect, useMemo, useState } from "react";
import { vendorsService } from "@/src/services/vendors.service";
import type { VendorOption } from "@/src/types/vendors.types";
import type { TrexSelectOption } from "@/src/components/ui/TrexSelect";

export function useVendorOptions() {
  const [items, setItems] = useState<VendorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);

    try {
      const res = await vendorsService.listOptions();
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const options: TrexSelectOption[] = useMemo(() => {
    return items.map((v) => ({
      value: v.id,
      label: [v.name, v.code ? `(${v.code})` : null].filter(Boolean).join(" "),
    }));
  }, [items]);

  return {
    items,
    options,
    loading,
    error,
    reload,
  };
}