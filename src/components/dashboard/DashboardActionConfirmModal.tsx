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

type Props = {
  open: boolean;
  response: ActionResponse | null;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function actionKey(response: ActionResponse | null) {
  return response?.action || response?.parsed?.intent || "unknown_action";
}

function actionLabel(action?: string | null) {
  if (action === "create_expense") return "تسجيل مصروف";
  if (action === "create_work_order") return "إنشاء أمر عمل";
  if (action === "create_maintenance_request") return "إنشاء طلب صيانة";
  return "تنفيذ إجراء";
}

function actionWarning(action?: string | null) {
  if (action === "create_expense") {
    return {
      title: "تنبيه مالي",
      text: "هذا الإجراء سيُنشئ مصروفًا جديدًا داخل النظام وقد يؤثر على التقارير المالية وحالة الاعتماد.",
      tone: "amber",
    };
  }

  if (action === "create_work_order") {
    return {
      title: "تنبيه تشغيلي",
      text: "هذا الإجراء سيُنشئ أمر عمل وقد يغيّر حالة المركبة إلى الصيانة حسب منطق الباك اند.",
      tone: "blue",
    };
  }

  if (action === "create_maintenance_request") {
    return {
      title: "تنبيه صيانة",
      text: "هذا الإجراء سيُنشئ طلب صيانة جديدًا للمركبة المحددة ليتم التعامل معه لاحقًا.",
      tone: "blue",
    };
  }

  return {
    title: "تأكيد مطلوب",
    text: "راجع البيانات قبل التنفيذ. بعض الإجراءات قد تقوم بتعديل بيانات النظام.",
    tone: "amber",
  };
}

function fieldLabel(key: string) {
  const labels: Record<string, string> = {
    amount: "القيمة",
    expense_type: "نوع المصروف",
    vehicle_hint: "المركبة",
    vehicle_id: "معرف المركبة",
    trip_hint: "الرحلة",
    trip_id: "معرف الرحلة",
    work_order_hint: "أمر العمل",
    maintenance_work_order_id: "معرف أمر العمل",
    vendor_name: "المورد",
    paid_method: "طريقة الدفع",
    payment_source: "مصدر الدفع",
    cash_advance_id: "العهدة",
    title: "العنوان",
    description: "الوصف",
    notes: "ملاحظات",
    receipt_url: "رابط الإيصال",
    invoice_no: "رقم الفاتورة",
    invoice_date: "تاريخ الفاتورة",
    vat_amount: "قيمة الضريبة",
    invoice_total: "إجمالي الفاتورة",
  };

  return labels[key] || key;
}

function valueLabel(key: string, value: any) {
  if (value === null || value === undefined || value === "") return "—";

  const upper = String(value).toUpperCase();

  if (key === "expense_type") {
    const map: Record<string, string> = {
      FUEL: "وقود",
      MAINTENANCE: "صيانة",
      TOLL: "رسوم طريق / بوابة",
      DRIVER_ALLOWANCE: "بدل سائق",
      LOADING: "تحميل",
      UNLOADING: "تنزيل / تفريغ",
      PARTS_PURCHASE: "شراء قطع غيار",
      EMERGENCY: "طارئ",
      OTHER: "أخرى",
    };

    return map[upper] || String(value);
  }

  if (key === "paid_method") {
    const map: Record<string, string> = {
      CASH: "نقدي",
      BANK_TRANSFER: "تحويل بنكي",
      CHEQUE: "شيك",
      CARD: "بطاقة",
      OTHER: "أخرى",
    };

    return map[upper] || String(value);
  }

  if (key === "payment_source") {
    const map: Record<string, string> = {
      ADVANCE: "عهدة",
      COMPANY: "الشركة",
    };

    return map[upper] || String(value);
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("ar-EG", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (typeof value === "boolean") return value ? "نعم" : "لا";

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function payloadEntries(payload: any) {
  if (!payload || typeof payload !== "object") return [];

  const preferredOrder = [
    "amount",
    "expense_type",
    "payment_source",
    "vehicle_hint",
    "trip_hint",
    "work_order_hint",
    "vendor_name",
    "paid_method",
    "title",
    "description",
    "notes",
  ];

  const entries = Object.entries(payload).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );

  const sorted = [
    ...preferredOrder
      .map((key) => entries.find(([entryKey]) => entryKey === key))
      .filter(Boolean),
    ...entries.filter(([key]) => !preferredOrder.includes(key)),
  ] as Array<[string, any]>;

  return sorted.map(([key, value]) => ({
    key,
    label: fieldLabel(key),
    value: valueLabel(key, value),
  }));
}

function toneClasses(tone: string) {
  if (tone === "blue") {
    return "border-blue-200 bg-blue-50 text-blue-900";
  }

  return "border-amber-200 bg-amber-50 text-amber-900";
}

export function DashboardActionConfirmModal({
  open,
  response,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open || !response) return null;

  const action = actionKey(response);
  const payload = response.execution?.payload || response.parsed?.action_payload || {};
  const fields = payloadEntries(payload);
  const missing = response.execution?.missing_fields || [];
  const warning = actionWarning(action);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500">
              تأكيد إجراء تنفيذي
            </div>

            <h3 className="mt-1 text-lg font-bold text-[rgb(var(--trex-fg))]">
              {actionLabel(action)}
            </h3>

            {response.ui?.badges?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {response.ui.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-black/10 bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-700"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-black/10 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-50"
            disabled={loading}
          >
            إغلاق
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700">
          {response.answer ||
            response.ui?.summary ||
            "هذا الإجراء سيقوم بتعديل بيانات النظام. راجع التفاصيل قبل التأكيد."}
        </div>

        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-7 ${toneClasses(warning.tone)}`}>
          <div className="font-bold">{warning.title}</div>
          <div className="mt-1">{warning.text}</div>
        </div>

        {fields.length > 0 ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10">
            <div className="border-b border-black/10 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600">
              بيانات الإجراء قبل التنفيذ
            </div>

            <div className="max-h-72 divide-y divide-black/10 overflow-auto">
              {fields.map((field) => (
                <div key={field.key} className="grid grid-cols-3 gap-3 px-4 py-3 text-sm">
                  <div className="font-semibold text-slate-500">{field.label}</div>
                  <div className="col-span-2 break-words font-medium text-slate-900">
                    {field.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-black/10 bg-black/[0.02] px-4 py-3 text-sm text-slate-500">
            لا توجد بيانات إضافية لعرضها.
          </div>
        )}

        {missing.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            توجد بيانات ناقصة: {missing.map(fieldLabel).join(", ")}
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
