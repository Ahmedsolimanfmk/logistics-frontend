"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/ui/DataTable";
import { fuelService, FuelTransaction } from "@/src/services/fuel.service";

export default function FuelTransactionsPage() {
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await fuelService.listCompanyTransactions();
      setTransactions(data);
    } catch (e: any) {
      alert("Error loading transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const columns = [
    { key: "fuel_station.name", label: "المحطة", render: (r: any) => r.fuel_station?.name || "-" },
    { key: "vehicle.plate_no", label: "المركبة", render: (r: any) => r.vehicle?.plate_no || "-" },
    { key: "amount", label: "قيمة التموين", render: (r: any) => <span>{r.amount} ج.م</span> },
    { key: "system_commission", label: "رسوم الخدمة", render: (r: any) => <span className="text-gray-500">{r.system_commission} ج.م</span> },
    { key: "total_deducted", label: "المخصوم من المحفظة", render: (r: any) => <strong className="text-red-600">{r.total_deducted} ج.م</strong> },
    { 
      key: "status", 
      label: "الحالة",
      render: (r: any) => {
        if (r.status === 'COMPLETED') return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-sm">مكتمل</span>;
        if (r.status === 'FAILED') return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">فشل</span>;
        return r.status;
      }
    },
    { key: "created_at", label: "تاريخ التموين", render: (r: any) => new Date(r.created_at).toLocaleString('ar-EG') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل حركات التموين"
        subtitle="جميع عمليات التموين التي تمت عبر النظام"
      />

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : (
          <DataTable columns={columns} rows={transactions} />
        )}
      </Card>
    </div>
  );
}
