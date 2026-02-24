import React from "react";

export function KpiCard({
  label,
  value,
  hint,
  className = "",
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-gray-200 bg-white p-4",
        "shadow-sm",
        className,
      ].join(" ")}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}