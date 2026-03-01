import React from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="text-xl font-bold text-[rgb(var(--trex-fg))]">{title}</div>
        {subtitle ? (
          <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
        ) : null}
      </div>

      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}