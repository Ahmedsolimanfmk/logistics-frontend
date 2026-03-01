"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { api, unwrapItems, unwrapTotal } from "@/src/lib/api";
import { useT } from "@/src/i18n/useT";

// ✅ Design System (Trex UI)
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/Toast";

// =====================
// Types
// =====================
type MaintenanceRequestStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

type MaintenanceRequest = {
  id: string;
  vehicle_id: string;
  problem_title: string;
  problem_description?: string | null;
  status: MaintenanceRequestStatus | string;

  requested_by?: string | null;
  requested_at?: string | null;

  reviewed_by?: string | null;
  reviewed_at?: string | null;

  rejection_reason?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
};

type VehicleOption = { id: string; label: string; status?: string | null };

// =====================
// Helpers
// =====================
function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}
function roleUpper(r: unknown) {
  return String(r || "").toUpperCase();
}
function isAdminOrAccountant(role: unknown) {
  const rr = roleUpper(role);
  return rr === "ADMIN" || rr === "ACCOUNTANT";
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}
function shortId(id: unknown) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

// =====================
// Main Page
// =====================
export default function MaintenanceRequestsPage() {
  const t = useT();
  const router = useRouter();

  // ✅ تثبيت t لتجنب loops
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const token = useAuth((s: any) => s.token);
  const user = useAuth((s: any) => s.user);
  const role = user?.role;
  const canReview = isAdminOrAccountant(role);

  // hydrate once
  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  // Filters
  const [status, setStatus] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [q, setQ] = useState<string>("");

  // server-side pagination
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);

  // Data
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  // Vehicles
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = useCallback((type: "success" | "error", msg: string) => {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }, []);

  // Create form
  const [createOpen, setCreateOpen] = useState(false);
  const [formVehicleId, setFormVehicleId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Approve / Reject dialogs
  const [approveTarget, setApproveTarget] = useState<MaintenanceRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MaintenanceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.7)] px-3 py-2 outline-none text-sm trex-input";
  const labelCls = "text-xs text-slate-500 mb-1";

  function vehicleLabelById(id?: string | null) {
    if (!id) return "—";
    const v = vehicleOptions.find((x) => x.id === id);
    return v ? v.label : shortId(id);
  }

  const loadVehicleOptions = useCallback(async () => {
    if (!token) return;
    setVehiclesLoading(true);
    try {
      const res: any = await api.get("/maintenance/vehicles/options");
      setVehicleOptions(unwrapItems<VehicleOption>(res));
    } catch (e: any) {
      setVehicleOptions([]);
      showToast("error", e?.message || tRef.current("maintenanceRequests.toast.vehiclesFailed"));
    } finally {
      setVehiclesLoading(false);
    }
  }, [token, showToast]);

  const loadRequests = useCallback(
    async (p = page) => {
      if (!token) return;

      setLoading(true);
      setErr(null);

      try {
        const res: any = await api.get("/maintenance/requests", {
          params: {
            status: status || undefined,
            vehicle_id: vehicleId || undefined,
            q: q.trim() ? q.trim() : undefined, // ✅ لو الباك يدعم q خليها تتفلتر سيرفر
            page: p,
            limit,
          },
        });

        const list = unwrapItems<MaintenanceRequest>(res);
        setItems(Array.isArray(list) ? list : []);

        const ttotal = unwrapTotal(res);
        if (typeof ttotal === "number" && Number.isFinite(ttotal)) setTotal(ttotal);
        else setTotal(Array.isArray(list) ? list.length : 0);

        // لو meta فيها page
        const mp = (res as any)?.meta?.page ?? (res as any)?.data?.meta?.page;
        if (typeof mp === "number" && mp > 0) setPage(mp);
      } catch (e: any) {
        setItems([]);
        setTotal(0);
        const msg = e?.message || tRef.current("maintenanceRequests.toast.loadFailed");
        setErr(msg);
      } finally {
        setLoading(false);
      }
    },
    [token, page, limit, status, vehicleId, q]
  );

  useEffect(() => {
    if (!token) return;
    loadVehicleOptions();
  }, [token, loadVehicleOptions]);

  // عند تغيير الفلاتر نرجع أول صفحة
  useEffect(() => {
    if (!token) return;
    setPage(1);
    loadRequests(1);
  }, [token, status, vehicleId, loadRequests]);

  // تغيير الصفحة
  useEffect(() => {
    if (!token) return;
    loadRequests(page);
  }, [token, page, loadRequests]);

  const pages = useMemo(() => {
    if (!total || total <= 0) return 1;
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

  // Local filter fallback (لو السيرفر مش بيفلتر بـ q)
  const rows = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => {
      const a = String(it.problem_title || "").toLowerCase();
      const b = String(it.problem_description || "").toLowerCase();
      return a.includes(qq) || b.includes(qq);
    });
  }, [items, q]);

  async function onCreateSubmit() {
    if (!token) return;

    if (!formVehicleId) {
      showToast("error", t("maintenanceRequests.form.vehicleSelect"));
      return;
    }
    if (!formTitle.trim()) {
      showToast("error", t("maintenanceRequests.form.problemTitle"));
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/maintenance/requests", {
        vehicle_id: formVehicleId,
        problem_title: formTitle.trim(),
        problem_description: formDesc.trim() || null,
      });

      setCreateOpen(false);
      setFormVehicleId("");
      setFormTitle("");
      setFormDesc("");

      showToast("success", t("maintenanceRequests.toast.requestCreated"));
      setPage(1);
      await loadRequests(1);
    } catch (e: any) {
      showToast("error", e?.message || t("maintenanceRequests.toast.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onApprove(id: string) {
    if (!token) return;
    setActionBusy(true);

    try {
      const res: any = await api.post(`/maintenance/requests/${id}/approve`, {
        type: "CORRECTIVE",
        vendor_name: null,
        odometer: null,
        notes: null,
      });

      // ✅ حاول نقرأ work_order_id من أي شكل response
      const woId =
        res?.work_order?.id ||
        res?.data?.work_order?.id ||
        res?.work_order_id ||
        res?.data?.work_order_id ||
        res?.id ||
        res?.data?.id ||
        null;

      setApproveTarget(null);
      showToast("success", t("maintenanceRequests.toast.approved"));

      setPage(1);
      await loadRequests(1);

      if (woId) router.push(`/maintenance/work-orders/${woId}`);
    } catch (e: any) {
      showToast("error", e?.message || t("maintenanceRequests.toast.approveFailed"));
    } finally {
      setActionBusy(false);
    }
  }

  async function onReject(id: string, reason: string) {
    if (!token) return;
    setActionBusy(true);

    try {
      await api.post(`/maintenance/requests/${id}/reject`, { reason });
      setRejectTarget(null);
      setRejectReason("");
      showToast("success", t("maintenanceRequests.toast.rejected"));
      setPage(1);
      await loadRequests(1);
    } catch (e: any) {
      showToast("error", e?.message || t("maintenanceRequests.toast.rejectFailed"));
    } finally {
      setActionBusy(false);
    }
  }

  const columns: DataTableColumn<MaintenanceRequest>[] = useMemo(
    () => [
      {
        key: "requested_at",
        label: t("maintenanceRequests.table.requestedAt"),
        render: (row) => fmtDate(row.requested_at || row.created_at),
        headerClassName: "text-right",
        className: "text-right",
      },
      {
        key: "vehicle",
        label: t("maintenanceRequests.table.vehicle"),
        render: (row) => (
          <div className="min-w-[240px]">
            <div className="font-medium text-slate-800">{vehicleLabelById(row.vehicle_id)}</div>
            <div className="mt-0.5 text-xs font-mono text-slate-500">{shortId(row.vehicle_id)}</div>
          </div>
        ),
        headerClassName: "text-right",
        className: "text-right",
      },
      {
        key: "title",
        label: t("maintenanceRequests.table.title"),
        render: (row) => {
          const st = String(row.status || "").toUpperCase();
          return (
            <div className="min-w-[320px]">
              <div className="font-medium text-slate-800">{row.problem_title}</div>

              {row.problem_description ? (
                <div className="mt-0.5 text-xs text-slate-600 line-clamp-2">{row.problem_description}</div>
              ) : null}

              {st === "REJECTED" && row.rejection_reason ? (
                <div className="mt-1 text-xs text-red-600">
                  {t("maintenanceRequests.modals.rejectReasonLabel")}: {row.rejection_reason}
                </div>
              ) : null}
            </div>
          );
        },
        headerClassName: "text-right",
        className: "text-right",
      },
      {
        key: "status",
        label: t("maintenanceRequests.table.status"),
        render: (row) => <StatusBadge status={String(row.status || "")} />,
        headerClassName: "text-right",
        className: "text-right",
      },
      {
        key: "actions",
        label: t("maintenanceRequests.table.actions"),
        render: (row) => {
          const st = String(row.status || "").toUpperCase();
          const canApproveReject = canReview && st === "SUBMITTED";

          return (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => router.push(`/maintenance/requests/${row.id}`)}>
                {t("common.view")}
              </Button>

              {st === "APPROVED" ? (
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/maintenance/work-orders?q=${encodeURIComponent(row.id)}`)}
                >
                  Open Work Order
                </Button>
              ) : null}

              {canApproveReject ? (
                <>
                  <Button variant="secondary" onClick={() => setApproveTarget(row)}>
                    {t("maintenanceRequests.actions.approve")}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setRejectTarget(row);
                      setRejectReason("");
                    }}
                  >
                    {t("maintenanceRequests.actions.reject")}
                  </Button>
                </>
              ) : null}
            </div>
          );
        },
        headerClassName: "text-right",
        className: "text-right",
      },
    ],
    [t, router, canReview, vehicleOptions]
  );

  if (token === null) {
    return (
      <div className="space-y-4 p-4" dir="rtl">
        <PageHeader title={t("maintenanceRequests.title")} subtitle={t("common.loadingSession")} />
        <Card>
          <div className="text-sm text-slate-500">{t("common.loading")}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <PageHeader
        title={t("maintenanceRequests.title")}
        subtitle={t("maintenanceRequests.subtitle") || t("maintenanceRequests.title")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await loadVehicleOptions();
                await loadRequests(1);
                showToast("success", t("common.refresh"));
              }}
              disabled={loading || vehiclesLoading}
              isLoading={loading || vehiclesLoading}
            >
              {t("maintenanceRequests.actions.refresh")}
            </Button>

            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              {t("maintenanceRequests.actions.create")}
            </Button>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className={labelCls}>{t("maintenanceRequests.filters.status")}</div>
            <select
              className={inputCls}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t("common.all")}</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div>
            <div className={labelCls}>{t("maintenanceRequests.filters.vehicle")}</div>
            <select
              className={inputCls}
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                setPage(1);
              }}
              disabled={vehiclesLoading}
            >
              <option value="">
                {vehiclesLoading
                  ? t("maintenanceRequests.form.vehicleLoading")
                  : t("maintenanceRequests.form.vehicleSelect")}
              </option>
              {vehicleOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  {`${v.label}${v.status ? ` (${String(v.status).toUpperCase()})` : ""}`}
                </option>
              ))}
            </select>

            <div className="mt-1 text-[11px] text-slate-500">
              {t("maintenanceRequests.form.attachmentsHint")}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className={labelCls}>{t("maintenanceRequests.filters.searchLocal")}</div>
            <input
              className={inputCls}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("maintenanceRequests.filters.searchPlaceholder")}
            />
          </div>
        </div>
      </Card>

      <DataTable<MaintenanceRequest>
        title={t("maintenanceRequests.list.title") || t("maintenanceRequests.title")}
        subtitle={err ? `⚠ ${err}` : undefined}
        right={
          <div className="flex items-center gap-2">
            {canReview ? (
              <div className="text-xs text-slate-500">
                {t("common.role")}: <span className="font-semibold text-[rgb(var(--trex-fg))]">{roleUpper(role)}</span>
              </div>
            ) : null}
          </div>
        }
        columns={columns}
        rows={rows}
        loading={loading}
        emptyTitle={err ? err : t("maintenanceRequests.empty")}
        emptyHint={err ? t("common.tryAgain") : t("maintenanceRequests.filters.searchPlaceholder")}
        total={total}
        page={page}
        pages={pages}
        onPrev={page > 1 && !loading ? () => setPage((p) => Math.max(1, p - 1)) : undefined}
        onNext={page < pages && !loading ? () => setPage((p) => p + 1) : undefined}
        minWidthClassName="min-w-[1050px]"
      />

      {/* Create (ConfirmDialog as modal-like) */}
      <ConfirmDialog
        open={createOpen}
        title={t("maintenanceRequests.modals.createTitle")}
        description={
          <div className="space-y-3">
            <div>
              <div className={labelCls}>{t("maintenanceRequests.form.vehicle")}</div>
              <select
                className={inputCls}
                value={formVehicleId}
                onChange={(e) => setFormVehicleId(e.target.value)}
                disabled={vehiclesLoading || submitting}
              >
                <option value="">
                  {vehiclesLoading
                    ? t("maintenanceRequests.form.vehicleLoading")
                    : t("maintenanceRequests.form.vehicleSelect")}
                </option>
                {vehicleOptions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {`${v.label}${v.status ? ` (${String(v.status).toUpperCase()})` : ""}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className={labelCls}>{t("maintenanceRequests.form.problemTitle")}</div>
              <input
                className={inputCls}
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t("maintenanceRequests.form.problemTitlePh")}
                disabled={submitting}
              />
            </div>

            <div>
              <div className={labelCls}>{t("maintenanceRequests.form.description")}</div>
              <textarea
                className={cn(inputCls, "min-h-[110px]")}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder={t("maintenanceRequests.form.descriptionPh")}
                disabled={submitting}
              />
            </div>

            <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 text-xs text-slate-600">
              ✅ {t("maintenanceRequests.form.attachmentsHint")}
            </div>
          </div>
        }
        confirmText={submitting ? t("common.saving") : t("common.save")}
        cancelText={t("common.cancel")}
        tone="info"
        isLoading={submitting}
        dir="rtl"
        onClose={() => {
          if (submitting) return;
          setCreateOpen(false);
        }}
        onConfirm={async () => {
          await onCreateSubmit();
        }}
      />

      {/* Approve */}
      <ConfirmDialog
        open={!!approveTarget}
        title={t("maintenanceRequests.modals.approveTitle")}
        description={
          approveTarget ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                <div className="font-semibold text-sm text-[rgb(var(--trex-fg))]">{approveTarget.problem_title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {t("maintenanceRequests.form.vehicle")}:{" "}
                  <span className="font-mono">{approveTarget.vehicle_id}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {t("maintenanceRequests.modals.approveHint") || "سيتم إنشاء أمر شغل (Work Order) وربطه بالطلب."}
              </div>
            </div>
          ) : null
        }
        confirmText={t("maintenanceRequests.modals.approveCta")}
        cancelText={t("common.cancel")}
        tone="warning"
        isLoading={actionBusy}
        dir="rtl"
        onClose={() => {
          if (actionBusy) return;
          setApproveTarget(null);
        }}
        onConfirm={async () => {
          if (!approveTarget) return;
          await onApprove(approveTarget.id);
        }}
      />

      {/* Reject */}
      <ConfirmDialog
        open={!!rejectTarget}
        title={t("maintenanceRequests.modals.rejectTitle")}
        description={
          rejectTarget ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3">
                <div className="font-semibold text-sm text-[rgb(var(--trex-fg))]">{rejectTarget.problem_title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {t("maintenanceRequests.form.vehicle")}:{" "}
                  <span className="font-mono">{rejectTarget.vehicle_id}</span>
                </div>
              </div>

              <div>
                <div className={labelCls}>{t("maintenanceRequests.modals.rejectReasonLabel")}</div>
                <textarea
                  className={cn(inputCls, "min-h-[110px]")}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("maintenanceRequests.modals.rejectReasonPh")}
                  disabled={actionBusy}
                />
                <div className="mt-1 text-xs text-slate-500">{t("maintenanceRequests.modals.rejectHint")}</div>
              </div>
            </div>
          ) : null
        }
        confirmText={t("maintenanceRequests.actions.reject")}
        cancelText={t("common.cancel")}
        tone="danger"
        isLoading={actionBusy}
        dir="rtl"
        onClose={() => {
          if (actionBusy) return;
          setRejectTarget(null);
          setRejectReason("");
        }}
        onConfirm={async () => {
          if (!rejectTarget) return;
          const r = rejectReason.trim();
          if (r.length < 2) {
            showToast("error", t("maintenanceRequests.modals.rejectReasonPh"));
            return;
          }
          await onReject(rejectTarget.id, r);
        }}
      />

      <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
    </div>
  );
}