"use client";

import React from "react";
import { Button } from "@/src/components/ui/Button";

type ActionResponse = {
  action?: string | null;
  answer?: string;
  ui?: {
    title?: string;
    summary?: string;
    badges?: string[];
  } | null;
  execution?: {
    ready_to_execute?: boolean;
    payload?: any;
    missing_fields?: string[];
  } | null;
  parsed?: {
    intent?: string;
    action_payload?: any;
  } | null;
};

function actionLabel(action?: string | null) {
  if (action === "create_expense") return "تسجيل مصروف";
  if (action === "create_work_order") return "إنشاء أمر عمل";
  if (action === "create_maintenance_request") return "إنشاء طلب صيانة";
  return "تنفيذ إجراء";
}

function renderPayload(payload: any) {
  if (!payload || typeof payload !== "object") return [];

  const labels: Record<string, string> = {
    amount: "القيمة",
    expense_type: "نوع المصروف",
    vehicle_hint: "المركبة",
    trip_hint: "الرحلة",
    work_order_hint: "أمر العمل",
    vendor_name: "المورد",
    paid_method: "طريقة الدفع",
    title: "العنوان",
    description: "الوصف",
    notes: "ملاحظات",
  };

  return Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      key,
      label: labels[key] || key,
      value: typeof value === "object" ? JSON.stringify(value) : String(value),
    }));
}

export function DashboardActionConfirmModal({
  open,
  response,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  response: ActionResponse | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open || !response) return null;

  const action = response.action || response.parsed?.intent || null;
  const payload = response.execution?.payload || response.parsed?.action_payload || {};
  const fields = renderPayload(payload);
  const missing = response.execution?.missing_fields || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">
              تأكيد إجراء تنفيذي
            </div>
            <h3 className="mt-1 text-lg font-bold text-[rgb(var(--trex-fg))]">
              {actionLabel(action)}
            </h3>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-black/10 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            disabled={loading}
          >
            إغلاق
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
          {response.answer ||
            response.ui?.summary ||
            "هذا الإجراء سيقوم بتعديل بيانات النظام. راجع التفاصيل قبل التأكيد."}
        </div>

        {fields.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
            <div className="border-b border-black/10 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
              بيانات الإجراء
            </div>

            <div className="divide-y divide-black/10">
              {fields.map((field) => (
                <div key={field.key} className="grid grid-cols-3 gap-3 px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-500">{field.label}</div>
                  <div className="col-span-2 break-words text-slate-900">
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {missing.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            توجد بيانات ناقصة: {missing.join(", ")}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            إلغاء
          </Button>

          <Button onClick={onConfirm} isLoading={loading} disabled={missing.length > 0}>
            تأكيد التنفيذ
          </Button>
        </div>
      </div>
    </div>
  );
}