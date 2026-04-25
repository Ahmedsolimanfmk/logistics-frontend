"use client";

import { useEffect, useState } from "react";
import warehousesService, {
  type WarehouseOption,
} from "@/src/services/warehouses.service";

export function WarehouseSelect({
  value,
  onChange,
  disabled,
  placeholder = "اختر المخزن",
}: {
  value?: string;
  onChange: (warehouseId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [items, setItems] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      try {
        const data = await warehousesService.listOptions();
        if (alive) setItems(data.items);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <select
      value={value || ""}
      disabled={disabled || loading}
      onChange={(e) => onChange(e.target.value)}
      className="trex-input w-full px-3 py-2 text-sm"
    >
      <option value="">
        {loading ? "جاري تحميل المخازن..." : placeholder}
      </option>

      {items.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
          {w.location ? ` - ${w.location}` : ""}
        </option>
      ))}
    </select>
  );
}

export default WarehouseSelect;