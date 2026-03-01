import React from "react";

type Status =
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  | "APPEALED"
  | "REAPPROVED"
  | "DRAFT"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OPEN"
  | "IN_REVIEW"
  | "CLOSED"
  | "CANCELLED"
  | "POSTED"
  | "IN_STOCK"
  | "RESERVED"
  | "ISSUED"
  | "INSTALLED"
  | "SCRAPPED";

function norm(s: any) {
  return String(s || "").toUpperCase();
}

export function StatusBadge({ status, className = "" }: { status: any; className?: string }) {
  const s = norm(status);

  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold";

  const map: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-800",
    REAPPROVED: "bg-green-100 text-green-900",
    PENDING: "bg-yellow-100 text-yellow-800",
    APPEALED: "bg-purple-100 text-purple-800",
    REJECTED: "bg-red-100 text-red-800",

    IN_STOCK: "bg-green-100 text-green-800",
    RESERVED: "bg-yellow-100 text-yellow-800",
    ISSUED: "bg-blue-100 text-blue-800",
    INSTALLED: "bg-purple-100 text-purple-800",
    SCRAPPED: "bg-red-100 text-red-800",

    DRAFT: "bg-gray-100 text-gray-700",
    ASSIGNED: "bg-blue-100 text-blue-800",
    IN_PROGRESS: "bg-indigo-100 text-indigo-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",

    OPEN: "bg-gray-100 text-gray-700",
    IN_REVIEW: "bg-yellow-100 text-yellow-800",
    CLOSED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",

    POSTED: "bg-blue-100 text-blue-800",
  };

  const cls = map[s] || "bg-gray-100 text-gray-700";

  return <span className={`${base} ${cls} ${className}`}>{s || "-"}</span>;
}