"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { Toast } from "@/src/components/Toast";
import { useT } from "@/src/i18n/useT";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}
function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}
function isUuid(v: any) {
  return typeof v === "string" && v.length > 30;
}

export default function NewCashExpensePage() {
  const t = useT();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isSupervisor = role === "FIELD_SUPERVISOR";
  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";

  const allowedSources = useMemo(() => {
    if (isSupervisor) return ["ADVANCE"] as const;
    if (isPrivileged) return ["COMPANY"] as const;
    return [] as const;
  }, [isSupervisor, isPrivileged]);

  const [paymentSource, setPaymentSource] = useState<string>(allowedSources[0] || "");
  useEffect(() => setPaymentSource(allowedSources[0] || ""), [allowedSources]);

  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [advances, setAdvances] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  const [form, setForm] = useState({
    amount: "",
    expense_type: "",
    notes: "",
    cash_advance_id: "",
    vendor_name: "",
    invoice_no: "",
    invoice_date: "",
    maintenance_work_order_id: "",
    trip_id: "",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setBootLoading(true);
      setError(null);

      try {
        if (isSupervisor) {
          const res = await api.get("/cash/cash-advances");
          const data = (res as any)?.data ?? res;
          const list = Array.isArray(data) ? data : (data as any)?.items || [];

          const openMine = list.filter(
            (a: any) => String(a.status).toUpperCase() === "OPEN" && a.field_supervisor_id === user?.id
          );

          if (mounted) setAdvances(openMine);
        } else {
          if (mounted) setAdvances([]);
        }

        try {
          const wosRes = await api.get("/maintenance/work-orders");
          const wosData = (wosRes as any)?.data ?? wosRes;
          const wosList = Array.isArray(wosData) ? wosData : (wosData as any)?.items || [];
          if (mounted) setWorkOrders(Array.isArray(wosList) ? wosList : []);
        } catch {
          if (mounted) setWorkOrders([]);
        }

        try {
          const tsRes = await api.get("/trips");
          const tsData = (tsRes as any)?.data ?? tsRes;
          const tsList = Array.isArray(tsData) ? tsData : (tsData as any)?.items || [];
          if (mounted) setTrips(Array.isArray(tsList) ? tsList : []);
        } catch {
          if (mounted) setTrips([]);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || t("financeNewExpense.errors.loadFailed"));
      } finally {
        if (mounted) setBootLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupervisor, user?.id, t]);

  function validate() {
    if (!paymentSource) return t("financeNewExpense.errors.notAllowed");
    if (!form.expense_type) return t("financeNewExpense.errors.expenseTypeRequired");
    if (!form.amount || Number(form.amount) <= 0) return t("financeNewExpense.errors.amountInvalid");

    if (paymentSource === "ADVANCE") {
      if (!isSupervisor) return t("financeNewExpense.errors.advanceOnlySupervisor");
      if (!isUuid(form.cash_advance_id)) return t("financeNewExpense.errors.selectOpenAdvance");
    }

    if (paymentSource === "COMPANY") {
      if (!isPrivileged) return t("financeNewExpense.errors.companyOnlyPrivileged");
      if (!form.vendor_name || String(form.vendor_name).trim().length < 2) return t("financeNewExpense.errors.vendorRequired");
      if (!form.invoice_date) return t("financeNewExpense.errors.invoiceDateRequired");
    }

    if (form.trip_id && !isUuid(form.trip_id)) return t("financeNewExpense.errors.tripInvalid");
    if (form.maintenance_work_order_id && !isUuid(form.maintenance_work_order_id)) return t("financeNewExpense.errors.woInvalid");

    return null;
  }

  async function submit() {
    const e = validate();
    if (e) {
      setError(e);
      showToast("error", e);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post("/cash/cash-expenses", {
        payment_source: paymentSource,
        expense_type: form.expense_type,
        amount: Number(form.amount),
        notes: form.notes?.trim() ? form.notes.trim() : undefined,
        cash_advance_id: paymentSource === "ADVANCE" ? form.cash_advance_id : undefined,
        vendor_name: paymentSource === "COMPANY" ? String(form.vendor_name).trim() : undefined,
        invoice_no: paymentSource === "COMPANY" && form.invoice_no?.trim() ? form.invoice_no.trim() : undefined,
        invoice_date: paymentSource === "COMPANY" ? form.invoice_date : undefined,
        maintenance_work_order_id: form.maintenance_work_order_id || undefined,
        trip_id: form.trip_id || undefined,
      });

      showToast("success", t("financeNewExpense.toast.created"));
      router.push("/finance/expenses");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t("financeNewExpense.toast.createFailed");
      setError(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
        <div className="max-w-3xl mx-auto p-4 md:p-6">
          <div className="text-sm text-gray-600">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  if (!paymentSource) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-3">
          <PageHeader
            title={t("financeNewExpense.title")}
            subtitle={
              <>
                {t("common.role")}: <span className="text-gray-700">{role || "—"}</span>
              </>
            }
            actions={
              <Link href="/finance/expenses">
                <Button variant="secondary">{t("common.list") || "القائمة"}</Button>
              </Link>
            }
          />
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t("financeNewExpense.notAllowedBanner")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title={t("financeNewExpense.title")}
          subtitle={
            <>
              {t("common.role")}: <span className="text-gray-700">{role || "—"}</span>
            </>
          }
          actions={
            <Link href="/finance/expenses">
              <Button variant="secondary">{t("common.list") || "القائمة"}</Button>
            </Link>
          }
        />

        {error ? <div className="text-sm text-red-600">⚠️ {error}</div> : null}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-600">{t("financeNewExpense.fields.paymentSource")}</div>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                value={paymentSource}
                onChange={(e) => setPaymentSource(e.target.value)}
              >
                {allowedSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {paymentSource === "ADVANCE" ? (
                <div className="text-xs text-gray-500">{t("financeNewExpense.hints.advance")}</div>
              ) : (
                <div className="text-xs text-gray-500">{t("financeNewExpense.hints.company")}</div>
              )}
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-1">{t("financeNewExpense.fields.expenseType")}</div>
              <input
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                placeholder={t("financeNewExpense.fields.expenseType")}
                value={form.expense_type}
                onChange={(e) => setForm({ ...form, expense_type: e.target.value })}
              />
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-1">{t("financeNewExpense.fields.amount")}</div>
              <input
                type="number"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                placeholder={t("financeNewExpense.fields.amount")}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            {paymentSource === "ADVANCE" ? (
              <div>
                <div className="text-xs text-gray-600 mb-1">{t("financeNewExpense.fields.cashAdvance")}</div>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  value={form.cash_advance_id}
                  onChange={(e) => setForm({ ...form, cash_advance_id: e.target.value })}
                >
                  <option value="">{t("financeNewExpense.fields.cashAdvance")}</option>
                  {advances.map((a) => (
                    <option key={a.id} value={a.id}>
                      {Number(a.amount || 0)} — {String(a.id).slice(0, 8)}…
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-xs text-gray-600 mb-1">{t("financeNewExpense.fields.vendorName")}</div>
                  <input
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    placeholder={t("financeNewExpense.fields.vendorName")}
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">{t("financeNewExpense.fields.invoiceNo")}</div>
                  <input
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    placeholder={t("financeNewExpense.fields.invoiceNo")}
                    value={form.invoice_no}
                    onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">{t("financeNewExpense.fields.invoiceDate")}</div>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    value={form.invoice_date}
                    onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <div className="text-xs text-gray-600 mb-1">{t("financeNewExpense.fields.linkWorkOrder")}</div>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                value={form.maintenance_work_order_id}
                onChange={(e) => setForm({ ...form, maintenance_work_order_id: e.target.value })}
              >
                <option value="">{t("financeNewExpense.fields.linkWorkOrder")}</option>
                {workOrders.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code || String(w.id).slice(0, 8) + "…"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-1">{t("financeNewExpense.fields.linkTrip")}</div>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                value={form.trip_id}
                onChange={(e) => setForm({ ...form, trip_id: e.target.value })}
              >
                <option value="">{t("financeNewExpense.fields.linkTrip")}</option>
                {trips.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.code || String(x.id).slice(0, 8) + "…"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-1">{t("financeNewExpense.fields.notes")}</div>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                placeholder={t("financeNewExpense.fields.notes")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex gap-2 justify-start">
            <Button variant="secondary" onClick={() => router.push("/finance/expenses")} disabled={loading}>
              {t("common.cancel") || "إلغاء"}
            </Button>

            <Button variant="primary" onClick={submit} disabled={loading} isLoading={loading}>
              {loading ? t("common.saving") : t("financeNewExpense.actions.create")}
            </Button>
          </div>
        </div>

        <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
      </div>
    </div>
  );
}