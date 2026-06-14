"use client";

import Link from "next/link";
import { useState } from "react";
import useMaintenanceRequests from "@/src/hooks/maintenance/useMaintenanceRequests";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Modal } from "@/src/components/ui/Modal";

import {
  RequestForm,
  AttachmentUploader,
} from "@/src/components/maintenance/maintenance-components";

export default function MaintenanceRequestsPage() {
  const {
    items,
    meta,
    loading,
    error,
    vehicleOptions,
    attachmentsByRequest,
    createRequest,
    approveRequest,
    rejectRequest,
    setPage,
    fetchAttachments,
    uploadAttachments,
    deleteAttachment,
  } = useMaintenanceRequests();

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [approveData, setApproveData] = useState({
    maintenance_mode: "INTERNAL" as "INTERNAL" | "EXTERNAL",
    type: "CORRECTIVE" as "CORRECTIVE" | "PREVENTIVE",
    odometer: "",
    notes: ""
  });

  async function handleApprove() {
    if (!approveId) return;
    setActionLoadingId(approveId);
    try {
      await approveRequest(approveId, {
        ...approveData,
        odometer: Number(approveData.odometer)
      });
      setApproveId(null);
    } catch (e: any) {
      alert(e?.message || "Error approving request");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject() {
    if (!rejectId) return;

    setActionLoadingId(rejectId);
    try {
      await rejectRequest(rejectId, { reason: "مرفوض" });
      setRejectId(null);
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <PageHeader
        title="طلبات الصيانة"
        subtitle="إدارة طلبات الصيانة وربطها بأوامر العمل"
      />

      <Card>
        <RequestForm
          vehicleOptions={vehicleOptions}
          onSubmit={async (payload) => {
            await createRequest(payload);
          }}
        />
      </Card>

      {loading && <p className="text-sm text-slate-500">جاري التحميل...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        {items.map((r) => {
          const status = String(r.status || "").toUpperCase();
          const isSubmitted = status === "SUBMITTED";
          const isApproved = status === "APPROVED";
          const isRejected = status === "REJECTED";
          const isActing = actionLoadingId === r.id;

          return (
            <Card key={r.id}>
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-semibold text-lg">
                      {r.problem_title}
                    </div>

                    {r.problem_description ? (
                      <div className="text-sm text-gray-500 mt-1">
                        {r.problem_description}
                      </div>
                    ) : null}
                  </div>

                  <StatusBadge status={r.status} />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {isSubmitted ? (
                    <>
                      <Button
                        onClick={() => setApproveId(r.id)}
                        disabled={isActing}
                        isLoading={isActing}
                        variant="primary"
                      >
                        تحويل لأمر عمل (اعتماد)
                      </Button>

                      <Button
                        onClick={() => setRejectId(r.id)}
                        disabled={isActing}
                        variant="danger"
                      >
                        رفض
                      </Button>
                    </>
                  ) : null}

                  {isApproved ? (
                    <Link href="/maintenance/work-orders">
                      <Button variant="secondary">
                        عرض أوامر العمل
                      </Button>
                    </Link>
                  ) : null}

                  {isRejected ? (
                    <span className="text-sm text-red-600">
                      تم رفض هذا الطلب
                    </span>
                  ) : null}
                </div>

                <AttachmentUploader
                  requestId={r.id}
                  attachments={attachmentsByRequest[r.id] || []}
                  onLoad={fetchAttachments}
                  onUpload={uploadAttachments}
                  onDelete={deleteAttachment}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between items-center">
        <Button
          disabled={meta.page <= 1}
          onClick={() => setPage(meta.page - 1)}
          variant="secondary"
        >
          السابق
        </Button>

        <span className="text-sm text-slate-600">
          {meta.page} / {meta.pages || 1}
        </span>

        <Button
          disabled={meta.page >= meta.pages}
          onClick={() => setPage(meta.page + 1)}
          variant="secondary"
        >
          التالي
        </Button>
      </div>

      <ConfirmDialog
        open={!!rejectId}
        title="تأكيد الرفض"
        description="هل أنت متأكد من رفض طلب الصيانة؟"
        confirmText="رفض"
        cancelText="إلغاء"
        tone="danger"
        isLoading={!!rejectId && actionLoadingId === rejectId}
        onClose={() => setRejectId(null)}
        onConfirm={handleReject}
      />

      {!!approveId && (
        <Modal open={!!approveId} title="اعتماد وتحويل لأمر عمل" onClose={() => setApproveId(null)}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-bold">نوع الصيانة</label>
              <select className="w-full border p-2 rounded" value={approveData.type} onChange={e => setApproveData({ ...approveData, type: e.target.value as any })}>
                <option value="CORRECTIVE">علاجية (Corrective)</option>
                <option value="PREVENTIVE">وقائية (Preventive)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-bold">نمط التنفيذ</label>
              <select className="w-full border p-2 rounded" value={approveData.maintenance_mode} onChange={e => setApproveData({ ...approveData, maintenance_mode: e.target.value as any })}>
                <option value="INTERNAL">داخلي (ورشة الشركة)</option>
                <option value="EXTERNAL">خارجي (مركز صيانة خارجي)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-bold">قراءة العداد الحالية</label>
              <input type="number" className="w-full border p-2 rounded" value={approveData.odometer} onChange={e => setApproveData({ ...approveData, odometer: e.target.value })} />
            </div>
            <div>
              <label className="block mb-1 font-bold">ملاحظات لمهندس الورشة</label>
              <textarea className="w-full border p-2 rounded" value={approveData.notes} onChange={e => setApproveData({ ...approveData, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setApproveId(null)}>إلغاء</Button>
              <Button variant="primary" onClick={handleApprove} isLoading={!!approveId && actionLoadingId === approveId}>اعتماد</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}