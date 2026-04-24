"use client";

import { useState } from "react";
import type {
  Attachment,
  MaintenanceRequest,
  VehicleOption,
} from "@/src/services/maintenance-requests.service";

// =====================
// Request Form
// =====================
export function RequestForm({
  vehicleOptions,
  onSubmit,
}: {
  vehicleOptions: VehicleOption[];
  onSubmit: (payload: {
    vehicle_id: string;
    problem_title: string;
    problem_description: string;
  }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    vehicle_id: "",
    problem_title: "",
    problem_description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      setForm({ vehicle_id: "", problem_title: "", problem_description: "" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border p-4 rounded-xl bg-white">
      <select
        value={form.vehicle_id}
        onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
        className="border p-2 w-full rounded"
      >
        <option value="">اختر العربية</option>
        {vehicleOptions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>

      <input
        placeholder="عنوان المشكلة"
        value={form.problem_title}
        onChange={(e) => setForm({ ...form, problem_title: e.target.value })}
        className="border p-2 w-full rounded"
      />

      <textarea
        placeholder="وصف المشكلة"
        value={form.problem_description}
        onChange={(e) =>
          setForm({ ...form, problem_description: e.target.value })
        }
        className="border p-2 w-full rounded"
      />

      <button
        disabled={submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {submitting ? "جاري الإنشاء..." : "إنشاء طلب"}
      </button>
    </form>
  );
}

// =====================
// Attachment Uploader
// =====================
export function AttachmentUploader({
  requestId,
  attachments,
  onLoad,
  onUpload,
  onDelete,
}: {
  requestId: string;
  attachments: Attachment[];
  onLoad: (requestId: string) => Promise<any>;
  onUpload: (requestId: string, files: File[]) => Promise<any>;
  onDelete: (requestId: string, attachmentId: string) => Promise<any>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLoad() {
    setLoading(true);
    try {
      await onLoad(requestId);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!files.length) return;
    setUploading(true);
    try {
      await onUpload(requestId, files);
      setFiles([]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleLoad}
          className="bg-gray-600 text-white px-3 py-1 rounded"
          type="button"
        >
          {loading ? "جاري التحميل..." : "عرض المرفقات"}
        </button>

        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
        />

        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
          type="button"
        >
          {uploading ? "جاري الرفع..." : "رفع"}
        </button>
      </div>

      <div className="space-y-2">
        {attachments.map((a) => (
          <div key={a.id} className="flex justify-between items-center border p-2 rounded">
            <div className="text-sm">{a.original_name}</div>
            <button
              onClick={() => onDelete(requestId, a.id)}
              className="text-red-600 text-sm"
              type="button"
            >
              حذف
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================
// Status Badge
// =====================
export function RequestStatusBadge({ status }: { status: string }) {
  const normalized = String(status || "").toUpperCase();

  const cls =
    normalized === "SUBMITTED"
      ? "bg-yellow-100 text-yellow-800"
      : normalized === "APPROVED"
      ? "bg-green-100 text-green-800"
      : normalized === "REJECTED"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-700";

  return (
    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${cls}`}>
      {normalized}
    </span>
  );
}

// =====================
// Request Card
// =====================
export function RequestCard({
  request,
  attachments,
  onApprove,
  onReject,
  onLoadAttachments,
  onUploadAttachments,
  onDeleteAttachment,
}: {
  request: MaintenanceRequest;
  attachments: Attachment[];
  onApprove: (id: string) => Promise<any>;
  onReject: (id: string) => Promise<any>;
  onLoadAttachments: (requestId: string) => Promise<any>;
  onUploadAttachments: (requestId: string, files: File[]) => Promise<any>;
  onDeleteAttachment: (requestId: string, attachmentId: string) => Promise<any>;
}) {
  const [acting, setActing] = useState(false);
  const isSubmitted = String(request.status).toUpperCase() === "SUBMITTED";

  async function handleApprove() {
    setActing(true);
    try {
      await onApprove(request.id);
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    const confirmed = window.confirm("هل أنت متأكد من رفض الطلب؟");
    if (!confirmed) return;

    setActing(true);
    try {
      await onReject(request.id);
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="border p-4 rounded-xl bg-white space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-base">{request.problem_title}</div>
          {request.problem_description ? (
            <div className="text-sm text-gray-600 mt-1">{request.problem_description}</div>
          ) : null}
        </div>
        <RequestStatusBadge status={request.status} />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleApprove}
          disabled={!isSubmitted || acting}
          className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
          type="button"
        >
          اعتماد
        </button>

        <button
          onClick={handleReject}
          disabled={!isSubmitted || acting}
          className="bg-red-600 text-white px-3 py-1 rounded disabled:opacity-50"
          type="button"
        >
          رفض
        </button>
      </div>

      <AttachmentUploader
        requestId={request.id}
        attachments={attachments}
        onLoad={onLoadAttachments}
        onUpload={onUploadAttachments}
        onDelete={onDeleteAttachment}
      />
    </div>
  );
}
