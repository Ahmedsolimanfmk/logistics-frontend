"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

async function apiFetch<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: any } = {}
): Promise<T> {
  const { method = "GET", token, body } = opts;
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const txt = await res.text();
  let json: any = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = { message: txt || "Unknown response" };
  }

  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return json as T;
}

// UI
function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition border";
  const styles: Record<string, string> = {
    primary: "bg-white text-black border-white hover:bg-neutral-200",
    secondary: "bg-white/5 text-white border-white/10 hover:bg-white/10",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
    ghost: "bg-transparent text-white border-transparent hover:bg-white/10",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(base, styles[variant], disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
}

function Badge({ value }: { value: string }) {
  const v = String(value || "").toUpperCase();
  const cls =
    v === "OPEN" || v === "IN_PROGRESS"
      ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
      : v === "COMPLETED"
      ? "bg-green-500/15 text-green-200 border-green-500/30"
      : v === "CANCELED"
      ? "bg-red-500/15 text-red-200 border-red-500/30"
      : "bg-white/5 text-white border-white/10";
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs", cls)}>{v}</span>;
}

function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-2 text-sm transition",
        active
          ? "bg-white text-black border-white"
          : "bg-white/5 text-white border-white/10 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
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
  maintenance_cash_expenses: any[];
  report_runtime: any;
};

type InventoryIssue = { id: string };
type TabKey = "issues" | "installations" | "qa";

const selectCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none text-white";
const optionCls = "bg-neutral-900 text-white";

