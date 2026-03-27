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
  fleet_no?: string | null;
  plate_no?: string | null;
  display_name?: string | null;
  license_no?: string | null;
  license_expiry_date?: string | null;
  supervisor_id?: string | null;
};

export type DashboardComplianceDriverItem = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  phone2?: string | null;
  license_no?: string | null;
  license_expiry_date?: string | null;
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
    drivers_expiring?: DashboardComplianceDriverItem[];
  };
  range?: {
    days?: number;
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
  };
};

export type DashboardSummaryTables = {
  active_trips_now?: Array<Record<string, unknown>>;
  trips_needing_finance_close?: Array<Record<string, unknown>>;
};

export type DashboardSummaryAlerts = {
  active_trips_now_count?: number;
  advances_open?: number;
  expenses_pending_too_long?: number;
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