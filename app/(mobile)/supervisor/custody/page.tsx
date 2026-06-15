"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { api } from "@/src/lib/api";
import { CheckCircle, XCircle } from "lucide-react";

export default function SupervisorCustodyPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/cash/expenses");
      // Filter for PENDING expenses submitted by drivers under this supervisor
      setExpenses(res.data?.items?.filter((e: any) => e.approval_status === 'PENDING') || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post(`/cash/expenses/${id}/approve`, { status: action });
      alert(action === 'APPROVE' ? "تم الاعتماد" : "تم الرفض");
      fetchExpenses();
    } catch (e) {
      alert("خطأ في تنفيذ الإجراء");
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <h2 className="font-bold text-2xl text-gray-800 px-2">اعتماد مصروفات السائقين</h2>
      
      <div className="space-y-4">
        {loading ? (
          <div className="text-center p-8 text-gray-500">جاري التحميل...</div>
        ) : expenses.length === 0 ? (
          <div className="text-center p-8 text-gray-500 bg-white rounded-2xl border border-dashed">لا توجد مصروفات معلقة للاعتماد</div>
        ) : (
          expenses.map(expense => (
            <Card key={expense.id} className="p-5 shadow-sm rounded-2xl border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-emerald-600">{expense.amount} ج.م</h3>
                  <p className="font-bold text-gray-800 text-sm mt-1">{expense.description}</p>
                </div>
                {expense.attachment_url && (
                  <a href={`http://localhost:5000${expense.attachment_url}`} target="_blank" rel="noreferrer" className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold hover:bg-gray-200">
                    عرض الإيصال
                  </a>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
                <p>السائق: {expense.created_by_user?.full_name || 'غير محدد'}</p>
                {expense.trip_id && <p>الرحلة: {expense.trip?.trip_code}</p>}
                <p>التاريخ: {new Date(expense.created_at).toLocaleDateString('ar-EG')}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center justify-center gap-1" onClick={() => handleAction(expense.id, 'REJECT')}>
                  <XCircle className="w-4 h-4" /> رفض
                </Button>
                <Button variant="primary" className="flex-[2] rounded-xl bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1" onClick={() => handleAction(expense.id, 'APPROVE')}>
                  <CheckCircle className="w-4 h-4" /> اعتماد وتسوية
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
