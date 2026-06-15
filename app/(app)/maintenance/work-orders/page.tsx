"use client";

import React, { useEffect, useState } from "react";
import { PenTool, Plus, Search, Eye } from "lucide-react";
import Link from "next/link";
import api from "@/src/lib/api";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function MaintenanceWorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const res = await api.get("/maintenance/work-orders");
      setWorkOrders(res.data);
    } catch (error) {
      console.error("Error fetching work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = workOrders.filter(
    (wo) =>
      wo.vehicle?.plate_no?.includes(search) ||
      wo.request?.problem_title?.includes(search)
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <PenTool className="w-6 h-6 text-indigo-600" />
            أوامر الشغل
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            إدارة ومتابعة صيانة السيارات والورش
          </p>
        </div>
        <Link
          href="/maintenance/work-orders/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          أمر شغل جديد
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث برقم اللوحة أو المشكلة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">لا توجد أوامر شغل حالياً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 text-gray-600 border-b">
                <tr>
                  <th className="p-4 font-semibold">تاريخ الفتح</th>
                  <th className="p-4 font-semibold">المركبة</th>
                  <th className="p-4 font-semibold">نوع الصيانة</th>
                  <th className="p-4 font-semibold">المشكلة / الملاحظات</th>
                  <th className="p-4 font-semibold">الحالة</th>
                  <th className="p-4 font-semibold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((wo) => (
                  <tr key={wo.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm text-gray-600">
                      {format(new Date(wo.opened_at || wo.created_at), "dd MMM yyyy", { locale: ar })}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">{wo.vehicle?.plate_no}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        wo.maintenance_mode === 'INTERNAL' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {wo.maintenance_mode === 'INTERNAL' ? 'داخلي' : 'خارجي'}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-medium">
                      {wo.request?.problem_title || wo.notes || "-"}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        wo.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
                        wo.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                        wo.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        href={`/maintenance/work-orders/${wo.id}`}
                        className="inline-block p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}