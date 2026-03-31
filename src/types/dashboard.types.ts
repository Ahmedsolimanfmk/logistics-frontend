export type DashboardTabKey = "operations" | "finance" | "maintenance" | "dev";

export type DashboardTrendPoint = {
  label: string;
  value: number;
};

export type DashboardAlertSeverity = "danger" | "warn" | "info";

export type DashboardAlertRow = {
  id: string;
  alert_key?: string;
  type: string;
  severity: DashboardAlertSeverity;
  area: string;
  title: string;
  message: string;
  entity_id?: string | null;
  entity_type?: string | null;
  href?: string | null;
  created_at: string;
  is_read?: boolean;
  read_at?: string | null;
  meta?: Record<string, unknown>;
};

export type DashboardAlertsSummary = {
  total: number;
  unread: number;
  read: number;
  by_severity?: {
    danger?: number;
    warn?: number;
    info?: number;
  };
  by_area?: {
    operations?: number;
    finance?: number;
    maintenance?: number;
    compliance?: number;
    [key: string]: number | undefined;
  };
};

export type DashboardComplianceVehicleItem = {
  id: string;
  company_id?: string | null;
  fleet_no?: string | null;
  plate_no?: string | null;
  display_name?: string | null;
  status?: string | null;
  license_no?: string | null;
  license_issue_date?: string | null;
  license_expiry_date?: string | null;
  disable_reason?: string | null;
  updated_at?: string | null;
  days_left?: number | null;
  days_overdue?: number | null;
};

export type DashboardComplianceDriverItem = {
  id: string;
  company_id?: string | null;
  full_name?: string | null;
  phone?: string | null;
  phone2?: string | null;
  national_id?: string | null;
  hire_date?: string | null;
  license_no?: string | null;
  license_issue_date?: string | null;
  license_expiry_date?: string | null;
  status?: string | null;
  disable_reason?: string | null;
  updated_at?: string | null;
  days_left?: number | null;
  days_overdue?: number | null;
};

export type DashboardComplianceResponse = {
  counts?: {
    vehicles?: {
      expiring?: number;
      expired?: number;
    };
    drivers?: {
      expiring?: number;
      expired?: number;
    };
  };
  items?: {
    vehicles_expiring?: DashboardComplianceVehicleItem[];
    vehicles_expired?: DashboardComplianceVehicleItem[];
    drivers_expiring?: DashboardComplianceDriverItem[];
    drivers_expired?: DashboardComplianceDriverItem[];
  };
  range?: {
    days?: number;
    limit?: number;
    now?: string | Date;
    until?: string | Date;
  };
};

export type DashboardTrendsBundle = {
  trips_created?: Array<{ label?: string; bucket?: string; value?: number }>;
  trips_assigned?: Array<{ label?: string; bucket?: string; value?: number }>;
  expenses_approved?: Array<{ label?: string; bucket?: string; value?: number }>;
  expenses_pending?: Array<{ label?: string; bucket?: string; value?: number }>;
};

export type DashboardSummaryCards = {
  trips_today?: {
    total?: number;
    [key: string]: unknown;
  };
  trips_month_total?: number;
  vehicles?: Record<string, unknown>;
  expenses_today?: Record<string, unknown>;
  advances_outstanding?: {
    count?: number;
    remaining_total?: number;
  };
  ar_due_soon?: {
    enabled?: boolean;
    count?: number;
    total?: number;
  };
  ar_overdue?: {
    enabled?: boolean;
    count?: number;
    total?: number;
  };
  ap_due_soon?: {
    enabled?: boolean;
    count?: number;
    total?: number;
  };
  ap_overdue?: {
    enabled?: boolean;
    count?: number;
    total?: number;
  };
  maintenance?: {
    open_work_orders?: number;
    completed_today?: number;
    qa_needs?: number;
    qa_failed?: number;
    parts_mismatch?: number;
    maintenance_parts_cost_today?: number;
    maintenance_cash_cost_today?: number;
    maintenance_cost_today?: number;
  };
};

export type DashboardSummaryTables = {
  active_trips_now?: Array<Record<string, unknown>>;
  trips_needing_finance_close?: Array<Record<string, unknown>>;
  top_expense_types_today?: Array<Record<string, unknown>>;
  pending_expenses_top10?: Array<Record<string, unknown>>;
  advances_open_top10?: Array<Record<string, unknown>>;
  top_ar_overdue_invoices?: Array<Record<string, unknown>>;
  top_ar_due_soon_invoices?: Array<Record<string, unknown>>;
  top_ap_overdue_payables?: Array<Record<string, unknown>>;
  top_ap_due_soon_payables?: Array<Record<string, unknown>>;
  maintenance_recent_work_orders?: Array<Record<string, unknown>>;
};

export type DashboardSummaryAlerts = {
  active_trips_now_count?: number;
  trips_completed_not_closed?: number;
  advances_open?: number;
  advances_open_too_long?: number;
  expenses_pending_too_long?: number;
  maintenance_open?: number;
  maintenance_qa_needs?: number;
  ar_due_soon_count?: number;
  ar_overdue_count?: number;
  ar_due_soon_total?: number;
  ar_overdue_total?: number;
  ap_enabled?: boolean;
  ap_due_soon_count?: number;
  ap_overdue_count?: number;
  ap_due_soon_total?: number;
  ap_overdue_total?: number;
};

export type DashboardSummaryResponse = {
  cards?: DashboardSummaryCards;
  tables?: DashboardSummaryTables;
  alerts?: DashboardSummaryAlerts;
};

export type DashboardSummaryState = {
  summary: DashboardSummaryResponse | null;
  trendsBundle: DashboardTrendsBundle | null;
  compliance: DashboardComplianceResponse | null;
  alertsList: DashboardAlertRow[];
  alertsSummary: DashboardAlertsSummary | null;
};

export type DashboardAlertsListResponse = {
  total?: number;
  items: DashboardAlertRow[];
};