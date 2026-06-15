"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { fuelService, FuelStation } from "@/src/services/fuel.service";

export default function StationDashboard() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [formData, setFormData] = useState({ station_id: "", amount: "" });
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => {
    // Ideally fetch the specific station assigned to this worker.
    fuelService.listStations().then(setStations).catch(() => {});
  }, []);

  const handleGenerateQR = () => {
    if (!formData.station_id || !formData.amount) return alert("اختر المحطة والمبلغ");
    setQrGenerated(true);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <Card className="p-6 shadow-lg rounded-2xl bg-white border border-gray-100">
        <h2 className="font-bold mb-4 text-2xl text-emerald-800 text-center">توليد كود التفويل</h2>
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-bold text-gray-700">المحطة</label>
            <select 
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-emerald-500 focus:outline-none"
              value={formData.station_id}
              onChange={e => setFormData({ ...formData, station_id: e.target.value })}
              disabled={qrGenerated}
            >
              <option value="">-- اختر المحطة --</option>
              {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-bold text-gray-700">مبلغ التفويل (ج.م)</label>
            <input 
              type="number" 
              className="w-full border-2 border-gray-200 p-3 rounded-xl text-3xl font-bold text-center focus:border-emerald-500 focus:outline-none" 
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              disabled={qrGenerated}
              placeholder="0.00"
            />
          </div>
          {!qrGenerated && (
            <Button variant="primary" onClick={handleGenerateQR} className="w-full h-14 text-xl rounded-xl mt-4 bg-emerald-600 hover:bg-emerald-700">توليد QR Code</Button>
          )}
        </div>
      </Card>

      {qrGenerated && (
        <div className="flex flex-col items-center justify-center p-8 bg-white shadow-xl border-emerald-500 border-2 rounded-2xl animate-in slide-in-from-bottom-4">
          <div className="text-center mb-6">
            <h3 className="text-gray-500 font-bold">المبلغ المطلوب</h3>
            <div className="text-5xl font-black text-emerald-600">{formData.amount} <span className="text-2xl">ج.م</span></div>
          </div>
          
          <div className="w-64 h-64 bg-white border-4 border-gray-900 rounded-xl flex items-center justify-center mb-6 relative shadow-inner">
             {/* Fake QR visual for demo */}
             <div className="absolute top-4 left-4 w-6 h-6 border-4 border-black"></div>
             <div className="absolute top-4 right-4 w-6 h-6 border-4 border-black"></div>
             <div className="absolute bottom-4 left-4 w-6 h-6 border-4 border-black"></div>
             <div className="grid grid-cols-4 grid-rows-4 gap-2 w-32 h-32 opacity-20">
               {Array.from({length: 16}).map((_, i) => <div key={i} className="bg-black rounded-sm"></div>)}
             </div>
             <div className="absolute inset-0 flex items-center justify-center font-bold text-emerald-800 text-2xl opacity-80 rotate-45">
               {formData.station_id.slice(0,4)}-{formData.amount}
             </div>
          </div>
          <p className="text-gray-500 text-center mb-6 font-medium">اجعل السائق يقوم بمسح هذا الكود من تطبيقه لتأكيد عملية الدفع والخصم من المحفظة</p>
          <Button variant="secondary" onClick={() => setQrGenerated(false)} className="w-full h-12 rounded-xl border-2 border-gray-200">
            إلغاء أو توليد كود جديد
          </Button>
        </div>
      )}
    </div>
  );
}
