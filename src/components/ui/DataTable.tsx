"use client";

import React from "react";
import { EmptyState } from "./EmptyState";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export type DataTableColumn<T> = {
  key: string;
  label: React.ReactNode;
  className?: string;
  headerClassName?: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  title,
  subtitle,
  right,
  columns,
  rows,
  loading,
  emptyTitle,
  emptyHint,
  onRowClick,

  // pagination (server-side)
  total,
  page,
  pages,
  onPrev,
  onNext,

  // optional footer totals
  footer,
  minWidthClassName = "min-w-[900px]",
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;

  columns: DataTableColumn<T>[];
  rows: T[];

  loading?: boolean;

  emptyTitle?: React.ReactNode;
  emptyHint?: React.ReactNode;

  onRowClick?: (row: T) => void;

  total?: number;
  page?: number;
  pages?: number;
  onPrev?: () => void;
  onNext?: () => void;

  footer?: React.ReactNode;

  minWidthClassName?: string;
}) {
  const hasHeader = Boolean(title || subtitle || right || typeof total === "number");
  const clickable = Boolean(onRowClick);

  const shellCls =
    "rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.92)] backdrop-blur-xl overflow-hidden " +
    "shadow-[0_10px_30px_rgba(0,0,0,0.06)]";

  const muted = "text-slate-500";
  const fg = "text-[rgb(var(--trex-fg))]";

  return (
    <div className={shellCls}>
      {hasHeader ? (
        <div className="px-4 py-3 border-b border-black/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title ? <div className={cn("text-sm font-semibold", fg)}>{title}</div> : null}
            {subtitle ? <div className={cn("text-xs mt-0.5", muted)}>{subtitle}</div> : null}
            {typeof total === "number" ? (
              <div className={cn("text-xs mt-0.5", muted)}>
                الإجمالي: <span className={cn("font-semibold", fg)}>{total}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {right}
            {typeof page === "number" && typeof pages === "number" ? (
              <div className={cn("text-xs", muted)}>
                صفحة <span className={cn("font-semibold", fg)}>{page}</span> /{" "}
                <span className={cn("font-semibold", fg)}>{pages}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Body */}
      {loading ? (
        <div className="p-4">
          <div className="space-y-2">
            <div className="h-8 rounded-lg bg-black/[0.06]" />
            <div className="h-8 rounded-lg bg-black/[0.06]" />
            <div className="h-8 rounded-lg bg-black/[0.06]" />
            <div className="h-8 rounded-lg bg-black/[0.06]" />
            <div className="h-8 rounded-lg bg-black/[0.06]" />
          </div>
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title={emptyTitle ?? "لا يوجد بيانات"}
            hint={emptyHint ?? "جرّب تغيير الفلاتر أو البحث."}
          />
        </div>
      ) : (
        <div className="overflow-auto">
          <table className={cn("w-full text-sm", minWidthClassName)}>
            <thead className="bg-black/[0.04]">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "text-left px-4 py-3 font-semibold whitespace-nowrap text-slate-600",
                      c.headerClassName
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "border-t border-black/10",
                    clickable && "cursor-pointer hover:bg-black/[0.03]"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-3 whitespace-nowrap text-slate-800",
                        c.className
                      )}
                    >
                      {c.render ? c.render(row) : String((row as any)?.[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {footer || onPrev || onNext ? (
        <div className="px-4 py-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-3">
          <div>{footer}</div>

          {onPrev || onNext ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={!onPrev}
                className={cn(
                  "px-3 py-2 rounded-xl border text-sm transition",
                  onPrev
                    ? "border-black/10 bg-black/[0.02] text-slate-700 hover:bg-black/[0.04]"
                    : "border-black/10 bg-black/[0.02] text-slate-400 cursor-not-allowed"
                )}
              >
                السابق
              </button>

              <button
                type="button"
                onClick={onNext}
                disabled={!onNext}
                className={cn(
                  "px-3 py-2 rounded-xl border text-sm transition",
                  onNext
                    ? "border-black/10 bg-black/[0.02] text-slate-700 hover:bg-black/[0.04]"
                    : "border-black/10 bg-black/[0.02] text-slate-400 cursor-not-allowed"
                )}
              >
                التالي
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}