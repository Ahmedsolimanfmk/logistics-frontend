"use client";

import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    isLoading?: boolean;
  }
>(function Button(
  { children, variant = "primary", isLoading = false, disabled, className = "", ...props },
  ref
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed " +
    "active:translate-y-[0.5px]";

  const styles: Record<Variant, string> = {
    primary:
      "bg-black text-white hover:bg-black/90 focus:ring-black " +
      "ring-offset-[rgb(var(--trex-bg))]",

    secondary:
      "border border-black/10 bg-[rgba(var(--trex-surface),0.7)] text-[rgb(var(--trex-fg))] " +
      "hover:bg-[rgba(var(--trex-surface),0.9)] focus:ring-black/20 " +
      "ring-offset-[rgb(var(--trex-bg))]",

    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600 " +
      "ring-offset-[rgb(var(--trex-bg))]",

    ghost:
      "bg-transparent text-[rgb(var(--trex-fg))] hover:bg-black/[0.04] focus:ring-black/20 " +
      "ring-offset-[rgb(var(--trex-bg))]",
  };

  const spinnerColor =
    variant === "primary" || variant === "danger" ? "border-white/60" : "border-black/30";

  return (
    <button
      {...props}
      ref={ref}
      disabled={disabled || isLoading}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {isLoading ? (
        <span
          className={`h-4 w-4 animate-spin rounded-full border-2 ${spinnerColor} border-t-transparent`}
        />
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = "Button";