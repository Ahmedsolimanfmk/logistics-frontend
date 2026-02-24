"use client";

import React, { useEffect } from "react";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  tone = "danger",
  isLoading = false,
  dir = "rtl",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: "danger" | "warning" | "info";
  isLoading?: boolean;
  dir?: "rtl" | "ltr";
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  // ESC close
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const toneCls =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : tone === "warning"
      ? "bg-amber-600 hover:bg-amber-700"
      : "bg-slate-900 hover:bg-slate-800";

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
      dir={dir}
      onMouseDown={() => {
        if (!isLoading) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
          <div className="font-semibold">{title}</div>
          <button
            type="button"
            onClick={() => {
              if (!isLoading) onClose();
            }}
            className={cn(
              "px-2 py-1 rounded-lg hover:bg-gray-100",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            disabled={isLoading}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {description ? (
          <div className="px-4 py-4 text-sm text-gray-700">{description}</div>
        ) : null}

        {/* RTL: الأزرار تبدأ من اليسار (start) */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2 justify-start">
          <button
            type="button"
            onClick={() => {
              if (!isLoading) onClose();
            }}
            className={cn(
              "px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            disabled={isLoading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => onConfirm()}
            className={cn(
              "px-4 py-2 rounded-xl text-white text-sm",
              toneCls,
              isLoading && "opacity-60 cursor-not-allowed"
            )}
            disabled={isLoading}
          >
            {isLoading ? "جارٍ التنفيذ..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}