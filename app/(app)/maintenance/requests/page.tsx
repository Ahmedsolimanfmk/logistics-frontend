"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { useRouter } from "next/navigation";

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
// API
// =====================
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

async function apiFetch<T>(
  path: string,
  opts: {
    method?: string;
    token?: string | null;
    body?: any;
    query?: Record<string, any>;
  } = {}
): Promise<T> {
  const { method = "GET", token, body, query } = opts;

  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const txt = await res.text();
  let json: any = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = { message: txt || "Unknown response" };
  }

  if (!res.ok) {
    const msg = json?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json as T;
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
      {/* ✅ force readable colors */}
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
  const { token, user } = useAuth() as any;
  const role = user?.role;
  const router = useRouter();

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
  const [toast, setToast] = useState<{ open: boolean; kind: "error" | "success" | "info"; message: string }>({
    open: false,
    kind: "error",
    message: "",
  });
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
    setVehiclesLoading(true);
    try {
      const res = await apiFetch<{ items: VehicleOption[] }>("/maintenance/vehicles/options", {
        token,
      });
      setVehicleOptions(res.items || []);
    } catch (e: any) {
      setVehicleOptions([]);
      showToast(e?.message || "Failed to load vehicle options", "error");
    } finally {
      setVehiclesLoading(false);
    }
  }

  async function loadRequests() {
    setLoading(true);
    try {
      const res = await apiFetch<ListResponse>("/maintenance/requests", {
        token,
        query: { status: status || undefined, vehicle_id: vehicleId || undefined, page, limit },
      });
      setItems(res.items || []);
      setMeta(res.meta || null);
    } catch (e: any) {
      showToast(e?.message || "Failed to load requests", "error");
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
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status, vehicleId, page]);

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
      await apiFetch<MaintenanceRequest>("/maintenance/requests", {
        token,
        method: "POST",
        body: {
          vehicle_id: formVehicleId,
          problem_title: formTitle.trim(),
          problem_description: formDesc.trim() || null,
        },
      });

      setCreateOpen(false);
      setFormVehicleId("");
      setFormTitle("");
      setFormDesc("");
      setPage(1);

      showToast("Request created", "success");
      await loadRequests();
    } catch (e: any) {
      showToast(e?.message || "Failed to create request", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function onApprove(id: string) {
    try {
      await apiFetch<any>(`/maintenance/requests/${id}/approve`, {
        token,
        method: "POST",
        body: { type: "CORRECTIVE", vendor_name: null, odometer: null, notes: null },
      });
      setApproveTarget(null);
      showToast("Approved", "success");
      await loadRequests();
    } catch (e: any) {
      showToast(e?.message || "Failed to approve", "error");
    }
  }

  async function onReject(id: string, reason: string) {
    try {
      await apiFetch<any>(`/maintenance/requests/${id}/reject`, {
        token,
        method: "POST",
        body: { reason },
      });
      setRejectTarget(null);
      showToast("Rejected", "info");
      await loadRequests();
    } catch (e: any) {
      showToast(e?.message || "Failed to reject", "error");
    }
  }

  const totalPages = meta?.pages || 1;

  return (
    <div className="space-y-4 p-4">
      <ToastView
        open={toast.open}
        kind={toast.kind}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />

      <Card
        title="Maintenance Requests"
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={async () => {
                await loadVehicleOptions();
                await loadRequests();
              }}
              disabled={loading || vehiclesLoading}
            >
              Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>+ Create Request</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="mb-1 text-xs text-neutral-600">Status</div>
            <Select
              value={status}
              onChange={(v: string) => {
                setStatus(v);
                setPage(1);
              }}
              options={[
                { label: "All", value: "" },
                { label: "SUBMITTED", value: "SUBMITTED" },
                { label: "APPROVED", value: "APPROVED" },
                { label: "REJECTED", value: "REJECTED" },
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-600">Vehicle</div>
            <Select
              value={vehicleId}
              disabled={vehiclesLoading}
              onChange={(v: string) => {
                setVehicleId(v);
                setPage(1);
              }}
              options={[
                { label: vehiclesLoading ? "Loading vehicles..." : "All Vehicles", value: "" },
                ...vehicleOptions.map((v) => ({
                  label: `${v.label}${v.status ? ` (${String(v.status).toUpperCase()})` : ""}`,
                  value: v.id,
                })),
              ]}
            />
            <div className="mt-1 text-[11px] text-neutral-500">
              المشرف: عربياته فقط • الأدمن/المحاسب: كل العربيات
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-1 text-xs text-neutral-600">Search (local)</div>
            <Input value={q} onChange={setQ} placeholder="بحث في العنوان/الوصف" />
          </div>
        </div>

        {loading ? <div className="mt-3 text-sm text-neutral-600">Loading…</div> : null}

        <div className="mt-4 overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-2 text-left">Requested At</th>
                <th className="px-3 py-2 text-left">Vehicle</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                    No requests
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
                        <div className="mt-0.5 font-mono text-xs text-neutral-500">
                          {shortId(it.vehicle_id)}
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="font-medium">{it.problem_title}</div>
                        {it.problem_description ? (
                          <div className="mt-0.5 line-clamp-2 text-xs text-neutral-600">
                            {it.problem_description}
                          </div>
                        ) : null}
                        {st === "REJECTED" && it.rejection_reason ? (
                          <div className="mt-1 text-xs text-red-700">
                            Rejection: {it.rejection_reason}
                          </div>
                        ) : null}
                      </td>

                      <td className="px-3 py-2">
                        <Badge value={st} />
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" onClick={() => router.push(`/maintenance/requests/${it.id}`)}>
                            View
                          </Button>

                          {canApproveReject ? (
                            <>
                              <Button variant="secondary" onClick={() => setApproveTarget(it)}>
                                Approve
                              </Button>
                              <Button variant="danger" onClick={() => setRejectTarget(it)}>
                                Reject
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
            Page {meta?.page || page} / {totalPages} • Total {meta?.total ?? filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Create Modal */}
      <Modal
        open={createOpen}
        title="Create Maintenance Request"
        onClose={() => setCreateOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onCreateSubmit} disabled={submitting || !formVehicleId}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3">
          <div>
            <div className="mb-1 text-xs text-neutral-600">Vehicle</div>
            <Select
              value={formVehicleId}
              disabled={vehiclesLoading}
              onChange={(v: string) => setFormVehicleId(v)}
              options={[
                { label: vehiclesLoading ? "Loading vehicles..." : "Select vehicle", value: "" },
                ...vehicleOptions.map((v) => ({
                  label: `${v.label}${v.status ? ` (${String(v.status).toUpperCase()})` : ""}`,
                  value: v.id,
                })),
              ]}
            />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-600">Problem title</div>
            <Input value={formTitle} onChange={setFormTitle} placeholder="مثال: تسريب زيت" />
          </div>

          <div>
            <div className="mb-1 text-xs text-neutral-600">Description</div>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="وصف العطل بالتفصيل…"
              className="min-h-[110px] w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 bg-white text-black placeholder:text-neutral-400"
            />
          </div>

          <div className="rounded-xl border bg-neutral-50 p-3 text-xs text-neutral-600">
            ✅ المرفقات هتترفع من صفحة التفاصيل بعد إنشاء البلاغ.
          </div>
        </div>
      </Modal>

      {/* Approve Modal */}
      <Modal
        open={!!approveTarget}
        title="Approve Request"
        onClose={() => setApproveTarget(null)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => approveTarget && onApprove(approveTarget.id)}>
              Approve + Create Work Order
            </Button>
          </div>
        }
      >
        <div className="text-sm">
          هيتعمل:
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-700">
            <li>Approve للـ Request</li>
            <li>Create Work Order (OPEN)</li>
            <li>Vehicle status → MAINTENANCE</li>
          </ul>
          {approveTarget ? (
            <div className="mt-3 rounded-xl border p-3">
              <div className="font-medium">{approveTarget.problem_title}</div>
              <div className="mt-1 text-xs text-neutral-600">
                vehicle: <span className="font-mono">{approveTarget.vehicle_id}</span>
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      {/* Reject Modal */}
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Request"
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
            Cancel
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
            {busy ? "Rejecting…" : "Reject"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm">
        {request ? (
          <div className="rounded-xl border p-3">
            <div className="font-medium">{request.problem_title}</div>
            <div className="mt-1 text-xs text-neutral-600">
              vehicle: <span className="font-mono">{request.vehicle_id}</span>
            </div>
          </div>
        ) : null}

        <div>
          <div className="mb-1 text-xs text-neutral-600">Rejection reason</div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[110px] w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10 bg-white text-black placeholder:text-neutral-400"
            placeholder="سبب الرفض…"
          />
        </div>

        <div className="text-xs text-neutral-600">
          لازم السبب يبقى واضح عشان المشرف يعرف يعمل Request تاني بشكل صحيح.
        </div>
      </div>
    </Modal>
  );
}
