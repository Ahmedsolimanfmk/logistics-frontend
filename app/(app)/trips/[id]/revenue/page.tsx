"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { tripRevenuesService } from "@/src/services/trip-revenues.service";

function money(value: any) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ar-EG");
}

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.rows)) return body.rows;
  return [];
}

export default function TripRevenuePage() {
  const { id } = useParams();
  const router = useRouter();

  const [revenue, setRevenue] = useState<any>(null);
  const [profitability, setProfitability] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const [revenueRes, profitabilityRes, historyRes] = await Promise.all([
        tripRevenuesService.getByTrip(id as string),
        tripRevenuesService.getProfitability(id as string),
        tripRevenuesService.getHistory(id as string),
      ]);

      setRevenue((revenueRes as any)?.data || null);
      setProfitability((profitabilityRes as any)?.data || profitabilityRes || null);
      setHistory(extractItems(historyRes));
    } catch (err: any) {
      setError(err?.message || "فشل تحميل بيانات الإيراد");
    } finally {
      setLoading(false);
    }
  }

  async function autoPrice() {
    try {
      setActionLoading(true);
      setError(null);

      await tripRevenuesService.autoPrice(id as string, {});
      await load();
    } catch (err: any) {
      setError(err?.message || "فشل إعادة حساب التسعير");
    } finally {
      setActionLoading(false);
    }
  }

  async function approve() {
    try {
      setActionLoading(true);
      setError(null);

      await tripRevenuesService.approve(id as string, {});
      await load();
    } catch (err: any) {
      setError(err?.message || "فشل اعتماد الإيراد");
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
          <h1 className="text-2xl font-bold text-gray-900">إيراد الرحلة</h1>
          <p className="mt-1 text-sm text-gray-500">
            التسعير، الاعتماد، وسجل تغييرات الإيراد.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/trips/${id}`)}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            رجوع
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={autoPrice}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            إعادة حساب التسعير
          </button>

          <button
            type="button"
            disabled={actionLoading || !revenue}
            onClick={approve}
            className="rounded-xl bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            اعتماد الإيراد
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-3">
        <Item label="الإيراد المتوقع" value={money(revenue?.expected_amount || revenue?.amount)} />
        <Item label="الإيراد النهائي" value={money(revenue?.final_amount || revenue?.approved_amount)} />
        <Item label="الحالة" value={revenue?.status || "—"} />
        <Item label="قاعدة التسعير" value={revenue?.pricing_rule_id || revenue?.rule_id || "—"} />
        <Item label="العملة" value={revenue?.currency || "EGP"} />
        <Item label="آخر تحديث" value={revenue?.updated_at || "—"} />
      </section>

      <section className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm md:grid-cols-3">
        <Item label="إجمالي المصروفات" value={money(profitability?.total_expenses)} />
        <Item label="صافي الربح" value={money(profitability?.net_profit || profitability?.profit)} />
        <Item
          label="هامش الربح"
          value={
            profitability?.profit_margin != null
              ? `${profitability.profit_margin}%`
              : "—"
          }
        />
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">سجل الإيراد</h2>

        {history.length === 0 ? (
          <div className="text-sm text-gray-500">لا يوجد سجل حتى الآن</div>
        ) : (
          <div className="space-y-3">
            {history.map((item: any, index) => (
              <div
                key={item.id || index}
                className="rounded-xl border p-4 text-sm"
              >
                <div className="font-medium">
                  {item.action || item.status || "تحديث"}
                </div>
                <div className="mt-1 text-gray-500">
                  {item.created_at || item.updated_at || "—"}
                </div>
                <div className="mt-2">
                  القيمة: {money(item.amount || item.final_amount || item.expected_amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Item({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="mt-1 font-medium text-gray-900">{value || "—"}</div>
    </div>
  );
}