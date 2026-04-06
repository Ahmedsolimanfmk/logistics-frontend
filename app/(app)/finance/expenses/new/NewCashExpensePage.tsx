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

import { cashExpensesService } from "@/src/services/cash-expenses.service";
import type {
  CashExpensePaymentSource,
  CreateCashExpensePayload,
} from "@/src/types/cash-expenses.types";

type AdvanceOption = {
  id: string;
  amount?: number | null;
  status?: string | null;
  field_supervisor_id?: string | null;
};

type WorkOrderOption = {
  id: string;
  code?: string | null;
};

type TripOption = {
  id: string;
  code?: string | null;
};

type VendorOption = {
  id: string;
  name?: string | null;
  code?: string | null;
  status?: string | null;
};

function roleUpper(role: unknown): string {
  return String(role || "").toUpperCase();
}

function isUuid(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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

  const [paymentSource, setPaymentSource] = useState<CashExpensePaymentSource | "">(
    allowedSources[0] || ""
  );

  useEffect(() => {
    setPaymentSource(allowedSources[0] || "");
  }, [allowedSources]);

  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [advances, setAdvances] = useState<AdvanceOption[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);

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
    vendor_id: "",
    vendor_name: "",
    invoice_no: "",
    invoice_date: "",
    maintenance_work_order_id: "",
    trip_id: "",
    vehicle_id: "",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);

  const inputCls =
    "w-full rounded-xl border border-black/10 bg-[rgba(var(--trex-surface),0.70)] px-3 py-2 outline-none text-sm " +
    "focus:ring-4 focus:ring-[rgba(var(--trex-accent),0.12)] focus:border-[rgba(var(--trex-accent),0.35)]";

  const labelCls = "text-xs text-slate-500 mb-1";

  useEffect(() => {
    let mounted = true;

    async function loadBootstrap() {
      setBootLoading(true);
      setError(null);

      try {
        if (isSupervisor) {
          try {
            const advRes = await api.get("/cash/cash-advances", {
              params: { status: "OPEN", page: 1, page_size: 200 },
            });
            const advBody = (advRes as any)?.data ?? advRes;
            const advItems = Array.isArray(advBody) ? advBody : advBody?.items || [];
            const mine = (Array.isArray(advItems) ? advItems : []).filter(
              (a: AdvanceOption) =>
                String(a.status || "").toUpperCase() === "OPEN" && a.field_supervisor_id === user?.id
            );

            if (mounted) setAdvances(mine);
          } catch {
            if (mounted) setAdvances([]);
          }
        } else if (mounted) {
          setAdvances([]);
        }

        try {
          const wosRes = await api.get("/maintenance/work-orders");
          const wosBody = (wosRes as any)?.data ?? wosRes;
          const wosItems = Array.isArray(wosBody) ? wosBody : wosBody?.items || [];
          if (mounted) setWorkOrders(Array.isArray(wosItems) ? wosItems : []);
        } catch {
          if (mounted) setWorkOrders([]);
        }

        try {
          const tripsRes = await api.get("/trips");
          const tripsBody = (tripsRes as any)?.data ?? tripsRes;
          const tripsItems = Array.isArray(tripsBody) ? tripsBody : tripsBody?.items || [];
          if (mounted) setTrips(Array.isArray(tripsItems) ? tripsItems : []);
        } catch {
          if (mounted) setTrips([]);
        }

        if (isPrivileged) {
          try {
            const vendorsRes = await api.get("/vendors", {
              params: { page: 1, page_size: 200 },
            });
            const vendorsBody = (vendorsRes as any)?.data ?? vendorsRes;
            const vendorItems = Array.isArray(vendorsBody)
              ? vendorsBody
              : vendorsBody?.items || [];
            if (mounted) setVendors(Array.isArray(vendorItems) ? vendorItems : []);
          } catch {
            if (mounted) setVendors([]);
          }
        } else if (mounted) {
          setVendors([]);
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.response?.data?.message || e?.message || t("financeNewExpense.errors.loadFailed"));
        }
      } finally {
        if (mounted) setBootLoading(false);
      }
    }

    loadBootstrap();

    return () => {
      mounted = false;
    };
  }, [isPrivileged, isSupervisor, t, user?.id]);

  function validate(): string | null {
    if (!paymentSource) return t("financeNewExpense.errors.notAllowed");
    if (!form.expense_type.trim()) return t("financeNewExpense.errors.expenseTypeRequired");
    if (!form.amount || Number(form.amount) <= 0) return t("financeNewExpense.errors.amountInvalid");

    if (paymentSource === "ADVANCE") {
      if (!isSupervisor) return t("financeNewExpense.errors.advanceOnlySupervisor");
      if (!isUuid(form.cash_advance_id)) return t("financeNewExpense.errors.selectOpenAdvance");
    }

    if (paymentSource === "COMPANY") {
      if (!isPrivileged) return t("financeNewExpense.errors.companyOnlyPrivileged");

      const hasVendorId = isUuid(form.vendor_id);
      const hasVendorName = form.vendor_name.trim().length >= 2;

      if (!hasVendorId && !hasVendorName) {
        return t("financeNewExpense.errors.vendorRequired");
      }

      if (!form.invoice_date) {
        return t("financeNewExpense.errors.invoiceDateRequired");
      }
    }

    if (form.trip_id && !isUuid(form.trip_id)) return t("financeNewExpense.errors.tripInvalid");
    if (form.maintenance_work_order_id && !isUuid(form.maintenance_work_order_id)) {
      return t("financeNewExpense.errors.woInvalid");
    }
    if (form.vehicle_id && !isUuid(form.vehicle_id)) {
      return t("financeNewExpense.errors.vehicleInvalid") || "Vehicle is invalid";
    }

    return null;
  }

  async function submit() {
    if (loading || !paymentSource) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      showToast("error", validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: CreateCashExpensePayload =
        paymentSource === "ADVANCE"
          ? {
              payment_source: "ADVANCE",
              expense_type: form.expense_type.trim(),
              amount: Number(form.amount),
              notes: form.notes.trim() || undefined,
              cash_advance_id: form.cash_advance_id,
              maintenance_work_order_id: form.maintenance_work_order_id || undefined,
              trip_id: form.trip_id || undefined,
              vehicle_id: form.vehicle_id || undefined,
            }
          : {
              payment_source: "COMPANY",
              expense_type: form.expense_type.trim(),
              amount: Number(form.amount),
              notes: form.notes.trim() || undefined,
              vendor_id: form.vendor_id || undefined,
              vendor_name: form.vendor_name.trim() || undefined,
              invoice_no: form.invoice_no.trim() || undefined,
              invoice_date: form.invoice_date || undefined,
              maintenance_work_order_id: form.maintenance_work_order_id || undefined,
              trip_id: form.trip_id || undefined,
              vehicle_id: form.vehicle_id || undefined,
            };

      await cashExpensesService.create(payload);

      showToast("success", t("financeNewExpense.toast.created"));
      router.push("/finance/expenses");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || t("financeNewExpense.toast.createFailed");
      setError(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  function openConfirmIfValid() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      showToast("error", validationError);
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

  const showNoOpenAdvanceHint =
    paymentSource === "ADVANCE" && isSupervisor && advances.length === 0;

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
                onChange={(e) => setPaymentSource(e.target.value as CashExpensePaymentSource)}
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
                onChange={(e) => setForm((prev) => ({ ...prev, expense_type: e.target.value }))}
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
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                disabled={loading}
              />
            </div>

            {paymentSource === "ADVANCE" ? (
              <div>
                <div className={labelCls}>{t("financeNewExpense.fields.cashAdvance")}</div>
                <select
                  className={inputCls}
                  value={form.cash_advance_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cash_advance_id: e.target.value }))
                  }
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
                  <div className={labelCls}>
                    {t("financeNewExpense.fields.vendor") || t("financeNewExpense.fields.vendorName")}
                  </div>
                  <select
                    className={inputCls}
                    value={form.vendor_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, vendor_id: e.target.value }))}
                    disabled={loading}
                  >
                    <option value="">{t("financeNewExpense.fields.vendor") || "اختر المورد"}</option>
                    {vendors.map((vendor) => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name || vendor.code || vendor.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={labelCls}>
                    {t("financeNewExpense.fields.vendorName") || "اسم المورد"}
                  </div>
                  <input
                    className={inputCls}
                    placeholder={t("financeNewExpense.fields.vendorName") || "اسم المورد"}
                    value={form.vendor_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, vendor_name: e.target.value }))}
                    disabled={loading}
                  />
                </div>

                <div>
                  <div className={labelCls}>{t("financeNewExpense.fields.invoiceNo")}</div>
                  <input
                    className={inputCls}
                    placeholder={t("financeNewExpense.fields.invoiceNo")}
                    value={form.invoice_no}
                    onChange={(e) => setForm((prev) => ({ ...prev, invoice_no: e.target.value }))}
                    disabled={loading}
                  />
                </div>

                <div>
                  <div className={labelCls}>{t("financeNewExpense.fields.invoiceDate")}</div>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.invoice_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, invoice_date: e.target.value }))}
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
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, maintenance_work_order_id: e.target.value }))
                }
                disabled={loading}
              >
                <option value="">{t("financeNewExpense.fields.linkWorkOrder")}</option>
                {workOrders.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code || `${String(w.id).slice(0, 8)}…`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className={labelCls}>{t("financeNewExpense.fields.linkTrip")}</div>
              <select
                className={inputCls}
                value={form.trip_id}
                onChange={(e) => setForm((prev) => ({ ...prev, trip_id: e.target.value }))}
                disabled={loading}
              >
                <option value="">{t("financeNewExpense.fields.linkTrip")}</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.code || `${String(trip.id).slice(0, 8)}…`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className={labelCls}>
                {t("financeNewExpense.fields.linkVehicle") || "المركبة"}
              </div>
              <input
                className={inputCls}
                placeholder={t("financeNewExpense.fields.linkVehicle") || "معرف المركبة"}
                value={form.vehicle_id}
                onChange={(e) => setForm((prev) => ({ ...prev, vehicle_id: e.target.value }))}
                disabled={loading}
              />
            </div>

            <div>
              <div className={labelCls}>{t("financeNewExpense.fields.notes")}</div>
              <textarea
                rows={3}
                className={inputCls}
                placeholder={t("financeNewExpense.fields.notes")}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
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
            await submit();
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