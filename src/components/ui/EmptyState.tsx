import React from "react";

export function EmptyState({
  title = "لا يوجد بيانات",
  hint,
  action,
  className = "",
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-gray-200 bg-white p-8 text-center",
        className,
      ].join(" ")}
    >
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      {hint ? <div className="mt-1 text-sm text-gray-600">{hint}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}