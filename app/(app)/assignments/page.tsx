"use client";

import React, { useEffect, useState } from "react";

import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/ui/DataTable";
import { Button } from "@/src/components/ui/Button";
import { Modal } from "@/src/components/ui/Modal";
import { assignmentsService } from "@/src/services/assignments.service";
import { vehiclesService } from "@/src/services/vehicles.service";
import { driversService } from "@/src/services/drivers.service";
import { Link2, Trash, Wrench } from "lucide-react";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAssignModalOpen, setAssignModalOpen] = useState(false);
  const [isCustodyModalOpen, setCustodyModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  const [formData, setFormData] = useState({ vehicle_id: "", driver_id: "", notes: "" });
  const [custodyData, setCustodyData] = useState({ item_name: "", qty: 1, condition: "" });

  useEffect(() => {
    loadData();
    loadDropdowns();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await assignmentsService.getActiveAssignments();
      setAssignments(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const vRes = await vehiclesService.list({ pageSize: 100 });
      setVehicles(vRes.items || []);
      const dRes = await driversService.getDrivers({ limit: 100 });
      setDrivers(dRes.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssign = async () => {
    if (!formData.vehicle_id || !formData.driver_id) return;
    try {
      await assignmentsService.assignDriver(formData);
      setAssignModalOpen(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error assigning driver");
    }
  };

  const handleUnassign = async (id: string) => {
    if (!confirm("هل أنت متأكد من إلغاء التعيين؟ تأكد من استلام العهد أولاً.")) return;
    try {
      await assignmentsService.unassignDriver(id);
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || "حدث خطأ أثناء الإلغاء");
    }
  };

  const handleAddCustody = async () => {
    if (!custodyData.item_name) return;
    try {
      await assignmentsService.addCustodyItem(selectedAssignment.id, custodyData);
      setCustodyModalOpen(false);
      setCustodyData({ item_name: "", qty: 1, condition: "" });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReturnCustody = async (id: string) => {
    try {
      await assignmentsService.returnCustodyItem(id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const columns = [
    { key: "vehicle", label: "المركبة", render: (r: any) => <span className="font-bold">{r.vehicle?.plate_no}</span> },
    { key: "driver", label: "السائق", render: (r: any) => <span>{r.driver?.full_name}</span> },
    { key: "assigned_at", label: "تاريخ التعيين", render: (r: any) => new Date(r.assigned_at).toLocaleDateString() },
    { key: "custody", label: "العهد المستلمة", render: (r: any) => (
        <div className="flex flex-col gap-1">
          {r.custody_items?.length > 0 ? r.custody_items.map((c: any) => (
            <div key={c.id} className="text-xs bg-gray-100 p-1 rounded flex justify-between items-center">
              <span>{c.item_name} ({c.qty})</span>
              <button onClick={() => handleReturnCustody(c.id)} className="text-red-500 hover:text-red-700 mx-2">استلام</button>
            </div>
          )) : <span className="text-gray-400 text-xs">لا يوجد</span>}
        </div>
      ) 
    },
    { key: "actions", label: "إجراءات", render: (r: any) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setSelectedAssignment(r); setCustodyModalOpen(true); }}>
            + عهدة
          </Button>
          <Button variant="danger" onClick={() => handleUnassign(r.id)}>
            إلغاء التعيين
          </Button>
        </div>
      ) 
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Link2 className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold">تعيين السائقين والشاحنات</h1>
            <p className="text-gray-500">إدارة ربط السائق بالشاحنة والعهد المستلمة</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setAssignModalOpen(true)}>تعيين جديد</Button>
      </div>

      <Card>
        {loading ? <div className="p-4 text-center">جاري التحميل...</div> : <DataTable columns={columns} data={assignments} />}
      </Card>

      {isAssignModalOpen && (
        <Modal title="تعيين سائق على شاحنة" onClose={() => setAssignModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-bold">الشاحنة</label>
              <select className="w-full border p-2 rounded" onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}>
                <option value="">اختر الشاحنة</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_no} - {v.model}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-bold">السائق</label>
              <select className="w-full border p-2 rounded" onChange={e => setFormData({ ...formData, driver_id: e.target.value })}>
                <option value="">اختر السائق</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-bold">ملاحظات</label>
              <textarea className="w-full border p-2 rounded" onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setAssignModalOpen(false)}>إلغاء</Button>
              <Button variant="primary" onClick={handleAssign}>حفظ التعيين</Button>
            </div>
          </div>
        </Modal>
      )}

      {isCustodyModalOpen && selectedAssignment && (
        <Modal title={`تسليم عهدة عينية: ${selectedAssignment.driver?.full_name}`} onClose={() => setCustodyModalOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-bold">اسم العهدة (مفتاح، إطار...)</label>
              <input type="text" className="w-full border p-2 rounded" value={custodyData.item_name} onChange={e => setCustodyData({ ...custodyData, item_name: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1 font-bold">الكمية</label>
              <input type="number" className="w-full border p-2 rounded" value={custodyData.qty} onChange={e => setCustodyData({ ...custodyData, qty: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="block mb-1 font-bold">حالة العهدة</label>
              <input type="text" className="w-full border p-2 rounded" value={custodyData.condition} onChange={e => setCustodyData({ ...custodyData, condition: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setCustodyModalOpen(false)}>إلغاء</Button>
              <Button variant="primary" onClick={handleAddCustody}>إضافة</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
