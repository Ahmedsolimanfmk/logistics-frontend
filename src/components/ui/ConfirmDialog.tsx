"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Button } from "@/src/components/ui/Button";

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
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    lastActiveRef.current = document.activeElement as HTMLElement | null;

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      if (closeBtnRef.current) closeBtnRef.current.focus();
      else panelRef.current?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isLoading) onClose();
        return;
      }

      if (e.key === "Tab") {
        const root = panelRef.current;
        if (!root) return;

        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => {
          const disabledAttr = el.getAttribute("disabled");
          const ariaHidden = el.getAttribute("aria-hidden");
          return !disabledAttr && ariaHidden !== "true";
        });

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = prevOverflow;

      lastActiveRef.current?.focus?.();
      lastActiveRef.current = null;
    };
  }, [open, onClose, isLoading]);

  if (!open) return null;

  const toneRing =
    tone === "danger"
      ? "ring-red-500/20"
      : tone === "warning"
      ? "ring-amber-500/20"
      : "ring-sky-500/20";

  const toneHeader =
    tone === "danger"
      ? "text-red-600"
      : tone === "warning"
      ? "text-amber-700"
      : "text-sky-700";

  const confirmVariant = useMemo(() => {
    return tone === "danger" ? "danger" : tone === "warning" ? "primary" : "secondary";
  }, [tone]);

  const overlay = "bg-black/35 backdrop-blur-[1px]";
  const surface = "bg-[rgba(var(--trex-surface),0.98)] text-[rgb(var(--trex-fg))] border-black/10";
  const muted = "text-slate-500";

  return (
    <div
      className={cn("fixed inset-0 z-[80] flex items-center justify-center p-4", overlay)}
      dir={dir}
      role="dialog"
      aria-modal="true"
      onMouseDown={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "w-full max-w-md rounded-2xl border shadow-xl overflow-hidden ring-1 outline-none",
          surface,
          toneRing
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-black/10 flex items-center justify-between gap-3">
          <div className={cn("font-semibold text-sm", toneHeader)}>{title}</div>

          <Button
            ref={closeBtnRef}
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
          >
            ✕
          </Button>
        </div>

        {description ? (
          <div className="px-4 py-4">
            <div className={cn("text-sm leading-6", muted)}>{description}</div>
          </div>
        ) : null}

        <div className="px-4 py-3 border-t border-black/10 flex gap-2 justify-start">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>

          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}