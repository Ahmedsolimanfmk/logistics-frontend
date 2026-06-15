"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { Wrench, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NewMaintenanceRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    problem_title: "",
    problem_description: "",
    priority: "MEDIUM",
  });

  useEffect(() => {
    api.get("/vehicles").then((res) => setVehicles(res.data)).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicle_id || !formData.problem_title) {
      toast.error("يرجى إكمال الحقول الأساسية");
      return;
    }
    try {
      setLoading(true);
      await api.post("/maintenance/requests", formData);
      toast.success("تم تقديم طلب الصيانة بنجاح");
      router.push("/maintenance/requests");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || "حدث خطأ أثناء تقديم الطلب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/maintenance/requests" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
          <ArrowRight className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[rgb(var(--trex-accent))]" />
            إنشاء طلب صيانة جديد
          </h1>
          <p className="text-gray-500 text-sm mt-1">الرجاء إدخال تفاصيل المشكلة بدقة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">المركبة</label>
          <select
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--trex-accent))] transition-all"
            value={formData.vehicle_id}
            onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
            required
          >
            <option value="">-- اختر المركبة --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate_no} {v.display_name ? `- ${v.display_name}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">عنوان المشكلة (مختصر)</label>
          <input
            type="text"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--trex-accent))] transition-all"
            placeholder="مثال: تغيير زيت، مشكلة في المحرك..."
            value={formData.problem_title}
            onChange={(e) => setFormData({ ...formData, problem_title: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">التفاصيل الكاملة</label>
          <textarea
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--trex-accent))] transition-all min-h-[120px]"
            placeholder="اشرح المشكلة بالتفصيل لمساعدة فريق الصيانة..."
            value={formData.problem_description}
            onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">الأولوية</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "MEDIUM", label: "متوسطة", color: "text-blue-700 bg-blue-50 border-blue-200" },
              { id: "HIGH", label: "عالية", color: "text-orange-700 bg-orange-50 border-orange-200" },
              { id: "CRITICAL", label: "حرجة (توقف كامل)", color: "text-red-700 bg-red-50 border-red-200" },
            ].map((p) => (
              <div
                key={p.id}
                onClick={() => setFormData({ ...formData, priority: p.id })}
                className={`flex justify-center items-center p-3 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${
                  formData.priority === p.id ? p.color + " ring-2 ring-offset-1 ring-current" : "text-gray-500 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[rgb(var(--trex-accent))] text-white rounded-xl shadow-md font-semibold hover:opacity-90 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال طلب الصيانة"}
          </button>
        </div>
      </form>
    </div>
  );
}
