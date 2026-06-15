"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { api } from "@/src/lib/api";
import { UploadCloud, CheckCircle } from "lucide-react";

export default function DriverExpensesPage() {
  const [balance, setBalance] = useState(0);
  const [formData, setFormData] = useState({ amount: "", description: "", trip_id: "" });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    // Fetch custody balance
    api.get("/driver-custody/balance").then(res => setBalance(res.data?.balance || 0)).catch(() => {});
    // Fetch active trips to link expense
    api.get("/trips").then(res => setTrips(res.data?.items?.filter((t: any) => t.status === 'STARTED') || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return alert("المبلغ والبيان مطلوبان");
    
    try {
      setLoading(true);
      let receipt_url = "";
      
      if (file) {
        const fileData = new FormData();
        fileData.append("file", file);
        const uploadRes = await api.post("/upload", fileData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        receipt_url = uploadRes.data.url;
      }

      await api.post("/cash/expenses", {
        amount: Number(formData.amount),
        description: formData.description,
        trip_id: formData.trip_id || undefined,
        attachment_url: receipt_url,
        // Assuming there is a way to link to custody or it's inferred from the driver context
      });

      alert("تم تسجيل المصروف بنجاح وهو الآن قيد المراجعة");
      setFormData({ amount: "", description: "", trip_id: "" });
      setFile(null);
      // Refresh balance
      api.get("/driver-custody/balance").then(res => setBalance(res.data?.balance || 0)).catch(() => {});
    } catch (error) {
      alert("حدث خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <Card className="p-6 bg-amber-500 text-white shadow-xl rounded-3xl relative overflow-hidden">
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white opacity-20 rounded-full"></div>
        <h2 className="font-bold text-amber-100 mb-1">العهدة الحالية (المتبقية)</h2>
        <div className="text-4xl font-black">{balance.toLocaleString()} <span className="text-xl font-normal">ج.م</span></div>
      </Card>

      <Card className="p-6 shadow-md rounded-3xl border border-gray-100">
        <h3 className="font-bold text-xl mb-4 border-b pb-2">تسجيل مصروف جديد / تسوية</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-bold text-gray-700">المبلغ (ج.م)</label>
            <input 
              type="number" 
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-amber-500 focus:outline-none"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block mb-2 font-bold text-gray-700">البيان (تفاصيل المصروف)</label>
            <input 
              type="text" 
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-amber-500 focus:outline-none"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="مثال: رسوم كارتة الطريق الدائري"
            />
          </div>
          <div>
            <label className="block mb-2 font-bold text-gray-700">ربط برحلة (اختياري)</label>
            <select 
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-amber-500 focus:outline-none"
              value={formData.trip_id}
              onChange={e => setFormData({ ...formData, trip_id: e.target.value })}
            >
              <option value="">-- بدون ربط برحلة --</option>
              {trips.map(t => <option key={t.id} value={t.id}>{t.trip_code}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-bold text-gray-700">إرفاق الإيصال / الفاتورة</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {file ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                    <p className="text-sm text-gray-500 font-bold">{file.name}</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500"><span className="font-bold">اضغط لرفع صورة</span> أو التقط بالكاميرا</p>
                  </>
                )}
              </div>
              <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          
          <Button variant="primary" type="submit" isLoading={loading} className="w-full h-14 text-lg rounded-xl mt-4 bg-amber-600 hover:bg-amber-700">
            تقديم الطلب للاعتماد
          </Button>
        </form>
      </Card>
    </div>
  );
}
