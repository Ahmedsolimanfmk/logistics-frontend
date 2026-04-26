"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { Toast } from "@/src/components/Toast";
import { useT } from "@/src/i18n/useT";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

import { useVendorOptions } from "@/src/hooks/master-data/useVendorOptions";
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

function roleUpper(role: unknown): string {
  return String(role || "").toUpperCase();
}

function isUuid(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value
  );
}

export default function NewCashExpensePage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripIdFromUrl = searchParams.get("trip_id");
  useEffect(() => {
  if (!tripIdFromUrl) return;

  setForm((prev) => ({
    ...prev,
    trip_id: tripIdFromUrl,
  }));
}, [tripIdFromUrl]);

  const user = useAuth((s) => s.user);
  const role = roleUpper(user?.role);

  const isSupervisor = role === "FIELD_SUPERVISOR";
  const isPrivileged = role === "ADMIN" || role === "ACCOUNTANT";

  const {
    options: vendorOptions,
    loading: vendorsLoading,
    error: vendorsError,
  } = useVendorOptions();

  const allowedSources = useMemo(() => {
    if (isSupervisor) return ["ADVANCE"] as const;
    if (isPrivileged) return ["COMPANY"] as const;
    return [] as const;
  }, [isSupervisor, isPrivileged]);

  const [paymentSource, setPaymentSource] = useState<
    CashExpensePaymentSource | ""
  >(allowedSources[0] || "");

  useEffect(() => {
    setPaymentSource(allowedSources[0] || "");
  }, [allowedSources]);

  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [advances, setAdvances] = useState<AdvanceOption[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderOption[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [confirmOpen, setConfirmOpen] = useState(false);

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

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  useEffect(() => {
    if (!vendorsError) return;
    showToast("error", vendorsError);
  }, [vendorsError]);

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
            const advItems = Array.isArray(advBody)
              ? advBody
              : advBody?.items || [];

            const mine = (Array.isArray(advItems) ? advItems : []).filter(
              (a: AdvanceOption) =>
                String(a.status || "").toUpperCase() === "OPEN" &&
                a.field_supervisor_id === user?.id
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
          const wosItems = Array.isArray(wosBody)
            ? wosBody
            : wosBody?.items || [];
          if (mounted) setWorkOrders(Array.isArray(wosItems) ? wosItems : []);
        } catch {
          if (mounted) setWorkOrders([]);
        }

        try {
          const tripsRes = await api.get("/trips");
          const tripsBody = (tripsRes as any)?.data ?? tripsRes;
          const tripsItems = Array.isArray(tripsBody)
            ? tripsBody
            : tripsBody?.items || [];
          if (mounted) setTrips(Array.isArray(tripsItems) ? tripsItems : []);
        } catch {
          if (mounted) setTrips([]);
        }
      } catch (e: any) {
        if (mounted) {
          setError(
            e?.response?.data?.message ||
              e?.message ||
              t("financeNewExpense.errors.loadFailed")
          );
        }
      } finally {
        if (mounted) setBootLoading(false);
      }
    }

    loadBootstrap();

    return () => {
      mounted = false;
    };
  }, [isSupervisor, t, user?.id]);

  function validate(): string | null {
    if (!paymentSource) return t("financeNewExpense.errors.notAllowed");

    if (!form.expense_type.trim()) {
      return t("financeNewExpense.errors.expenseTypeRequired");
    }

    if (!form.amount || Number(form.amount) <= 0) {
      return t("financeNewExpense.errors.amountInvalid");
    }

    if (paymentSource === "ADVANCE") {
      if (!isSupervisor) {
        return t("financeNewExpense.errors.advanceOnlySupervisor");
      }

      if (!isUuid(form.cash_advance_id)) {
        return t("financeNewExpense.errors.selectOpenAdvance");
      }
    }

    if (paymentSource === "COMPANY") {
      if (!isPrivileged) {
        return t("financeNewExpense.errors.companyOnlyPrivileged");
      }

      const hasVendorId = isUuid(form.vendor_id);
      const hasVendorName = form.vendor_name.trim().length >= 2;

      if (!hasVendorId && !hasVendorName) {
        return t("financeNewExpense.errors.vendorRequired");
      }

      if (!form.invoice_date) {
        return t("financeNewExpense.errors.invoiceDateRequired");
      }
    }

    if (form.trip_id && !isUuid(form.trip_id)) {
      return t("financeNewExpense.errors.tripInvalid");
    }

    if (form.maintenance_work_order_id && !isUuid(form.maintenance_work_order_id)) {
      return t("financeNewExpense.errors.woInvalid");
    }

    if (form.vehicle_id && !isUuid(form.vehicle_id)) {
      return "Vehicle is invalid";
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
              maintenance_work_order_id:
                form.maintenance_work_order_id || undefined,
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
              maintenance_work_order_id:
                form.maintenance_work_order_id || undefined,
              trip_id: form.trip_id || undefined,
              vehicle_id: form.vehicle_id || undefined,
            };

      await cashExpensesService.create(payload);

      showToast("success", t("financeNewExpense.toast.created"));
      if (form.trip_id) {
  router.push(`/trips/${form.trip_id}/finance`);
} else {
  router.push("/finance/expenses");
}
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
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      showToast("error", validationError);
      return;
    }

    setConfirmOpen(true);
  }

  const showNoOpenAdvanceHint =
    paymentSource === "ADVANCE" && isSupervisor && advances.length === 0;

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
                <span className="font-semibold text-[rgb(var(--trex-fg))]">
                  {role || "—"}
                </span>
              </span>
            }
            actions={
              <Link href="/finance/expenses">
                <Button type="button" variant="secondary">
                  {t("common.list") || "القائمة"}
                </Button>
              </Link>
            }
          />

          <Card className="border-amber-500/20">
            <div className="text-sm text-amber-700">
              {t("financeNewExpense.notAllowedBanner")}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title={t("financeNewExpense.title")}
          subtitle={
            <span className="text-slate-500">
              {t("common.role")}:{" "}
              <span className="font-semibold text-[rgb(var(--trex-fg))]">
                {role || "—"}
              </span>
            </span>
          }
          actions={
            <Link href="/finance/expenses">
              <Button type="button" variant="secondary">
                {t("common.list") || "القائمة"}
              </Button>
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
              {t("financeNewExpense.errors.selectOpenAdvance") ||
                "لا يوجد عهدة مفتوحة لاختيارها."}
            </div>
          </Card>
        ) : null}

        <Card title={t("financeNewExpense.title")}>
          <div className="space-y-4">
            <TrexSelect
              label="financeNewExpense.fields.paymentSource"
              value={paymentSource}
              onChange={(value) =>
                setPaymentSource(value as CashExpensePaymentSource)
              }
              disabled={loading || Boolean(tripIdFromUrl)}
              options={allowedSources.map((source) => ({
                value: source,
                label: source,
              }))}
            />

            {paymentSource === "ADVANCE" ? (
              <div className="text-xs text-slate-500">
                {t("financeNewExpense.hints.advance")}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                {t("financeNewExpense.hints.company")}
              </div>
            )}

            <TrexInput
              label="financeNewExpense.fields.expenseType"
              value={form.expense_type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  expense_type: e.target.value,
                }))
              }
              placeholder={t("financeNewExpense.fields.expenseType")}
              disabled={loading}
            />

            <TrexInput
              label="financeNewExpense.fields.amount"
              type="number"
              value={form.amount}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder={t("financeNewExpense.fields.amount")}
              disabled={loading}
            />

            {paymentSource === "ADVANCE" ? (
              <TrexSelect
                label="financeNewExpense.fields.cashAdvance"
                value={form.cash_advance_id}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, cash_advance_id: value }))
                }
                disabled={loading}
                placeholderText={t("financeNewExpense.fields.cashAdvance")}
                options={advances.map((a) => ({
                  value: a.id,
                  label: `${Number(a.amount || 0)} — ${String(a.id).slice(
                    0,
                    8
                  )}…`,
                }))}
              />
            ) : (
              <>
                <TrexSelect
                  label="financeNewExpense.fields.vendorName"
                  value={form.vendor_id}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      vendor_id: value,
                      vendor_name: value ? "" : prev.vendor_name,
                    }))
                  }
                  loading={vendorsLoading}
                  disabled={loading}
                  options={vendorOptions}
                  placeholderText="اختر المورد"
                  emptyText="لا يوجد موردون"
                />

                <TrexInput
                  label="financeNewExpense.fields.vendorName"
                  value={form.vendor_name}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      vendor_name: e.target.value,
                      vendor_id: e.target.value.trim()
                        ? ""
                        : prev.vendor_id,
                    }))
                  }
                  placeholder="اسم مورد يدوي عند الحاجة"
                  disabled={loading || Boolean(form.vendor_id)}
                />

                <TrexInput
                  label="financeNewExpense.fields.invoiceNo"
                  value={form.invoice_no}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      invoice_no: e.target.value,
                    }))
                  }
                  placeholder={t("financeNewExpense.fields.invoiceNo")}
                  disabled={loading}
                />

                <TrexInput
                  label="financeNewExpense.fields.invoiceDate"
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      invoice_date: e.target.value,
                    }))
                  }
                  disabled={loading}
                />
              </>
            )}

            <TrexSelect
              label="financeNewExpense.fields.linkWorkOrder"
              value={form.maintenance_work_order_id}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  maintenance_work_order_id: value,
                }))
              }
              disabled={loading}
              placeholderText={t("financeNewExpense.fields.linkWorkOrder")}
              options={workOrders.map((w) => ({
                value: w.id,
                label: w.code || `${String(w.id).slice(0, 8)}…`,
              }))}
            />

            <TrexSelect
              label="financeNewExpense.fields.linkTrip"
              value={form.trip_id}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, trip_id: value }))
              }
              disabled={loading}
              placeholderText={t("financeNewExpense.fields.linkTrip")}
              options={trips.map((trip) => ({
                value: trip.id,
                label: trip.code || `${String(trip.id).slice(0, 8)}…`,
              }))}
            />

            <TrexInput
              labelText="المركبة"
              value={form.vehicle_id}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, vehicle_id: e.target.value }))
              }
              placeholder="Vehicle ID اختياري"
              disabled={loading}
            />

            <label className="grid gap-2 text-sm">
              <span className="text-[rgb(var(--trex-fg))] opacity-80">
                {t("financeNewExpense.fields.notes")}
              </span>

              <textarea
                rows={3}
                className="trex-input w-full px-3 py-2 text-sm"
                placeholder={t("financeNewExpense.fields.notes")}
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                disabled={loading}
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2 justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/finance/expenses")}
              disabled={loading}
            >
              {t("common.cancel") || "إلغاء"}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={openConfirmIfValid}
              disabled={loading}
              isLoading={loading}
            >
              {loading
                ? t("common.saving")
                : t("financeNewExpense.actions.create")}
            </Button>
          </div>
        </Card>

        <ConfirmDialog
          open={confirmOpen}
          title={t("financeNewExpense.actions.create") || "إنشاء مصروف"}
          description="هل تريد إنشاء المصروف الآن؟"
          confirmText={t("common.yes") || "تأكيد"}
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