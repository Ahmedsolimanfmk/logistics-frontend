"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { tripsService } from "@/src/services/trips.service";
import { tripRevenuesService } from "@/src/services/trip-revenues.service";
import { tripFinanceService } from "@/src/services/trip-finance.service";

function money(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG");
}

function text(value: any) {
  return value || "—";
}

export default function TripDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [trip, setTrip] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [financeSummary, setFinanceSummary] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTrip() {
    try {
      setLoading(true);
      setError(null);

      const [tripRes, revenueRes, financeRes] = await Promise.all([
        tripsService.getById(id as string),
        tripRevenuesService.getByTrip(id as string),
        tripFinanceService.getSummary(id as string),
      ]);

      setTrip(tripRes);
      setRevenue((revenueRes as any)?.data || null);
      setFinanceSummary((financeRes as any)?.data || financeRes || null);
    } catch (err: any) {
      setError(err?.message || "فشل تحميل بيانات الرحلة");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: "start" | "finish") {
    if (!trip?.id) return;

    try {
      setActionLoading(true);
      setError(null);

      if (action === "start") {
        await tripsService.start(trip.id);
      }

      if (action === "finish") {
        await tripsService.finish(trip.id);
      }

      await loadTrip();
    } catch (err: any) {
      setError(err?.message || "فشل تنفيذ الإجراء");
    } finally {
      setActionLoading(false);
    }
  }

  async function autoPriceTrip() {
    if (!trip?.id) return;

    try {
      setActionLoading(true);
      setError(null);

      await tripRevenuesService.autoPrice(trip.id, {});
      await loadTrip();
    } catch (err: any) {
      setError(err?.message || "فشل حساب التسعير التلقائي");
    } finally {
      setActionLoading(false);
    }
  }

  async function approveRevenue() {
    if (!trip?.id) return;

    try {
      setActionLoading(true);
      setError(null);

      await tripRevenuesService.approve(trip.id, {});
      await loadTrip();
    } catch (err: any) {
      setError(err?.message || "فشل اعتماد الإيراد");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div className="p-6">جاري التحميل...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>

        <button
          type="button"
          onClick={() => router.push("/trips")}
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
        >
          رجوع
        </button>
      </div>
    );
  }

  if (!trip) {
    return <div className="p-6">لا توجد بيانات</div>;
  }

  const tripCode = trip.trip_no || trip.trip_number || trip.code;

  const clientName =
    trip.clients?.name ||
    trip.client?.name ||
    trip.clients?.company_name ||
    trip.client?.company_name;

  const contractNo =
    trip.client_contracts?.contract_no ||
    trip.contract?.contract_no ||
    trip.contract_no;

  const routeName =
    trip.routes?.name ||
    trip.route?.name ||
    [trip.routes?.origin_label, trip.routes?.destination_label]
      .filter(Boolean)
      .join(" → ");

  const pickupSiteName =
    trip.pickup_site?.name ||
    trip.pickup_sites?.name ||
    trip.pickup_site_name;

  const dropoffSiteName =
    trip.dropoff_site?.name ||
    trip.dropoff_sites?.name ||
    trip.dropoff_site_name;

  const siteName = trip.sites?.name || trip.site?.name || trip.site_name;

  const vehicleName =
    trip.vehicles?.plate_no ||
    trip.vehicle?.plate_no ||
    trip.vehicles?.plate_number ||
    trip.vehicle?.plate_number ||
    trip.vehicles?.truck_number ||
    trip.vehicle?.truck_number;

  const driverName =
    trip.drivers?.name ||
    trip.driver?.name ||
    trip.driver_name ||
    trip.drivers?.full_name ||
    trip.driver?.full_name;

  const supervisorName =
    trip.supervisors?.name ||
    trip.supervisor?.name ||
    trip.supervisor_name ||
    trip.supervisors?.full_name ||
    trip.supervisor?.full_name;

  const expectedRevenue =
    revenue?.expected_amount || revenue?.amount || trip.expected_revenue;

  const approvedRevenue =
    revenue?.approved_amount || revenue?.final_amount || trip.actual_revenue;

  const totalExpenses =
    financeSummary?.total_expenses ||
    financeSummary?.expenses_total ||
    trip.cost;

  const netProfit =
    financeSummary?.net_profit || financeSummary?.profit || null;

  const profitMargin = financeSummary?.profit_margin;

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            تفاصيل الرحلة
          </h1>
          <p className="mt-1 text-sm text-gray-500">{text(tripCode)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/trips")}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            رجوع
          </button>
          <button
            type="button"
            onClick={() => router.push(`/trips/${trip.id}/revenue`)}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            >
             تفاصيل الإيراد
          </button>
          <button
            type="button"
            onClick={() => router.push(`/trips/${trip.id}/finance`)}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
            >
  مالية الرحلة
</button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={autoPriceTrip}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            إعادة حساب التسعير
          </button>

          <button
            type="button"
            disabled={actionLoading || !revenue}
            onClick={approveRevenue}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            اعتماد الإيراد
          </button>

          {trip.status === "DRAFT" ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => runAction("start")}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              بدء الرحلة
            </button>
          ) : null}

          {trip.status === "IN_PROGRESS" ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => runAction("finish")}
              className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              إنهاء الرحلة
            </button>
          ) : null}
        </div>
      </div>

      {/* BASIC INFO */}
      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-3">
        <Item label="رقم الرحلة" value={tripCode} />
        <Item label="الحالة" value={trip.status} />
        <Item label="نوع الرحلة" value={trip.trip_type} />
        <Item label="العميل" value={clientName} />
        <Item label="العقد" value={contractNo} />
        <Item label="المسار" value={routeName} />
      </section>

      {/* ASSIGNMENT */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">التخصيص</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Item label="المركبة" value={vehicleName} />
          <Item label="السائق" value={driverName} />
          <Item label="المشرف" value={supervisorName} />
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => router.push(`/trips/${trip.id}/assign`)}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            تعديل التخصيص
          </button>
        </div>
      </section>

      {/* LOCATIONS */}
      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-3">
        <Item label="موقع التحميل" value={pickupSiteName} />
        <Item label="موقع التسليم" value={dropoffSiteName} />
        <Item label="الموقع" value={siteName} />
      </section>

      {/* TIME */}
      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-3">
        <Item label="تاريخ الرحلة" value={trip.trip_date || trip.date} />
        <Item label="البداية المخططة" value={trip.planned_start_at} />
        <Item label="النهاية المخططة" value={trip.planned_end_at} />
        <Item label="بدأت فعليًا" value={trip.started_at} />
        <Item label="انتهت فعليًا" value={trip.finished_at || trip.ended_at} />
        <Item
          label="المسافة المتوقعة"
          value={
            trip.estimated_distance_km
              ? `${trip.estimated_distance_km} كم`
              : null
          }
        />
      </section>

      {/* FINANCE + REVENUE */}
      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-3">
        <Item label="الإيراد المتوقع" value={money(expectedRevenue)} />
        <Item label="الإيراد المعتمد" value={money(approvedRevenue)} />
        <Item label="حالة الإيراد" value={revenue?.status || "—"} />
        <Item label="إجمالي المصروفات" value={money(totalExpenses)} />
        <Item label="صافي الربح" value={money(netProfit)} />
        <Item
          label="هامش الربح"
          value={profitMargin != null ? `${profitMargin}%` : "—"}
        />
      </section>

      {/* NOTES */}
      {trip.notes ? (
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold">ملاحظات</h2>
          <p className="text-sm text-gray-700">{trip.notes}</p>
        </section>
      ) : null}
    </div>
  );
}

function Item({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="mt-1 font-medium text-gray-900">{text(value)}</div>
    </div>
  );
}