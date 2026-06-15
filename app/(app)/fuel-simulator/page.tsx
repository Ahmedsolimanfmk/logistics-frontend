"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { fuelService, FuelStation } from "@/src/services/fuel.service";
import { api } from "@/src/lib/api";

export default function FuelSimulatorPage() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [formData, setFormData] = useState({ station_id: "", company_id: "", amount: "" });
  const [loading, setLoading] = useState(false);
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => {
    // Only fetch for super admin or mock it. For our simulator, we use super admin token.
    fuelService.listStations().then(setStations).catch(() => {});
    api.get("/companies").then((res: any) => setCompanies(res.data?.items || [])).catch(() => {});
  }, []);

  const handleGenerateQR = () => {
    if (!formData.station_id || !formData.amount) return alert("اختر المحطة والمبلغ");
    setQrGenerated(true);
  };

  const handleDriverScan = async () => {
    if (!formData.company_id) return alert("اختر الشركة (تجسيداً لتطبيق السائق)");
    try {
      setLoading(true);
      await fuelService.simulateTransaction({
        company_id: formData.company_id,
        station_id: formData.station_id,
        amount: Number(formData.amount)
      });
      alert("تمت عملية التموين بنجاح! تم خصم الرصيد وإضافة العمولة.");
      setQrGenerated(false);
      setFormData({ station_id: "", company_id: "", amount: "" });
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || "فشلت العملية (قد يكون الرصيد غير كافٍ أو الخدمة غير مفعلة)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="محاكي أجهزة محطات الوقود (POS)"
        subtitle="شاشة لاختبار دورة عمل التفويل ومحاكاة جهاز المحطة وتطبيق السائق"
      />

      <Card className="p-6">
        <h3 className="font-bold mb-4 text-xl border-b pb-2">1. شاشة عامل المحطة</h3>
        <div className="space-y-4">
          <div>
            <label className="block mb-1 font-bold">المحطة</label>
            <select 
              className="w-full border p-2 rounded"
              value={formData.station_id}
              onChange={e => setFormData({ ...formData, station_id: e.target.value })}
              disabled={qrGenerated}
            >
              <option value="">-- اختر المحطة --</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-bold">مبلغ التموين (ج.م)</label>
            <input 
              type="number" 
              className="w-full border p-2 rounded text-2xl" 
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              disabled={qrGenerated}
            />
          </div>
          {!qrGenerated && (
            <Button variant="primary" onClick={handleGenerateQR} className="w-full h-12 text-lg">توليد QR Code</Button>
          )}
        </div>
      </Card>

      {qrGenerated && (
        <Card className="p-6 border-emerald-500 border-2 shadow-lg">
          <h3 className="font-bold mb-4 text-xl border-b pb-2 text-emerald-700">2. محاكاة تطبيق السائق (يقوم بمسح الـ QR)</h3>
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg mb-6">
            <div className="w-48 h-48 bg-white border-4 border-black flex items-center justify-center mb-4 relative">
               <div className="absolute top-2 left-2 w-4 h-4 bg-black"></div>
               <div className="absolute top-2 right-2 w-4 h-4 bg-black"></div>
               <div className="absolute bottom-2 left-2 w-4 h-4 bg-black"></div>
               <div className="text-center font-bold text-gray-400">QR CODE<br/>{formData.amount} EGP</div>
            </div>
            <p className="text-gray-500">في الحقيقة، سيقوم السائق بمسح هذا الكود من الجوال</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-bold">اختر شركة السائق (من يملك المحفظة)</label>
              <select 
                className="w-full border p-2 rounded"
                value={formData.company_id}
                onChange={e => setFormData({ ...formData, company_id: e.target.value })}
              >
                <option value="">-- اختر الشركة --</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button variant="primary" onClick={handleDriverScan} isLoading={loading} className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700">
              [محاكاة] تأكيد الخصم وإتمام التموين
            </Button>
            <Button variant="secondary" onClick={() => setQrGenerated(false)} className="w-full">
              إلغاء العملية
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