export default function WorkOrderDetailsPage() {
  const t = useT();

  const token = useAuth((s: any) => s.token);
  const user = useAuth((s: any) => s.user);

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  const role = user?.role;
  const canManage = isAdminOrAccountant(role);

  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);

  const [tab, setTab] = useState<TabKey>("issues");

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

  const [instPartId, setInstPartId] = useState("");
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

  async function load() {
    if (!token || !id) return;
    setLoading(true);
    setErr(null);

    try {
      const [woRes, repRes] = await Promise.all([
        apiFetch<WorkOrderByIdResponse>(`/maintenance/work-orders/${id}`, { token }),
        apiFetch<ReportResponse>(`/maintenance/work-orders/${id}/report`, { token }),
      ]);

      setWo(woRes.work_order || null);
      setReport(repRes || null);

      const db = repRes?.post_report_db;
      if (db?.road_test_result) {
        const r = String(db.road_test_result).toUpperCase();
        setQaResult(r === "FAIL" ? "FAIL" : "PASS");
      }
      if (typeof db?.remarks === "string") setQaRemarks(db.remarks);
    } catch (e: any) {
      setWo(null);
      setReport(null);
      setErr(e?.message || t("woDetails.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }

  async function loadInstallations() {
    if (!token || !id) return;
    setInstLoading(true);
    setInstMsg(null);

    try {
      const res: any = await apiFetch<any>(`/maintenance/work-orders/${id}/installations`, { token });

      const arr =
        Array.isArray(res)
          ? res
          : Array.isArray(res?.["items"])
          ? res["items"]
          : Array.isArray(res?.["installations"])
          ? res["installations"]
          : Array.isArray(res?.["data"])
          ? res["data"]
          : [];

      setInstItems(arr);
    } catch (e: any) {
      setInstItems([]);
      setInstMsg(e?.message || t("woDetails.installationsLoadFailed"));
    } finally {
      setInstLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  useEffect(() => {
    if (tab === "installations") loadInstallations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const totals = report?.report_runtime?.totals;
  const rs = String(report?.report_status || "");
  const mismatchCounts = totals?.mismatch_counts;
  const mismatchTotal =
    (mismatchCounts?.issued_not_installed || 0) + (mismatchCounts?.installed_not_issued || 0);

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

  async function createIssue() {
    if (!token || !id) return;
    setIssueMsg(null);

    if (!canManage) {
      setIssueMsg(t("woDetails.onlyAdminAccountantCreateIssue"));
      return;
    }

    setIssueCreating(true);
    try {
      const res = await apiFetch<{ issue: InventoryIssue }>(`/maintenance/work-orders/${id}/issues`, {
        method: "POST",
        token,
        body: { notes: null },
      });
      setIssueId(res?.issue?.id || null);
      setIssueMsg(t("woDetails.issueCreated"));
    } catch (e: any) {
      setIssueMsg(`${t("common.failed")}: ${e?.message || t("common.unknownError")}`);
    } finally {
      setIssueCreating(false);
    }
  }

  async function addIssueLine() {
    if (!token) return;
    setLineMsg(null);

    if (!canManage) {
      setLineMsg(t("woDetails.onlyAdminAccountantAddLines"));
      return;
    }
    if (!issueId) {
      setLineMsg(t("woDetails.mustCreateIssueFirst"));
      return;
    }
    if (!linePartId.trim()) {
      setLineMsg(t("woDetails.partIdRequired"));
      return;
    }
    if (!Number.isFinite(lineQty) || lineQty <= 0) {
      setLineMsg(t("woDetails.qtyMustBeGt0"));
      return;
    }
    if (!Number.isFinite(lineUnitCost) || lineUnitCost < 0) {
      setLineMsg(t("woDetails.unitCostMustBeGte0"));
      return;
    }

    setLineSaving(true);
    try {
      await apiFetch(`/maintenance/issues/${issueId}/lines`, {
        method: "POST",
        token,
        body: {
          lines: [
            {
              part_id: linePartId.trim(),
              qty: Number(lineQty),
              unit_cost: Number(lineUnitCost),
              notes: lineNotes || null,
            },
          ],
        },
      });

      setLineMsg(t("woDetails.lineAdded"));
      setLinePartId("");
      setLineQty(1);
      setLineUnitCost(0);
      setLineNotes("");

      await load();
    } catch (e: any) {
      setLineMsg(`${t("common.failed")}: ${e?.message || t("common.unknownError")}`);
    } finally {
      setLineSaving(false);
    }
  }

  async function addInstallation() {
    if (!token || !id) return;
    setInstMsg(null);

    if (!instPartId.trim()) {
      setInstMsg(t("woDetails.partIdRequired"));
      return;
    }
    if (!Number.isFinite(instQty) || instQty <= 0) {
      setInstMsg(t("woDetails.qtyInstalledMustBeGt0"));
      return;
    }
    const odometer = instOdo === "" ? null : Number(instOdo);
    if (odometer !== null && (!Number.isFinite(odometer) || odometer < 0)) {
      setInstMsg(t("woDetails.odometerMustBeGte0"));
      return;
    }

    setInstSaving(true);
    try {
      await apiFetch(`/maintenance/work-orders/${id}/installations`, {
        method: "POST",
        token,
        body: {
          items: [
            {
              part_id: instPartId.trim(),
              qty_installed: Number(instQty),
              odometer,
              notes: instNotes || null,
            },
          ],
        },
      });

      setInstMsg(t("woDetails.installationAdded"));
      setInstPartId("");
      setInstQty(1);
      setInstOdo("");
      setInstNotes("");

      await Promise.all([load(), loadInstallations()]);
    } catch (e: any) {
      setInstMsg(`${t("common.failed")}: ${e?.message || t("common.unknownError")}`);
    } finally {
      setInstSaving(false);
    }
  }

  async function saveQA() {
    if (!token || !id) return;
    setQaMsg(null);

    if (!canManage) {
      setQaMsg(t("woDetails.onlyAdminAccountantQa"));
      return;
    }
    if (!qaResult) {
      setQaMsg(t("woDetails.selectPassOrFail"));
      return;
    }
    if (rs === "NEEDS_PARTS_RECONCILIATION") {
      setQaMsg(t("woDetails.fixMismatchFirst"));
      return;
    }

    setQaSaving(true);
    try {
      await apiFetch(`/maintenance/work-orders/${id}/post-report`, {
        method: "POST",
        token,
        body: {
          road_test_result: qaResult,
          remarks: qaRemarks || null,
          checklist_json: null,
        },
      });

      setQaMsg(t("woDetails.qaSaved"));
      await load();
    } catch (e: any) {
      setQaMsg(`${t("woDetails.qaSaveFailed")}: ${e?.message || t("common.unknownError")}`);
    } finally {
      setQaSaving(false);
    }
  }

  async function completeWO() {
    if (!token || !id) return;
    setCompleteMsg(null);

    if (!canComplete) {
      setCompleteMsg(t("woDetails.cannotCompleteNow"));
      return;
    }

    setCompleting(true);
    try {
      await apiFetch(`/maintenance/work-orders/${id}/complete`, {
        method: "POST",
        token,
        body: { notes: null },
      });
      setCompleteMsg(t("woDetails.completed"));
      await load();
    } catch (e: any) {
      setCompleteMsg(`${t("woDetails.completeFailed")}: ${e?.message || t("common.unknownError")}`);
    } finally {
      setCompleting(false);
    }
  }

  const reportHint = useMemo(() => {
    if (!report) return null;
    if (rs === "NEEDS_PARTS_RECONCILIATION") return t("woDetails.hintMismatch");
    if (rs === "NEEDS_QA") return t("woDetails.hintNeedsQa");
    if (rs === "QA_FAILED") return t("woDetails.hintQaFailed");
    if (rs === "OK") return t("woDetails.hintReady");
    return null;
  }, [report, rs, t]);

  if (token === null) {
    return (
      <div className="space-y-4 p-4 text-white">
        <Card title={t("woDetails.title")}>
          <div className="text-sm text-white/70">{t("common.loadingSession")}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-white/70">{t("woDetails.breadcrumb")}</div>
          <div className="text-xl font-semibold">{t("woDetails.title")}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/maintenance/work-orders">
            <Button variant="secondary">← {t("common.back")}</Button>
          </Link>
          <Button variant="secondary" onClick={load} disabled={loading}>
            {t("common.refresh")}
          </Button>
        </div>
      </div>

      <Card
        title={`${t("woDetails.wo")} #${shortId(id)}`}
        right={wo?.status ? <Badge value={wo.status} /> : null}
      >
        {loading ? (
          <div className="text-sm text-white/70">{t("common.loading")}</div>
        ) : err ? (
          <div className="text-sm text-red-200">
            {t("common.error")}: {err}
          </div>
        ) : !wo ? (
          <div className="text-sm text-white/70">{t("common.notFound")}</div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-white/60">{t("woDetails.type")}:</span> {wo.type || "—"}
                </div>
                <div className="text-sm">
                  <span className="text-white/60">{t("woDetails.vendor")}:</span> {wo.vendor_name || "—"}
                </div>
                <div className="text-sm">
                  <span className="text-white/60">{t("woDetails.opened")}:</span> {fmtDate(wo.opened_at)}
                </div>
                <div className="text-sm">
                  <span className="text-white/60">{t("woDetails.started")}:</span> {fmtDate(wo.started_at)}
                </div>
                <div className="text-sm">
                  <span className="text-white/60">{t("woDetails.completedAt")}:</span> {fmtDate(wo.completed_at)}
                </div>
                <div className="text-sm">
                  <span className="text-white/60">{t("woDetails.odometer")}:</span> {wo.odometer ?? "—"}
                </div>
                <div className="text-sm">
                  <span className="text-white/60">{t("woDetails.notes")}:</span> {wo.notes || "—"}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">{t("woDetails.vehicle")}</div>
                <div className="text-sm">
                  {wo.vehicles?.fleet_no ? `${wo.vehicles.fleet_no} - ` : ""}
                  {wo.vehicles?.plate_no || wo.vehicles?.display_name || "—"}
                </div>
                <div className="text-xs text-white/50 font-mono">
                  vehicle_id: {shortId(wo.vehicle_id)}
                </div>

                <div className="mt-3 text-sm font-semibold">{t("woDetails.report")}</div>
                <div className="text-sm">
                  <span className="text-white/60">{t("woDetails.reportStatus")}:</span>{" "}
                  {report?.report_status || "—"}
                  {reportHint ? <div className="mt-1 text-xs text-white/70">{reportHint}</div> : null}
                </div>

                {totals ? (
                  <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">{t("woDetails.parts")}:</span>
                      <span>{totals.parts_cost_total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">{t("woDetails.labor")}:</span>
                      <span>{totals.labor_cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">{t("woDetails.service")}:</span>
                      <span>{totals.service_cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">{t("woDetails.cashApproved")}:</span>
                      <span>{totals.maintenance_cash_cost_total ?? 0}</span>
                    </div>

                    <div className="mt-2 text-xs text-white/60">
                      {t("woDetails.mismatches")}:{" "}
                      <span
                        className={cn(
                          "font-semibold",
                          mismatchTotal > 0 ? "text-yellow-200" : "text-green-200"
                        )}
                      >
                        {mismatchTotal}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between font-semibold">
                      <span>{t("woDetails.grandTotal")}:</span>
                      <span>{totals.grand_total}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-white/70">{t("woDetails.noTotals")}</div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button variant="primary" onClick={completeWO} disabled={completing || !canComplete}>
                    {completing ? t("woDetails.completing") : t("woDetails.completeWo")}
                  </Button>
                  {completeMsg ? (
                    <span
                      className={cn(
                        "text-sm",
                        completeMsg.startsWith("✅") ? "text-green-200" : "text-red-200"
                      )}
                    >
                      {completeMsg}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              <Pill active={tab === "issues"} onClick={() => setTab("issues")}>
                {t("woDetails.tabIssues")}
              </Pill>
              <Pill active={tab === "installations"} onClick={() => setTab("installations")}>
                {t("woDetails.tabInstallations")}
              </Pill>
              <Pill active={tab === "qa"} onClick={() => setTab("qa")}>
                {t("woDetails.tabQa")}
              </Pill>
            </div>

            {/* Reconciliation Table */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{t("woDetails.reconTitle")}</div>
                <div className="text-xs text-white/60">
                  {t("woDetails.reconMatched")}: {recon.matched?.length || 0} |{" "}
                  {t("woDetails.reconIssuedNotInstalled")}: {recon.issued_not_installed?.length || 0} |{" "}
                  {t("woDetails.reconInstalledNotIssued")}: {recon.installed_not_issued?.length || 0}
                </div>
              </div>

              <div className="mt-3 overflow-auto rounded-2xl border border-white/10">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-white/5 text-white/70">
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
                      <tr key={`m_${r.part_id}`} className="border-t border-white/10">
                        <td className="p-3">
                          <div className="font-semibold">{r?.part?.name || "—"}</div>
                          <div className="text-xs text-white/50 font-mono">{shortId(r.part_id)}</div>
                        </td>
                        <td className="p-3">{r.issued_qty}</td>
                        <td className="p-3">{r.installed_qty}</td>
                        <td className="p-3">{r.issued_cost}</td>
                        <td className="p-3">
                          <span className="text-green-200">{t("woDetails.matched")}</span>
                        </td>
                      </tr>
                    ))}

                    {(recon.issued_not_installed || []).map((r: any) => (
                      <tr key={`i_${r.part_id}`} className="border-t border-white/10">
                        <td className="p-3">
                          <div className="font-semibold">{r?.part?.name || "—"}</div>
                          <div className="text-xs text-white/50 font-mono">{shortId(r.part_id)}</div>
                        </td>
                        <td className="p-3">{r.issued_qty}</td>
                        <td className="p-3">{r.installed_qty}</td>
                        <td className="p-3">{r.issued_cost}</td>
                        <td className="p-3">
                          <span className="text-yellow-200">{t("woDetails.issuedGtInstalled")}</span>
                        </td>
                      </tr>
                    ))}

                    {(recon.installed_not_issued || []).map((r: any) => (
                      <tr key={`x_${r.part_id}`} className="border-t border-white/10">
                        <td className="p-3">
                          <div className="font-semibold">{r?.part?.name || "—"}</div>
                          <div className="text-xs text-white/50 font-mono">{shortId(r.part_id)}</div>
                        </td>
                        <td className="p-3">{r.issued_qty}</td>
                        <td className="p-3">{r.installed_qty}</td>
                        <td className="p-3">—</td>
                        <td className="p-3">
                          <span className="text-red-200">{t("woDetails.installedGtIssued")}</span>
                        </td>
                      </tr>
                    ))}

                    {((recon.matched || []).length +
                      (recon.issued_not_installed || []).length +
                      (recon.installed_not_issued || []).length ===
                      0) ? (
                      <tr className="border-t border-white/10">
                        <td className="p-3 text-white/70" colSpan={5}>
                          {t("woDetails.noReconData")}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Issues Tab */}
            {tab === "issues" ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{t("woDetails.issuesTitle")}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={createIssue} disabled={issueCreating || !canManage}>
                      {issueCreating ? t("common.creating") : t("woDetails.createIssue")}
                    </Button>
                  </div>
                </div>

                <div className="mt-2 text-xs text-white/60">
                  {t("woDetails.currentIssueId")}:{" "}
                  <span className="font-mono text-white">{issueId ? shortId(issueId) : "—"}</span>
                </div>

                {issueMsg ? (
                  <div className={cn("mt-2 text-sm", issueMsg.startsWith("✅") ? "text-green-200" : "text-red-200")}>
                    {issueMsg}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <div className="text-xs text-white/60 mb-1">{t("woDetails.partIdUuid")}</div>
                    <input
                      value={linePartId}
                      onChange={(e) => setLinePartId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                      placeholder={t("woDetails.uuidPlaceholder")}
                    />
                  </div>

                  <div>
                    <div className="text-xs text-white/60 mb-1">{t("woDetails.qty")}</div>
                    <input
                      type="number"
                      value={lineQty}
                      onChange={(e) => setLineQty(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-white/60 mb-1">{t("woDetails.unitCost")}</div>
                    <input
                      type="number"
                      value={lineUnitCost}
                      onChange={(e) => setLineUnitCost(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <div className="text-xs text-white/60 mb-1">{t("woDetails.notesOpt")}</div>
                    <input
                      value={lineNotes}
                      onChange={(e) => setLineNotes(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                      placeholder={t("common.optional")}
                    />
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2">
                    <Button variant="primary" onClick={addIssueLine} disabled={lineSaving || !canManage}>
                      {lineSaving ? t("common.saving") : t("woDetails.addLine")}
                    </Button>
                    {lineMsg ? (
                      <div className={cn("text-sm", lineMsg.startsWith("✅") ? "text-green-200" : "text-red-200")}>
                        {lineMsg}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 text-sm font-semibold">{t("woDetails.issuedLinesFromReport")}</div>
                <div className="mt-2 overflow-auto rounded-2xl border border-white/10">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-white/5 text-white/70">
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
                        <tr className="border-t border-white/10">
                          <td colSpan={6} className="p-3 text-white/70">
                            {t("woDetails.noIssuedLines")}
                          </td>
                        </tr>
                      ) : (
                        issuedLines.map((l: any, idx: number) => (
                          <tr key={`${l.issue_id}_${l.part_id}_${idx}`} className="border-t border-white/10">
                            <td className="p-3">
                              <div className="font-semibold">{l?.part?.name || "—"}</div>
                              <div className="text-xs text-white/50 font-mono">{shortId(l.part_id)}</div>
                            </td>
                            <td className="p-3">{l.qty}</td>
                            <td className="p-3">{l.unit_cost}</td>
                            <td className="p-3">{l.total_cost}</td>
                            <td className="p-3 text-xs font-mono text-white/60">{shortId(l.issue_id)}</td>
                            <td className="p-3">{l.notes || "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Installations Tab */}
            {tab === "installations" ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{t("woDetails.installationsTitle")}</div>
                  <Button variant="secondary" onClick={loadInstallations} disabled={instLoading}>
                    {instLoading ? t("common.loading") : t("common.refresh")}
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <div className="text-xs text-white/60 mb-1">{t("woDetails.partIdUuid")}</div>
                    <input
                      value={instPartId}
                      onChange={(e) => setInstPartId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                      placeholder={t("woDetails.uuidPlaceholder")}
                    />
                  </div>

                  <div>
                    <div className="text-xs text-white/60 mb-1">{t("woDetails.qtyInstalled")}</div>
                    <input
                      type="number"
                      value={instQty}
                      onChange={(e) => setInstQty(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-white/60 mb-1">{t("woDetails.odometerOpt")}</div>
                    <input
                      type="number"
                      value={instOdo}
                      onChange={(e) => setInstOdo(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                      placeholder={t("common.optional")}
                    />
                  </div>

                  <div className="md:col-span-4">
                    <div className="text-xs text-white/60 mb-1">{t("woDetails.notesOpt")}</div>
                    <input
                      value={instNotes}
                      onChange={(e) => setInstNotes(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                      placeholder={t("common.optional")}
                    />
                  </div>

                  <div className="md:col-span-4 flex items-center gap-2">
                    <Button variant="primary" onClick={addInstallation} disabled={instSaving}>
                      {instSaving ? t("common.saving") : t("woDetails.addInstallation")}
                    </Button>
                    {instMsg ? (
                      <div className={cn("text-sm", instMsg.startsWith("✅") ? "text-green-200" : "text-red-200")}>
                        {instMsg}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 text-sm font-semibold">{t("woDetails.installationsApiList")}</div>
                <div className="mt-2 overflow-auto rounded-2xl border border-white/10">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-white/5 text-white/70">
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
                        <tr className="border-t border-white/10">
                          <td colSpan={5} className="p-3 text-white/70">
                            {t("common.loading")}
                          </td>
                        </tr>
                      ) : instItems.length === 0 ? (
                        <tr className="border-t border-white/10">
                          <td colSpan={5} className="p-3 text-white/70">
                            {t("woDetails.noInstallations")}
                          </td>
                        </tr>
                      ) : (
                        instItems.map((x: any) => (
                          <tr key={x.id} className="border-t border-white/10">
                            <td className="p-3">{fmtDate(x.installed_at)}</td>
                            <td className="p-3">
                              <div className="font-semibold">{x?.part?.name || x?.part_name || "—"}</div>
                              <div className="text-xs text-white/50 font-mono">{shortId(x.part_id)}</div>
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

                <div className="mt-4 text-sm font-semibold">{t("woDetails.installationsRuntimeList")}</div>
                <div className="mt-2 overflow-auto rounded-2xl border border-white/10">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead className="bg-white/5 text-white/70">
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
                        <tr className="border-t border-white/10">
                          <td colSpan={5} className="p-3 text-white/70">
                            {t("woDetails.noRuntimeInstallations")}
                          </td>
                        </tr>
                      ) : (
                        installationsRuntime.map((x: any) => (
                          <tr key={x.id} className="border-t border-white/10">
                            <td className="p-3">{fmtDate(x.installed_at)}</td>
                            <td className="p-3">
                              <div className="font-semibold">{x?.part?.name || x?.part_name || "—"}</div>
                              <div className="text-xs text-white/50 font-mono">{shortId(x.part_id)}</div>
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
              </div>
            ) : null}

            {/* QA Tab */}
            {tab === "qa" ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm font-semibold">{t("woDetails.qaTitle")}</div>
                  <div className="text-xs text-white/60">{t("woDetails.qaEndpoint")}</div>
                </div>

                {!canManage ? (
                  <div className="text-sm text-white/70">{t("woDetails.onlyAdminAccountantQa")}</div>
                ) : (
                  <div className="space-y-3">
                    {rs === "NEEDS_PARTS_RECONCILIATION" ? (
                      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">
                        {t("woDetails.fixMismatchFirst")}
                      </div>
                    ) : null}

                    <div>
                      <div className="text-xs text-white/60 mb-1">{t("woDetails.roadTestResult")}</div>
                      <select
                        value={qaResult}
                        onChange={(e) => setQaResult(e.target.value as any)}
                        className={selectCls}
                      >
                        <option value="" className={optionCls}>
                          {t("common.select")}
                        </option>
                        <option value="PASS" className={optionCls}>
                          {t("woDetails.pass")}
                        </option>
                        <option value="FAIL" className={optionCls}>
                          {t("woDetails.fail")}
                        </option>
                      </select>
                    </div>

                    <div>
                      <div className="text-xs text-white/60 mb-1">{t("woDetails.remarks")}</div>
                      <textarea
                        value={qaRemarks}
                        onChange={(e) => setQaRemarks(e.target.value)}
                        placeholder={t("woDetails.remarksPlaceholder")}
                        className="min-h-[90px] w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="primary" onClick={saveQA} disabled={qaSaving}>
                        {qaSaving ? t("common.saving") : t("woDetails.saveQa")}
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
                      <div className={cn("text-sm", qaMsg.startsWith("✅") ? "text-green-200" : "text-red-200")}>
                        {qaMsg}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
