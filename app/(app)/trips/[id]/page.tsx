"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { tripsService } from "@/src/services/trips.service";
import type { Trip } from "@/src/types/trips.types";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function num(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n: any, currency = "EGP") {
  const v = num(n);
  try {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return new Intl.NumberFormat("ar-EG", {
      maximumFractionDigits: 2,
    }).format(v);
  }
}

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

function StatusBadge({ value }: { value?: string | null }) {
  const st = String(value || "").toUpperCase();

  const cls =
    st === "DRAFT"
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : st === "ASSIGNED"
      ? "bg-blue-50 text-blue-800 border-blue-200"
      : st === "IN_PROGRESS"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : st === "COMPLETED"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : st === "CANCELLED"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-white text-slate-700 border-slate-200";

  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>
      {st || "—"}
    </span>
  );
}

function FinancialStatusBadge({ value }: { value?: string | null }) {
  const st = String(value || "").toUpperCase();

  const cls =
    st === "OPEN"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : st === "UNDER_REVIEW"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : st === "CLOSED"
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : "bg-white text-slate-700 border-slate-200";

  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>
      {st || "—"}
    </span>
  );
}

function KeyValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-sm text-slate-900 font-medium break-words">
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function TripDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const tripId = String((params as any)?.id || "");

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const canSeeFinance = useMemo(
    () => role === "ADMIN" || role === "ACCOUNTANT",
    [role]
  );
  const canManageRevenue = useMemo(
    () => role === "ADMIN" || role === "CONTRACT_MANAGER",
    [role]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);

  async function load() {
    if (!tripId || !token) return;

    setLoading(true);
    setError(null);

    try {
      const data = await tripsService.getById(tripId);
      setTrip(data);
    } catch (e: any) {
      setError(e?.message || "فشل تحميل بيانات الرحلة");
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token === null) return;
    if (!token) {
      router.push("/login");
      return;
    }
    load();
  }, [token, tripId]);

  const activeAssignment = useMemo(() => {
    const rows = trip?.trip_assignments || [];
    return rows.find((x) => x?.is_active) || rows[0] || null;
  }, [trip]);

  const siteName =
    trip?.site?.name ||
    trip?.sites?.name ||
    trip?.pickup_site?.name ||
    trip?.dropoff_site?.name ||
    "—";

  const routeName =
    trip?.routes?.name ||
    [
      trip?.routes?.origin_label,
      trip?.routes?.destination_label,
    ]
      .filter(Boolean)
      .join(" → ") ||
    "—";

  const contractLabel =
    trip?.client_contracts?.contract_no ||
    trip?.contract?.contract_no ||
    trip?.contract_id ||
    "—";

  const currency = trip?.currency || trip?.revenue_currency || "EGP";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">
                تفاصيل الرحلة
              </h1>
              <StatusBadge value={trip?.status} />
              <FinancialStatusBadge value={trip?.financial_status} />
            </div>

            <div className="text-xs text-slate-600">
              رقم الرحلة:{" "}
              <span className="font-semibold text-slate-900">
                {trip?.trip_code || tripId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => router.back()}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
            >
              {t("common.back")}
            </button>

            <Link
              href="/trips"
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm"
            >
              الرحلات
            </Link>

            {canSeeFinance ? (
              <Link
                href={`/trips/${tripId}/finance`}
                className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm text-emerald-800"
              >
                المالية
              </Link>
            ) : null}

            {canManageRevenue ? (
              <Link
                href={`/trips/${tripId}/revenue`}
                className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-sm text-blue-800"
              >
                الإيراد
              </Link>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            {t("common.loading")}
          </div>
        ) : trip ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <KeyValue label="العميل" value={trip?.clients?.name || "—"} />
              <KeyValue label="العقد" value={contractLabel} />
              <KeyValue label="الموقع" value={siteName} />
              <KeyValue label="المسار" value={routeName} />

              <KeyValue label="نوع الرحلة" value={trip?.trip_type || "—"} />
              <KeyValue
                label="نوع الحمولة"
                value={trip?.cargo_types?.name || "—"}
              />
              <KeyValue
                label="وزن الحمولة"
                value={
                  trip?.cargo_weight != null ? String(trip.cargo_weight) : "—"
                }
              />
              <KeyValue
                label="الموعد المجدول"
                value={fmtDate(trip?.scheduled_at)}
              />

              <KeyValue
                label="تاريخ البدء"
                value={fmtDate(trip?.actual_departure_at)}
              />
              <KeyValue
                label="تاريخ الوصول"
                value={fmtDate(trip?.actual_arrival_at)}
              />
              <KeyValue
                label="الإيراد المتفق عليه"
                value={fmtMoney(trip?.agreed_revenue ?? 0, currency)}
              />
              <KeyValue
                label="طريقة إدخال الإيراد"
                value={trip?.revenue_entry_mode || "—"}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="text-sm font-bold text-slate-900">
                  بيانات التشغيل
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <KeyValue label="الأصل" value={trip?.origin || "—"} />
                  <KeyValue label="الوجهة" value={trip?.destination || "—"} />
                  <KeyValue
                    label="Pickup Site"
                    value={trip?.pickup_site?.name || "—"}
                  />
                  <KeyValue
                    label="Dropoff Site"
                    value={trip?.dropoff_site?.name || "—"}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500 mb-1">ملاحظات</div>
                  <div className="text-sm text-slate-900 whitespace-pre-wrap">
                    {trip?.notes || "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="text-sm font-bold text-slate-900">
                  الإسناد الحالي
                </div>

                {activeAssignment ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <KeyValue
                      label="السيارة"
                      value={
                        activeAssignment?.vehicles?.display_name ||
                        activeAssignment?.vehicles?.fleet_no ||
                        activeAssignment?.vehicles?.plate_no ||
                        "—"
                      }
                    />
                    <KeyValue
                      label="السائق"
                      value={
                        activeAssignment?.drivers?.full_name ||
                        activeAssignment?.drivers?.name ||
                        "—"
                      }
                    />
                    <KeyValue
                      label="المشرف"
                      value={
                        activeAssignment?.users_trip_assignments_supervisor
                          ?.full_name || "—"
                      }
                    />
                    <KeyValue
                      label="تاريخ الإسناد"
                      value={fmtDate(activeAssignment?.assigned_at)}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    لا يوجد إسناد متاح لهذه الرحلة.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            لا توجد بيانات.
          </div>
        )}
      </div>
    </div>
  );
}