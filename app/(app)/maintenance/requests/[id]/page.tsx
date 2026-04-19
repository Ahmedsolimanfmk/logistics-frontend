"use client";

import { useState } from "react";
import useMaintenanceRequests from "@/src/hooks/maintenance/useMaintenanceRequests";

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

  const [form, setForm] = useState({
    vehicle_id: "",
    problem_title: "",
    problem_description: "",
  });

  const [files, setFiles] = useState<File[]>([]);

  async function handleCreate(e: any) {
    e.preventDefault();
    await createRequest(form);
    setForm({ vehicle_id: "", problem_title: "", problem_description: "" });
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">طلبات الصيانة</h1>

      {/* Create Form */}
      <form onSubmit={handleCreate} className="space-y-3 border p-4 rounded">
        <select
          value={form.vehicle_id}
          onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })}
          className="border p-2 w-full"
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
          className="border p-2 w-full"
        />

        <textarea
          placeholder="وصف المشكلة"
          value={form.problem_description}
          onChange={(e) =>
            setForm({ ...form, problem_description: e.target.value })
          }
          className="border p-2 w-full"
        />

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          إنشاء طلب
        </button>
      </form>

      {/* List */}
      {loading && <p>جاري التحميل...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="space-y-3">
        {items.map((r) => (
          <div key={r.id} className="border p-4 rounded space-y-3">
            <div className="font-semibold">{r.problem_title}</div>
            <div className="text-sm text-gray-600">{r.status}</div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => approveRequest(r.id, {})}
                className="bg-green-600 text-white px-3 py-1 rounded"
              >
                اعتماد
              </button>

              <button
                onClick={() => rejectRequest(r.id, { reason: "مرفوض" })}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                رفض
              </button>

              <button
                onClick={() => fetchAttachments(r.id)}
                className="bg-gray-600 text-white px-3 py-1 rounded"
              >
                عرض المرفقات
              </button>
            </div>

            {/* Upload */}
            <div className="flex gap-2 items-center">
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
              <button
                onClick={() => uploadAttachments(r.id, files)}
                className="bg-blue-500 text-white px-3 py-1 rounded"
              >
                رفع
              </button>
            </div>

            {/* Attachments List */}
            <div className="space-y-1">
              {(attachmentsByRequest[r.id] || []).map((a) => (
                <div key={a.id} className="flex justify-between border p-2 rounded">
                  <span>{a.original_name}</span>
                  <button
                    onClick={() => deleteAttachment(r.id, a.id)}
                    className="text-red-600"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex gap-2">
        <button
          disabled={meta.page <= 1}
          onClick={() => setPage(meta.page - 1)}
          className="border px-3 py-1"
        >
          السابق
        </button>
        <span>
          {meta.page} / {meta.pages}
        </span>
        <button
          disabled={meta.page >= meta.pages}
          onClick={() => setPage(meta.page + 1)}
          className="border px-3 py-1"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
