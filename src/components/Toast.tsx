"use client";

import React, { useEffect } from "react";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export function Toast({
  open,
  message,
  type = "success",
  dir = "rtl",
  onClose,
}: {
  open: boolean;
  message: string;
  type?: "success" | "error";
  dir?: "rtl" | "ltr";
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onClose(), 2600);
    return () => window.clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  const tone =
    type === "success"
      ? "bg-emerald-600"
      : "bg-red-600";

  return (
    <div
      dir={dir}
      className={cn(
        "fixed bottom-4 z-[70] max-w-[360px] rounded-xl px-4 py-3 text-white shadow-[0_10px_25px_rgba(0,0,0,0.2)] cursor-pointer",
        tone,
        dir === "rtl" ? "left-4" : "right-4"
      )}
      onClick={onClose}
      role="alert"
    >
      <div className="text-sm">{message}</div>
      <div className="mt-1 text-xs opacity-85">اضغط لإغلاق</div>
    </div>
  );
}