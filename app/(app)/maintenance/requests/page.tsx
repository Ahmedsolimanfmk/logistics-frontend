"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { useRouter } from "next/navigation";
import { api, unwrapItems } from "@/src/lib/api";
import { useT } from "@/src/i18n/useT";

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

type ListResponse = {
  items: MaintenanceRequest[];
  meta?: { page: number; limit: number; total: number; pages: number };
};

type VehicleOption = { id: string; label: string; status?: string | null };

// =====================
// Helpers
// =====================
function roleUpper(r: unknown) {
  return String(r || "").toUpperCase();
}
function isAdminOrAccountant(role: unknown) {
  const rr = roleUpper(role);
  return rr === "ADMIN" || rr === "ACCOUNTANT";
}
function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
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
// UI atoms
// =====================
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
    <div className="rounded-2xl border bg-white p-4 shadow-sm text-black">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
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
    primary: "bg-black text-white border-black hover:bg-neutral-800",
    secondary: "bg-white text-black border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
    ghost: "bg-transparent text-black border-transparent hover:bg-neutral-100",
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
    v === "SUBMITTED"
      ? "bg-yellow-50 text-yellow-800 border-yellow-200"
      : v === "APPROVED"
      ? "bg-green-50 text-green-800 border-green-200"
      : v === "REJECTED"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-neutral-50 text-neutral-700 border-neutral-200";
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs", cls)}>{v}</span>;
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 bg-white text-black placeholder:text-neutral-400"
    />
  );
}

