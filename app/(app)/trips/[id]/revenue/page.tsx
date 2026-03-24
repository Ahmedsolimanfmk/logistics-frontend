"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import {
  tripRevenuesService,
  type TripRevenue,
  type TripRevenueSource,
} from "@/src/services/trip-revenues.service";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

function num(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n: any, currency = "EGP") {
  const v = num(n);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(v);
  } catch {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(v);
  }
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300";

const textareaCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 min-h-[100px]";

export default function TripRevenuePage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const tripId = String((params as any)?.id || "");

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const canManageRevenue = role === "ADMIN" || role === "CONTRACT_MANAGER";

  const [loading, setLoading] = useState(true);
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [revenueRecord, setRevenueRecord] = useState<TripRevenue | null>(null);

  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenueCurrency, setRevenueCurrency] = useState("EGP");
  const [revenueSource, setRevenueSource] = useState<TripRevenueSource>("MANUAL");
  const [revenueNotes, setRevenueNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    if (!canManageRevenue) {
      router.replace("/trips");
    }
  }, [user, canManageRevenue, router]);

  async function load() {
    if (!tripId || !canManageRevenue) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const revenueRes = await tripRevenuesService.getByTrip(tripId);
      const revenue = revenueRes?.data || null;

      setRevenueRecord(revenue);
      setRevenueAmount(revenue?.amount != null ? String(num(revenue.amount)) : "");
      setRevenueCurrency(String(revenue?.currency || "EGP"));
      setRevenueSource((revenue?.source as TripRevenueSource) || "MANUAL");
      setRevenueNotes(String(revenue?.notes || ""));
    } catch (e: any) {
      setError(e?.message || "فشل تحميل بيانات الإيراد");
      setRevenueRecord(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tripId || !canManageRevenue) return;
    load();
  }, [tripId, canManageRevenue]);

  async function saveRevenue() {
    if (!canManageRevenue) return;

    const amount = Number(revenueAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("قيمة الإيراد غير صحيحة");
      return;
    }

    setSavingRevenue(true);
    setError(null);

    try {
      await tripRevenuesService.save(tripId, {
        amount,
        currency: revenueCurrency || "EGP",
        source: revenueSource,
        notes: revenueNotes.trim() || null,
      });

      await load();
    } catch (e: any) {
      setError(e?.message || "فشل حفظ إيراد الرحلة");
    } finally {
      setSavingRevenue(false);
    }
  }

  const currency = revenueRecord?.currency || revenueCurrency || "EGP";

  if (user && !canManageRevenue) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold">إيراد الرحلة</h1>
            <div className="text-xs text-slate-600">
              رقم الرحلة: <span className="text-slate-900 font-semibold">{tripId}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {loading ? (
            <div className="text-sm text-slate-600">{t("common.loading")}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">الإيراد الحالي</div>
                  <div className="text-lg font-semibold">
                    {revenueRecord?.amount != null ? fmtMoney(revenueRecord.amount, currency) : "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">المصدر</div>
                  <div className="text-lg font-semibold">
                    {String(revenueRecord?.source || revenueSource || "MANUAL")}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">العملة</div>
                  <div className="text-lg font-semibold">{currency}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                <div className="text-sm font-semibold text-slate-900">بيانات الإيراد</div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="space-y-1">
                    <div className="text-xs text-slate-600">قيمة الإيراد</div>
                    <input
                      type="number"
                      value={revenueAmount}
                      onChange={(e) => setRevenueAmount(e.target.value)}
                      className={inputCls}
                      disabled={savingRevenue}
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs text-slate-600">العملة</div>
                    <select
                      value={revenueCurrency}
                      onChange={(e) => setRevenueCurrency(e.target.value)}
                      className={inputCls}
                      disabled={savingRevenue}
                    >
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="SAR">SAR</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs text-slate-600">المصدر</div>
                    <select
                      value={revenueSource}
                      onChange={(e) => setRevenueSource(e.target.value as TripRevenueSource)}
                      className={inputCls}
                      disabled={savingRevenue}
                    >
                      <option value="MANUAL">MANUAL</option>
                      <option value="CONTRACT">CONTRACT</option>
                      <option value="INVOICE">INVOICE</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-1 block">
                  <div className="text-xs text-slate-600">ملاحظات</div>
                  <textarea
                    value={revenueNotes}
                    onChange={(e) => setRevenueNotes(e.target.value)}
                    className={textareaCls}
                    disabled={savingRevenue}
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                    <div>
                      المصدر الحالي: <span className="font-semibold">{revenueRecord?.source || "—"}</span>
                    </div>
                    <div>
                      المدخل:{" "}
                      <span className="font-semibold">
                        {revenueRecord?.users_entered?.full_name || "—"}
                      </span>
                    </div>
                    <div>
                      تاريخ الإدخال:{" "}
                      <span className="font-semibold">{fmtDate(revenueRecord?.entered_at)}</span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                    <div>
                      قيمة الإيراد الحالية:{" "}
                      <span className="font-semibold">
                        {revenueRecord?.amount != null ? fmtMoney(revenueRecord.amount, currency) : "—"}
                      </span>
                    </div>
                    <div>
                      العملة: <span className="font-semibold">{currency}</span>
                    </div>
                    <div>
                      آخر تحديث: <span className="font-semibold">{fmtDate(revenueRecord?.entered_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={savingRevenue}
                    onClick={saveRevenue}
                    className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm disabled:opacity-50 text-emerald-800"
                  >
                    {savingRevenue ? "جارٍ الحفظ..." : "حفظ الإيراد"}
                  </button>

                  <button
                    disabled={savingRevenue}
                    onClick={load}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
                  >
                    تحديث
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}