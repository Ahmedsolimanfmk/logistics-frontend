"use client";

import React from "react";
import { useT } from "@/src/i18n/useT";

export type TrexSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type TrexSelectProps = {
  label?: string;
  labelText?: string;
  value: string;
  onChange: (value: string) => void;
  options: TrexSelectOption[];
  placeholder?: string;
  placeholderText?: string;
  loading?: boolean;
  emptyText?: string;
  disabled?: boolean;
  error?: string | null;
  className?: string;
};

export function TrexSelect({
  label,
  labelText,
  value,
  onChange,
  options,
  placeholder,
  placeholderText,
  loading = false,
  emptyText,
  disabled = false,
  error,
  className = "",
}: TrexSelectProps) {
  const t = useT();

  return (
    <label className="grid gap-2 text-sm">
      {label || labelText ? (
        <span className="text-[rgb(var(--trex-fg))] opacity-80">
          {label ? t(label) : labelText}
        </span>
      ) : null}

      <select
        value={value || ""}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "trex-input w-full px-3 py-2 text-sm text-[rgb(var(--trex-fg))]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          error ? "border-red-400 focus:border-red-500" : "",
          className,
        ].join(" ")}
      >
        <option value="">
          {placeholder ? t(placeholder) : placeholderText || t("common.selected")}
        </option>

        {loading ? <option disabled>{t("common.loading")}</option> : null}

        {!loading && options.length === 0 ? (
          <option disabled>{emptyText || t("common.noData")}</option>
        ) : null}

        {!loading
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : null}
      </select>

      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}