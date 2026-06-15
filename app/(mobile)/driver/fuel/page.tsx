"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { api } from "@/src/lib/api";
import { QrCode, ScanLine } from "lucide-react";

export default function DriverFuelPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [scannedData, setScannedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch assigned vehicles for this driver
    api.get("/vehicles").then(res => setVehicles(res.data?.items || [])).catch(() => {});
  }, []);

  const handleSimulateScan = () => {
    // In a real app, this would open a camera and decode QR.
    // Here we simulate parsing QR data "STATION_ID-AMOUNT"
    // We will just prompt for it.
    const mockData = prompt("للمحاكاة: أدخل كود المحطة والمبلغ بهذا الشكل (مثال: ST-123-500)");
    if (!mockData) return;
    
    // Simple mock logic
    const parts = mockData.split('-');
    if (parts.length >= 2) {
      setScannedData({
        station_id: parts.slice(0, -1).join('-'), // In reality, this would be a real UUID
        amount: Number(parts[parts.length - 1])
      });
    } else {
      alert("بيانات QR غير صالحة");
    }
  };

  const confirmTransaction = async () => {
    if (!selectedVehicle) return alert("اختر المركبة");
    try {
      setLoading(true);
      await api.post("/fuel/simulate", {
        // Assume company_id is fetched from driver's token by backend, but simulator needs it.
        // We will send a special mobile request that uses the driver's token to deduce company.
        station_id: scannedData.station_id,
        amount: scannedData.amount,
        vehicle_id: selectedVehicle
      });
      alert("تم الدفع بنجاح");
      setScannedData(null);
      setSelectedVehicle("");
    } catch (e: any) {
      alert("خطأ في العملية: " + (e.response?.data?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <Card className="p-6 text-center shadow-lg rounded-3xl border-emerald-500 border-t-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <QrCode className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="font-bold text-2xl mb-2 text-emerald-900">مسح كود التفويل</h2>
        <p className="text-gray-500 mb-6">قم بتوجيه الكاميرا نحو الكود الظاهر لدى عامل المحطة ليتم خصم المبلغ من محفظة الشركة</p>
        
        {!scannedData ? (
          <Button variant="primary" onClick={handleSimulateScan} className="w-full h-16 text-xl rounded-2xl bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-emerald-200 shadow-xl">
            <ScanLine className="w-6 h-6" /> افتح الكاميرا
          </Button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 text-right mt-6 pt-6 border-t border-gray-100">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
              <span className="block text-sm text-gray-500 mb-1">المبلغ المطلوب سداده</span>
              <span className="text-4xl font-black text-emerald-600">{scannedData.amount} ج.م</span>
            </div>
            <div>
              <label className="block mb-2 font-bold">لأي مركبة؟</label>
              <select 
                className="w-full border-2 border-gray-200 p-4 rounded-xl focus:border-emerald-500 focus:outline-none"
                value={selectedVehicle}
                onChange={e => setSelectedVehicle(e.target.value)}
              >
                <option value="">-- اختر المركبة --</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_no}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="secondary" onClick={() => setScannedData(null)} className="flex-1 rounded-xl h-14">إلغاء</Button>
              <Button variant="primary" onClick={confirmTransaction} isLoading={loading} className="flex-[2] rounded-xl h-14 bg-emerald-600 hover:bg-emerald-700 shadow-md">
                تأكيد الدفع
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
