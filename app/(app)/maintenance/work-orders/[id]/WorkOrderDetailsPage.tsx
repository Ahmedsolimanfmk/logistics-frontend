"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";
import { apiGet, apiPost, unwrapTotal } from "@/src/lib/api";

// ✅ Design System (الموحد)
import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Card } from "@/src/components/ui/Card";
import { TabsBar } from "@/src/components/ui/TabsBar";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}
function isAdminOrAccountant(role: any) {
  const rr = roleUpper(role);
  return rr === "ADMIN" || rr === "ACCOUNTANT";
}

type WorkOrder = {
  id: string;
  status: string;
  type: string;
  vendor_name?: string | null;
  opened_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  odometer?: number | null;
  notes?: string | null;
  request_id?: string | null;
  vehicle_id?: string | null;
  vehicles?: {
    id: string;
    plate_no?: string | null;
    fleet_no?: string | null;
    display_name?: string | null;
    status?: string | null;
    current_odometer?: number | null;
  } | null;
};

type WorkOrderByIdResponse = { work_order: WorkOrder };

type ReportResponse = {
  report_status: "OK" | "NEEDS_QA" | "QA_FAILED" | "NEEDS_PARTS_RECONCILIATION" | string;
  work_order: any;
  vehicle: any;
  post_report_db: any;
  work_order_expenses: any[];
  report_runtime: any;
};

type InventoryIssue = { id: string };
type TabKey = "issues" | "installations" | "qa";

type Warehouse = {
  id: string;
  name?: string | null;
  code?: string | null;
  is_active?: boolean | null;
};

