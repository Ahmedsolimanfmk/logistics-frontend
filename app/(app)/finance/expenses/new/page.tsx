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
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

function isUuid(v: any) {
  if (typeof v !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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
  useEffect(() => {
    setPaymentSource(allowedSources[0] || "");
  }, [allowedSources]);

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

  // Confirm before submit
  const [confirmOpen, setConfirmOpen] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.70)] px-3 py-2 outline-none text-sm " +
    "focus:ring-4 focus:ring-[rgba(var(--trex-accent),0.12)] focus:border-[rgba(var(--trex-accent),0.35)]";
  const labelCls = "text-xs text-slate-500 mb-1";

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
            (a: any) =>
              String(a.status).toUpperCase() === "OPEN" && a.field_supervisor_id === user?.id
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
      if (!form.vendor_name || String(form.vendor_name).trim().length < 2)
        return t("financeNewExpense.errors.vendorRequired");
      if (!form.invoice_date) return t("financeNewExpense.errors.invoiceDateRequired");
    }

    if (form.trip_id && !isUuid(form.trip_id)) return t("financeNewExpense.errors.tripInvalid");
    if (form.maintenance_work_order_id && !isUuid(form.maintenance_work_order_id))
      return t("financeNewExpense.errors.woInvalid");

    return null;
  }

  async function submit() {
    if (loading) return;

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
        invoice_no:
          paymentSource === "COMPANY" && form.invoice_no?.trim() ? form.invoice_no.trim() : undefined,
        invoice_date: paymentSource === "COMPANY" ? form.invoice_date : undefined,

        maintenance_work_order_id: form.maintenance_work_order_id || undefined,
        trip_id: form.trip_id || undefined,
      });

      showToast("success", t("financeNewExpense.toast.created"));
      router.push("/finance/expenses");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        t("financeNewExpense.toast.createFailed");
      setError(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  function openConfirmIfValid() {
    const e = validate();
    if (e) {
      setError(e);
      showToast("error", e);
      return;
    }
    setConfirmOpen(true);
  }

  if (bootLoading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="max-w-3xl mx-auto p-4 md:p-6">
          <div className="text-sm text-slate-500">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  if (!paymentSource) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-3">
          <PageHeader
            title={t("financeNewExpense.title")}
            subtitle={
              <span className="text-slate-500">
                {t("common.role")}:{" "}
                <span className="font-semibold text-[rgb(var(--trex-fg))]">{role || "—"}</span>
              </span>
            }
            actions={
              <Link href="/finance/expenses">
                <Button variant="secondary">{t("common.list") || "القائمة"}</Button>
              </Link>
            }
          />

          <Card className="border-amber-500/20">
            <div className="text-sm text-amber-700">{t("financeNewExpense.notAllowedBanner")}</div>
          </Card>
        </div>
      </div>
    );
  }

  const showNoOpenAdvanceHint = paymentSource === "ADVANCE" && isSupervisor && advances.length === 0;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title={t("financeNewExpense.title")}
          subtitle={
            <span className="text-slate-500">
              {t("common.role")}:{" "}
              <span className="font-semibold text-[rgb(var(--trex-fg))]">{role || "—"}</span>
            </span>
          }
          actions={
            <Link href="/finance/expenses">
              <Button variant="secondary">{t("common.list") || "القائمة"}</Button>
            </Link>
          }
        />

        {error ? (
          <Card className="border-red-500/20">
            <div className="text-sm text-red-600">⚠️ {error}</div>
          </Card>
        ) : null}

        {showNoOpenAdvanceHint ? (
          <Card className="border-amber-500/20">
            <div className="text-sm text-amber-700">
              {t("financeNewExpense.errors.selectOpenAdvance") || "لا يوجد عهدة مفتوحة لاختيارها."}
            </div>
          </Card>
        ) : null}

        <Card title={t("financeNewExpense.title")}>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className={labelCls}>{t("financeNewExpense.fields.paymentSource")}</div>
              <select
                className={inputCls}
                value={paymentSource}
                onChange={(e) => setPaymentSource(e.target.value)}
                disabled={loading}
              >
                {allowedSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {paymentSource === "ADVANCE" ? (
                <div className="text-xs text-slate-500">{t("financeNewExpense.hints.advance")}</div>
              ) : (
                <div className="text-xs text-slate-500">{t("financeNewExpense.hints.company")}</div>
              )}
            </div>

            <div>
              <div className={labelCls}>{t("financeNewExpense.fields.expenseType")}</div>
              <input
                className={inputCls}
                placeholder={t("financeNewExpense.fields.expenseType")}
                value={form.expense_type}
                onChange={(e) => setForm({ ...form, expense_type: e.target.value })}
                disabled={loading}
              />
            </div>

            <div>
              <div className={labelCls}>{t("financeNewExpense.fields.amount")}</div>
              <input
                type="number"
                className={inputCls}
                placeholder={t("financeNewExpense.fields.amount")}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                disabled={loading}
              />
            </div>

            {paymentSource === "ADVANCE" ? (
              <div>
                <div className={labelCls}>{t("financeNewExpense.fields.cashAdvance")}</div>
                <select
                  className={inputCls}
                  value={form.cash_advance_id}
                  onChange={(e) => setForm({ ...form, cash_advance_id: e.target.value })}
                  disabled={loading}
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
                  <div className={labelCls}>{t("financeNewExpense.fields.vendorName")}</div>
                  <input
                    className={inputCls}
                    placeholder={t("financeNewExpense.fields.vendorName")}
                    value={form.vendor_name}
                    onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div>
                  <div className={labelCls}>{t("financeNewExpense.fields.invoiceNo")}</div>
                  <input
                    className={inputCls}
                    placeholder={t("financeNewExpense.fields.invoiceNo")}
                    value={form.invoice_no}
                    onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div>
                  <div className={labelCls}>{t("financeNewExpense.fields.invoiceDate")}</div>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.invoice_date}
                    onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </>
            )}

            <div>
              <div className={labelCls}>{t("financeNewExpense.fields.linkWorkOrder")}</div>
              <select
                className={inputCls}
                value={form.maintenance_work_order_id}
                onChange={(e) => setForm({ ...form, maintenance_work_order_id: e.target.value })}
                disabled={loading}
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
              <div className={labelCls}>{t("financeNewExpense.fields.linkTrip")}</div>
              <select
                className={inputCls}
                value={form.trip_id}
                onChange={(e) => setForm({ ...form, trip_id: e.target.value })}
                disabled={loading}
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
              <div className={labelCls}>{t("financeNewExpense.fields.notes")}</div>
              <textarea
                rows={3}
                className={inputCls}
                placeholder={t("financeNewExpense.fields.notes")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2 justify-start">
            <Button
              variant="secondary"
              onClick={() => router.push("/finance/expenses")}
              disabled={loading}
            >
              {t("common.cancel") || "إلغاء"}
            </Button>

            <Button
              variant="primary"
              onClick={openConfirmIfValid}
              disabled={loading}
              isLoading={loading}
            >
              {loading ? t("common.saving") : t("financeNewExpense.actions.create")}
            </Button>
          </div>
        </Card>

        <ConfirmDialog
          open={confirmOpen}
          title={t("financeNewExpense.actions.create") || "إنشاء مصروف"}
          description={t("financeNewExpense.confirmCreate") || "هل تريد إنشاء المصروف الآن؟"}
          confirmText={t("common.confirm") || "تأكيد"}
          cancelText={t("common.cancel") || "إلغاء"}
          tone="warning"
          isLoading={loading}
          dir="rtl"
          onClose={() => {
            if (loading) return;
            setConfirmOpen(false);
          }}
          onConfirm={async () => {
            // keep dialog open while loading (ConfirmDialog will show spinner)
            await submit();
            // close only if request started/finished without blocking
            // If submit navigates away, no need; otherwise close safely when not loading.
            if (!loading) setConfirmOpen(false);
          }}
        />

        <Toast
          open={toastOpen}
          message={toastMsg}
          type={toastType}
          dir="rtl"
          onClose={() => setToastOpen(false)}
        />
      </div>
    </div>
  );
}