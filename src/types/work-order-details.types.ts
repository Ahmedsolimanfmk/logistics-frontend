export type WorkOrderVehicle = {
  id: string;
  plate_no?: string | null;
  fleet_no?: string | null;
  display_name?: string | null;
  status?: string | null;
  current_odometer?: number | null;
} | null;

export type WorkOrderVendor = {
  id: string;
  name?: string | null;
  code?: string | null;
  classification?: string | null;
  vendor_type?: string | null;
} | null;

export type WorkOrder = {
  id: string;
  status: string;
  type: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
  opened_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  odometer?: number | null;
  notes?: string | null;
  request_id?: string | null;
  vehicle_id?: string | null;
  vehicles?: WorkOrderVehicle;
  vendors?: WorkOrderVendor;
};

export type WorkOrderByIdResponse = {
  work_order: WorkOrder;
};

export type ReportResponse = {
  report_status: "OK" | "NEEDS_QA" | "QA_FAILED" | "NEEDS_PARTS_RECONCILIATION" | string;
  work_order: any;
  vehicle: any;
  post_report_db: any;
  work_order_expenses: any[];
  report_runtime: any;
};

export type InventoryIssue = {
  id: string;
};

export type TabKey = "issues" | "installations" | "qa";

export type Warehouse = {
  id: string;
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
};

export type WorkOrderDetailsBundle = {
  workOrder: WorkOrder | null;
  report: ReportResponse | null;
};

export type WorkOrderHubCounts = {
  requests: number;
  issues: number;
  installations: number;
};

export type CreateIssueResponse = {
  issue: InventoryIssue;
};

export type AddIssueLinesPayload = {
  lines: Array<{
    part_id: string;
    qty: number;
    unit_cost: number;
    notes?: string | null;
  }>;
};

export type AddInstallationPayload = {
  items: Array<{
    part_id: string;
    part_item_id?: string;
    qty_installed: number;
    odometer?: number | null;
    notes?: string | null;
  }>;
};

export type SaveQaPayload = {
  road_test_result: "PASS" | "FAIL";
  remarks?: string | null;
  checklist_json?: any;
};

export type CompleteWorkOrderPayload = {
  notes?: string | null;
};