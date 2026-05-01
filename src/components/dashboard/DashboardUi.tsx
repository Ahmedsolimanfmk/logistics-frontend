"use client";

import React from "react";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function DashboardGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}) {
  const cls =
    cols === 2
      ? "xl:grid-cols-2"
      : cols === 3
      ? "xl:grid-cols-3"
      : "xl:grid-cols-4";

  return <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", cls)}>{children}</div>;
}

export function DashboardSection({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[rgb(var(--trex-fg))]">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function DashboardStatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "info" | "success" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50"
      : tone === "success"
      ? "border-emerald-200 bg-emerald-50"
      : tone === "info"
      ? "border-blue-200 bg-blue-50"
      : "border-black/10 bg-white";

  return (
    <div className={cn("rounded-3xl border p-4 shadow-sm", toneClass)}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-[rgb(var(--trex-fg))]">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function DashboardTabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {children}
    </button>
  );
}