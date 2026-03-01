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
                ? "bg-black text-white border-black"
                : "border-black/10 bg-[rgba(var(--trex-surface),0.7)] text-[rgb(var(--trex-fg))] hover:bg-black/[0.04]",
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