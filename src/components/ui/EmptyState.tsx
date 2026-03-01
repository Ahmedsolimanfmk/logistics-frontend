"use client";

import React from "react";
import { Button } from "@/src/components/ui/Button";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export function EmptyState({
  title = "لا توجد بيانات",
  hint,
  actionText,
  onAction,
  icon,
  className,
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // ✅ Trex surface + border alpha (dark/light friendly)
        "rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.85)] p-6 text-center",
        className
      )}
    >
      {icon ? <div className="mx-auto mb-3 w-fit opacity-80">{icon}</div> : null}

      <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">{title}</div>

      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}

      {actionText && onAction ? (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={onAction}>
            {actionText}
          </Button>
        </div>
      ) : null}
    </div>
  );
}