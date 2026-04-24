"use client";

import { useMemo, useState } from "react";
import useParts from "@/src/hooks/useParts";

export function PartSelect({
  value,
  onChange,
  disabled,
  placeholder = "اختر قطعة الغيار",
}: {
  value?: string;
  onChange: (partId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { items, loading, search } = useParts();
  const [q, setQ] = useState("");

  const selectedLabel = useMemo(() => {
    const part = items.find((p) => p.id === value);
    if (!part) return "";
    return part.part_number ? `${part.name} - ${part.part_number}` : part.name;
  }, [items, value]);

  return (
    <div className="space-y-2">
      <input
        value={q}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setQ(next);
          search(next);
        }}
        placeholder="بحث باسم أو رقم القطعة..."
        className="trex-input w-full px-3 py-2 text-sm"
      />

      <select
        value={value || ""}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
        className="trex-input w-full px-3 py-2 text-sm"
      >
        <option value="">
          {loading ? "جاري التحميل..." : selectedLabel || placeholder}
        </option>

        {items.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.part_number ? ` - ${p.part_number}` : ""}
            {p.brand ? ` - ${p.brand}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export default PartSelect;