"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useParams, useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";

const fmtDate = (d: any) => {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
};

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

// ✅ helper: supports axios (res.data) + custom wrapper (res)
function unwrap(res: any) {
  return res?.data ?? res;
}

export default function TripDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);

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
        const res = await api.get(`/trips/${id}`);
        const data = unwrap(res);
        if (!cancel) setTrip(data);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          t("common.failed");
        if (!cancel) setErr(msg);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [token, id, t]);

  const lastAssign = useMemo(() => trip?.trip_assignments?.[0], [trip]);

  // ✅ Optional: show session loading state like other pages
  if (token === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {t("common.loadingSession")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">{t("tripDetails.title")}</div>
            <div className="text-sm text-slate-400">{id}</div>
          </div>

          <div className="flex items-center gap-2">
            {canSeeFinance && id ? (
              <Link
                href={`/trips/${id}/finance`}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm"
              >
                {t("tripDetails.actions.financeClose")}
              </Link>
            ) : null}

            <button
              className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              onClick={() => router.push("/trips")}
            >
              {t("common.back")}
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
            {t("common.loading")}
          </div>
        ) : !trip ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            {t("tripDetails.notFound")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">{t("tripDetails.sections.trip")}</div>
              <div className="mt-2 text-sm text-slate-300 space-y-1">
                <div>
                  {t("tripDetails.fields.status")}:{" "}
                  <span className="text-white">{trip.status}</span>
                </div>
                <div>
                  {t("tripDetails.fields.financial")}:{" "}
                  <span className="text-white">{trip.financial_status}</span>
                </div>
                <div>
                  {t("tripDetails.fields.scheduled")}:{" "}
                  <span className="text-white">{fmtDate(trip.scheduled_at)}</span>
                </div>
                <div>
                  {t("tripDetails.fields.created")}:{" "}
                  <span className="text-white">{fmtDate(trip.created_at)}</span>
                </div>
                <div>
                  {t("tripDetails.fields.notes")}:{" "}
                  <span className="text-white">{trip.notes || "—"}</span>
                </div>
              </div>

              {canSeeFinance ? (
                <div className="mt-3 text-xs text-slate-400">
                  {t("tripDetails.hints.financeTip")}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold">{t("tripDetails.sections.assignmentLatest")}</div>

              {lastAssign ? (
                <div className="mt-2 text-sm text-slate-300 space-y-1">
                  <div>
                    {t("tripDetails.fields.vehicle")}:{" "}
                    <span className="text-white">
                      {lastAssign.vehicles?.plate_number ||
                        lastAssign.vehicles?.plate_no ||
                        "—"}
                    </span>
                  </div>
                  <div>
                    {t("tripDetails.fields.driver")}:{" "}
                    <span className="text-white">{lastAssign.drivers?.full_name || "—"}</span>
                  </div>
                  <div>
                    {t("tripDetails.fields.supervisor")}:{" "}
                    <span className="text-white">{lastAssign.users?.full_name || "—"}</span>
                  </div>
                  <div>
                    {t("tripDetails.fields.assigned")}:{" "}
                    <span className="text-white">{fmtDate(lastAssign.assigned_at)}</span>
                  </div>
                  <div>
                    {t("tripDetails.fields.active")}:{" "}
                    <span className="text-white">{String(lastAssign.is_active)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-300">
                  {t("tripDetails.empty.noAssignment")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
