"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

// ✅ tolerant unwrap: supports axios raw (res.data) OR wrapper returning body directly
function unwrap(res: any) {
  return res?.data ?? res;
}

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

// ---------------- Toast ----------------
function Toast({
  open,
  message,
  type,
  onClose,
  closeHint,
}: {
  open: boolean;
  message: string;
  type: "success" | "error";
  onClose: () => void;
  closeHint: string;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className={cn(
        "fixed right-4 bottom-4 z-[9999] max-w-[360px] cursor-pointer",
        "rounded-xl px-4 py-3 text-white shadow-xl border",
        type === "success"
          ? "bg-emerald-600 border-emerald-500/30"
          : "bg-red-600 border-red-500/30"
      )}
      role="alert"
    >
      <div className="font-semibold">{message}</div>
      <div className="opacity-85 text-xs mt-1">{closeHint}</div>
    </div>
  );
}

// ---------------- Assign Modal ----------------
function AssignTripModal({
  open,
  tripId,
  onClose,
  onAssigned,
}: {
  open: boolean;
  tripId: string | null;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const t = useT();

  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);

  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  useEffect(() => {
    if (!open) return;

    setVehicleId("");
    setDriverId("");
    setSupervisorId("");

    (async () => {
      setLoading(true);
      try {
        // ✅ list endpoints may return {items} or []
        const [vRes, dRes, uRes] = await Promise.all([
          api.get("/vehicles"),
          api.get("/drivers"),
          api.get("/users"),
        ]);

        const v = unwrap(vRes);
        const d = unwrap(dRes);
        const u = unwrap(uRes);

        const vItems = Array.isArray(v?.items) ? v.items : Array.isArray(v) ? v : [];
        const dItems = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
        const uItems = Array.isArray(u?.items) ? u.items : Array.isArray(u) ? u : [];

        setVehicles(vItems);
        setDrivers(dItems);

        setSupervisors(
          uItems.filter((x: any) => roleUpper(x?.role) === "FIELD_SUPERVISOR")
        );
      } finally {
        setLoading(false);
      }
    })();
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
      onAssigned();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-[560px] max-w-full rounded-2xl bg-white text-slate-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 font-bold">{t("tripModals.assignTitle")}</h3>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm">
            {t("tripModals.vehicle")}
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              disabled={loading}
              className="h-10 rounded-lg border border-slate-200 px-3"
            >
              <option value="">{t("tripModals.selectVehicle")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.fleet_no && v.plate_no
                    ? `${v.fleet_no} - ${v.plate_no}`
                    : v.plate_number || v.plate_no || v.name || v.code || v.id}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            {t("tripModals.driver")}
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              disabled={loading}
              className="h-10 rounded-lg border border-slate-200 px-3"
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
              className="h-10 rounded-lg border border-slate-200 px-3"
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

        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            {t("tripModals.cancel")}
          </button>

          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? t("tripModals.saving") : t("tripModals.assign")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Page ----------------
export default function TripsManagedPage() {
  const t = useT();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);

  const role = useMemo(() => roleUpper(user?.role), [user]);
  const canAssign = useMemo(() => role === "ADMIN" || role === "HR", [role]);

  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTripId, setAssignTripId] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2500);
  }

  async function loadTrips() {
    setLoading(true);
    try {
      const res = await api.get("/trips", { params: { page: 1, pageSize: 25 } });
      const data = unwrap(res);
      setTrips(Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast("error", e?.message || t("trips.errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function openAssign(tripId: string) {
    setAssignTripId(tripId);
    setAssignOpen(true);
  }

  async function startTrip(tripId: string) {
    try {
      await api.post(`/trips/${tripId}/start`, {});
      showToast("success", t("trips.toast.started"));
      loadTrips();
    } catch (e: any) {
      showToast("error", e?.message || t("trips.errors.startFailed"));
    }
  }

  async function finishTrip(tripId: string) {
    const ok = window.confirm(t("trips.confirm.finishTrip"));
    if (!ok) return;

    try {
      await api.post(`/trips/${tripId}/finish`, {});
      showToast("success", t("trips.toast.finished"));
      loadTrips();
    } catch (e: any) {
      showToast("error", e?.message || t("trips.errors.finishFailed"));
    }
  }

  if (token === null) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          {t("common.loadingSession")}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white m-0">{t("trips.title")}</h2>
          <div className="text-sm text-slate-400">{t("trips.subtitle")}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadTrips}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-white disabled:opacity-50"
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>

          <div className="text-xs text-slate-400">
            {t("common.role")}: <span className="text-slate-200">{role || "—"}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs text-slate-400 border-b border-white/10">
            <div className="col-span-2">{t("trips.table.status")}</div>
            <div className="col-span-4">{t("trips.table.client")}</div>
            <div className="col-span-4">{t("trips.table.site")}</div>
            <div className="col-span-2">{t("trips.table.actions")}</div>
          </div>

          {trips.map((tr: any) => {
            const st = String(tr.status || "").toUpperCase();
            const clientName = tr.clients?.name || "—";
            const siteName = tr.sites?.name || "—";

            return (
              <div
                key={tr.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-white/10 hover:bg-white/5"
              >
                <div className="col-span-2 text-slate-200">{st || "—"}</div>
                <div className="col-span-4 text-slate-200">{clientName}</div>
                <div className="col-span-4 text-slate-200">{siteName}</div>

                <div className="col-span-2">
                  <div className="flex gap-2 flex-wrap justify-end">
                    {/* Optional: view details */}
                    <Link
                      href={`/trips/${tr.id}`}
                      className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white"
                      title={t("common.view")}
                    >
                      {t("common.view")}
                    </Link>

                    {st === "DRAFT" && canAssign ? (
                      <button
                        onClick={() => openAssign(tr.id)}
                        className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white"
                      >
                        {t("trips.actions.assign")}
                      </button>
                    ) : null}

                    {st === "ASSIGNED" ? (
                      <button
                        onClick={() => startTrip(tr.id)}
                        className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white"
                      >
                        {t("trips.actions.start")}
                      </button>
                    ) : null}

                    {st === "IN_PROGRESS" ? (
                      <button
                        onClick={() => finishTrip(tr.id)}
                        className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-white"
                      >
                        {t("trips.actions.finish")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && trips.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-300">{t("trips.empty")}</div>
          ) : null}
        </div>
      </div>

      <AssignTripModal
        open={assignOpen}
        tripId={assignTripId}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          showToast("success", t("trips.toast.assigned"));
          loadTrips();
        }}
      />

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        onClose={() => setToastOpen(false)}
        closeHint={t("tripModals.toastCloseHint")}
      />
    </div>
  );
}
