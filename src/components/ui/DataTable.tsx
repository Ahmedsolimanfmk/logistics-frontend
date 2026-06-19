"use client";

import React from "react";
import { EmptyState } from "./EmptyState";
import { FileSpreadsheet, FileDown } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/src/utils/exportUtils";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export type DataTableColumn<T> = {
  key: string;
  label: React.ReactNode;
  exportLabel?: string;
  className?: string;
  headerClassName?: string;
  render?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number | null | undefined;
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

  // export functionality
  exportable = true,
  exportFilename = "data_export",

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

  exportable?: boolean;
  exportFilename?: string;

  total?: number;
  page?: number;
  pages?: number;
  onPrev?: () => void;
  onNext?: () => void;

  footer?: React.ReactNode;

  minWidthClassName?: string;
}) {
  const hasHeader = Boolean(title || subtitle || right || typeof total === "number" || exportable);
  const clickable = Boolean(onRowClick);

  const shellCls =
    "rounded-2xl border border-black/10 bg-[rgba(var(--trex-surface),0.92)] backdrop-blur-xl overflow-hidden " +
    "shadow-[0_10px_30px_rgba(0,0,0,0.06)]";

  const muted = "text-slate-500";
  const fg = "text-[rgb(var(--trex-fg))]";

  const handleExport = (type: "excel" | "pdf") => {
    if (!rows || rows.length === 0) return;

    const headers = columns.map(c => 
      c.exportLabel || (typeof c.label === "string" ? c.label : c.key)
    );

    const data = rows.map(row => {
      return columns.map(c => {
        if (c.exportValue) return c.exportValue(row) ?? "";
        return (row as any)?.[c.key] ?? "";
      });
    });

    if (type === "excel") {
      exportToExcel(exportFilename, headers, data);
    } else {
      exportToPDF(exportFilename, headers, data);
    }
  };

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
            
            {exportable && rows?.length > 0 && (
              <div className="flex items-center gap-1 bg-black/[0.02] border border-black/10 rounded-xl p-1 mr-2">
                <button
                  type="button"
                  onClick={() => handleExport("excel")}
                  title="تصدير Excel"
                  className="p-1.5 rounded-lg text-slate-600 hover:text-green-600 hover:bg-green-50 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  title="تصدير PDF"
                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition"
                >
                  <FileDown className="w-4 h-4" />
                </button>
              </div>
            )}

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
          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-black/5">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 space-y-3",
                  clickable && "cursor-pointer hover:bg-black/[0.03] active:bg-black/[0.05]"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((c) => (
                  <div key={c.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      {c.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 break-words">
                      {c.render ? c.render(row) : String((row as any)?.[c.key] ?? "")}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <table className={cn("hidden md:table w-full text-sm", minWidthClassName)}>
            <thead className="bg-black/[0.02]">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={cn(
                      "text-left px-4 py-3 font-semibold whitespace-nowrap text-slate-500 text-xs uppercase tracking-wider",
                      c.headerClassName
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5">
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className={cn(
                    "transition-colors",
                    clickable ? "cursor-pointer hover:bg-slate-50" : "hover:bg-slate-50/50"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-4 py-3 whitespace-nowrap text-slate-800 font-medium",
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