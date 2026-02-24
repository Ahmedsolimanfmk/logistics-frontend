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
        const data = await api.get(`/trips/${id}`);
        if (!cancel) setTrip(data?.data ?? data);
      } catch (e: any) {
        const msg = e?.response?.data?.message || e?.message || t("tripDetails.errors.loadFailed");
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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">{t("tripDetails.title")}</div>
            <div className="text-sm text-slate-600">{id}</div>
          </div>

          <div className="flex items-center gap-2">
            {canSeeFinance && id ? (
              <Link
                href={`/trips/${id}/finance`}
                className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm text-emerald-800"
              >
                {t("tripDetails.actions.financeClose")}
              </Link>
            ) : null}

            <button
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm"
              onClick={() => router.push("/trips")}
            >
              {t("tripDetails.actions.back")}
            </button>
          </div>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {t("tripDetails.states.loading")}
          </div>
        ) : !trip ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {t("tripDetails.states.notFound")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold">{t("tripDetails.sections.trip")}</div>
              <div className="mt-2 text-sm text-slate-700 space-y-1">
                <div>
                  {t("tripDetails.fields.status")}: <span className="text-slate-900 font-semibold">{trip.status}</span>
                </div>
                <div>
                  {t("tripDetails.fields.financial")}:{" "}
                  <span className="text-slate-900 font-semibold">{trip.financial_status}</span>
                </div>
                <div>
                  {t("tripDetails.fields.scheduled")}:{" "}
                  <span className="text-slate-900 font-semibold">{fmtDate(trip.scheduled_at)}</span>
                </div>
                <div>
                  {t("tripDetails.fields.created")}:{" "}
                  <span className="text-slate-900 font-semibold">{fmtDate(trip.created_at)}</span>
                </div>
                <div>
                  {t("tripDetails.fields.notes")}:{" "}
                  <span className="text-slate-900">{trip.notes || "—"}</span>
                </div>
              </div>

              {canSeeFinance ? <div className="mt-3 text-xs text-slate-500">{t("tripDetails.hints.financeTip")}</div> : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold">{t("tripDetails.sections.assignmentLatest")}</div>

              {lastAssign ? (
                <div className="mt-2 text-sm text-slate-700 space-y-1">
                  <div>
                    {t("tripDetails.fields.vehicle")}:{" "}
                    <span className="text-slate-900 font-semibold">
                      {lastAssign.vehicles?.plate_no || lastAssign.vehicles?.plate_number || "—"}
                    </span>
                  </div>
                  <div>
                    {t("tripDetails.fields.driver")}:{" "}
                    <span className="text-slate-900 font-semibold">{lastAssign.drivers?.full_name || "—"}</span>
                  </div>
                  <div>
                    {t("tripDetails.fields.supervisor")}:{" "}
                    <span className="text-slate-900 font-semibold">{lastAssign.users?.full_name || "—"}</span>
                  </div>
                  <div>
                    {t("tripDetails.fields.assigned")}:{" "}
                    <span className="text-slate-900 font-semibold">{fmtDate(lastAssign.assigned_at)}</span>
                  </div>
                  <div>
                    {t("tripDetails.fields.active")}:{" "}
                    <span className="text-slate-900 font-semibold">{String(lastAssign.is_active)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-sm text-slate-600">—</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}