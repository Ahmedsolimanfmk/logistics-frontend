"use client";

import React from "react";
import { useT } from "@/src/i18n/useT";

type TrexInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  labelText?: string;
  error?: string | null;
};

export function TrexInput({
  label,
  labelText,
  error,
  className = "",
  ...props
}: TrexInputProps) {
  const t = useT();

  return (
    <label className="grid gap-2 text-sm">
      {label || labelText ? (
        <span className="text-[rgb(var(--trex-fg))] opacity-80">
          {label ? t(label) : labelText}
        </span>
      ) : null}

      <input
        {...props}
        className={[
          "trex-input w-full px-3 py-2 text-sm text-[rgb(var(--trex-fg))]",
          "placeholder:text-slate-400",
          error ? "border-red-400 focus:border-red-500" : "",
          className,
        ].join(" ")}
      />

      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}