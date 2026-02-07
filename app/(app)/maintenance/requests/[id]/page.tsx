"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { useParams, useRouter } from "next/navigation";

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

type AttachmentType = "IMAGE" | "VIDEO" | "OTHER";

type MaintenanceAttachment = {
  id: string;
  request_id: string;
  type: AttachmentType | string;
  original_name: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  storage_path: string; // e.g. /uploads/...
  uploaded_by?: string | null;
  created_at?: string | null;
};

// =====================
// Helpers
// =====================
function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}
function isAdminOrAccountant(role: any) {
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
function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}
function fmtBytes(n?: number | null) {
  const x = Number(n || 0);
  if (!x) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = x;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
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

async function uploadFiles(
  requestId: string,
  files: File[],
  token?: string | null
): Promise<{ items: MaintenanceAttachment[] }> {
  const url = new URL(`${API_BASE}/maintenance/requests/${requestId}/attachments`);
  const fd = new FormData();
  for (const f of files) fd.append("files", f);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // ⚠️ لا تضع Content-Type هنا (المتصفح يضبط boundary تلقائيًا)
    },
    body: fd,
  });

  const txt = await res.text();
  let json: any = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = { message: txt || "Unknown response" };
  }

  if (!res.ok) {
    const msg = json?.message || `Upload failed (${res.status})`;
    throw new Error(msg);
  }

  return json as { items: MaintenanceAttachment[] };
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-sm backdrop-blur">
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
  primary: "bg-white text-black border-white hover:bg-neutral-200",
  secondary: "bg-neutral-900/40 text-white border-white/15 hover:bg-neutral-900/60",
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
    v === "SUBMITTED"
      ? "bg-yellow-50 text-yellow-800 border-yellow-200"
      : v === "APPROVED"
      ? "bg-green-50 text-green-800 border-green-200"
      : v === "REJECTED"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-neutral-50 text-neutral-700 border-neutral-200";
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs", cls)}>{v}</span>;
}

