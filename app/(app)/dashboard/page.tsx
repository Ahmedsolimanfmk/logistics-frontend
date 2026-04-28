"use client";

import { useEffect, useState } from "react";
import { dashboardService } from "@/src/services/dashboard.service";

function money(v: any) {
  return new Intl.NumberFormat("ar-EG").format(Number(v || 0));
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getDashboardData().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6 p-6">
      {/* ========================= */}
      {/* Executive Summary */}
      {/* ========================= */}

      <div className="grid grid-cols-4 gap-4">
        <Card title="إجمالي الرحلات">
          {data.tripsSummary?.data?.total_trips || 0}
        </Card>

        <Card title="رحلات مربحة">
          {data.tripsSummary?.data?.profitable_count || 0}
        </Card>

        <Card title="رحلات خاسرة">
          {data.tripsSummary?.data?.loss_count || 0}
        </Card>

        <Card title="صافي الربح">
          {money(data.tripsSummary?.data?.total_profit)}
        </Card>
      </div>

      {/* ========================= */}
      {/* Top Profitable Trips */}
      {/* ========================= */}

      <Section title="أعلى الرحلات ربحًا">
        <Table rows={data.tripsTop} />
      </Section>

      {/* ========================= */}
      {/* Worst Trips */}
      {/* ========================= */}

      <Section title="الرحلات الخاسرة">
        <Table rows={data.tripsWorst} />
      </Section>

      {/* ========================= */}
      {/* Low Margin */}
      {/* ========================= */}

      <Section title="رحلات بهامش ضعيف">
        <Table rows={data.tripsLowMargin} />
      </Section>

      {/* ========================= */}
      {/* Alerts */}
      {/* ========================= */}

      <Section title="التنبيهات">
        <div className="flex gap-6">
          <Stat label="Danger" value={data.alertsSummary?.by_severity?.danger} />
          <Stat label="Warnings" value={data.alertsSummary?.by_severity?.warn} />
        </div>
      </Section>
    </div>
  );
}

/* ========================= */
/* UI Helpers */
/* ========================= */

function Card({ title, children }: any) {
  return (
    <div className="rounded-xl border p-4 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{children}</div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="rounded-xl border p-4">{children}</div>
    </div>
  );
}

function Table({ rows }: any) {
  if (!rows?.length) return <div>لا توجد بيانات</div>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th>الرحلة</th>
          <th>العميل</th>
          <th>الإيراد</th>
          <th>المصروفات</th>
          <th>الربح</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r: any) => (
          <tr key={r.trip_id}>
            <td>{r.trip_code || r.trip_id?.slice(0, 6)}</td>
            <td>{r.client_name}</td>
            <td>{money(r.revenue)}</td>
            <td>{money(r.expense)}</td>
            <td>{money(r.profit)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Stat({ label, value }: any) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold">{value || 0}</div>
    </div>
  );
}