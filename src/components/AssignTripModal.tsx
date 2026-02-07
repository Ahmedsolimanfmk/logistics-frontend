// src/components/AssignTripModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

type Vehicle = { id: string; plate_no?: string; fleet_no?: string; display_name?: string };
type Driver = { id: string; full_name?: string; name?: string };
type User = { id: string; full_name?: string; email?: string; role?: string };

export function AssignTripModal({
  open,
  tripId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  tripId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);

  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");

  const canSubmit = useMemo(() => vehicleId && driverId && tripId, [vehicleId, driverId, tripId]);

  useEffect(() => {
    if (!open) return;

    // reset
    setVehicleId("");
    setDriverId("");
    setSupervisorId("");

    (async () => {
      setLoading(true);
      try {
        // endpoints:
        // vehicles: GET /vehicles  (admin/hr) :contentReference[oaicite:2]{index=2}
        // drivers:  GET /drivers   (admin/hr) :contentReference[oaicite:3]{index=3}
        // users:    GET /users     (admin/hr) :contentReference[oaicite:4]{index=4}
        const [v, d, u] = await Promise.all([
          apiGet<any>(`/vehicles`),
          apiGet<any>(`/drivers`),
          apiGet<any>(`/users`),
        ]);

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

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await apiPost(`/trips/${tripId}/assign`, {
        vehicle_id: vehicleId,
        driver_id: driverId,
        field_supervisor_id: supervisorId || null,
      });
      onSuccess();
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
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9998,
      }}
      onClick={onClose}
    >
      <div
        style={{ width: 520, background: "white", borderRadius: 14, padding: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Assign Trip</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <label>
            Vehicle
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={loading}>
              <option value="">اختر عربية</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.fleet_no ? `${v.fleet_no} - ${v.plate_no || ""}` : v.plate_no || v.display_name || v.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Driver
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)} disabled={loading}>
              <option value="">اختر سائق</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name || d.name || d.id}
                </option>
              ))}
            </select>
          </label>

          <label>
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
          <button onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button onClick={submit} disabled={!canSubmit || loading}>
            {loading ? "Saving..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
