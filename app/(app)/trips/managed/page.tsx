"use client";

import React, { useEffect, useMemo, useState } from "react";

// ✅ غيّر BASE_URL لو عندك env NEXT_PUBLIC_API_URL
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function getUserRole() {
  if (typeof window === "undefined") return "";
  try {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return String(u?.role || "").toUpperCase();
  } catch {
    return "";
  }
}

async function apiGet(path: string) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

async function apiPost(path: string, body?: any) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

// ---------------- Toast ----------------
function Toast({
  open,
  message,
  type,
  onClose,
}: {
  open: boolean;
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        padding: "12px 14px",
        borderRadius: 12,
        color: "white",
        background: type === "success" ? "#16a34a" : "#dc2626",
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
        maxWidth: 360,
        cursor: "pointer",
      }}
      role="alert"
    >
      <div style={{ fontWeight: 600 }}>{message}</div>
      <div style={{ opacity: 0.85, fontSize: 12, marginTop: 4 }}>اضغط لإغلاق</div>
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
        const [v, d, u] = await Promise.all([apiGet("/vehicles"), apiGet("/drivers"), apiGet("/users")]);

        // بعض الكنترولرز بترجع items، وبعضها array
        const vItems = Array.isArray(v?.items) ? v.items : Array.isArray(v) ? v : [];
        const dItems = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
        const uItems = Array.isArray(u?.items) ? u.items : Array.isArray(u) ? u : [];

        setVehicles(vItems);
        setDrivers(dItems);
        setSupervisors(uItems.filter((x: any) => String(x.role || "").toUpperCase() === "FIELD_SUPERVISOR"));
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
      await apiPost(`/trips/${tripId}/assign`, {
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
      onClick={onClose}
    >
      <div
        style={{ width: 560, maxWidth: "100%", background: "white", borderRadius: 16, padding: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Assign Trip</h3>
          <button onClick={onClose} style={{ padding: "6px 10px" }}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Vehicle
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={loading}>
              <option value="">اختر عربية</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate_number || v.name || v.code || v.id}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Driver
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} disabled={loading}>
              <option value="">اختر سائق</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name || d.name || d.phone || d.id}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Field Supervisor (اختياري)
            <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} disabled={loading}>
              <option value="">بدون</option>
              {supervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email || s.id}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} disabled={loading} style={{ padding: "8px 12px" }}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || loading}
            style={{ padding: "8px 12px", fontWeight: 600 }}
          >
            {loading ? "Saving..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Page ----------------
export default function TripsManagedPage() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTripId, setAssignTripId] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const canAssign = useMemo(() => role === "ADMIN" || role === "HR", [role]);

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  async function loadTrips() {
    setLoading(true);
    try {
      const data = await apiGet("/trips?page=1&pageSize=25");
      setTrips(data.items || []);
    } catch (e: any) {
      showToast("error", e.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setRole(getUserRole());
    loadTrips();
  }, []);

  function openAssign(tripId: string) {
    setAssignTripId(tripId);
    setAssignOpen(true);
  }

  async function startTrip(tripId: string) {
    try {
      await apiPost(`/trips/${tripId}/start`);
      showToast("success", "تم بدء الرحلة");
      loadTrips();
    } catch (e: any) {
      showToast("error", e.message || "Start failed");
    }
  }

 async function finishTrip(tripId: string) {
  const ok = window.confirm("تأكيد إنهاء الرحلة؟");
  if (!ok) return;

  try {
    await apiPost(`/trips/${tripId}/finish`);
    showToast("success", "تم إنهاء الرحلة");
    loadTrips();
  } catch (e: any) {
    showToast("error", e.message || "Finish failed");
  }
}


  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Trips (Managed)</h2>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <button onClick={loadTrips} disabled={loading} style={{ padding: "8px 12px" }}>
          {loading ? "Loading..." : "Refresh"}
        </button>
        <div style={{ opacity: 0.7 }}>Role: {role || "-"}</div>
      </div>

      <div style={{ overflowX: "auto", background: "white", borderRadius: 14, border: "1px solid #eee" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Status</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Client</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Site</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {trips.map((t: any) => {
              const st = String(t.status || "").toUpperCase();
              const clientName = t.clients?.name || "-";
              const siteName = t.sites?.name || "-";

              return (
                <tr key={t.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{st}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{clientName}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{siteName}</td>

                  <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {st === "DRAFT" && canAssign && (
                        <button onClick={() => openAssign(t.id)} style={{ padding: "6px 10px" }}>
                          Assign
                        </button>
                      )}

                      {st === "ASSIGNED" && (
                        <button onClick={() => startTrip(t.id)} style={{ padding: "6px 10px" }}>
                          Start
                        </button>
                      )}

                      {st === "IN_PROGRESS" && (
                        <button onClick={() => finishTrip(t.id)} style={{ padding: "6px 10px" }}>
                          Finish
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!loading && trips.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 14, opacity: 0.7 }}>
                  No trips
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AssignTripModal
        open={assignOpen}
        tripId={assignTripId}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => {
          showToast("success", "تم تعيين الرحلة");
          loadTrips();
        }}
      />

      <Toast open={toastOpen} message={toastMsg} type={toastType} onClose={() => setToastOpen(false)} />
    </div>
  );
}
