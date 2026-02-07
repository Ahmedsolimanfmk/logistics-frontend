"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useParams, useRouter } from "next/navigation";

const fmtDate = (d: any) => {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
};

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

export default function TripDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { token, user } = useAuth();
  const role = roleUpper(user?.role);
  const canSeeFinance = role === "ADMIN" || role === "ACCOUNTANT";

  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [trip, setTrip] = useState<any>(null);

  useEffect(() => {
    if (!token || !id) return;

    let cancel = false;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // ✅ api.ts returns data directly (not AxiosResponse)
        const data = await api.get(`/trips/${id}`);
        if (!cancel) setTrip(data);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Failed";
        if (!cancel) setErr(msg);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [token, id]);

  const lastAssign = useMemo(() => trip?.trip_assignments?.[0], [trip]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">Trip Details</div>
            <div className="text-sm text-slate-400">{id}</div>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ Finance button */}
            {canSeeFinance && id ? (
              <Link
                href={`/finance/trips/${id}/finance`}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm"
              >
                Finance Close
              </Link>
            ) : null}

            <button
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              onClick={() => router.push("/trips")}
            >
              Back
            </button>
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Loading…
          </div>
        ) : !trip ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Trip not found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">Trip</div>
              <div className="mt-2 text-sm text-slate-300 space-y-1">
                <div>
                  Status: <span className="text-white">{trip.status}</span>
                </div>
                <div>
                  Financial:{" "}
                  <span className="text-white">{trip.financial_status}</span>
                </div>
                <div>
                  Scheduled:{" "}
                  <span className="text-white">{fmtDate(trip.scheduled_at)}</span>
                </div>
                <div>
                  Created:{" "}
                  <span className="text-white">{fmtDate(trip.created_at)}</span>
                </div>
                <div>
                  Notes: <span className="text-white">{trip.notes || "—"}</span>
                </div>
              </div>

              {/* Optional hint for finance */}
              {canSeeFinance ? (
                <div className="mt-3 text-xs text-slate-400">
                  Tip: Use <span className="text-slate-200">Finance Close</span> to review and lock trip financially.
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">Assignment (latest)</div>
              {lastAssign ? (
                <div className="mt-2 text-sm text-slate-300 space-y-1">
                  <div>
                    Vehicle:{" "}
                    <span className="text-white">
                      {lastAssign.vehicles?.plate_number ||
                        lastAssign.vehicles?.plate_no ||
                        "—"}
                    </span>
                  </div>
                  <div>
                    Driver:{" "}
                    <span className="text-white">
                      {lastAssign.drivers?.full_name || "—"}
                    </span>
                  </div>
                  <div>
                    Supervisor:{" "}
                    <span className="text-white">
                      {lastAssign.users?.full_name || "—"}
                    </span>
                  </div>
                  <div>
                    Assigned:{" "}
                    <span className="text-white">
                      {fmtDate(lastAssign.assigned_at)}
                    </span>
                  </div>
                  <div>
                    Active:{" "}
                    <span className="text-white">
                      {String(lastAssign.is_active)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-300">No assignment yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
