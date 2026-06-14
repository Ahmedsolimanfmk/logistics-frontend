"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { analyticsService } from "@/src/services/analytics.service";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Briefcase,
  Wrench,
  PackageSearch,
  Wallet,
  Truck,
} from "lucide-react";

type Tab = "finance" | "trips" | "maintenance" | "inventory";

const COLORS = ["#4f46e5", "#3b82f6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AnalyticsClientPage() {
  const [activeTab, setActiveTab] = useState<Tab>("finance");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  const loadData = async (tab: Tab) => {
    setLoading(true);
    try {
      let results: any = {};
      if (tab === "finance") {
        const [summary, byType, approval, topVendors] = await Promise.all([
          analyticsService.getFinanceExpenseSummary(),
          analyticsService.getFinanceExpenseByType(),
          analyticsService.getFinanceExpenseApprovalBreakdown(),
          analyticsService.getFinanceTopVendors(),
        ]);
        results = { summary, byType, approval, topVendors };
      } else if (tab === "trips") {
        const [summary, topClients, topVehicles] = await Promise.all([
          analyticsService.getTripsSummary(),
          analyticsService.getTopClientsByTrips(),
          analyticsService.getTopVehiclesByTrips(),
        ]);
        results = { summary, topClients, topVehicles };
      } else if (tab === "maintenance") {
        const [openWO, costByVehicle] = await Promise.all([
          analyticsService.getMaintenanceOpenWorkOrders(),
          analyticsService.getMaintenanceCostByVehicle(),
        ]);
        results = { openWO, costByVehicle };
      } else if (tab === "inventory") {
        const [topIssued, lowStock] = await Promise.all([
          analyticsService.getInventoryTopIssuedParts(),
          analyticsService.getInventoryLowStockItems(),
        ]);
        results = { topIssued, lowStock };
      }
      setData(results);
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "finance", label: "المالية والربحية", icon: Wallet },
    { id: "trips", label: "الرحلات", icon: Truck },
    { id: "maintenance", label: "الصيانة", icon: Wrench },
    { id: "inventory", label: "المخزون", icon: PackageSearch },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="التحليلات الشاملة"
        subtitle="نظرة عامة على أداء الأسطول، المالية، الرحلات والمزيد."
      />

      <div className="flex flex-wrap gap-2 border-b pb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as Tab)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Finance Charts */}
          {activeTab === "finance" && data && (
            <>
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">المصروفات حسب النوع</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.byType?.items || []}
                        dataKey="total_expense"
                        nameKey="expense_type"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {(data.byType?.items || []).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => new Intl.NumberFormat("ar-EG").format(Number(val))} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">المصروفات حسب حالة الاعتماد</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.approval?.items || []}>
                      <XAxis dataKey="approval_status" />
                      <YAxis />
                      <Tooltip formatter={(val) => new Intl.NumberFormat("ar-EG").format(Number(val))} />
                      <Bar dataKey="total_expense" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                        {(data.approval?.items || []).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6 md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold">أعلى الموردين (المصروفات)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topVendors?.items || []}>
                      <XAxis dataKey="vendor_name" />
                      <YAxis />
                      <Tooltip formatter={(val) => new Intl.NumberFormat("ar-EG").format(Number(val))} />
                      <Bar dataKey="total_expense" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {/* Trips Charts */}
          {activeTab === "trips" && data && (
            <>
              <Card className="p-6 md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold">ملخص الرحلات</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">إجمالي الرحلات</div>
                    <div className="text-2xl font-bold text-gray-900">{data.summary?.total_trips || 0}</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 mb-1">نشطة</div>
                    <div className="text-2xl font-bold text-blue-700">{data.summary?.active_count || 0}</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600 mb-1">مكتملة</div>
                    <div className="text-2xl font-bold text-green-700">{data.summary?.completed_count || 0}</div>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <div className="text-sm text-amber-600 mb-1">تحتاج إغلاق مالي</div>
                    <div className="text-2xl font-bold text-amber-700">{data.summary?.need_financial_closure_count || 0}</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-sm text-red-600 mb-1">ملغاة</div>
                    <div className="text-2xl font-bold text-red-700">{data.summary?.cancelled_count || 0}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">أعلى العملاء للرحلات</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topClients?.items || []}>
                      <XAxis dataKey="client_name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="trips_count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">أعلى المركبات مشاركة</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topVehicles?.items || []}>
                      <XAxis dataKey="display_name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="trips_count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}

          {/* Maintenance Charts */}
          {activeTab === "maintenance" && data && (
            <>
              <Card className="p-6 md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold">أعلى المركبات من حيث تكلفة الصيانة</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.costByVehicle?.items || []}>
                      <XAxis dataKey="display_name" />
                      <YAxis />
                      <Tooltip formatter={(val) => new Intl.NumberFormat("ar-EG").format(Number(val))} />
                      <Bar dataKey="total_cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6 md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold">أوامر العمل المفتوحة</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3">رقم الأمر</th>
                        <th className="px-4 py-3">المركبة</th>
                        <th className="px-4 py-3">النوع</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="px-4 py-3">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.openWO?.items || []).slice(0, 10).map((wo: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="px-4 py-3 font-semibold">{wo.id.slice(0, 8)}...</td>
                          <td className="px-4 py-3">{wo.vehicle_name}</td>
                          <td className="px-4 py-3">{wo.type}</td>
                          <td className="px-4 py-3">
                            <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-semibold">
                              {wo.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{new Date(wo.opened_at).toLocaleDateString("ar-EG")}</td>
                        </tr>
                      ))}
                      {(!data.openWO?.items || data.openWO.items.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            لا توجد أوامر عمل مفتوحة
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}

          {/* Inventory Charts */}
          {activeTab === "inventory" && data && (
            <>
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">القطع الأكثر صرفاً</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topIssued?.items || []}>
                      <XAxis dataKey="part_name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="total_issued_qty" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">نواقص المخزون (تحت الحد الأدنى)</h3>
                <div className="overflow-y-auto h-64 pr-2">
                  <div className="space-y-3">
                    {(data.lowStock?.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                        <div>
                          <div className="font-semibold text-red-900">{item.part_name}</div>
                          <div className="text-xs text-red-700">{item.warehouse_name}</div>
                        </div>
                        <div className="text-left">
                          <div className="text-lg font-bold text-red-600">{item.qty_on_hand}</div>
                          <div className="text-xs text-red-500">الحد: {item.min_stock}</div>
                        </div>
                      </div>
                    ))}
                    {(!data.lowStock?.items || data.lowStock.items.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        لا توجد نواقص في المخزون
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
