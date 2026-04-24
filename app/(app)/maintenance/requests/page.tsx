"use client";

import Link from "next/link";
import { useState } from "react";
import useMaintenanceRequests from "@/src/hooks/maintenance/useMaintenanceRequests";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";

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
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setActionLoadingId(id);
    try {
      await approveRequest(id, {});
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
                        onClick={() => handleApprove(r.id)}
                        disabled={isActing}
                        isLoading={isActing}
                        variant="primary"
                      >
                        اعتماد
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
    </div>
  );
}