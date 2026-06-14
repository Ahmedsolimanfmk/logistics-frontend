"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { apiGet } from "@/src/lib/api";
import { DataTable } from "@/src/components/ui/DataTable";

export default function InventoryDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiGet("/inventory/dashboard");
        setData(res);
      } catch (err) {
        console.error("Failed to load inventory dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">جاري تحميل البيانات...</div>;
  }

  if (!data) {
    return <div className="p-6 text-center text-red-500">حدث خطأ أثناء تحميل البيانات</div>;
  }

  const topConsumedColumns = [
    { key: "part_number", label: "رقم القطعة" },
    { key: "part_name", label: "الاسم" },
    { key: "total_quantity", label: "الكمية المستهلكة" },
    { 
      key: "total_cost", 
      label: "التكلفة (ج.م)",
      render: (row: any) => <span className="font-semibold text-red-600">{Number(row.total_cost || 0).toLocaleString()}</span>
    }
  ];

  const lowStockColumns = [
    { key: "part_number", label: "رقم القطعة" },
    { key: "part_name", label: "الاسم" },
    { key: "warehouse_name", label: "المخزن" },
    { 
      key: "qty_on_hand", 
      label: "الرصيد الحالي",
      render: (row: any) => <span className="font-bold text-red-600">{row.qty_on_hand}</span>
    },
    { key: "min_stock", label: "الحد الأدنى" }
  ];

  const recentIssuesColumns = [
    { key: "id", label: "المعرف", render: (r: any) => r.id.split('-')[0] },
    { key: "date", label: "التاريخ", render: (r: any) => new Date(r.date).toLocaleDateString() },
    { key: "vehicle", label: "المركبة", render: (r: any) => <span className="bg-slate-200 px-2 py-1 rounded text-xs">{r.vehicle}</span> },
    { key: "status", label: "الحالة", render: (r: any) => <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">{r.status}</span> }
  ];

  const recentReceiptsColumns = [
    { key: "id", label: "المعرف", render: (r: any) => r.id.split('-')[0] },
    { key: "date", label: "التاريخ", render: (r: any) => new Date(r.date).toLocaleDateString() },
    { key: "vendor", label: "المورد" },
    { key: "warehouse", label: "المخزن" },
    { key: "status", label: "الحالة", render: (r: any) => <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{r.status}</span> }
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader title="لوحة تحكم المخازن" subtitle="ملخص ومؤشرات النظام" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-slate-50 to-slate-100 border-none shadow-sm">
          <span className="text-slate-500 text-sm font-semibold mb-1">التقييم المالي للمخزون</span>
          <span className="text-3xl font-bold text-emerald-600">
            {Number(data.totalValue || 0).toLocaleString()} <span className="text-base text-slate-500 font-normal">ج.م</span>
          </span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-slate-50 to-slate-100 border-none shadow-sm">
          <span className="text-slate-500 text-sm font-semibold mb-1">عدد أصناف القطع</span>
          <span className="text-3xl font-bold text-indigo-600">{data.totalParts || 0}</span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-slate-50 to-slate-100 border-none shadow-sm">
          <span className="text-slate-500 text-sm font-semibold mb-1">إجمالي المخازن النشطة</span>
          <span className="text-3xl font-bold text-sky-600">{data.totalWarehouses || 0}</span>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center text-center bg-gradient-to-br from-rose-50 to-rose-100 border-none shadow-sm">
          <span className="text-rose-500 text-sm font-semibold mb-1">تنبيهات نواقص القطع</span>
          <span className="text-3xl font-bold text-rose-700">{data.lowStockItems?.length || 0}</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="أكثر القطع استهلاكاً (آخر 30 يوم)">
          <DataTable 
            columns={topConsumedColumns} 
            rows={data.topConsumed || []} 
            emptyTitle="لا يوجد استهلاكات مؤخراً" 
          />
        </Card>

        <Card title="نواقص القطع (Low Stock)">
          <DataTable 
            columns={lowStockColumns} 
            rows={data.lowStockItems || []} 
            emptyTitle="جميع القطع ضمن الحد الآمن" 
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="أحدث حركات الصرف (Issues)">
          <DataTable 
            columns={recentIssuesColumns} 
            rows={data.recentIssues || []} 
            emptyTitle="لا يوجد حركات صرف" 
          />
        </Card>

        <Card title="أحدث حركات الإضافة (Receipts)">
          <DataTable 
            columns={recentReceiptsColumns} 
            rows={data.recentReceipts || []} 
            emptyTitle="لا يوجد إضافات مخزنية" 
          />
        </Card>
      </div>
    </div>
  );
}
