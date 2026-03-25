"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [error, setError] = useState<string | null>(null);

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
      const [revenueRes, historyRes] = await Promise.all([
        tripRevenuesService.getByTrip(tripId),
        tripRevenuesService.getHistory(tripId),
      ]);

      const revenue = revenueRes?.data || null;
      const historyItems = historyRes?.data || [];

      setRevenueRecord(revenue);
      setHistory(
        Array.isArray(historyItems) && historyItems.length
          ? historyItems
          : revenue
          ? [revenue]
          : []
      );

      setRevenueAmount(
        revenue?.amount != null ? String(num(revenue.amount)) : ""
      );
      setRevenueCurrency(String(revenue?.currency || "EGP"));
      setRevenueSource((revenue?.source as TripRevenueSource) || "MANUAL");
      setRevenueNotes(String(revenue?.notes || ""));
    } catch (e: any) {
      setError(e?.message || "فشل تحميل بيانات الإيراد");
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

  const saveBlockedReason = useMemo(() => {
    if (revenueSource === "CONTRACT") {
      const hasContractLink =
        Boolean((revenueRecord as any)?.contract_id) ||
        Boolean((revenueRecord as any)?.pricing_rule_id);
      if (!hasContractLink) {
        return "لا يمكن حفظ إيراد CONTRACT من هذه الشاشة بدون وجود contract_id أو pricing_rule_id محفوظ مسبقًا.";
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

      await load();
    } catch (e: any) {
      setError(e?.message || "فشل حفظ إيراد الرحلة");
    } finally {
      setSavingRevenue(false);
    }
  }

  async function approveRevenue() {
    if (!canApproveRevenue || !tripId) return;

    setApproving(true);
    setError(null);
    try {
      await tripRevenuesService.approve(tripId, {});
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
                      onChange={(e) =>
                        setRevenueSource(e.target.value as TripRevenueSource)
                      }
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
                    disabled={savingRevenue}
                    onClick={saveRevenue}
                    className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-sm disabled:opacity-50 text-emerald-800"
                  >
                    {savingRevenue ? "جارٍ الحفظ..." : "حفظ الإيراد"}
                  </button>

                  <button
                    disabled={approving || !!revenueRecord?.is_approved}
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
                    disabled={savingRevenue || approving}
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