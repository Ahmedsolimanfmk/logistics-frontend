"use client";

import React from "react";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type Tone = "neutral" | "success" | "warn" | "danger" | "info";

export function DashboardStatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-100 bg-red-50"
      : tone === "warn"
      ? "border-amber-100 bg-amber-50"
      : tone === "success"
      ? "border-emerald-100 bg-emerald-50"
      : tone === "info"
      ? "border-blue-100 bg-blue-50"
      : "border-black/10 bg-white";

  const dotClass =
    tone === "danger"
      ? "bg-red-500"
      : tone === "warn"
      ? "bg-amber-500"
      : tone === "success"
      ? "bg-emerald-500"
      : tone === "info"
      ? "bg-blue-500"
      : "bg-slate-400";

  return (
    <div
      className={cn(
        "group rounded-3xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
        toneClass
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium text-slate-500">
            {label}
          </div>

          <div className="mt-2 text-2xl font-bold tracking-tight text-[rgb(var(--trex-fg))]">
            {value}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {icon ? (
            <div className="rounded-2xl bg-white/70 p-2 text-slate-700 shadow-sm">
              {icon}
            </div>
          ) : null}

          <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", dotClass)} />
        </div>
      </div>

      {hint ? (
        <div className="mt-3 text-xs leading-5 text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}

export function DashboardSection({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[rgb(var(--trex-fg))]">
            {title}
          </h2>

          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {children}
    </section>
  );
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
      ? "md:grid-cols-2"
      : cols === 3
      ? "md:grid-cols-3"
      : "md:grid-cols-4";

  return <div className={cn("grid grid-cols-1 gap-3", cls)}>{children}</div>;
}

export function DashboardEmptyState({
  title = "لا توجد بيانات",
  hint = "لا توجد بيانات متاحة حاليًا.",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/10 bg-black/[0.02] p-8 text-center">
      <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">
        {title}
      </div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </div>
  );
}

export function DashboardSkeletonCard() {
  return (
    <div className="animate-pulse rounded-3xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="h-3 w-24 rounded bg-black/10" />
      <div className="mt-3 h-7 w-20 rounded bg-black/10" />
      <div className="mt-4 h-3 w-36 rounded bg-black/10" />
    </div>
  );
}

export function DashboardSkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <DashboardGrid>
      {Array.from({ length: count }).map((_, i) => (
        <DashboardSkeletonCard key={i} />
      ))}
    </DashboardGrid>
  );
}

export function DashboardTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl px-4 py-2 text-sm font-semibold transition duration-200",
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "text-slate-600 hover:bg-black/[0.04]"
      )}
    >
      {children}
    </button>
  );
}

export function DashboardStatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const cls =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "info"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : "border-black/10 bg-black/[0.03] text-slate-600";

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        cls
      )}
    >
      {children}
    </span>
  );
}