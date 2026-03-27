export type AlertSeverity = "danger" | "warn" | "info";
export type AlertArea = "operations" | "finance" | "maintenance" | "compliance";

export type SeverityFilter = "all" | AlertSeverity;
export type AreaFilter = "all" | AlertArea;
export type TypeFilter = "all" | string;
export type ReadStatusFilter = "all" | "read" | "unread";

export type AlertRow = {
  id: string;
  alert_key?: string;
  type: string;
  severity: AlertSeverity;
  area: AlertArea | string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  href?: string | null;
  created_at: string;
  meta?: Record<string, unknown>;
  is_read?: boolean;
  read_at?: string | null;
};

export type AlertsResponse = {
  total: number;
  items: AlertRow[];
};

export type AlertsFilters = {
  limit?: number;
  area?: string | null;
  read_status?: "read" | "unread" | null;
};

export type AlertsSummary = {
  total: number;
  unread: number;
  read: number;
  danger: number;
  warn: number;
  info: number;
};

export function isValidSeverity(v: string | null): v is AlertSeverity {
  return v === "danger" || v === "warn" || v === "info";
}

export function isValidArea(v: string | null): v is AlertArea {
  return (
    v === "operations" ||
    v === "finance" ||
    v === "maintenance" ||
    v === "compliance"
  );
}

export function isValidReadStatus(v: string | null): v is ReadStatusFilter {
  return v === "all" || v === "read" || v === "unread";
}