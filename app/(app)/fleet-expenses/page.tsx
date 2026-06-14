"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/ui/DataTable";
import { vehiclesService } from "@/src/services/vehicles.service";
import { BadgeDollarSign } from "lucide-react";

export default function FleetExpensesPage() {
  const [data, setData] = useState<any[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    start_date: "",
    end_date: "",
    vehicle_id: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await vehiclesService.getFleetExpenses(filters);
      setData(res.items || []);
      setGrandTotal(res.grandTotal || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.start_date, filters.end_date, filters.vehicle_id]);

  const columns = [
    { 
      key: "vehicle", 
      label: "المركبة", 
      render: (r: any) => (
        <div>
          <div className="font-bold">{r.vehicle?.plate_no}</div>
          <div className="text-sm text-gray-500">{r.vehicle?.model || r.vehicle?.display_name}</div>
        </div>
      ) 
    },
    { 
      key: "fuel", 
      label: "وقود", 
      render: (r: any) => <span className="text-orange-600 font-semibold">{(r.breakdown?.FUEL || 0).toLocaleString()} ج.م</span> 
    },
    { 
      key: "maintenance", 
      label: "صيانة", 
      render: (r: any) => <span className="text-blue-600 font-semibold">{(r.breakdown?.MAINTENANCE || 0).toLocaleString()} ج.م</span> 
    },
    { 
      key: "parts", 
      label: "قطع غيار", 
      render: (r: any) => <span className="text-indigo-600 font-semibold">{(r.breakdown?.PARTS_PURCHASE || 0).toLocaleString()} ج.م</span> 
    },
    { 
      key: "tolls", 
      label: "كارتات ومخالفات", 
      render: (r: any) => <span className="text-red-600 font-semibold">{(r.breakdown?.TOLL || 0).toLocaleString()} ج.م</span> 
    },
    { 
      key: "other", 
      label: "أخرى", 
      render: (r: any) => <span>{((r.breakdown?.OTHER || 0) + (r.breakdown?.EMERGENCY || 0)).toLocaleString()} ج.م</span> 
    },
    { 
      key: "total", 
      label: "الإجمالي", 
      render: (r: any) => <span className="text-green-600 font-bold text-lg">{r.total.toLocaleString()} ج.م</span> 
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BadgeDollarSign className="w-8 h-8 text-green-600" />
          <PageHeader
            title="مصروفات الأسطول"
            subtitle="تقرير شامل لتكاليف ومصروفات كل مركبة"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="col-span-1 md:col-span-3">
          <div className="flex gap-4 p-2">
            <div className="flex-1">
              <label className="block text-sm text-gray-500 mb-1">من تاريخ</label>
              <input 
                type="date" 
                className="w-full border p-2 rounded" 
                value={filters.start_date}
                onChange={e => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-500 mb-1">إلى تاريخ</label>
              <input 
                type="date" 
                className="w-full border p-2 rounded" 
                value={filters.end_date}
                onChange={e => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
          </div>
        </Card>
        
        <Card className="flex flex-col justify-center items-center bg-green-50 border-green-200">
          <span className="text-sm text-green-700 font-semibold mb-1">إجمالي المصروفات</span>
          <span className="text-3xl font-bold text-green-600">{grandTotal.toLocaleString()} ج.م</span>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري تحميل التقرير...</div>
        ) : (
          <DataTable columns={columns} data={data} />
        )}
      </Card>
    </div>
  );
}
