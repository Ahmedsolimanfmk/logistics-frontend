"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

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

  useEffect(() => {
    setPaymentSource(allowedSources[0] || "");
  }, [allowedSources]);

  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [advances, setAdvances] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);

  const [form, setForm] = useState({
    amount: "",
    expense_type: "",
    notes: "",
    cash_advance_id: "",
    vendor_name: "",
    invoice_no: "",
    invoice_date: "",
    maintenance_work_order_id: "",
    trip_id: ""
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setBootLoading(true);
      setError(null);

      try {
        if (isSupervisor) {
          const list = (await api.get("/cash/cash-advances")) as any[];
          const openMine = list.filter(
            (a) => String(a.status).toUpperCase() === "OPEN" && a.field_supervisor_id === user?.id
          );
          if (mounted) setAdvances(openMine);
        } else {
          if (mounted) setAdvances([]);
        }

        try {
          const wos = (await api.get("/maintenance/work-orders")) as any[];
          if (mounted) setWorkOrders(Array.isArray(wos) ? wos : []);
        } catch {
          if (mounted) setWorkOrders([]);
        }

        try {
          const ts = (await api.get("/trips")) as any[];
          if (mounted) setTrips(Array.isArray(ts) ? ts : []);
        } catch {
          if (mounted) setTrips([]);
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || t("financeExpenseNew.errors.loadFailed"));
      } finally {
        if (mounted) setBootLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupervisor, user?.id]);

  function validate() {
    if (!paymentSource) return t("financeExpenseNew.validation.noPaymentSource");
    if (!form.expense_type) return t("financeExpenseNew.validation.expenseTypeRequired");
    if (!form.amount || Number(form.amount) <= 0) return t("financeExpenseNew.validation.amountInvalid");

    if (paymentSource === "ADVANCE") {
      if (!isSupervisor) return t("financeExpenseNew.validation.advanceSupervisorOnly");
      if (!isUuid(form.cash_advance_id)) return t("financeExpenseNew.validation.advancePickOpen");
    }

    if (paymentSource === "COMPANY") {
      if (!isPrivileged) return t("financeExpenseNew.validation.companyPrivOnly");
      if (!form.vendor_name || String(form.vendor_name).trim().length < 2) return t("financeExpenseNew.validation.vendorRequired");
      if (!form.invoice_date) return t("financeExpenseNew.validation.invoiceDateRequired");
    }

    if (form.trip_id && !isUuid(form.trip_id)) return t("financeExpenseNew.validation.tripInvalid");
    if (form.maintenance_work_order_id && !isUuid(form.maintenance_work_order_id)) return t("financeExpenseNew.validation.workOrderInvalid");

    return null;
  }

  async function submit() {
    const err = validate();
    if (err) {
      setError(err);
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
        trip_id: form.trip_id || undefined
      });

      router.push("/finance/expenses");
    } catch (e: any) {
      setError(e?.message || t("financeExpenseNew.errors.createFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (bootLoading) {
    return <div className="text-sm text-slate-300">{t("common.loading")}</div>;
  }

  if (!paymentSource) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold">{t("financeExpenseNew.title")}</h1>
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-200">
          {t("financeExpenseNew.errors.notAllowed")}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t("financeExpenseNew.title")}</h1>
          <div className="text-xs text-slate-400">
            {t("common.role")}: <span className="text-slate-200">{role || "—"}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-1">
          <div className="text-xs text-slate-400">{t("financeExpenseNew.fields.paymentSource")}</div>
          <select
            className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
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
            <div className="text-xs text-slate-400">{t("financeExpenseNew.hints.advance")}</div>
          ) : (
            <div className="text-xs text-slate-400">{t("financeExpenseNew.hints.company")}</div>
          )}
        </div>

        <input
          className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
          placeholder={t("financeExpenseNew.fields.expenseType")}
          value={form.expense_type}
          onChange={(e) => setForm({ ...form, expense_type: e.target.value })}
        />

        <input
          type="number"
          className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
          placeholder={t("financeExpenseNew.fields.amount")}
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />

        {paymentSource === "ADVANCE" && (
          <select
            className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
            value={form.cash_advance_id}
            onChange={(e) => setForm({ ...form, cash_advance_id: e.target.value })}
          >
            <option value="">{t("financeExpenseNew.fields.selectCashAdvanceOpen")}</option>
            {advances.map((a) => (
              <option key={a.id} value={a.id}>
                {Number(a.amount || 0)} — {String(a.id).slice(0, 8)}…
              </option>
            ))}
          </select>
        )}

        {paymentSource === "COMPANY" && (
          <>
            <input
              className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
              placeholder={t("financeExpenseNew.fields.vendorName")}
              value={form.vendor_name}
              onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
            />

            <input
              className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
              placeholder={t("financeExpenseNew.fields.invoiceNoOptional")}
              value={form.invoice_no}
              onChange={(e) => setForm({ ...form, invoice_no: e.target.value })}
            />

            <input
              type="date"
              className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
              value={form.invoice_date}
              onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
            />
          </>
        )}

        <select
          className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
          value={form.maintenance_work_order_id}
          onChange={(e) => setForm({ ...form, maintenance_work_order_id: e.target.value })}
        >
          <option value="">{t("financeExpenseNew.fields.linkWorkOrderOptional")}</option>
          {workOrders.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code || String(w.id).slice(0, 8) + "…"}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
          value={form.trip_id}
          onChange={(e) => setForm({ ...form, trip_id: e.target.value })}
        >
          <option value="">{t("financeExpenseNew.fields.linkTripOptional")}</option>
          {trips.map((ttt) => (
            <option key={ttt.id} value={ttt.id}>
              {ttt.code || String(ttt.id).slice(0, 8) + "…"}
            </option>
          ))}
        </select>

        <textarea
          className="w-full rounded-lg bg-slate-900 border border-white/10 px-3 py-2"
          placeholder={t("financeExpenseNew.fields.notes")}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        <button
          disabled={loading}
          onClick={submit}
          className={cn(
            "px-4 py-2 rounded-lg text-sm",
            loading ? "bg-indigo-600/60" : "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          {loading ? t("common.saving") : t("financeExpenseNew.cta.create")}
        </button>
      </div>
    </div>
  );
}
