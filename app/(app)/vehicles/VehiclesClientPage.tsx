"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

const fmtDate = (d: any) => {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
};

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function vehicleLabel(v: any) {
  const a = String(v.fleet_no || "").trim();
  const b = String(v.plate_no || "").trim();
  const dn = String(v.display_name || "").trim();

  if (a && b) return `${a} — ${b}${dn ? ` (${dn})` : ""}`;
  if (a) return `${a}${dn ? ` (${dn})` : ""}`;
  if (b) return `${b}${dn ? ` (${dn})` : ""}`;
  return dn || shortId(v.id);
}

/* ---------------- Modal ---------------- */
function VehicleModal({
  open,
  mode,
  initial,
  onClose,
  onSaved,
  showToast,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: any;
  onClose: () => void;
  onSaved: () => void;
  showToast: (type: "success" | "error", msg: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const [fleetNo, setFleetNo] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("AVAILABLE");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [odometer, setOdometer] = useState<string>("");
  const [gps, setGps] = useState("");

  useEffect(() => {
    if (!open) return;

    setFleetNo(String(initial?.fleet_no || ""));
    setPlateNo(String(initial?.plate_no || ""));
    setDisplayName(String(initial?.display_name || ""));
    setStatus(String(initial?.status || "AVAILABLE"));
    setModel(String(initial?.model || ""));
    setYear(initial?.year ? String(initial.year) : "");
    setOdometer(initial?.current_odometer ? String(initial.current_odometer) : "");
    setGps(String(initial?.gps_device_id || ""));
  }, [open, initial]);

  if (!open) return null;

  const canSubmit = fleetNo.trim() && plateNo.trim();

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const payload: any = {
        fleet_no: fleetNo.trim(),
        plate_no: plateNo.trim(),
        display_name: displayName.trim() || null,
        status: status || "AVAILABLE",
        model: model.trim() || null,
        year: year ? Number(year) : null,
        current_odometer: odometer ? Number(odometer) : null,
        gps_device_id: gps.trim() || null,
      };

      if (mode === "create") {
        await api.post("/vehicles", payload);
        showToast("success", "Vehicle created");
      } else {
        await api.put(`/vehicles/${initial.id}`, payload);
        showToast("success", "Vehicle updated");
      }

      onSaved();
      onClose();
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-3" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-slate-900 text-white border border-white/10 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{mode === "create" ? "Add Vehicle" : "Edit Vehicle"}</h3>
          <button onClick={onClose} className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10">
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            Fleet No *
            <input
              value={fleetNo}
              onChange={(e) => setFleetNo(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
              placeholder="مثال: F-001"
            />
          </label>

          <label className="grid gap-2 text-sm">
            Plate No *
            <input
              value={plateNo}
              onChange={(e) => setPlateNo(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
              placeholder="مثال: 1234 د م ط"
            />
          </label>

          <label className="grid gap-2 text-sm md:col-span-2">
            Display Name (اختياري)
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
              placeholder="مثال: مرسيدس 1844"
            />
          </label>

          <label className="grid gap-2 text-sm">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="IN_USE">IN_USE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            Model (اختياري)
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm">
            Year (اختياري)
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={loading}
              type="number"
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm">
            Odometer (اختياري)
            <input
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              disabled={loading}
              type="number"
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm md:col-span-2">
            GPS Device ID (اختياري)
            <input
              value={gps}
              onChange={(e) => setGps(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            className="px-4 py-2 rounded-xl border border-white/10 bg-emerald-600/80 hover:bg-emerald-600 disabled:opacity-60 font-semibold"
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function VehiclesPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const role = String(user?.role || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<any>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (token === null) return;
    if (!token) router.push("/login");
  }, [token, router]);

  const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10), 1), 100);
  const q = sp.get("q") || "";
  const status = sp.get("status") || "";
  const active = sp.get("active") || "";

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    if (active) p.set("active", active);
    return p.toString();
  }, [page, pageSize, q, status, active]);

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    router.push(`/vehicles?${p.toString()}`);
  };

  async function load() {
    if (token === null || !token) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get(`/vehicles?${qs}`);
      setData(res);
    } catch (e: any) {
      setErr(e?.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token === null) return;
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, qs]);

  const items = data?.items || [];
  const total = Number(data?.total || 0);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  function openCreate() {
    setEditing(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openEdit(v: any) {
    setEditing(v);
    setModalMode("edit");
    setModalOpen(true);
  }

  async function toggle(v: any) {
    try {
      await api.patch(`/vehicles/${v.id}/toggle`, {});
      showToast("success", "Toggled");
      load();
    } catch (e: any) {
      showToast("error", e?.message || "Toggle failed");
    }
  }

  if (token === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Checking session…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">Vehicles</div>
            <div className="text-sm text-slate-400">Manage fleet</div>
          </div>
          <div className="text-xs text-slate-400">
            Role: <span className="text-slate-200">{role || "—"}</span>
          </div>
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            placeholder="Search fleet/plate/name..."
            className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm outline-none w-64"
          />

          <select
            value={status}
            onChange={(e) => setParam("status", e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm outline-none"
          >
            <option value="">All status</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="IN_USE">IN_USE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="AVAILABLE,IN_USE">Active (AVAILABLE + IN_USE)</option>
          </select>

          <select
            value={active}
            onChange={(e) => setParam("active", e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 text-sm outline-none"
          >
            <option value="">All (active flag)</option>
            <option value="1">Active only</option>
            <option value="0">Inactive only</option>
          </select>

          <span className="text-xs text-slate-400">
            Total: {total} — Page {page}/{totalPages}
          </span>

          <button
            onClick={openCreate}
            className="ml-auto px-3 py-2 rounded-xl border border-white/10 bg-emerald-600/80 hover:bg-emerald-600 text-sm"
          >
            + Add Vehicle
          </button>

          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">{err}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">Loading…</div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-4 py-2 text-left text-slate-200">Vehicle</th>
                    <th className="px-4 py-2 text-left text-slate-200">Fleet</th>
                    <th className="px-4 py-2 text-left text-slate-200">Plate</th>
                    <th className="px-4 py-2 text-left text-slate-200">Status</th>
                    <th className="px-4 py-2 text-left text-slate-200">Active</th>
                    <th className="px-4 py-2 text-left text-slate-200">Created</th>
                    <th className="px-4 py-2 text-left text-slate-200">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((v: any) => (
                    <tr key={v.id} className={cn("border-t border-white/10 hover:bg-white/5")}>
                      <td className="px-4 py-2 font-medium">{vehicleLabel(v)}</td>
                      <td className="px-4 py-2 font-mono">{v.fleet_no || "—"}</td>
                      <td className="px-4 py-2 font-mono">{v.plate_no || "—"}</td>
                      <td className="px-4 py-2">{v.status || "—"}</td>
                      <td className="px-4 py-2">{v.is_active ? "Yes" : "No"}</td>
                      <td className="px-4 py-2">{fmtDate(v.created_at)}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                            onClick={() => openEdit(v)}
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                            onClick={() => toggle(v)}
                          >
                            Toggle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!items.length ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-300" colSpan={7}>
                        No vehicles found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 p-4 border-t border-white/10">
              <button
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setParam("page", String(page - 1))}
              >
                Prev
              </button>

              <div className="text-xs text-slate-400">
                Showing {items.length} of {total}
              </div>

              <button
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setParam("page", String(page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <VehicleModal
        open={modalOpen}
        mode={modalMode}
        initial={editing || undefined}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        showToast={showToast}
      />

      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
    </div>
  );
}
