"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { api } from "@/src/lib/api";
import { PenTool, UploadCloud, CheckCircle } from "lucide-react";

export default function SupervisorMaintenancePage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [formData, setFormData] = useState({ vehicle_id: "", priority: "MEDIUM", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/vehicles").then(res => setVehicles(res.data?.items || [])).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_id || !formData.description) return alert("اختر المركبة واكتب الوصف");
    
    try {
      setLoading(true);
      let attachment_url = "";
      
      if (file) {
        const fileData = new FormData();
        fileData.append("file", file);
        const uploadRes = await api.post("/upload", fileData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        attachment_url = uploadRes.data.url;
      }

      await api.post("/maintenance/requests", {
        vehicle_id: formData.vehicle_id,
        priority: formData.priority,
        description: formData.description,
        // Mocking attachments array if backend supports it
        attachments: attachment_url ? [{ file_url: attachment_url, attachment_type: 'IMAGE' }] : []
      });

      alert("تم رفع طلب الصيانة بنجاح");
      setFormData({ vehicle_id: "", priority: "MEDIUM", description: "" });
      setFile(null);
    } catch (error) {
      alert("حدث خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto mt-4">
      <Card className="p-6 shadow-md rounded-3xl border border-gray-100">
        <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
          <div className="bg-rose-100 p-3 rounded-xl">
            <PenTool className="w-6 h-6 text-rose-600" />
          </div>
          <h3 className="font-bold text-xl">طلب صيانة جديد</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 font-bold text-gray-700">المركبة</label>
            <select 
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-rose-500 focus:outline-none"
              value={formData.vehicle_id}
              onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
            >
              <option value="">-- اختر المركبة --</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.brand}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block mb-2 font-bold text-gray-700">الأولوية</label>
            <select 
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-rose-500 focus:outline-none"
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="LOW">منخفضة</option>
              <option value="MEDIUM">متوسطة</option>
              <option value="HIGH">عالية</option>
              <option value="CRITICAL">حرجة (توقف فوري)</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-bold text-gray-700">وصف العطل</label>
            <textarea 
              className="w-full border-2 border-gray-200 p-3 rounded-xl focus:border-rose-500 focus:outline-none min-h-[100px]"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="صف المشكلة بدقة..."
            />
          </div>

          <div>
            <label className="block mb-2 font-bold text-gray-700">صورة العطل (اختياري)</label>
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
          
          <Button variant="primary" type="submit" isLoading={loading} className="w-full h-14 text-lg rounded-xl mt-4 bg-rose-600 hover:bg-rose-700">
            إرسال طلب الصيانة
          </Button>
        </form>
      </Card>
    </div>
  );
}
