"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PenTool, CheckCircle, Package, ArrowRight, Save, Play } from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [parts, setParts] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);

  // Form states
  const [notes, setNotes] = useState("");
  const [odometer, setOdometer] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partNotes, setPartNotes] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [woRes, partsRes] = await Promise.all([
        api.get(`/maintenance/work-orders/${id}`),
        api.get("/maintenance/parts")
      ]);
      setWorkOrder(woRes.data);
      setNotes(woRes.data.notes || "");
      setOdometer(woRes.data.odometer?.toString() || "");
      setParts(partsRes.data);
    } catch (error) {
      console.error("Error fetching work order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      setProcessing(true);
      await api.put(`/maintenance/work-orders/${id}`, { 
        status,
        notes,
        odometer: parseInt(odometer) || null
      });
      await fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !partQty) return;
    
    try {
      setProcessing(true);
      await api.post(`/maintenance/work-orders/${id}/parts`, {
        part_id: selectedPart,
        qty_installed: parseFloat(partQty),
        notes: partNotes
      });
      
      setSelectedPart("");
      setPartQty("1");
      setPartNotes("");
      await fetchData();
    } catch (error) {
      console.error("Error adding part:", error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
  if (!workOrder) return <div className="p-8 text-center text-red-500">لم يتم العثور على أمر الشغل</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 bg-white border rounded-lg hover:bg-gray-50">
          <ArrowRight className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">تفاصيل أمر الشغل</h1>
          <p className="text-gray-500 text-sm mt-1">المركبة: {workOrder.vehicle?.plate_no}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-indigo-600" />
              معلومات الصيانة
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">نوع الصيانة</p>
                <p className="font-semibold">{workOrder.maintenance_mode === 'INTERNAL' ? 'داخلي' : 'خارجي'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">الحالة</p>
                <p className="font-semibold">{workOrder.status}</p>
              </div>
              {workOrder.vendor && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">المورد / الورشة الخارجية</p>
                  <p className="font-semibold">{workOrder.vendor.name}</p>
                </div>
              )}
            </div>

            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">قراءة العداد (كم)</label>
                <input 
                  type="number" 
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  disabled={workOrder.status === "COMPLETED" || workOrder.status === "CANCELLED"}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الملاحظات وتفاصيل العمل</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={workOrder.status === "COMPLETED" || workOrder.status === "CANCELLED"}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-24 disabled:bg-gray-100"
                  placeholder="سجل ما تم إنجازه في هذه الصيانة..."
                />
              </div>
              
              {workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELLED" && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(workOrder.status)} // Just save notes
                    disabled={processing}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50 flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" /> حفظ التعديلات
                  </button>
                  
                  {workOrder.status === "OPEN" && (
                    <button 
                      onClick={() => handleUpdateStatus("IN_PROGRESS")}
                      disabled={processing}
                      className="flex-1 bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Play className="w-5 h-5" /> بدء العمل
                    </button>
                  )}

                  {workOrder.status === "IN_PROGRESS" && (
                    <button 
                      onClick={() => handleUpdateStatus("COMPLETED")}
                      disabled={processing}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" /> إنهاء الصيانة
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Parts Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              قطع الغيار والمواد المستهلكة
            </h2>
            
            {workOrder.installations && workOrder.installations.length > 0 ? (
              <table className="w-full text-right mb-6">
                <thead className="bg-gray-50 text-gray-600 text-sm">
                  <tr>
                    <th className="p-2">الصنف</th>
                    <th className="p-2">الكمية</th>
                    <th className="p-2">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrder.installations.map((inst: any) => (
                    <tr key={inst.id} className="border-b text-sm">
                      <td className="p-2">{inst.part?.name}</td>
                      <td className="p-2 font-bold">{inst.qty_installed}</td>
                      <td className="p-2 text-gray-500">{inst.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-sm mb-6">لم يتم تسجيل أي قطع غيار في هذا الأمر.</p>
            )}

            {workOrder.status !== "COMPLETED" && workOrder.status !== "CANCELLED" && (
              <form onSubmit={handleAddPart} className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="font-semibold text-sm mb-3">إضافة قطعة جديدة</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="col-span-2">
                    <select 
                      value={selectedPart}
                      onChange={(e) => setSelectedPart(e.target.value)}
                      required
                      className="w-full p-2 text-sm border rounded-lg outline-none"
                    >
                      <option value="">اختر الصنف...</option>
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.part_number ? `(${p.part_number})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input 
                      type="number" 
                      min="0.01" 
                      step="0.01"
                      required
                      value={partQty}
                      onChange={(e) => setPartQty(e.target.value)}
                      placeholder="الكمية"
                      className="w-full p-2 text-sm border rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={partNotes}
                    onChange={(e) => setPartNotes(e.target.value)}
                    placeholder="ملاحظات التركيب..."
                    className="flex-1 p-2 text-sm border rounded-lg outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={processing}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    إضافة القطعة
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          {workOrder.request && (
            <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
              <h3 className="font-bold text-orange-800 mb-2 border-b border-orange-200 pb-2">الطلب المرتبط</h3>
              <p className="font-semibold text-sm">{workOrder.request.problem_title}</p>
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{workOrder.request.problem_description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}