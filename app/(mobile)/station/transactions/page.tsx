"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/src/components/ui/Card";
import { fuelService, FuelTransaction } from "@/src/services/fuel.service";

export default function StationTransactionsPage() {
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // For MVP, we use listAllTransactions or a custom station transactions endpoint.
      // Assuming listAllTransactions returns everything for SuperAdmin, we need to filter or have a specific API.
      // In a real scenario, the backend limits it to the worker's station.
      const data = await fuelService.listAllTransactions();
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

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <h2 className="font-bold text-2xl text-emerald-800 px-2">سجل التفويل (اليوم)</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-emerald-50 border-emerald-100 shadow-sm rounded-2xl text-center">
          <div className="text-sm text-emerald-700 mb-1 font-bold">العمليات اليوم</div>
          <div className="text-3xl font-black text-emerald-600">{transactions.length}</div>
        </Card>
        <Card className="p-4 bg-emerald-600 text-white shadow-md rounded-2xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-4 -mt-4"></div>
          <div className="text-sm text-emerald-100 mb-1 font-bold">الإجمالي (ج.م)</div>
          <div className="text-3xl font-black">{transactions.reduce((acc, t) => acc + t.amount, 0)}</div>
        </Card>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center p-8 text-gray-500">جاري التحميل...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center p-8 text-gray-500 bg-white rounded-2xl border border-dashed">لا توجد عمليات اليوم</div>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id} className="p-4 shadow-sm rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-800">{tx.company?.name || "شركة مجهولة"}</div>
                <div className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleTimeString('ar-EG')} • سيارة: {tx.vehicle?.plate_no || "-"}</div>
              </div>
              <div className="text-left">
                <div className="font-black text-emerald-600 text-lg">{tx.amount} ج.م</div>
                {tx.status === 'COMPLETED' ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">تم الخصم</span>
                ) : (
                  <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">فشل</span>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
