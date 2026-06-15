"use client";

import React, { useEffect, useState } from "react";
import { Wrench, CheckCircle, XCircle, Search, Eye } from "lucide-react";
import Link from "next/link";
import { api } from "@/src/lib/api";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";

export default function MaintenanceRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get("/maintenance/requests");
      setRequests(res.data);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, reason: string = "") => {
    try {
      setProcessing(true);
      await api.put(`/maintenance/requests/${id}/status`, { status, rejection_reason: reason });
      await fetchRequests();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error updating request:", error);
    } finally {
      setProcessing(false);
    }
  };

  const openDetails = (req: any) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  const filteredRequests = requests.filter(
    (req) =>
      req.vehicle?.plate_no?.includes(search) ||
      req.problem_title?.includes(search) ||
      req.requested_by_user?.full_name?.includes(search)
  );

  const columns: DataTableColumn<any>[] = [
    {
      key: "requested_at",
      label: "تاريخ الطلب",
      render: (req) => new Date(req.requested_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }),
    },
    {
      key: "vehicle",
      label: "المركبة",
      render: (req) => (
        <div>
          <div className="font-semibold">{req.vehicle?.plate_no}</div>
          <div className="text-xs text-gray-500">{req.vehicle?.display_name}</div>
        </div>
      ),
    },
    {
      key: "requested_by",
      label: "مقدم الطلب",
      render: (req) => req.requested_by_user?.full_name,
    },
    {
      key: "problem_title",
      label: "العنوان",
      render: (req) => <span className="font-medium">{req.problem_title}</span>,
    },
    {
      key: "priority",
      label: "الأولوية",
      render: (req) => (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
          req.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
          req.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {req.priority}
        </span>
      ),
    },
    {
      key: "status",
      label: "الحالة",
      render: (req) => (
        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
          req.status === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-700' :
          req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
          req.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {req.status}
        </span>
      ),
    },
    {
      key: "actions",
      label: "إجراءات",
      className: "text-left",
      headerClassName: "text-left",
      render: (req) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openDetails(req);
          }}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="عرض التفاصيل"
        >
          <Eye className="w-5 h-5" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            طلبات الصيانة
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            إدارة ومراجعة طلبات الصيانة الواردة من السائقين والمشرفين
          </p>
        </div>
        <Link href="/maintenance/requests/new">
          <button className="w-full md:w-auto px-4 py-2 bg-[rgb(var(--trex-accent))] text-white rounded-xl shadow-sm hover:opacity-90 transition font-medium">
            إنشاء طلب صيانة
          </button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="بحث برقم اللوحة، المشكلة، أو السائق..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[rgb(var(--trex-accent))] transition-all shadow-sm"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredRequests}
        loading={loading}
        emptyTitle="لا توجد طلبات صيانة حالياً"
        onRowClick={openDetails}
      />

      {/* Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">تفاصيل طلب الصيانة</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <p className="text-sm text-gray-500 mb-1">المركبة</p>
                  <p className="font-bold">{selectedRequest.vehicle?.plate_no} - {selectedRequest.vehicle?.display_name}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border">
                  <p className="text-sm text-gray-500 mb-1">مقدم الطلب</p>
                  <p className="font-bold">{selectedRequest.requested_by_user?.full_name}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-2">وصف المشكلة:</h3>
                <div className="bg-gray-50 p-4 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedRequest.problem_description || selectedRequest.problem_title}
                </div>
              </div>

              {selectedRequest.status === "SUBMITTED" && (
                <div className="flex gap-3 justify-end mt-8 border-t pt-4">
                  <button
                    disabled={processing}
                    onClick={() => handleUpdateStatus(selectedRequest.id, "REJECTED")}
                    className="px-6 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold transition-colors disabled:opacity-50"
                  >
                    رفض الطلب
                  </button>
                  <button
                    disabled={processing}
                    onClick={() => handleUpdateStatus(selectedRequest.id, "APPROVED")}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-5 h-5" />
                    موافقة
                  </button>
                </div>
              )}
              {selectedRequest.status === "APPROVED" && (
                <div className="flex justify-end mt-8 border-t pt-4">
                  <Link
                    href="/maintenance/work-orders"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-colors"
                  >
                    فتح أمر شغل
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}