function Toast({
  open,
  kind = "error",
  message,
  onClose,
}: {
  open: boolean;
  kind?: "error" | "success" | "info";
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
      <div className="absolute left-1/2 top-1/2 w-[95vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-xl">
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
// Page
// =====================
export default function MaintenanceRequestDetailsPage() {
  const { token, user } = useAuth() as any;
  const role = user?.role;

  const params = useParams();
  const router = useRouter();
  const id = String((params as any)?.id || "");

  const canReview = isAdminOrAccountant(role);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<MaintenanceRequest | null>(null);

  // vehicle labels
  const [vehicleOptions, setVehicleOptions] = useState<VehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  // attachments
  const [attLoading, setAttLoading] = useState(false);
  const [attachments, setAttachments] = useState<MaintenanceAttachment[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // toast
  const [toast, setToast] = useState<{ open: boolean; kind: any; message: string }>({
    open: false,
    kind: "error",
    message: "",
  });
  const showToast = (message: string, kind: "error" | "success" | "info" = "error") =>
    setToast({ open: true, kind, message });

  // reject modal
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  function vehicleLabelById(vehicle_id?: string | null) {
    if (!vehicle_id) return "—";
    const v = vehicleOptions.find((x) => x.id === vehicle_id);
    return v ? v.label : shortId(vehicle_id);
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

  type MaintenanceRequestDetailsResponse = {
  request: MaintenanceRequest;
  vehicles?: any;
  requested_by_user?: any;
  reviewed_by_user?: any;
};

async function loadDetails() {
  setLoading(true);
  try {
    const data = await apiFetch<MaintenanceRequestDetailsResponse>(
      `/maintenance/requests/${id}`,
      { token }
    );
    setRow(data?.request ?? null); // ✅ المهم هنا
  } catch (e: any) {
    setRow(null);
    showToast(e?.message || "Failed to load request", "error");
  } finally {
    setLoading(false);
  }
}


  async function loadAttachments() {
    if (!id) return;
    setAttLoading(true);
    try {
      const res = await apiFetch<{ items: MaintenanceAttachment[] }>(
        `/maintenance/requests/${id}/attachments`,
        { token }
      );
      setAttachments(res.items || []);
    } catch (e: any) {
      setAttachments([]);
      showToast(e?.message || "Failed to load attachments", "error");
    } finally {
      setAttLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !id) return;
    loadVehicleOptions();
    loadDetails();
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const st = useMemo(() => String(row?.status || "").toUpperCase(), [row?.status]);
  const canApproveReject = canReview && st === "SUBMITTED";

  async function onApprove() {
    if (!row) return;
    setBusy(true);
    try {
      await apiFetch<any>(`/maintenance/requests/${row.id}/approve`, {
        token,
        method: "POST",
        body: { type: "CORRECTIVE", vendor_name: null, odometer: null, notes: null },
      });
      showToast("Approved", "success");
      await loadDetails();
    } catch (e: any) {
      showToast(e?.message || "Failed to approve", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!row) return;
    const reason = rejectReason.trim();
    if (reason.length < 2) return;

    setBusy(true);
    try {
      await apiFetch<any>(`/maintenance/requests/${row.id}/reject`, {
        token,
        method: "POST",
        body: { reason },
      });
      setRejectOpen(false);
      setRejectReason("");
      showToast("Rejected", "info");
      await loadDetails();
    } catch (e: any) {
      showToast(e?.message || "Failed to reject", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onPickFiles(ev: React.ChangeEvent<HTMLInputElement>) {
    const list = ev.target.files;
    if (!list || list.length === 0) return;

    const files = Array.from(list);
    ev.target.value = ""; // reset input

    // ✅ ارفع باستخدام id الحقيقي (مش :id)
    setAttLoading(true);
    try {
      await uploadFiles(id, files, token);
      showToast("Uploaded", "success");
      await loadAttachments();
    } catch (e: any) {
      showToast(e?.message || "Failed to upload", "error");
    } finally {
      setAttLoading(false);
    }
  }

  async function onDeleteAttachment(attId: string) {
    if (!canReview) return; // delete admin/accountant only (حسب backend)
    setAttLoading(true);
    try {
      await apiFetch<any>(`/maintenance/attachments/${attId}`, { token, method: "DELETE" });
      showToast("Deleted", "info");
      await loadAttachments();
    } catch (e: any) {
      showToast(e?.message || "Failed to delete", "error");
    } finally {
      setAttLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <Toast open={toast.open} kind={toast.kind} message={toast.message} onClose={() => setToast((t) => ({ ...t, open: false }))} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-neutral-600">Maintenance / Requests</div>
          <div className="text-xl font-semibold">Request Details</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/maintenance/requests")}>
            ← Back
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await loadVehicleOptions();
              await loadDetails();
              await loadAttachments();
            }}
            disabled={loading || vehiclesLoading || attLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <Card title={`Request #${row ? shortId(row.id) : "—"}`} right={row ? <Badge value={st} /> : null}>
        {loading ? (
          <div className="text-sm text-neutral-600">Loading…</div>
        ) : !row ? (
          <div className="text-sm text-neutral-600">Not found</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Left */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white">
                <div className="text-xs text-neutral-600">Vehicle</div>
                <div className="mt-1 text-base font-semibold">{vehicleLabelById(row.vehicle_id)}</div>
                <div className="mt-1 font-mono text-xs text-neutral-500">{row.vehicle_id}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white">
                <div className="text-xs text-neutral-600">Problem title</div>
                <div className="mt-1 text-base font-semibold">{row.problem_title}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white">
                <div className="text-xs text-neutral-600">Description</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-neutral-100">
                  {row.problem_description || "—"}
                </div>
              </div>

              {st === "REJECTED" && row.rejection_reason ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                  <div className="text-xs font-semibold text-red-800">Rejection reason</div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-red-800">
                    {row.rejection_reason}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white">
                <div className="text-xs text-neutral-600">Requested</div>
                <div className="mt-1 text-sm">
                  <div>
                    <span className="text-neutral-600">At:</span>{" "}
                    <span className="font-medium">{fmtDate(row.requested_at || row.created_at)}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-neutral-600">By:</span>{" "}
                    <span className="font-mono text-xs">{row.requested_by || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white">
                <div className="text-xs text-neutral-600">Reviewed</div>
                <div className="mt-1 text-sm">
                  <div>
                    <span className="text-neutral-600">At:</span>{" "}
                    <span className="font-medium">{fmtDate(row.reviewed_at)}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-neutral-600">By:</span>{" "}
                    <span className="font-mono text-xs">{row.reviewed_by || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white">
                <div className="text-xs text-neutral-600">System</div>
                <div className="mt-1 text-sm">
                  <div>
                    <span className="text-neutral-600">Created:</span>{" "}
                    <span className="font-medium">{fmtDate(row.created_at)}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-neutral-600">Updated:</span>{" "}
                    <span className="font-medium">{fmtDate(row.updated_at)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {canApproveReject ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-white">
                  <div className="text-xs text-neutral-600">Actions</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button disabled={busy} variant="secondary" onClick={onApprove}>
                      {busy ? "Working…" : "Approve + Create Work Order"}
                    </Button>
                    <Button
                      disabled={busy}
                      variant="danger"
                      onClick={() => {
                        setRejectOpen(true);
                        setRejectReason("");
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border p-3 text-sm text-neutral-600">
                  لا توجد إجراءات متاحة (إما الحالة ليست SUBMITTED أو ليس لديك صلاحية).
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Attachments */}
      <Card
        title="Attachments"
        right={
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={onPickFiles}
            />
            <Button
              variant="secondary"
              disabled={!row || attLoading}
              onClick={() => fileRef.current?.click()}
            >
              + Upload
            </Button>
            <Button
              variant="ghost"
              disabled={attLoading}
              onClick={() => loadAttachments()}
            >
              Refresh
            </Button>
          </div>
        }
      >
        {attLoading ? <div className="text-sm text-neutral-600">Loading…</div> : null}

        {attachments.length === 0 ? (
          <div className="text-sm text-neutral-600">No attachments</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {attachments.map((a) => {
              const t = String(a.type || "").toUpperCase();
              const url = a.storage_path?.startsWith("http")
                ? a.storage_path
                : `${API_BASE}${a.storage_path}`;

              return (
                <div key={a.id} className="rounded-2xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{a.original_name}</div>
                      <div className="mt-0.5 text-xs text-neutral-600">
                        {t} • {fmtBytes(a.size_bytes)} • {fmtDate(a.created_at)}
                      </div>
                      <div className="mt-2">
                        {t === "IMAGE" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={a.original_name}
                            className="h-40 w-full rounded-xl object-cover border"
                          />
                        ) : t === "VIDEO" ? (
                          <video src={url} controls className="h-40 w-full rounded-xl border" />
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm underline"
                          >
                            Open file
                          </a>
                        )}
                      </div>
                    </div>

                    {canReview ? (
                      <Button
                        variant="danger"
                        disabled={attLoading}
                        onClick={() => onDeleteAttachment(a.id)}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-2 text-[11px] text-neutral-500 font-mono">
                    {shortId(a.id)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-3 rounded-xl border bg-neutral-50 p-3 text-xs text-neutral-600">
          • رفع الملفات يدعم صور/فيديو (حتى 8 ملفات) — حسب إعدادات السيرفر. <br />
        
        </div>
      </Card>

      {/* Reject Modal */}
      <Modal
        open={rejectOpen}
        title="Reject Request"
        onClose={() => setRejectOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onReject}
              disabled={busy || rejectReason.trim().length < 2}
            >
              {busy ? "Rejecting…" : "Reject"}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <div className="text-xs text-neutral-600">Rejection reason</div>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[120px] w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
            placeholder="سبب الرفض…"
          />
        </div>
      </Modal>
    </div>
  );
}
