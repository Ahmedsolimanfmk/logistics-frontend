// src/components/ui/TabsBar.tsx
"use client";

import React from "react";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export function TabsBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: Array<{ key: T; label: React.ReactNode; disabled?: boolean }>;
  value: T;
  onChange: (key: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tabs.map((x) => {
        const active = x.key === value;
        return (
          <button
            key={x.key}
            type="button"
            disabled={x.disabled}
            onClick={() => onChange(x.key)}
            className={cn(
              "px-3 py-2 rounded-xl text-sm border transition",
              active
                ? "bg-white/10 border-white/10 text-white"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white",
              x.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {x.label}
          </button>
        );
      })}
    </div>
  );
}