export default function WorkOrderDetailsPage() {
  const t = useT();

  // ✅ تثبيت t لتفادي loops
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const router = useRouter();
  const sp = useSearchParams();

  const token = useAuth((s: any) => s.token);
  const user = useAuth((s: any) => s.user);

  // hydrate once
  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  const role = user?.role;
  const canManage = isAdminOrAccountant(role);

  const params = useParams<{ id: string }>();
  const id = params?.id;

  const tabQ = String(sp?.get("tab") || "").toLowerCase();
  const initialTab: TabKey = tabQ === "installations" ? "installations" : tabQ === "qa" ? "qa" : "issues";
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const showToast = useCallback((m: string, type: "success" | "error" = "success") => {
    setToastMsg(m);
    setToastType(type);
    setToastOpen(true);
  }, []);

  // ✅ WO Hub
  const [hubWarehouseId, setHubWarehouseId] = useState("");
  const [hubCounts, setHubCounts] = useState({ requests: 0, issues: 0, installations: 0 });
  const [hubCountsLoading, setHubCountsLoading] = useState(false);

  // ✅ Warehouses dropdown
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [whLoading, setWhLoading] = useState(false);

  // -------- Issues state --------
  const [issueCreating, setIssueCreating] = useState(false);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [issueMsg, setIssueMsg] = useState<string | null>(null);

  const [linePartId, setLinePartId] = useState("");
  const [lineQty, setLineQty] = useState<number>(1);
  const [lineUnitCost, setLineUnitCost] = useState<number>(0);
  const [lineNotes, setLineNotes] = useState("");
  const [lineSaving, setLineSaving] = useState(false);
  const [lineMsg, setLineMsg] = useState<string | null>(null);

  // -------- Installations state --------
  const [instLoading, setInstLoading] = useState(false);
  const [instItems, setInstItems] = useState<any[]>([]);
  const [instMsg, setInstMsg] = useState<string | null>(null);

  // ✅ Changed: instPartId now selected from issued-only dropdown (not manual uuid input)
  const [instPartId, setInstPartId] = useState("");
  // ✅ Optional serial (only if backend returns it in issued lines later)
  const [instPartItemId, setInstPartItemId] = useState("");
  const [instQty, setInstQty] = useState<number>(1);
  const [instOdo, setInstOdo] = useState<number | "">("");
  const [instNotes, setInstNotes] = useState("");
  const [instSaving, setInstSaving] = useState(false);

  // -------- QA state --------
  const [qaResult, setQaResult] = useState<"PASS" | "FAIL" | "">("");
  const [qaRemarks, setQaRemarks] = useState("");
  const [qaSaving, setQaSaving] = useState(false);
  const [qaMsg, setQaMsg] = useState<string | null>(null);

  // -------- Complete state --------
  const [completing, setCompleting] = useState(false);
  const [completeMsg, setCompleteMsg] = useState<string | null>(null);

  const setTabAndUrl = useCallback(
    (next: TabKey) => {
      setTab(next);
      if (!id) return;
      const p = new URLSearchParams(sp?.toString() || "");
      p.set("tab", next);
      router.replace(`/maintenance/work-orders/${id}?${p.toString()}`);
    },
    [id, router, sp]
  );

  // ✅ load warehouses
  const loadWarehouses = useCallback(async () => {
    if (!token) return;
    setWhLoading(true);
    try {
      const res: any = await apiGet("/inventory/warehouses");
      const arr: Warehouse[] =
        Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : Array.isArray(res?.data) ? res.data : [];

      setWarehouses(arr);

      // auto pick first warehouse if none selected
      if (!hubWarehouseId && arr?.[0]?.id) setHubWarehouseId(arr[0].id);
    } catch (e: any) {
      setWarehouses([]);
      showToast(e?.message || "Failed to load warehouses", "error");
    } finally {
      setWhLoading(false);
    }
  }, [token, hubWarehouseId, showToast]);

  useEffect(() => {
    if (!token) return;
    loadWarehouses();
  }, [token, loadWarehouses]);

  // ✅ WO Hub actions
  function hubOpenRequests() {
    if (!id) return;
    router.push(`/inventory/requests?work_order_id=${encodeURIComponent(id)}`);
  }
  function hubOpenIssues() {
    if (!id) return;
    router.push(`/inventory/issues?work_order_id=${encodeURIComponent(id)}`);
  }
  function hubAddInstallations() {
    setTabAndUrl("installations");
  }
  function hubCreateRequest() {
    if (!id) return;

    const wh = String(hubWarehouseId || "").trim();
    if (!wh) {
      showToast("warehouse_id مطلوب لإنشاء طلب مخزني من داخل أمر العمل.", "error");
      return;
    }

    router.push(`/inventory/requests/new?work_order_id=${encodeURIComponent(id)}&warehouse_id=${encodeURIComponent(wh)}`);
  }

  const loadInstallations = useCallback(async () => {
    if (!token || !id) return;
    setInstLoading(true);
    setInstMsg(null);

    try {
      const res: any = await apiGet(`/maintenance/work-orders/${id}/installations`);
      const arr = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.installations)
        ? res.installations
        : Array.isArray(res?.data)
        ? res.data
        : [];

      setInstItems(arr);
    } catch (e: any) {
      setInstItems([]);
      setInstMsg(e?.message || tRef.current("woDetails.installationsLoadFailed"));
    } finally {
      setInstLoading(false);
    }
  }, [token, id]);

  const loadHubCounts = useCallback(async () => {
    if (!token || !id) return;
    setHubCountsLoading(true);

    try {
      const reqRes: any = await apiGet(`/inventory/requests`, {
        work_order_id: id,
        page: 1,
        limit: 1,
      });
      const requestsTotal = unwrapTotal(reqRes);

      const issRes: any = await apiGet(`/inventory/issues`, {
        work_order_id: id,
        page: 1,
        limit: 1,
      });
      const issuesTotal = unwrapTotal(issRes);

      const instRes: any = await apiGet(`/maintenance/work-orders/${id}/installations`);
      const instArr = Array.isArray(instRes)
        ? instRes
        : Array.isArray(instRes?.items)
        ? instRes.items
        : Array.isArray(instRes?.installations)
        ? instRes.installations
        : Array.isArray(instRes?.data)
        ? instRes.data
        : [];
      const installationsTotal = instArr.length;

      setHubCounts({
        requests: Number.isFinite(requestsTotal) ? requestsTotal : 0,
        issues: Number.isFinite(issuesTotal) ? issuesTotal : 0,
        installations: installationsTotal,
      });
    } catch {
      // ignore
    } finally {
      setHubCountsLoading(false);
    }
  }, [token, id]);

  const load = useCallback(async () => {
    if (!token || !id) return;

    setLoading(true);
    setErr(null);

    try {
      const [woRes, repRes] = await Promise.all([
        apiGet<WorkOrderByIdResponse>(`/maintenance/work-orders/${id}`),
        apiGet<ReportResponse>(`/maintenance/work-orders/${id}/report`),
      ]);

      setWo(woRes.work_order || null);
      setReport(repRes || null);

      const db = repRes?.post_report_db;
      if (db?.road_test_result) {
        const r = String(db.road_test_result).toUpperCase();
        setQaResult(r === "FAIL" ? "FAIL" : "PASS");
      } else {
        setQaResult("");
      }
      if (typeof db?.remarks === "string") setQaRemarks(db.remarks);
      else setQaRemarks("");

      await loadHubCounts();
    } catch (e: any) {
      setWo(null);
      setReport(null);
      setErr(e?.message || tRef.current("woDetails.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [token, id, loadHubCounts]);

  useEffect(() => {
    if (!token || !id) return;
    load();
  }, [token, id, load]);

  useEffect(() => {
    const v = String(sp?.get("tab") || "").toLowerCase();
    const next: TabKey = v === "installations" ? "installations" : v === "qa" ? "qa" : "issues";
    setTab(next);
  }, [tabQ, sp]);

  useEffect(() => {
    if (tab === "installations") loadInstallations();
  }, [tab, loadInstallations]);

  const totals = report?.report_runtime?.totals;
  const rs = String(report?.report_status || "");
  const mismatchCounts = totals?.mismatch_counts;
  const mismatchTotal = (mismatchCounts?.issued_not_installed || 0) + (mismatchCounts?.installed_not_issued || 0);

  const canComplete =
    canManage &&
    rs === "OK" &&
    String(wo?.status || "").toUpperCase() !== "COMPLETED" &&
    String(wo?.status || "").toUpperCase() !== "CANCELED";

  const issuedLines: any[] = report?.report_runtime?.issued?.lines || [];
  const installationsRuntime: any[] = report?.report_runtime?.installed?.installations || [];

  const recon = report?.report_runtime?.reconciliation || {
    matched: [],
    issued_not_installed: [],
    installed_not_issued: [],
  };

  const reportHint = useMemo(() => {
    if (!report) return null;
    if (rs === "NEEDS_PARTS_RECONCILIATION") return t("woDetails.hintMismatch");
    if (rs === "NEEDS_QA") return t("woDetails.hintNeedsQa");
    if (rs === "QA_FAILED") return t("woDetails.hintQaFailed");
    if (rs === "OK") return t("woDetails.hintReady");
    return null;
  }, [report, rs, t]);

  // ✅ NEW: Build dropdown options from issued parts ONLY + remaining qty
  const installableParts = useMemo(() => {
    const issuedByPart = new Map<string, { part: any; qty: number }>();
    for (const l of issuedLines || []) {
      const pid = String(l?.part_id || "");
      if (!pid) continue;
      const qty = Number(l?.qty ?? 0) || 0;
      const prev = issuedByPart.get(pid) || { part: l?.part || null, qty: 0 };
      issuedByPart.set(pid, { part: prev.part || l?.part || null, qty: prev.qty + qty });
    }

    const installedByPart = new Map<string, number>();
    for (const ins of installationsRuntime || []) {
      const pid = String(ins?.part_id || "");
      if (!pid) continue;
      const qty = Number(ins?.qty_installed ?? 0) || 0;
      installedByPart.set(pid, (installedByPart.get(pid) || 0) + qty);
    }

    const rows: Array<{
      part_id: string;
      part: any;
      issued_qty: number;
      installed_qty: number;
      remaining_qty: number;
    }> = [];

    for (const [part_id, v] of issuedByPart.entries()) {
      const installed_qty = installedByPart.get(part_id) || 0;
      const remaining_qty = v.qty - installed_qty;
      if (remaining_qty > 0.0005) {
        rows.push({
          part_id,
          part: v.part,
          issued_qty: v.qty,
          installed_qty,
          remaining_qty,
        });
      }
    }

    // sort by name then id
    rows.sort((a, b) => String(a?.part?.name || "").localeCompare(String(b?.part?.name || "")));
    return rows;
  }, [issuedLines, installationsRuntime]);

  const selectedPartRow = useMemo(() => {
    return installableParts.find((x) => x.part_id === instPartId) || null;
  }, [installableParts, instPartId]);

  // ✅ Optional serial options (will appear only if issued lines later include part_item_id details)
  const serialOptions = useMemo(() => {
    if (!instPartId) return [];
    // Expecting something like issued line containing part_item_id + maybe part_item details (future-ready)
    const rows = (issuedLines || [])
      .filter((l: any) => String(l?.part_id || "") === instPartId && l?.part_item_id)
      .map((l: any) => ({
        id: String(l.part_item_id),
        internal_serial: l?.part_item?.internal_serial || l?.internal_serial || null,
        manufacturer_serial: l?.part_item?.manufacturer_serial || l?.manufacturer_serial || null,
      }));

    // dedupe by id
    const seen = new Set<string>();
    const out: any[] = [];
    for (const r of rows) {
      if (!r.id || seen.has(r.id)) continue;
      seen.add(r.id);
      out.push(r);
    }
    return out;
  }, [issuedLines, instPartId]);

  const isSerialSelected = Boolean(instPartItemId) || serialOptions.length > 0;

  async function createIssue() {
    if (!token || !id) return;
    setIssueMsg(null);

    if (!canManage) {
      setIssueMsg(tRef.current("woDetails.onlyAdminAccountantCreateIssue"));
      return;
    }

    setIssueCreating(true);
    try {
      const res = await apiPost<{ issue: InventoryIssue }>(`/maintenance/work-orders/${id}/issues`, {
        notes: null,
      });
      setIssueId(res?.issue?.id || null);
      setIssueMsg("✅ " + tRef.current("woDetails.issueCreated"));
      await loadHubCounts();
      await load();
    } catch (e: any) {
      setIssueMsg(`${tRef.current("common.failed")}: ${e?.message || tRef.current("common.unknownError")}`);
    } finally {
      setIssueCreating(false);
    }
  }

  async function addIssueLine() {
    if (!token) return;
    setLineMsg(null);

    if (!canManage) {
      setLineMsg(tRef.current("woDetails.onlyAdminAccountantAddLines"));
      return;
    }
    if (!issueId) {
      setLineMsg(tRef.current("woDetails.mustCreateIssueFirst"));
      return;
    }
    if (!linePartId.trim()) {
      setLineMsg(tRef.current("woDetails.partIdRequired"));
      return;
    }
    if (!Number.isFinite(lineQty) || lineQty <= 0) {
      setLineMsg(tRef.current("woDetails.qtyMustBeGt0"));
      return;
    }
    if (!Number.isFinite(lineUnitCost) || lineUnitCost < 0) {
      setLineMsg(tRef.current("woDetails.unitCostMustBeGte0"));
      return;
    }

    setLineSaving(true);
    try {
      await apiPost(`/maintenance/issues/${issueId}/lines`, {
        lines: [
          {
            part_id: linePartId.trim(),
            qty: Number(lineQty),
            unit_cost: Number(lineUnitCost),
            notes: lineNotes || null,
          },
        ],
      });

      setLineMsg("✅ " + tRef.current("woDetails.lineAdded"));
      setLinePartId("");
      setLineQty(1);
      setLineUnitCost(0);
      setLineNotes("");

      await load();
    } catch (e: any) {
      setLineMsg(`${tRef.current("common.failed")}: ${e?.message || tRef.current("common.unknownError")}`);
    } finally {
      setLineSaving(false);
    }
  }

  async function addInstallation() {
    if (!token || !id) return;
    setInstMsg(null);

    // ✅ Must pick part from issued-only dropdown
    if (!instPartId.trim()) {
      setInstMsg("اختر قطعة من القطع المصروفة لأمر الشغل.");
      return;
    }

    // odometer validation (same logic)
    const odometer = instOdo === "" ? null : Number(instOdo);
    if (odometer !== null && (!Number.isFinite(odometer) || odometer < 0)) {
      setInstMsg(tRef.current("woDetails.odometerMustBeGte0"));
      return;
    }

    // ✅ enforce remaining qty for bulk items
    const remaining = Number(selectedPartRow?.remaining_qty ?? 0) || 0;

    // serial mode: qty must be 1
    const qty = isSerialSelected ? 1 : Number(instQty);

    if (!Number.isFinite(qty) || qty <= 0) {
      setInstMsg(tRef.current("woDetails.qtyInstalledMustBeGt0"));
      return;
    }

    if (!isSerialSelected && remaining > 0 && qty - remaining > 0.0005) {
      setInstMsg("الكمية أكبر من المتبقي من المصروف لهذا أمر الشغل.");
      return;
    }

    // if serial dropdown is shown and user didn't pick
    if (serialOptions.length > 0 && !instPartItemId) {
      setInstMsg("اختر السيريال للقطعة (Serial).");
      return;
    }

    setInstSaving(true);
    try {
      await apiPost(`/maintenance/work-orders/${id}/installations`, {
        items: [
          {
            part_id: instPartId.trim(),
            ...(instPartItemId ? { part_item_id: instPartItemId } : {}),
            qty_installed: qty,
            odometer,
            notes: instNotes || null,
          },
        ],
      });

      showToast("✅ " + tRef.current("woDetails.installationAdded"), "success");

      // reset
      setInstPartId("");
      setInstPartItemId("");
      setInstQty(1);
      setInstOdo("");
      setInstNotes("");

      await Promise.all([load(), loadInstallations(), loadHubCounts()]);
    } catch (e: any) {
      setInstMsg(`${tRef.current("common.failed")}: ${e?.message || tRef.current("common.unknownError")}`);
      showToast(String(e?.message || "فشل الإضافة"), "error");
    } finally {
      setInstSaving(false);
    }
  }

  async function saveQA() {
    if (!token || !id) return;
    setQaMsg(null);

    if (!canManage) {
      setQaMsg(tRef.current("woDetails.onlyAdminAccountantQa"));
      return;
    }
    if (!qaResult) {
      setQaMsg(tRef.current("woDetails.selectPassOrFail"));
      return;
    }
    if (rs === "NEEDS_PARTS_RECONCILIATION") {
      setQaMsg(tRef.current("woDetails.fixMismatchFirst"));
      return;
    }

    setQaSaving(true);
    try {
      await apiPost(`/maintenance/work-orders/${id}/post-report`, {
        road_test_result: qaResult,
        remarks: qaRemarks || null,
        checklist_json: null,
      });

      setQaMsg("✅ " + tRef.current("woDetails.qaSaved"));
      showToast("✅ " + tRef.current("woDetails.qaSaved"), "success");
      await load();
    } catch (e: any) {
      setQaMsg(`${tRef.current("woDetails.qaSaveFailed")}: ${e?.message || tRef.current("common.unknownError")}`);
      showToast(String(e?.message || "فشل الحفظ"), "error");
    } finally {
      setQaSaving(false);
    }
  }

  async function completeWO() {
    if (!token || !id) return;
    setCompleteMsg(null);

    if (!canComplete) {
      setCompleteMsg(tRef.current("woDetails.cannotCompleteNow"));
      return;
    }

    setCompleting(true);
    try {
      await apiPost(`/maintenance/work-orders/${id}/complete`, { notes: null });
      setCompleteMsg("✅ " + tRef.current("woDetails.completed"));
      showToast("✅ " + tRef.current("woDetails.completed"), "success");
      await load();
    } catch (e: any) {
      setCompleteMsg(`${tRef.current("woDetails.completeFailed")}: ${e?.message || tRef.current("common.unknownError")}`);
      showToast(String(e?.message || "فشل الإتمام"), "error");
    } finally {
      setCompleting(false);
    }
  }

  if (!token) {
    return (
      <div className="p-4">
        <PageHeader title={t("woDetails.title")} subtitle={t("common.loadingSession")} />
      </div>
    );
  }

  const tabItems = [
    { key: "issues" as const, label: t("woDetails.tabIssues") },
    { key: "installations" as const, label: t("woDetails.tabInstallations") },
    { key: "qa" as const, label: t("woDetails.tabQa") },
  ];

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title={t("woDetails.title")}
        subtitle={t("woDetails.breadcrumb")}
        actions={
          <>
            <Link href="/maintenance/work-orders">
              <Button variant="secondary">← {t("common.back")}</Button>
            </Link>
            <Button variant="secondary" onClick={load} disabled={loading}>
              {t("common.refresh")}
            </Button>
          </>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-base font-semibold">
              {t("woDetails.wo")} #{shortId(id)}
            </div>
            {wo?.status ? <StatusBadge status={wo.status} /> : null}
          </div>

          <Button variant="primary" onClick={completeWO} disabled={completing || !canComplete} isLoading={completing}>
            {t("woDetails.completeWo")}
          </Button>
        </div>

        {completeMsg ? (
          <div className={cn("mt-2 text-sm", String(completeMsg).startsWith("✅") ? "text-green-700" : "text-red-700")}>
            {completeMsg}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-3 text-sm text-gray-500">{t("common.loading")}</div>
        ) : err ? (
          <div className="mt-3 text-sm text-red-700">
            {t("common.error")}: {err}
          </div>
        ) : null}
      </Card>

      <Card title="WO Hub">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="text-xs text-gray-500">ربط المخزن + الطلبات + الصرف + التركيبات من نفس صفحة أمر العمل</div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">warehouse</div>

              <select
                value={hubWarehouseId}
                onChange={(e) => setHubWarehouseId(e.target.value)}
                className="w-[260px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                disabled={whLoading}
              >
                <option value="">{whLoading ? "Loading..." : "Select warehouse"}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || w.code || w.id}
                  </option>
                ))}
              </select>

              <Button variant="ghost" onClick={loadWarehouses} disabled={whLoading}>
                Refresh Warehouses
              </Button>
            </div>

            {canManage ? (
              <Button variant="primary" onClick={hubCreateRequest} disabled={!hubWarehouseId}>
                Create Request
              </Button>
            ) : null}

            <Button variant="secondary" onClick={hubOpenRequests}>
              Open Requests
              <span className="ml-2 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs">
                {hubCountsLoading ? "…" : hubCounts.requests}
              </span>
            </Button>

            <Button variant="secondary" onClick={hubOpenIssues}>
              Open Issues
              <span className="ml-2 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs">
                {hubCountsLoading ? "…" : hubCounts.issues}
              </span>
            </Button>

            <Button variant="secondary" onClick={hubAddInstallations}>
              Add Installations
              <span className="ml-2 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs">
                {hubCountsLoading ? "…" : hubCounts.installations}
              </span>
            </Button>

            <Button variant="ghost" onClick={loadHubCounts} disabled={hubCountsLoading}>
              Refresh Counts
            </Button>
          </div>
        </div>

        {!canManage ? <div className="mt-2 text-xs text-gray-500">ملاحظة: Create Request متاح فقط لـ ADMIN / ACCOUNTANT</div> : null}
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <KpiCard label={t("woDetails.parts")} value={totals?.parts_cost_total ?? 0} />
        <KpiCard label={t("woDetails.labor")} value={totals?.labor_cost ?? 0} />
        <KpiCard label={t("woDetails.service")} value={totals?.service_cost ?? 0} />
        <KpiCard label={t("woDetails.grandTotal")} value={totals?.grand_total ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Card title={t("woDetails.wo")}>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div>
              <span className="text-gray-500">{t("woDetails.type")}:</span> {wo?.type || "—"}
            </div>
            <div>
              <span className="text-gray-500">{t("woDetails.vendor")}:</span> {wo?.vendor_name || "—"}
            </div>
            <div>
              <span className="text-gray-500">{t("woDetails.opened")}:</span> {fmtDate(wo?.opened_at)}
            </div>
            <div>
              <span className="text-gray-500">{t("woDetails.started")}:</span> {fmtDate(wo?.started_at)}
            </div>
            <div>
              <span className="text-gray-500">{t("woDetails.completedAt")}:</span> {fmtDate(wo?.completed_at)}
            </div>
            <div>
              <span className="text-gray-500">{t("woDetails.odometer")}:</span> {wo?.odometer ?? "—"}
            </div>
            <div>
              <span className="text-gray-500">{t("woDetails.notes")}:</span> {wo?.notes || "—"}
            </div>
          </div>
        </Card>

        <Card title={t("woDetails.vehicle")}>
          <div className="text-sm">
            {wo?.vehicles?.fleet_no ? `${wo.vehicles.fleet_no} - ` : ""}
            {wo?.vehicles?.plate_no || wo?.vehicles?.display_name || "—"}
          </div>
          <div className="mt-1 text-xs text-gray-500 font-mono">vehicle_id: {shortId(wo?.vehicle_id)}</div>

          <div className="mt-4 text-sm font-semibold">{t("woDetails.report")}</div>
          <div className="mt-1 text-sm">
            <span className="text-gray-500">{t("woDetails.reportStatus")}:</span> {report?.report_status || "—"}
          </div>
          {reportHint ? <div className="mt-1 text-xs text-gray-500">{reportHint}</div> : null}

          <div className="mt-3 text-sm">
            <span className="text-gray-500">{t("woDetails.mismatches")}:</span>{" "}
            <span className={cn("font-semibold", mismatchTotal > 0 ? "text-amber-700" : "text-green-700")}>{mismatchTotal}</span>
          </div>

          <div className="mt-3 text-sm">
            <span className="text-gray-500">{t("woDetails.cashApproved")}:</span>{" "}
            <span className="font-semibold">{totals?.maintenance_cash_cost_total ?? 0}</span>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsBar<TabKey> tabs={tabItems} value={tab} onChange={setTabAndUrl} />
          <Button variant="secondary" onClick={load} disabled={loading}>
            {t("common.refresh")}
          </Button>
        </div>
      </Card>

      {/* Reconciliation Table */}
      <Card title={t("woDetails.reconTitle")}>
        <div className="text-xs text-gray-500">
          {t("woDetails.reconMatched")}: {recon.matched?.length || 0} | {t("woDetails.reconIssuedNotInstalled")}:{" "}
          {recon.issued_not_installed?.length || 0} | {t("woDetails.reconInstalledNotIssued")}:{" "}
          {recon.installed_not_issued?.length || 0}
        </div>

        <div className="mt-3 overflow-auto rounded-xl border border-gray-200">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">{t("woDetails.part")}</th>
                <th className="text-left p-3">{t("woDetails.issuedQty")}</th>
                <th className="text-left p-3">{t("woDetails.installedQty")}</th>
                <th className="text-left p-3">{t("woDetails.issuedCost")}</th>
                <th className="text-left p-3">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {(recon.matched || []).map((r: any) => (
                <tr key={`m_${r.part_id}`} className="border-t border-gray-200">
                  <td className="p-3">
                    <div className="font-semibold">{r?.part?.name || "—"}</div>
                    <div className="text-xs text-gray-500 font-mono">{shortId(r.part_id)}</div>
                  </td>
                  <td className="p-3">{r.issued_qty}</td>
                  <td className="p-3">{r.installed_qty}</td>
                  <td className="p-3">{r.issued_cost}</td>
                  <td className="p-3">
                    <span className="text-green-700">{t("woDetails.matched")}</span>
                  </td>
                </tr>
              ))}

              {(recon.issued_not_installed || []).map((r: any) => (
                <tr key={`i_${r.part_id}`} className="border-t border-gray-200">
                  <td className="p-3">
                    <div className="font-semibold">{r?.part?.name || "—"}</div>
                    <div className="text-xs text-gray-500 font-mono">{shortId(r.part_id)}</div>
                  </td>
                  <td className="p-3">{r.issued_qty}</td>
                  <td className="p-3">{r.installed_qty}</td>
                  <td className="p-3">{r.issued_cost}</td>
                  <td className="p-3">
                    <span className="text-amber-700">{t("woDetails.issuedGtInstalled")}</span>
                  </td>
                </tr>
              ))}

              {(recon.installed_not_issued || []).map((r: any) => (
                <tr key={`x_${r.part_id}`} className="border-t border-gray-200">
                  <td className="p-3">
                    <div className="font-semibold">{r?.part?.name || "—"}</div>
                    <div className="text-xs text-gray-500 font-mono">{shortId(r.part_id)}</div>
                  </td>
                  <td className="p-3">{r.issued_qty}</td>
                  <td className="p-3">{r.installed_qty}</td>
                  <td className="p-3">—</td>
                  <td className="p-3">
                    <span className="text-red-700">{t("woDetails.installedGtIssued")}</span>
                  </td>
                </tr>
              ))}

              {(recon.matched || []).length +
                (recon.issued_not_installed || []).length +
                (recon.installed_not_issued || []).length ===
              0 ? (
                <tr className="border-t border-gray-200">
                  <td className="p-3 text-gray-500" colSpan={5}>
                    {t("woDetails.noReconData")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Issues Tab */}
      {tab === "issues" ? (
        <Card
          title={t("woDetails.issuesTitle")}
          right={
            <Button variant="secondary" onClick={createIssue} disabled={issueCreating || !canManage} isLoading={issueCreating}>
              {t("woDetails.createIssue")}
            </Button>
          }
        >
          <div className="text-xs text-gray-500">
            {t("woDetails.currentIssueId")}:{" "}
            <span className="font-mono text-gray-900">{issueId ? shortId(issueId) : "—"}</span>
          </div>

          {issueMsg ? (
            <div className={cn("mt-2 text-sm", String(issueMsg).startsWith("✅") ? "text-green-700" : "text-red-700")}>
              {issueMsg}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500 mb-1">{t("woDetails.partIdUuid")}</div>
              <input
                value={linePartId}
                onChange={(e) => setLinePartId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder={t("woDetails.uuidPlaceholder")}
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">{t("woDetails.qty")}</div>
              <input
                type="number"
                value={lineQty}
                onChange={(e) => setLineQty(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              />
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">{t("woDetails.unitCost")}</div>
              <input
                type="number"
                value={lineUnitCost}
                onChange={(e) => setLineUnitCost(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              />
            </div>

            <div className="md:col-span-4">
              <div className="text-xs text-gray-500 mb-1">{t("woDetails.notesOpt")}</div>
              <input
                value={lineNotes}
                onChange={(e) => setLineNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder={t("common.optional")}
              />
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <Button variant="primary" onClick={addIssueLine} disabled={lineSaving || !canManage} isLoading={lineSaving}>
                {t("woDetails.addLine")}
              </Button>
              {lineMsg ? (
                <div className={cn("text-sm", String(lineMsg).startsWith("✅") ? "text-green-700" : "text-red-700")}>
                  {lineMsg}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 text-sm font-semibold">{t("woDetails.issuedLinesFromReport")}</div>
          <div className="mt-2 overflow-auto rounded-xl border border-gray-200">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">{t("woDetails.part")}</th>
                  <th className="text-left p-3">{t("woDetails.qty")}</th>
                  <th className="text-left p-3">{t("woDetails.unitCost")}</th>
                  <th className="text-left p-3">{t("woDetails.total")}</th>
                  <th className="text-left p-3">{t("woDetails.issue")}</th>
                  <th className="text-left p-3">{t("woDetails.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {issuedLines.length === 0 ? (
                  <tr className="border-t border-gray-200">
                    <td colSpan={6} className="p-3 text-gray-500">
                      {t("woDetails.noIssuedLines")}
                    </td>
                  </tr>
                ) : (
                  issuedLines.map((l: any, idx: number) => (
                    <tr key={`${l.issue_id}_${l.part_id}_${idx}`} className="border-t border-gray-200">
                      <td className="p-3">
                        <div className="font-semibold">{l?.part?.name || "—"}</div>
                        <div className="text-xs text-gray-500 font-mono">{shortId(l.part_id)}</div>
                      </td>
                      <td className="p-3">{l.qty}</td>
                      <td className="p-3">{l.unit_cost}</td>
                      <td className="p-3">{l.total_cost}</td>
                      <td className="p-3 text-xs font-mono text-gray-500">{shortId(l.issue_id)}</td>
                      <td className="p-3">{l.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* Installations Tab */}
      {tab === "installations" ? (
        <Card
          title={t("woDetails.installationsTitle")}
          right={
            <Button variant="secondary" onClick={loadInstallations} disabled={instLoading} isLoading={instLoading}>
              {t("common.refresh")}
            </Button>
          }
        >
          <div className="mt-2 text-xs text-gray-500">{instMsg ? `⚠ ${instMsg}` : null}</div>

          {/* ✅ NEW FORM: select from issued-only */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500 mb-1">القطعة (من المصروف لهذا أمر الشغل)</div>
              <select
                value={instPartId}
                onChange={(e) => {
                  const v = e.target.value;
                  setInstPartId(v);
                  setInstPartItemId("");
                  setInstQty(1);
                  setInstMsg(null);
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">{installableParts.length ? "اختر قطعة" : "لا توجد قطع متبقية للتركيب"}</option>
                {installableParts.map((p) => (
                  <option key={p.part_id} value={p.part_id}>
                    {(p.part?.name || "Part") + ` | متبقي: ${p.remaining_qty}`}
                  </option>
                ))}
              </select>

              {selectedPartRow ? (
                <div className="mt-1 text-xs text-gray-500">
                  Issued: <span className="font-semibold">{selectedPartRow.issued_qty}</span> | Installed:{" "}
                  <span className="font-semibold">{selectedPartRow.installed_qty}</span> | Remaining:{" "}
                  <span className="font-semibold">{selectedPartRow.remaining_qty}</span>
                </div>
              ) : null}
            </div>

            {/* ✅ Optional serial selector (only if data exists) */}
            {serialOptions.length > 0 ? (
              <div className="md:col-span-2">
                <div className="text-xs text-gray-500 mb-1">Serial (للقطع المسلسلة)</div>
                <select
                  value={instPartItemId}
                  onChange={(e) => setInstPartItemId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">اختر السيريال</option>
                  {serialOptions.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {(s.internal_serial || "—") + " / " + (s.manufacturer_serial || "—")}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-gray-500">ملاحظة: في حالة السيريال، الكمية = 1 تلقائيًا.</div>
              </div>
            ) : null}

            <div>
              <div className="text-xs text-gray-500 mb-1">{t("woDetails.qtyInstalled")}</div>
              <input
                type="number"
                value={instQty}
                onChange={(e) => setInstQty(Number(e.target.value))}
                disabled={serialOptions.length > 0 || Boolean(instPartItemId)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
              />
              {serialOptions.length > 0 || Boolean(instPartItemId) ? (
                <div className="mt-1 text-xs text-gray-500">تم تعطيل الكمية لأن القطعة Serial.</div>
              ) : null}
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">{t("woDetails.odometerOpt")}</div>
              <input
                type="number"
                value={instOdo}
                onChange={(e) => setInstOdo(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder={t("common.optional")}
              />
            </div>

            <div className="md:col-span-4">
              <div className="text-xs text-gray-500 mb-1">{t("woDetails.notesOpt")}</div>
              <input
                value={instNotes}
                onChange={(e) => setInstNotes(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                placeholder={t("common.optional")}
              />
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <Button variant="primary" onClick={addInstallation} disabled={instSaving} isLoading={instSaving}>
                {t("woDetails.addInstallation")}
              </Button>
              {selectedPartRow ? (
                <div className="text-xs text-gray-500">
                  الحد الأقصى: <span className="font-semibold">{selectedPartRow.remaining_qty}</span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 text-sm font-semibold">{t("woDetails.installationsApiList")}</div>
          <div className="mt-2 overflow-auto rounded-xl border border-gray-200">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">{t("woDetails.installedAt")}</th>
                  <th className="text-left p-3">{t("woDetails.part")}</th>
                  <th className="text-left p-3">{t("woDetails.qty")}</th>
                  <th className="text-left p-3">{t("woDetails.odometer")}</th>
                  <th className="text-left p-3">{t("woDetails.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {instLoading ? (
                  <tr className="border-t border-gray-200">
                    <td colSpan={5} className="p-3 text-gray-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : instItems.length === 0 ? (
                  <tr className="border-t border-gray-200">
                    <td colSpan={5} className="p-3 text-gray-500">
                      {t("woDetails.noInstallations")}
                    </td>
                  </tr>
                ) : (
                  instItems.map((x: any) => (
                    <tr key={x.id} className="border-t border-gray-200">
                      <td className="p-3">{fmtDate(x.installed_at)}</td>
                      <td className="p-3">
                        <div className="font-semibold">{x?.part?.name || x?.part_name || "—"}</div>
                        <div className="text-xs text-gray-500 font-mono">{shortId(x.part_id)}</div>
                      </td>
                      <td className="p-3">{x.qty_installed}</td>
                      <td className="p-3">{x.odometer_at_install ?? "—"}</td>
                      <td className="p-3">{x.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 text-sm font-semibold">{t("woDetails.installationsRuntimeList")}</div>
          <div className="mt-2 overflow-auto rounded-xl border border-gray-200">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">{t("woDetails.installedAt")}</th>
                  <th className="text-left p-3">{t("woDetails.part")}</th>
                  <th className="text-left p-3">{t("woDetails.qty")}</th>
                  <th className="text-left p-3">{t("woDetails.odometer")}</th>
                  <th className="text-left p-3">{t("woDetails.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {installationsRuntime.length === 0 ? (
                  <tr className="border-t border-gray-200">
                    <td colSpan={5} className="p-3 text-gray-500">
                      {t("woDetails.noRuntimeInstallations")}
                    </td>
                  </tr>
                ) : (
                  installationsRuntime.map((x: any) => (
                    <tr key={x.id} className="border-t border-gray-200">
                      <td className="p-3">{fmtDate(x.installed_at)}</td>
                      <td className="p-3">
                        <div className="font-semibold">{x?.part?.name || x?.part_name || "—"}</div>
                        <div className="text-xs text-gray-500 font-mono">{shortId(x.part_id)}</div>
                      </td>
                      <td className="p-3">{x.qty_installed}</td>
                      <td className="p-3">{x.odometer_at_install ?? "—"}</td>
                      <td className="p-3">{x.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* QA Tab */}
      {tab === "qa" ? (
        <Card title={t("woDetails.qaTitle")}>
          {!canManage ? (
            <div className="text-sm text-gray-600">{t("woDetails.onlyAdminAccountantQa")}</div>
          ) : (
            <div className="space-y-3">
              {rs === "NEEDS_PARTS_RECONCILIATION" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  {t("woDetails.fixMismatchFirst")}
                </div>
              ) : null}

              <div>
                <div className="text-xs text-gray-500 mb-1">{t("woDetails.roadTestResult")}</div>
                <select
                  value={qaResult}
                  onChange={(e) => setQaResult(e.target.value as any)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">{t("common.select")}</option>
                  <option value="PASS">{t("woDetails.pass")}</option>
                  <option value="FAIL">{t("woDetails.fail")}</option>
                </select>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">{t("woDetails.remarks")}</div>
                <textarea
                  value={qaRemarks}
                  onChange={(e) => setQaRemarks(e.target.value)}
                  placeholder={t("woDetails.remarksPlaceholder")}
                  className="min-h-[90px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={saveQA} disabled={qaSaving} isLoading={qaSaving}>
                  {t("woDetails.saveQa")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQaMsg(null);
                    setQaResult("");
                    setQaRemarks("");
                  }}
                >
                  {t("common.clear")}
                </Button>
              </div>

              {qaMsg ? (
                <div className={cn("text-sm", String(qaMsg).startsWith("✅") ? "text-green-700" : "text-red-700")}>
                  {qaMsg}
                </div>
              ) : null}
            </div>
          )}
        </Card>
      ) : null}

      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
    </div>
  );
}