"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";

const fmtDate = (d: any) => {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
};

const shortId = (id: any) => {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
};

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

/** ✅ helper: supports axios (res.data) + custom wrapper (res) */
function unwrap(res: any) {
  return res?.data ?? res;
}
/** ✅ helper: if body is {items,total} or array */
function unwrapItems(res: any) {
  const body = unwrap(res);
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  return [];
}

/* ---------------- Toast ---------------- */
function Toast({
  open,
  message,
  type,
  onClose,
  t,
}: {
  open: boolean;
  message: string;
  type: "success" | "error";
  onClose: () => void;
  t: (k: string, vars?: Record<string, any>) => string;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className={cn(
        "fixed bottom-4 right-4 z-[9999] max-w-sm cursor-pointer rounded-xl px-4 py-3 text-white shadow-xl",
        type === "success" ? "bg-emerald-600" : "bg-red-600"
      )}
      role="alert"
    >
      <div className="font-semibold">{message}</div>
      <div className="mt-1 text-xs opacity-85">{t("tripModals.toastCloseHint")}</div>
    </div>
  );
}

/* ---------------- Assign Modal ---------------- */
function AssignTripModal({
  open,
  tripId,
  onClose,
  onAssigned,
  showToast,
}: {
  open: boolean;
  tripId: string | null;
  onClose: () => void;
  onAssigned: () => void;
  showToast: (type: "success" | "error", msg: string) => void;
}) {
  const t = useT();

  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);

  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  // ✅ vehicle label helper
  const vehicleLabel = (v: any) => {
    const fleet = String(v?.fleet_no || "").trim();
    const plate = String(v?.plate_no || v?.plate_number || "").trim();
    const disp = String(v?.display_name || "").trim();

    if (fleet && plate) return `${fleet} - ${plate}`;
    if (fleet) return fleet;
    if (plate) return plate;
    if (disp) return disp;

    return shortId(v?.id);
  };

  useEffect(() => {
    if (!open) return;

    setVehicleId("");
    setDriverId("");
    setSupervisorId("");

    (async () => {
      setLoading(true);
      try {
        const [vRes, dRes, uRes] = await Promise.all([
          api.get("/vehicles"),
          api.get("/drivers/active"),
          api.get("/users"),
        ]);

        const vItems = unwrapItems(vRes);
        const dItems = unwrapItems(dRes);
        const uItems = unwrapItems(uRes);

        // ✅ Vehicles UI filter:
        const filteredVehicles = vItems.filter((v: any) => {
          if (v?.is_active === false) return false;
          if (v?.status) return String(v.status).toUpperCase() === "AVAILABLE";
          return true;
        });

        setVehicles(filteredVehicles);
        setDrivers(dItems);
        setSupervisors(
          uItems.filter((x: any) => String(x.role || "").toUpperCase() === "FIELD_SUPERVISOR")
        );
      } catch (e: any) {
        showToast("error", e?.response?.data?.message || e?.message || t("common.failed"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !tripId) return null;

  const canSubmit = !!vehicleId && !!driverId;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.post(`/trips/${tripId}/assign`, {
        vehicle_id: vehicleId,
        driver_id: driverId,
        field_supervisor_id: supervisorId || null,
      });

      showToast("success", t("trips.toast.assigned"));
      onAssigned();
      onClose();
    } catch (e: any) {
      showToast("error", e?.response?.data?.message || e?.message || t("common.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl bg-white text-slate-900 border border-slate-200 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{t("tripModals.assignTitle")}</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm">
            {t("tripModals.vehicle")} ({t("tripModals.availableOnly")})
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">{t("tripModals.selectVehicle")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {vehicleLabel(v)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            {t("tripModals.driver")} ({t("tripModals.activeOnly")})
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">{t("tripModals.selectDriver")}</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name || d.name || d.phone || d.id}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            {t("tripModals.fieldSupervisor")}
            <select
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">{t("tripModals.none")}</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email || s.id}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
          >
            {t("tripModals.cancel")}
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 font-semibold"
          >
            {loading ? t("tripModals.saving") : t("tripModals.assign")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Create Modal ---------------- */
function CreateTripModal({
  open,
  onClose,
  onCreated,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  showToast: (type: "success" | "error", msg: string) => void;
}) {
  const t = useT();

  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);

  const [clientId, setClientId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;

    setClientId("");
    setSiteId("");
    setScheduledAt("");
    setNotes("");

    (async () => {
      setLoading(true);
      try {
        const [cRes, sRes] = await Promise.all([api.get("/clients"), api.get("/sites")]);
        setClients(unwrapItems(cRes));
        setSites(unwrapItems(sRes));
      } catch (e: any) {
        showToast("error", e?.response?.data?.message || e?.message || t("common.failed"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const canSubmit = !!clientId && !!siteId;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await api.post("/trips", {
        client_id: clientId,
        site_id: siteId,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        notes: notes || null,
      });

      showToast("success", t("trips.toast.tripCreated"));
      onCreated();
      onClose();
    } catch (e: any) {
      showToast("error", e?.response?.data?.message || e?.message || t("common.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl bg-white text-slate-900 border border-slate-200 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{t("tripModals.createTitle")}</h3>
          <button onClick={onClose} className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm">
            {t("tripModals.client")}
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">{t("common.search")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.company_name || c.id}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            {t("tripModals.site")}
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">{t("common.search")}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name || s.address || s.id}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            {t("tripModals.scheduledOptional")}
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="grid gap-2 text-sm">
            {t("tripModals.notesOptional")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none focus:ring-2 focus:ring-slate-200"
              rows={3}
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60"
          >
            {t("tripModals.cancel")}
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 font-semibold"
          >
            {loading ? t("tripModals.saving") : t("tripModals.create")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function TripsPage() {
  const t = useT();

  const router = useRouter();
  const sp = useSearchParams();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const role = String(user?.role || "").toUpperCase();

  const canSeeFinance = useMemo(() => role === "ADMIN" || role === "ACCOUNTANT", [role]);
  const canAssign = useMemo(() => role === "ADMIN" || role === "HR", [role]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTripId, setAssignTripId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  // hydrate
  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  // guard
  useEffect(() => {
    if (token === null) return;
    if (!token) router.push("/login");
  }, [token, router]);

  const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10), 1), 100);
  const status = sp.get("status") || "";

  const qs = useMemo(() => {
    const q = new URLSearchParams();
    q.set("page", String(page));
    q.set("pageSize", String(pageSize));
    if (status) q.set("status", status);
    return q.toString();
  }, [page, pageSize, status]);

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    router.push(`/trips?${p.toString()}`);
  };

  async function loadTrips() {
    if (token === null || !token) return;

    setLoading(true);
    setErr(null);
    try {
      const res = await api.get(`/trips?${qs}`);
      setData(unwrap(res));
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || t("trips.errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token === null) return;
    if (!token) return;
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, qs]);

  const items = data?.items || [];
  const total = Number(data?.total || 0);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  async function startTrip(tripId: string) {
    try {
      await api.post(`/trips/${tripId}/start`);
      showToast("success", t("trips.toast.started"));
      loadTrips();
    } catch (e: any) {
      showToast("error", e?.response?.data?.message || e?.message || t("trips.errors.startFailed"));
    }
  }

  async function finishTrip(tripId: string) {
    const ok = window.confirm(t("trips.confirm.finishTrip"));
    if (!ok) return;

    try {
      await api.post(`/trips/${tripId}/finish`);
      showToast("success", t("trips.toast.finished"));
      loadTrips();
    } catch (e: any) {
      showToast("error", e?.response?.data?.message || e?.message || t("trips.errors.finishFailed"));
    }
  }

  function openAssign(tripId: string) {
    setAssignTripId(tripId);
    setAssignOpen(true);
  }

  if (token === null) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {t("common.checkingSession")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">{t("trips.title")}</div>
            <div className="text-sm text-slate-600">{t("trips.subtitle")}</div>
          </div>

          <div className="text-xs text-slate-600">
            {t("trips.meta.role")}: <span className="text-slate-900 font-semibold">{role || "—"}</span>
          </div>
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => setParam("status", e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm outline-none"
          >
            <option value="">{t("trips.filters.allStatuses")}</option>
            <option value="ASSIGNED,IN_PROGRESS">{t("trips.filters.active")}</option>
            <option value="DRAFT">{t("trips.filters.DRAFT")}</option>
            <option value="ASSIGNED">{t("trips.filters.ASSIGNED")}</option>
            <option value="IN_PROGRESS">{t("trips.filters.IN_PROGRESS")}</option>
            <option value="COMPLETED">{t("trips.filters.COMPLETED")}</option>
          </select>

          <span className="text-xs text-slate-600">
            {t("trips.meta.total")}: {total} — {t("trips.meta.page")} {page}/{totalPages}
          </span>

          <button
            onClick={() => setCreateOpen(true)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
          >
            {t("trips.actions.createTrip")}
          </button>

          <button
            onClick={loadTrips}
            disabled={loading}
            className="ml-auto px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-60"
          >
            {loading ? t("common.loading") : t("trips.actions.refresh")}
          </button>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {t("common.loading")}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-slate-700">{t("trips.table.trip")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("trips.table.status")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("trips.table.client")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("trips.table.site")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("trips.table.scheduled")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("trips.table.created")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("trips.table.actions")}</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((r: any) => {
                    const st = String(r.status || "").toUpperCase();

                    return (
                      <tr
                        key={r.id}
                        className={cn("border-t border-slate-200 hover:bg-slate-50 cursor-pointer")}
                        onClick={() => router.push(`/trips/${r.id}`)}
                      >
                        <td className="px-4 py-2 font-mono text-slate-800">{shortId(r.id)}</td>
                        <td className="px-4 py-2 text-slate-800">{String(r.status || "—")}</td>
                        <td className="px-4 py-2 text-slate-800">{r.clients?.name || "—"}</td>
                        <td className="px-4 py-2 text-slate-800">{r.sites?.name || "—"}</td>
                        <td className="px-4 py-2 text-slate-700">{fmtDate(r.scheduled_at)}</td>
                        <td className="px-4 py-2 text-slate-700">{fmtDate(r.created_at)}</td>

                        <td className="px-4 py-2">
                          <div className="flex gap-2 flex-wrap">
                            {/* ✅ Finance link FIXED to /trips/:id/finance */}
                            {canSeeFinance ? (
                              <Link
                                href={`/trips/${r.id}/finance`}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs text-emerald-800"
                                title={t("tripFinance.title")}
                              >
                                {t("trips.actions.finance")}
                              </Link>
                            ) : null}

                            {st === "DRAFT" && canAssign ? (
                              <button
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAssign(r.id);
                                }}
                              >
                                {t("trips.actions.assign")}
                              </button>
                            ) : null}

                            {st === "ASSIGNED" ? (
                              <button
                                className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs text-emerald-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startTrip(r.id);
                                }}
                              >
                                {t("trips.actions.start")}
                              </button>
                            ) : null}

                            {st === "IN_PROGRESS" ? (
                              <button
                                className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs text-amber-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  finishTrip(r.id);
                                }}
                              >
                                {t("trips.actions.finish")}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!items.length ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-600" colSpan={7}>
                        {t("trips.empty")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 p-4 border-t border-slate-200">
              <button
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setParam("page", String(page - 1))}
              >
                {t("common.prev")}
              </button>

              <div className="text-xs text-slate-600">{t("trips.meta.showing", { count: items.length, total })}</div>

              <button
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setParam("page", String(page + 1))}
              >
                {t("common.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      <AssignTripModal
        open={assignOpen}
        tripId={assignTripId}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => loadTrips()}
        showToast={showToast}
      />

      <CreateTripModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => loadTrips()} showToast={showToast} />

      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} t={t} />
    </div>
  );
}