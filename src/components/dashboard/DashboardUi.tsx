"use client";

import React from "react";
import { motion } from "framer-motion";

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

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
        },
      }}
      className={cn("grid grid-cols-1 gap-5 md:grid-cols-2", cls)}
    >
      {children}
    </motion.div>
  );
}

export function DashboardSection({
  title,
  children,
  right,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-[24px] border border-black/5 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </motion.section>
  );
}

export function DashboardStatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "info" | "success" | "warn" | "danger";
  icon?: React.ReactNode;
}) {
  const tones = {
    danger: {
      wrapper: "border-rose-100 bg-gradient-to-br from-rose-50 to-white",
      iconBg: "bg-rose-100 text-rose-600",
      value: "text-rose-950",
    },
    warn: {
      wrapper: "border-amber-100 bg-gradient-to-br from-amber-50 to-white",
      iconBg: "bg-amber-100 text-amber-600",
      value: "text-amber-950",
    },
    success: {
      wrapper: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white",
      iconBg: "bg-emerald-100 text-emerald-600",
      value: "text-emerald-950",
    },
    info: {
      wrapper: "border-blue-100 bg-gradient-to-br from-blue-50 to-white",
      iconBg: "bg-blue-100 text-blue-600",
      value: "text-blue-950",
    },
    neutral: {
      wrapper: "border-slate-100 bg-gradient-to-br from-slate-50 to-white",
      iconBg: "bg-slate-100 text-slate-600",
      value: "text-slate-900",
    },
  };

  const style = tones[tone] || tones.neutral;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "relative overflow-hidden rounded-[24px] border p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all",
        style.wrapper
      )}
    >
      {/* Decorative subtle glow */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/40 blur-2xl" />

      <div className="relative flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-slate-500">
          {label}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              style.iconBg
            )}
          >
            {icon}
          </div>
        )}
      </div>

      <div className={cn("relative mt-3 text-3xl font-black tracking-tight", style.value)}>
        {value}
      </div>

      {hint && (
        <div className="relative mt-2 text-xs font-medium text-slate-500/80">
          {hint}
        </div>
      )}
    </motion.div>
  );
}

export function DashboardTabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 overflow-hidden rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300",
        active
          ? "bg-[rgb(var(--trex-accent))] text-white shadow-md shadow-[rgba(var(--trex-accent),0.3)]"
          : "bg-transparent text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
      )}
    >
      {/* Animated active background for non-active states (hover effect) */}
      {!active && (
        <span className="absolute inset-0 z-0 scale-95 rounded-xl bg-slate-200/50 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100" />
      )}
      
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  );
}