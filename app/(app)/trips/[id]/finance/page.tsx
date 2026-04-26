"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { tripFinanceService } from "@/src/services/trip-finance.service";

function money(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG");
}

function text(value: any) {
  return value || "—";
}

export default function TripFinancePage() {
  const { id } = useParams();
  const router = useRouter();

  const [summary, setSummary] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const res = await tripFinanceService.getSummary(id as string);
      setSummary(res);
    } catch (err: any) {
      setError(err?.message || "فشل تحميل الملخص المالي");
    } finally {
      setLoading(false);
    }
  }

  async function openReview() {
    try {
      setActionLoading(true);
      setError(null);

      await tripFinanceService.openReview(id as string);
      await load();
    } catch (err: any) {
      setError(err?.message || "فشل فتح المراجعة المالية");
    } finally {
      setActionLoading(false);
    }
  }

  async function closeFinance() {
    try {
      setActionLoading(true);
      setError(null);

      await tripFinanceService.close(id as string, notes);
      await load();
    } catch (err: any) {
      setError(err?.message || "فشل إغلاق مالية الرحلة");
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="p-6">جاري التحميل...</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            مالية الرحلة
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            مراجعة المصروفات، الإيرادات، وصافي الربح.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push(`/trips/${id}`)}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            رجوع
          </button>
<button
  type="button"
  onClick={() => router.push(`/finance/expenses/new?trip_id=${id}`)}
  className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
>
  إضافة مصروف رحلة
</button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={load}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            تحديث
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={openReview}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            فتح مراجعة
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={closeFinance}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            إغلاق المالية
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-3">
        <Item label="حالة المالية" value={summary?.status} />
        <Item label="إجمالي الإيرادات" value={money(summary?.total_revenue)} />
        <Item label="إجمالي المصروفات" value={money(summary?.total_expenses)} />
        <Item label="صافي الربح" value={money(summary?.net_profit || summary?.profit)} />
        <Item
          label="هامش الربح"
          value={
            summary?.profit_margin != null
              ? `${summary.profit_margin}%`
              : "—"
          }
        />
        <Item label="آخر تحديث" value={summary?.updated_at} />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">ملاحظات الإغلاق</h2>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="trex-input min-h-28 w-full px-3 py-2 text-sm"
          placeholder="اكتب ملاحظات المالية هنا..."
        />
      </section>
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