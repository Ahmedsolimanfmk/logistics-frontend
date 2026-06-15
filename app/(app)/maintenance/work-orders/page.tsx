"use client";

import React, { useEffect, useState } from "react";
import { PenTool, Plus, Search, Eye } from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";

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

  const columns: DataTableColumn<any>[] = [
    {
      key: "opened_at",
      label: "تاريخ الفتح",
      render: (wo) => new Date(wo.opened_at || wo.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }),
    },
    {
      key: "vehicle",
      label: "المركبة",
      render: (wo) => <div className="font-semibold">{wo.vehicle?.plate_no}</div>,
    },
    {
      key: "maintenance_mode",
      label: "نوع الصيانة",
      render: (wo) => (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
          wo.maintenance_mode === 'INTERNAL' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {wo.maintenance_mode === 'INTERNAL' ? 'داخلي' : 'خارجي'}
        </span>
      ),
    },
    {
      key: "problem",
      label: "المشكلة / الملاحظات",
      render: (wo) => <span className="font-medium">{wo.request?.problem_title || wo.notes || "-"}</span>,
    },
    {
      key: "status",
      label: "الحالة",
      render: (wo) => (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
          wo.status === 'OPEN' ? 'bg-blue-100 text-blue-700' :
          wo.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
          wo.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {wo.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "إجراءات",
      className: "text-left",
      headerClassName: "text-left",
      render: (wo) => (
        <Link
          href={`/maintenance/work-orders/${wo.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-block p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="عرض التفاصيل"
        >
          <Eye className="w-5 h-5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          className="w-full md:w-auto px-4 py-2 bg-[rgb(var(--trex-accent))] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          أمر شغل جديد
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث برقم اللوحة أو المشكلة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--trex-accent))] transition-all shadow-sm"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredOrders}
        loading={loading}
        emptyTitle="لا توجد أوامر شغل حالياً"
      />
    </div>
  );
}