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

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {hasHeader ? (
        <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title ? <div className="text-sm font-semibold text-gray-900">{title}</div> : null}
            {subtitle ? <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div> : null}
            {typeof total === "number" ? (
              <div className="text-xs text-gray-500 mt-0.5">
                الإجمالي: <span className="font-semibold text-gray-900">{total}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {right}
            {typeof page === "number" && typeof pages === "number" ? (
              <div className="text-xs text-gray-600">
                صفحة <span className="font-semibold text-gray-900">{page}</span> /{" "}
                <span className="font-semibold text-gray-900">{pages}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Body */}
      {loading ? (
        <div className="p-4">
          <div className="space-y-2">
            <div className="h-8 rounded-lg bg-gray-100" />
            <div className="h-8 rounded-lg bg-gray-100" />
            <div className="h-8 rounded-lg bg-gray-100" />
            <div className="h-8 rounded-lg bg-gray-100" />
            <div className="h-8 rounded-lg bg-gray-100" />
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
            <thead className="bg-gray-50">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap",
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
                    "border-t border-gray-200",
                    clickable && "cursor-pointer hover:bg-gray-50"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn("px-4 py-3 text-gray-900 whitespace-nowrap", c.className)}
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
      {(footer || onPrev || onNext) ? (
        <div className="px-4 py-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div>{footer}</div>

          {(onPrev || onNext) ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                disabled={!onPrev}
                className={cn(
                  "px-3 py-2 rounded-xl border text-sm transition",
                  onPrev
                    ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
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
                    ? "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    : "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
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