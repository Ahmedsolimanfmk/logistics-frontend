// src/components/ui/Button.tsx
import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  children,
  variant = "primary",
  isLoading = false,
  disabled,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  isLoading?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const styles: Record<Variant, string> = {
    primary: "bg-black text-white hover:bg-black/90 focus:ring-black",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-600",
    ghost: "bg-transparent text-gray-900 hover:bg-gray-100 focus:ring-gray-300",
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" /> : null}
      {children}
    </button>
  );
}