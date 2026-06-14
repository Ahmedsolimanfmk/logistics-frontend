"use client";

import React, { useEffect, useState } from "react";
import { useT } from "@/src/i18n/useT";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/ui/DataTable";
import { vehiclesService } from "@/src/services/vehicles.service";
import { Activity, Truck, Users, Wrench } from "lucide-react";

export default function FleetDashboardPage() {
  const t = useT();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await vehiclesService.getFleetDashboard();
      setData(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  }

  if (!data) return null;

  const vehicleColumns = [
    { key: "plate_no", label: "رقم اللوحة", render: (r: any) => <span className="font-bold">{r.plate_no}</span> },
    { key: "license_expiry_date", label: "تاريخ الانتهاء", render: (r: any) => new Date(r.license_expiry_date).toLocaleDateString() },
  ];

  const driverColumns = [
    { key: "full_name", label: "اسم السائق", render: (r: any) => <span className="font-bold">{r.full_name}</span> },
    { key: "license_expiry_date", label: "تاريخ الانتهاء", render: (r: any) => new Date(r.license_expiry_date).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir="rtl">
      <div className="flex items-center gap-4 border-b border-black/5 pb-4">
        <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">لوحة تحكم الأسطول</h1>
          <p className="text-slate-500 text-sm">نظرة عامة على حالة الشاحنات، السائقين، والصيانة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center gap-3 border-b pb-2 mb-2">
            <Truck className="text-indigo-600" />
            <h2 className="text-lg font-bold">المركبات ({data.vehicles.total})</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>متاحة (نشطة):</span> <span className="font-bold text-green-600">{data.vehicles.ACTIVE || 0}</span></div>
            <div className="flex justify-between"><span>في الصيانة:</span> <span className="font-bold text-red-600">{data.vehicles.IN_MAINTENANCE || 0}</span></div>
            <div className="flex justify-between"><span>متوقفة (بدون عمل):</span> <span className="font-bold text-yellow-600">{data.vehicles.IDLE || 0}</span></div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 border-b pb-2 mb-2">
            <Users className="text-rose-600" />
            <h2 className="text-lg font-bold">السائقين ({data.drivers.total})</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>نشط (متاح):</span> <span className="font-bold text-green-600">{data.drivers.active || 0}</span></div>
            <div className="flex justify-between"><span>غير نشط (إجازة/مجمد):</span> <span className="font-bold text-gray-600">{data.drivers.inactive || 0}</span></div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3 border-b pb-2 mb-2">
            <Wrench className="text-orange-600" />
            <h2 className="text-lg font-bold">طلبات الصيانة ({data.maintenance.total})</h2>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between"><span>قيد الانتظار:</span> <span className="font-bold text-yellow-600">{data.maintenance.PENDING || 0}</span></div>
            <div className="flex justify-between"><span>قيد العمل (مقبول):</span> <span className="font-bold text-blue-600">{data.maintenance.APPROVED || 0}</span></div>
            <div className="flex justify-between"><span>مكتمل:</span> <span className="font-bold text-green-600">{data.maintenance.COMPLETED || 0}</span></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="تراخيص مركبات تقترب من الانتهاء (30 يوم)">
          {data.expiring.vehicles?.length > 0 ? (
            <DataTable columns={vehicleColumns} rows={data.expiring.vehicles} emptyTitle="" />
          ) : (
            <div className="text-center py-4 text-gray-500">لا يوجد مركبات تنتهي تراخيصها قريباً</div>
          )}
        </Card>

        <Card title="رخص سائقين تقترب من الانتهاء (30 يوم)">
          {data.expiring.drivers?.length > 0 ? (
            <DataTable columns={driverColumns} rows={data.expiring.drivers} emptyTitle="" />
          ) : (
            <div className="text-center py-4 text-gray-500">لا يوجد رخص تنتهي قريباً</div>
          )}
        </Card>
      </div>
    </div>
  );
}