function Select({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 disabled:bg-neutral-50 disabled:text-neutral-400 bg-white text-black"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ToastView({
  open,
  kind,
  message,
  onClose,
}: {
  open: boolean;
  kind: "error" | "success" | "info";
  message: string;
  onClose: () => void;
}) {
  if (!open) return null;
  const cls =
    kind === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : kind === "info"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : "border-red-200 bg-red-50 text-red-800";
  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[92vw] max-w-md">
      <div className={cn("rounded-2xl border p-3 shadow-lg", cls)}>
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm">{message}</div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 hover:bg-black/5">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white text-black shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-base font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 hover:bg-neutral-100">
            ✕
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
        {footer ? <div className="border-t px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

// =====================
// Main Page
// =====================
export default function MaintenanceRequestsPage() {
  const t = useT();

  const { token, user } = useAuth() as any;
  const role = user?.role;
  const router = useRouter();

  // ✅ hydrate
  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  // Filters
  const [status, setStatus] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Data
  const [items, setItems] = useState<MaintenanceRequest[]>([]);
  const [meta, setMeta] = useState<ListResponse["meta"] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Toast
  const [toast, setToast] = useState<{
    open: boolean;
    kind: "error" | "success" | "info";
    message: string;
  }>({ open: false, kind: "error", message: "" });

  const showToast = (message: string, kind: "error" | "success" | "info" = "error") =>
    setToast({ open: true, kind, message });

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState<MaintenanceRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MaintenanceRequest | null>(null);

  // Create form
  const [formVehicleId, setFormVehicleId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Vehicle options
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  const canReview = isAdminOrAccountant(role);

  function vehicleLabelById(id?: string | null) {
    if (!id) return "—";
    const v = vehicleOptions.find((x) => x.id === id);
    return v ? v.label : shortId(id);
  }

  async function loadVehicleOptions() {
    if (!token) return;
    setVehiclesLoading(true);
    try {
      const res: any = await api.get("/maintenance/vehicles/options");
      setVehicleOptions(unwrapItems<VehicleOption>(res));
    } catch (e: any) {
      setVehicleOptions([]);
      showToast(e?.message || t("maintenanceRequests.toast.vehiclesFailed"), "error");
    } finally {
      setVehiclesLoading(false);
    }
  }

  async function loadRequests(p = page) {
    if (!token) return;
    setLoading(true);
    try {
      const res: any = await api.get("/maintenance/requests", {
        params: {
          status: status || undefined,
          vehicle_id: vehicleId || undefined,
          page: p,
          limit,
        },
      });

      const list = unwrapItems<MaintenanceRequest>(res);
      const m = (res?.meta || res?.data?.meta || null) as ListResponse["meta"] | null;

      setItems(list);
      setMeta(m);
      if (m?.page) setPage(m.page);
    } catch (e: any) {
      showToast(e?.message || t("maintenanceRequests.toast.loadFailed"), "error");
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadVehicleOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadRequests(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status, vehicleId]);

  useEffect(() => {
    if (!token) return;
    loadRequests(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((it) => {
      const a = (it.problem_title || "").toLowerCase();
      const b = (it.problem_description || "").toLowerCase();
      return a.includes(qq) || b.includes(qq);
    });
  }, [items, q]);

  async function onCreateSubmit() {
    if (!formVehicleId) return;

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
      setPage(1);

      showToast(t("maintenanceRequests.toast.requestCreated"), "success");
      await loadRequests(1);
    } catch (e: any) {
      // لو تحب ترجمة خاصة للفشل، هنضيف مفتاح createFailed تحت
      showToast(e?.message || t("maintenanceRequests.toast.createFailed"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onApprove(id: string) {
    try {
      await api.post(`/maintenance/requests/${id}/approve`, {
        type: "CORRECTIVE",
        vendor_name: null,
        odometer: null,
        notes: null,
      });
      setApproveTarget(null);
      showToast(t("maintenanceRequests.toast.approved"), "success");
      await loadRequests(1);
    } catch (e: any) {
      showToast(e?.message || t("maintenanceRequests.toast.approveFailed"), "error");
    }
  }

  async function onReject(id: string, reason: string) {
    try {
      await api.post(`/maintenance/requests/${id}/reject`, { reason });
      setRejectTarget(null);
      showToast(t("maintenanceRequests.toast.rejected"), "info");
      await loadRequests(1);
    } catch (e: any) {
      showToast(e?.message || t("maintenanceRequests.toast.rejectFailed"), "error");
    }
  }

  const totalPages = meta?.pages || 1;

  if (token === null) {
    return (
      <div className="space-y-4 p-4">
        <Card title={t("maintenanceRequests.title")}>
          <div className="text-sm text-neutral-600">{t("common.loadingSession")}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <ToastView
        open={toast.open}
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast((tt) => ({ ...tt, open: false }))}
      />

      <Card
        title={t("maintenanceRequests.title")}
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await loadVehicleOptions();
                await loadRequests(1);
              }}
              disabled={loading || vehiclesLoading}
            >
              {t("maintenanceRequests.actions.refresh")}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>{t("maintenanceRequests.actions.create")}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="mb-1 text-xs text-neutral-600">{t("maintenanceRequests.filters.status")}</div>
            <Select
              value={status}
              onChange={(v: string) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { label: t("common.all"), value: "" },
                { label: "SUBMITTED", value: "SUBMITTED" },
                { label: "APPROVED", value: "APPROVED" },
                { label: "REJECTED", value: "REJECTED" },
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-600">{t("maintenanceRequests.filters.vehicle")}</div>
            <Select
              value={vehicleId}
              disabled={vehiclesLoading}
              onChange={(v: string) => {
                setVehicleId(v);
                setPage(1);
              }}
              options={[
                {
                  label: vehiclesLoading
                    ? t("maintenanceRequests.form.vehicleLoading")
                    : t("maintenanceRequests.form.vehicleSelect"),
                  value: "",
                },
                ...vehicleOptions.map((v) => ({
                  label: `${v.label}${v.status ? ` (${String(v.status).toUpperCase()})` : ""}`,
                  value: v.id,
                })),
              ]}
            />
            <div className="mt-1 text-[11px] text-neutral-500">{t("maintenanceRequests.form.attachmentsHint")}</div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-neutral-600">{t("maintenanceRequests.filters.searchLocal")}</div>
            <Input value={q} onChange={setQ} placeholder={t("maintenanceRequests.filters.searchPlaceholder")} />
          </div>
        </div>

        {loading ? <div className="mt-3 text-sm text-neutral-600">{t("common.loading")}</div> : null}

        <div className="mt-4 overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-2 text-left">{t("maintenanceRequests.table.requestedAt")}</th>
                <th className="px-3 py-2 text-left">{t("maintenanceRequests.table.vehicle")}</th>
                <th className="px-3 py-2 text-left">{t("maintenanceRequests.table.title")}</th>
                <th className="px-3 py-2 text-left">{t("maintenanceRequests.table.status")}</th>
                <th className="px-3 py-2 text-left">{t("maintenanceRequests.table.actions")}</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                    {t("maintenanceRequests.empty")}
                  </td>
                </tr>
              ) : (
                filtered.map((it) => {
                  const st = String(it.status || "").toUpperCase();
                  const canApproveReject = canReview && st === "SUBMITTED";
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-2">{fmtDate(it.requested_at || it.created_at)}</td>

                      <td className="px-3 py-2">
                        <div className="font-medium">{vehicleLabelById(it.vehicle_id)}</div>
                        <div className="mt-0.5 font-mono text-xs text-neutral-500">{shortId(it.vehicle_id)}</div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="font-medium">{it.problem_title}</div>
                        {it.problem_description ? (
                          <div className="mt-0.5 line-clamp-2 text-xs text-neutral-600">{it.problem_description}</div>
                        ) : null}
                        {st === "REJECTED" && it.rejection_reason ? (
                          <div className="mt-1 text-xs text-red-700">
                            {t("maintenanceRequests.modals.rejectReasonLabel")}: {it.rejection_reason}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-3 py-2">
                        <Badge value={st} />
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => router.push(`/maintenance/requests/${it.id}`)}>
                            {t("common.view")}
                          </Button>

                          {canApproveReject ? (
                            <>
                              <Button variant="secondary" onClick={() => setApproveTarget(it)}>
                                {t("maintenanceRequests.actions.approve")}
                              </Button>
                              <Button variant="danger" onClick={() => setRejectTarget(it)}>
                                {t("maintenanceRequests.actions.reject")}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-xs text-neutral-600">
            {t("maintenanceRequests.pagination.page")} {meta?.page || page} / {totalPages} •{" "}
            {t("maintenanceRequests.pagination.total")} {meta?.total ?? filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("common.prev")}
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        title={t("maintenanceRequests.modals.createTitle")}
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={submitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onCreateSubmit} disabled={submitting || !formVehicleId}>
              {submitting ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="mb-1 text-xs text-neutral-600">{t("maintenanceRequests.form.vehicle")}</div>
            <Select
              value={formVehicleId}
              disabled={vehiclesLoading}
              onChange={(v: string) => setFormVehicleId(v)}
              options={[
                {
                  label: vehiclesLoading
                    ? t("maintenanceRequests.form.vehicleLoading")
                    : t("maintenanceRequests.form.vehicleSelect"),
                  value: "",
                },
                ...vehicleOptions.map((v) => ({
                  label: `${v.label}${v.status ? ` (${String(v.status).toUpperCase()})` : ""}`,
                  value: v.id,
                })),
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-600">{t("maintenanceRequests.form.problemTitle")}</div>
            <Input
              value={formTitle}
              onChange={setFormTitle}
              placeholder={t("maintenanceRequests.form.problemTitlePh")}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-600">{t("maintenanceRequests.form.description")}</div>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder={t("maintenanceRequests.form.descriptionPh")}
              className="min-h-[110px] w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 bg-white text-black placeholder:text-neutral-400"
            />
          </div>

          <div className="rounded-xl border bg-neutral-50 p-3 text-xs text-neutral-600">
            ✅ {t("maintenanceRequests.form.attachmentsHint")}
          </div>
        </div>
      </Modal>

      {/* Approve Modal */}
      <Modal
        open={!!approveTarget}
        title={t("maintenanceRequests.modals.approveTitle")}
        onClose={() => setApproveTarget(null)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setApproveTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => approveTarget && onApprove(approveTarget.id)}>
              {t("maintenanceRequests.modals.approveCta")}
            </Button>
          </div>
        }
      >
        <div className="text-sm">
          {approveTarget ? (
            <div className="mt-3 rounded-xl border p-3">
              <div className="font-medium">{approveTarget.problem_title}</div>
              <div className="mt-1 text-xs text-neutral-600">
                {t("maintenanceRequests.form.vehicle")}:{" "}
                <span className="font-mono">{approveTarget.vehicle_id}</span>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Reject Modal */}
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title={t("maintenanceRequests.modals.rejectTitle")}
        request={rejectTarget}
        onSubmit={onReject}
      />
    </div>
  );
}

function RejectModal({
  open,
  onClose,
  title,
  request,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  request: MaintenanceRequest | null;
  onSubmit: (id: string, reason: string) => Promise<void>;
}) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            disabled={busy || reason.trim().length < 2 || !request}
            onClick={async () => {
              if (!request) return;
              setBusy(true);
              try {
                await onSubmit(request.id, reason.trim());
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? t("common.saving") : t("maintenanceRequests.actions.reject")}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        {request ? (
          <div className="rounded-xl border p-3">
            <div className="font-medium">{request.problem_title}</div>
            <div className="mt-1 text-xs text-neutral-600">
              {t("maintenanceRequests.form.vehicle")}: <span className="font-mono">{request.vehicle_id}</span>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1 text-xs text-neutral-600">{t("maintenanceRequests.modals.rejectReasonLabel")}</div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[110px] w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 bg-white text-black placeholder:text-neutral-400"
            placeholder={t("maintenanceRequests.modals.rejectReasonPh")}
          />
        </div>

        <div className="text-xs text-neutral-600">{t("maintenanceRequests.modals.rejectHint")}</div>
      </div>
    </Modal>
  );
}
