"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { tripRevenuesService } from "@/src/services/trip-revenues.service";

import type {
  TripRevenue,
  TripRevenueSource,
} from "@/src/types/trip-revenues.types";
import { tripsService } from "@/src/services/trips.service";

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

function SourceBadge({ source }: { source?: string | null }) {
  const st = String(source || "").toUpperCase();

  const cls =
    st === "CONTRACT"
      ? "bg-blue-50 text-blue-800 border-blue-200"
      : st === "INVOICE"
      ? "bg-purple-50 text-purple-800 border-purple-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>
      {st || "MANUAL"}
    </span>
  );
}

function ApprovalBadge({ approved }: { approved?: boolean | null }) {
  const cls = approved
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-amber-50 text-amber-800 border-amber-200";

  return (
    <span className={cn("px-2 py-0.5 rounded-md text-xs border", cls)}>
      {approved ? "APPROVED" : "PENDING"}
    </span>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300";

const textareaCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 min-h-[100px]";

type TripDetailsLite = {
  id: string;
  contract_id?: string | null;
  cargo_weight?: number | string | null;
  status?: string | null;
  trip_type?: string | null;
  routes?: {
    id?: string | null;
    name?: string | null;
    code?: string | null;
    distance_km?: number | null;
  } | null;
  pickup_site?: {
    id?: string | null;
    name?: string | null;
    zone_id?: string | null;
  } | null;
  dropoff_site?: {
    id?: string | null;
    name?: string | null;
    zone_id?: string | null;
  } | null;
  cargo_types?: {
    id?: string | null;
    name?: string | null;
    code?: string | null;
  } | null;
  trip_assignments?: Array<{
    id?: string;
    is_active?: boolean;
    vehicles?: {
      id?: string | null;
      vehicle_class_id?: string | null;
      display_name?: string | null;
      plate_no?: string | null;
      fleet_no?: string | null;
    } | null;
  }>;
};

type AutoPricingReadiness = {
  ok: boolean;
  reasons: string[];
  hasContract: boolean;
  hasVehicleClass: boolean;
  hasWeight: boolean;
};

function getActiveVehicleClassId(trip: TripDetailsLite | null): string | null {
  if (!trip?.trip_assignments?.length) return null;
  const active =
    trip.trip_assignments.find((x) => x?.is_active !== false) ||
    trip.trip_assignments[0];
  return active?.vehicles?.vehicle_class_id || null;
}

function buildAutoPricingReadiness(trip: TripDetailsLite | null): AutoPricingReadiness {
  const reasons: string[] = [];

  const hasContract = Boolean(trip?.contract_id);
  const hasVehicleClass = Boolean(getActiveVehicleClassId(trip));
  const hasWeight =
    trip?.cargo_weight !== undefined &&
    trip?.cargo_weight !== null &&
    String(trip.cargo_weight).trim() !== "";

  if (!hasContract) {
    reasons.push("لا يمكن حساب السعر تلقائيًا لأن الرحلة غير مرتبطة بعقد.");
  }

  if (!hasVehicleClass) {
    reasons.push("لا يمكن حساب السعر تلقائيًا لأن الرحلة لا تحتوي على سيارة مخصصة بفئة سيارة معروفة.");
  }

  if (!hasWeight) {
    reasons.push("لا يمكن ضمان حساب السعر تلقائيًا لأن وزن الحمولة غير مُسجل.");
  }

  return {
    ok: reasons.length === 0,
    reasons,
    hasContract,
    hasVehicleClass,
    hasWeight,
  };
}

export default function TripRevenuePage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const tripId = String((params as any)?.id || "");

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const canManageRevenue = role === "ADMIN" || role === "CONTRACT_MANAGER";
  const canApproveRevenue = role === "ADMIN" || role === "CONTRACT_MANAGER";

  const [loading, setLoading] = useState(true);
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [approving, setApproving] = useState(false);
  const [autoPricing, setAutoPricing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [trip, setTrip] = useState<TripDetailsLite | null>(null);
  const [revenueRecord, setRevenueRecord] = useState<TripRevenue | null>(null);
  const [history, setHistory] = useState<TripRevenue[]>([]);

  const [revenueAmount, setRevenueAmount] = useState("");
  const [revenueCurrency, setRevenueCurrency] = useState("EGP");
  const [revenueSource, setRevenueSource] =
    useState<TripRevenueSource>("MANUAL");
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
      const [tripRes, revenueRes, historyRes] = await Promise.all([
        tripsService.getById(tripId),
        tripRevenuesService.getByTrip(tripId),
        tripRevenuesService.getHistory(tripId),
      ]);

      const tripData = (tripRes ?? null) as TripDetailsLite | null;
      const revenue = revenueRes?.data || null;
      const historyItems = historyRes?.data || [];

      setTrip(tripData);
      setRevenueRecord(revenue as TripRevenue | null);
      setHistory(
        Array.isArray(historyItems) && historyItems.length
          ? (historyItems as TripRevenue[])
          : revenue
          ? [revenue as TripRevenue]
          : []
      );

      setRevenueAmount(
        revenue && (revenue as TripRevenue).amount != null
          ? String(num((revenue as TripRevenue).amount))
          : ""
      );
      setRevenueCurrency(
        String((revenue as TripRevenue | null)?.currency || "EGP")
      );
      setRevenueSource(
        (((revenue as TripRevenue | null)?.source as TripRevenueSource) ||
          "MANUAL")
      );
      setRevenueNotes(String((revenue as TripRevenue | null)?.notes || ""));
    } catch (e: any) {
      setError(e?.message || "فشل تحميل بيانات الإيراد");
      setTrip(null);
      setRevenueRecord(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!tripId || !canManageRevenue) return;
    load();
  }, [tripId, canManageRevenue]);

  const currency = revenueRecord?.currency || revenueCurrency || "EGP";
  const autoPricingReadiness = useMemo(
    () => buildAutoPricingReadiness(trip),
    [trip]
  );

  const saveBlockedReason = useMemo(() => {
    if (revenueSource === "CONTRACT") {
      const hasContractLink =
        Boolean((revenueRecord as any)?.contract_id) ||
        Boolean((revenueRecord as any)?.pricing_rule_id);
      if (!hasContractLink) {
        return "لا يمكن حفظ إيراد CONTRACT من هذه الشاشة بدون وجود contract_id أو pricing_rule_id محفوظ مسبقًا. استخدم زر احسب السعر من العقد أولًا.";
      }
    }

    if (revenueSource === "INVOICE") {
      const hasInvoiceLink = Boolean((revenueRecord as any)?.invoice_id);
      if (!hasInvoiceLink) {
        return "لا يمكن حفظ إيراد INVOICE من هذه الشاشة بدون وجود invoice_id محفوظ مسبقًا.";
      }
    }

    return null;
  }, [revenueSource, revenueRecord]);

  async function saveRevenue() {
    if (!canManageRevenue) return;

    const amount = Number(revenueAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("قيمة الإيراد غير صحيحة");
      return;
    }

    if (saveBlockedReason) {
      setError(saveBlockedReason);
      return;
    }

    setSavingRevenue(true);
    setError(null);
    setInfo(null);

    try {
      await tripRevenuesService.save(tripId, {
        amount,
        currency: revenueCurrency || "EGP",
        source: revenueSource,
        contract_id: (revenueRecord as any)?.contract_id || null,
        invoice_id: (revenueRecord as any)?.invoice_id || null,
        pricing_rule_id: (revenueRecord as any)?.pricing_rule_id || null,
        notes: revenueNotes.trim() || null,
      });

      setInfo("تم حفظ الإيراد بنجاح");
      await load();
    } catch (e: any) {
      setError(e?.message || "فشل حفظ إيراد الرحلة");
    } finally {
      setSavingRevenue(false);
    }
  }

  async function autoCalculateRevenue() {
    if (!canManageRevenue || !tripId) return;

    if (!autoPricingReadiness.ok) {
      setError(autoPricingReadiness.reasons.join(" "));
      return;
    }

    setAutoPricing(true);
    setError(null);
    setInfo(null);

    try {
      const result = await tripRevenuesService.autoPrice(tripId, {
        auto_approve: false,
        notes: "AUTO_CALCULATED_FROM_REVENUE_PAGE",
      });

      const revenue = result?.data?.revenue || null;
      const amount = revenue?.amount ?? null;
      const ruleId = revenue?.pricing_rule_id ?? null;
      const resolvedCurrency = revenue?.currency || "EGP";

      setInfo(
        amount != null
          ? `تم حساب السعر تلقائيًا${
              ruleId ? ` باستخدام قاعدة التسعير ${ruleId}` : ""
            } بقيمة ${fmtMoney(amount, resolvedCurrency)}`
          : "تم حساب السعر تلقائيًا بنجاح"
      );

      await load();
    } catch (e: any) {
      setError(e?.message || "فشل حساب السعر تلقائيًا");
    } finally {
      setAutoPricing(false);
    }
  }

  async function approveRevenue() {
    if (!canApproveRevenue || !tripId) return;

    setApproving(true);
    setError(null);
    setInfo(null);

    try {
      await tripRevenuesService.approve(tripId, {});
      setInfo("تم اعتماد الإيراد بنجاح");
      await load();
    } catch (e: any) {
      setError(e?.message || "فشل اعتماد الإيراد");
    } finally {
      setApproving(false);
    }
  }

  if (user && !canManageRevenue) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold">إيراد الرحلة</h1>
            <div className="text-xs text-slate-600">
              رقم الرحلة:{" "}
              <span className="text-slate-900 font-semibold">{tripId}</span>
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

            <Link
              href={`/trips/${tripId}/finance`}
              className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm text-emerald-800"
            >
              المالية
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {info && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
            {info}
          </div>
        )}

        {!loading && !autoPricingReadiness.ok ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="font-semibold mb-2">متطلبات التسعير التلقائي غير مكتملة</div>
            <ul className="list-disc pr-5 space-y-1">
              {autoPricingReadiness.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {!loading && trip ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-900 mb-3">
              جاهزية التسعير التلقائي
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-600 mb-1">العقد</div>
                <div className={autoPricingReadiness.hasContract ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                  {autoPricingReadiness.hasContract ? "موجود" : "غير موجود"}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-600 mb-1">فئة السيارة</div>
                <div className={autoPricingReadiness.hasVehicleClass ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                  {autoPricingReadiness.hasVehicleClass ? "موجودة" : "غير موجودة"}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-600 mb-1">وزن الحمولة</div>
                <div className={autoPricingReadiness.hasWeight ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                  {autoPricingReadiness.hasWeight ? `موجود (${trip.cargo_weight})` : "غير موجود"}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {loading ? (
            <div className="text-sm text-slate-600">{t("common.loading")}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">الإيراد الحالي</div>
                  <div className="text-lg font-semibold">
                    {revenueRecord?.amount != null
                      ? fmtMoney(revenueRecord.amount, currency)
                      : "—"}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">المصدر</div>
                  <div className="mt-1">
                    <SourceBadge
                      source={String(
                        revenueRecord?.source || revenueSource || "MANUAL"
                      )}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">الاعتماد</div>
                  <div className="mt-1">
                    <ApprovalBadge approved={revenueRecord?.is_approved} />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs text-slate-600">العملة</div>
                  <div className="text-lg font-semibold">{currency}</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
                <div className="text-sm font-semibold text-slate-900">
                  بيانات الإيراد الحالية
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="space-y-1">
                    <div className="text-xs text-slate-600">قيمة الإيراد</div>
                    <input
                      type="number"
                      value={revenueAmount}
                      onChange={(e) => setRevenueAmount(e.target.value)}
                      className={inputCls}
                      disabled={savingRevenue || autoPricing}
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs text-slate-600">العملة</div>
                    <select
                      value={revenueCurrency}
                      onChange={(e) => setRevenueCurrency(e.target.value)}
                      className={inputCls}
                      disabled={savingRevenue || autoPricing}
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
                      onChange={(e) =>
                        setRevenueSource(e.target.value as TripRevenueSource)
                      }
                      className={inputCls}
                      disabled={savingRevenue || autoPricing}
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
                    disabled={savingRevenue || autoPricing}
                  />
                </label>

                {saveBlockedReason ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {saveBlockedReason}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                    <div>
                      المصدر الحالي:{" "}
                      <span className="font-semibold">
                        {revenueRecord?.source || "—"}
                      </span>
                    </div>
                    <div>
                      المدخل:{" "}
                      <span className="font-semibold">
                        {revenueRecord?.users_entered?.full_name || "—"}
                      </span>
                    </div>
                    <div>
                      تاريخ الإدخال:{" "}
                      <span className="font-semibold">
                        {fmtDate(revenueRecord?.entered_at)}
                      </span>
                    </div>
                    <div>
                      المعتمد بواسطة:{" "}
                      <span className="font-semibold">
                        {revenueRecord?.users_approved?.full_name || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-sm">
                    <div>
                      العقد:{" "}
                      <span className="font-semibold">
                        {(revenueRecord as any)?.client_contracts?.contract_no ||
                          (revenueRecord as any)?.contract_id ||
                          trip?.contract_id ||
                          "—"}
                      </span>
                    </div>
                    <div>
                      الفاتورة:{" "}
                      <span className="font-semibold">
                        {(revenueRecord as any)?.ar_invoices?.invoice_no ||
                          (revenueRecord as any)?.invoice_id ||
                          "—"}
                      </span>
                    </div>
                    <div>
                      قاعدة التسعير:{" "}
                      <span className="font-semibold">
                        {(revenueRecord as any)?.pricing_rule_id || "—"}
                      </span>
                    </div>
                    <div>
                      رقم النسخة:{" "}
                      <span className="font-semibold">
                        {(revenueRecord as any)?.version_no ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={savingRevenue || autoPricing}
                    onClick={saveRevenue}
                    className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm disabled:opacity-50 text-emerald-800"
                  >
                    {savingRevenue ? "جارٍ الحفظ..." : "حفظ الإيراد"}
                  </button>

                  <button
                    disabled={!autoPricingReadiness.ok || autoPricing || savingRevenue || approving}
                    onClick={autoCalculateRevenue}
                    className="px-3 py-2 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-sm disabled:opacity-50 text-purple-800"
                    title={
                      autoPricingReadiness.ok
                        ? "احسب السعر من العقد"
                        : autoPricingReadiness.reasons.join(" ")
                    }
                  >
                    {autoPricing ? "جارٍ الحساب..." : "احسب السعر من العقد"}
                  </button>

                  <button
                    disabled={approving || !!revenueRecord?.is_approved || autoPricing}
                    onClick={approveRevenue}
                    className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-sm disabled:opacity-50 text-blue-800"
                  >
                    {approving
                      ? "جارٍ الاعتماد..."
                      : revenueRecord?.is_approved
                      ? "تم الاعتماد"
                      : "اعتماد الإيراد"}
                  </button>

                  <button
                    disabled={savingRevenue || approving || autoPricing}
                    onClick={load}
                    className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-50"
                  >
                    تحديث
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900 mb-3">
                  سجل نسخ الإيراد
                </div>

                {!history.length ? (
                  <div className="text-sm text-slate-600">
                    لا يوجد سجل إيرادات حتى الآن.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-semibold text-slate-900">
                              {fmtMoney(row.amount, row.currency || "EGP")}
                            </div>
                            <SourceBadge source={row.source} />
                            <ApprovalBadge approved={row.is_approved} />
                            <span className="px-2 py-0.5 rounded-md text-xs border border-slate-200 bg-white text-slate-700">
                              v{row.version_no ?? "—"}
                            </span>
                            {row.is_current ? (
                              <span className="px-2 py-0.5 rounded-md text-xs border border-emerald-200 bg-emerald-50 text-emerald-800">
                                CURRENT
                              </span>
                            ) : null}
                          </div>

                          <div className="text-xs text-slate-500">
                            {fmtDate(row.entered_at)}
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-slate-600">
                          <div>
                            المدخل:{" "}
                            <span className="font-semibold text-slate-900">
                              {row?.users_entered?.full_name || "—"}
                            </span>
                          </div>
                          <div>
                            المعتمد:{" "}
                            <span className="font-semibold text-slate-900">
                              {row?.users_approved?.full_name || "—"}
                            </span>
                          </div>
                          <div>
                            العملة:{" "}
                            <span className="font-semibold text-slate-900">
                              {row?.currency || "EGP"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                          <div>
                            العقد:{" "}
                            <span className="font-semibold text-slate-900">
                              {(row as any)?.client_contracts?.contract_no ||
                                (row as any)?.contract_id ||
                                "—"}
                            </span>
                          </div>
                          <div>
                            قاعدة التسعير:{" "}
                            <span className="font-semibold text-slate-900">
                              {(row as any)?.pricing_rule_id || "—"}
                            </span>
                          </div>
                        </div>

                        {row.notes ? (
                          <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                            {row.notes}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}