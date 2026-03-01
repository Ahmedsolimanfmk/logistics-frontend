"use client";

import React from "react";
import { Card } from "@/src/components/ui/Card";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function formatNumber(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

export function KpiCard({
  label,
  value,
  hint,
  right,
  className,
  formatValue = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  /** ✅ optional: لو value رقم/قابل للتحويل لرقم وتريد format */
  formatValue?: boolean;
}) {
  const shownValue = formatValue ? formatNumber(value) : value;

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-xl font-semibold text-[rgb(var(--trex-fg))]">
            {shownValue}
          </div>
        </div>

        {right ? <div className="pt-1">{right}</div> : null}
      </div>

      {hint ? <div className="mt-2 text-[11px] text-slate-500">{hint}</div> : null}
    </Card>
  );
}