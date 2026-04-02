"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";

import { clientsService } from "@/src/services/clients.service";
import type { ClientPayload } from "@/src/types/clients.types";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type FormState = {
  name: string;
  phone: string;
  email: string;
  hq_address: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  tax_no: string;
  notes: string;
  is_active: boolean;
};

function toPayload(form: FormState): ClientPayload {
  const clean = (v: string) => {
    const x = v.trim();
    return x ? x : null;
  };

  return {
    name: form.name.trim(),
    phone: clean(form.phone),
    email: clean(form.email),
    hq_address: clean(form.hq_address),
    contact_name: clean(form.contact_name),
    contact_phone: clean(form.contact_phone),
    contact_email: clean(form.contact_email),
    tax_no: clean(form.tax_no),
    notes: clean(form.notes),
    is_active: form.is_active,
  };
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-slate-500">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
          "focus:ring-2 focus:ring-slate-200"
        )}
      />
    </label>
  );
}

export default function NewClientPage() {
  const t = useT();
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",
    email: "",
    hq_address: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    tax_no: "",
    notes: "",
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;

    setSaving(true);
    try {
      const created = await clientsService.create(toPayload(form));
      setToast({
        type: "success",
        msg: t("clients.toast.created") || "تم إنشاء العميل بنجاح",
      });
      router.push(`/clients/${created.id}`);
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || t("clients.errors.createFailed") || "فشل إنشاء العميل",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title={t("clients.new.title") || "إضافة عميل"}
        subtitle={t("clients.new.subtitle") || "إنشاء سجل عميل جديد"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/clients">
              <Button variant="secondary">{t("common.cancel") || "إلغاء"}</Button>
            </Link>
          </div>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {t("clients.form.sections.basic") || "البيانات الأساسية"}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label={t("clients.form.name") || "اسم العميل"}
              value={form.name}
              onChange={(v) => setForm((s) => ({ ...s, name: v }))}
              placeholder={t("clients.form.placeholders.name") || "أدخل اسم العميل"}
              required
            />

            <Field
              label={t("clients.form.phone") || "الهاتف"}
              value={form.phone}
              onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
              placeholder={t("clients.form.placeholders.phone") || "أدخل رقم الهاتف"}
            />

            <Field
              label={t("clients.form.email") || "البريد الإلكتروني"}
              value={form.email}
              onChange={(v) => setForm((s) => ({ ...s, email: v }))}
              placeholder={t("clients.form.placeholders.email") || "name@example.com"}
              type="email"
            />

            <Field
              label={t("clients.form.hqAddress") || "العنوان الرئيسي"}
              value={form.hq_address}
              onChange={(v) => setForm((s) => ({ ...s, hq_address: v }))}
              placeholder={t("clients.form.placeholders.hqAddress") || "أدخل العنوان الرئيسي"}
            />

            <Field
              label={t("clients.form.taxNo") || "الرقم الضريبي"}
              value={form.tax_no}
              onChange={(v) => setForm((s) => ({ ...s, tax_no: v }))}
              placeholder={t("clients.form.placeholders.taxNo") || "أدخل الرقم الضريبي"}
            />

            <label className="block">
              <div className="mb-1 text-xs font-medium text-slate-500">
                {t("clients.form.status") || "الحالة"}
              </div>
              <select
                value={form.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    is_active: e.target.value === "active",
                  }))
                }
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
              >
                <option value="active">{t("common.active") || "نشط"}</option>
                <option value="inactive">{t("common.disabled") || "غير نشط"}</option>
              </select>
            </label>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {t("clients.form.sections.contact") || "بيانات المسؤول"}
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field
              label={t("clients.form.contactName") || "اسم المسؤول"}
              value={form.contact_name}
              onChange={(v) => setForm((s) => ({ ...s, contact_name: v }))}
              placeholder={t("clients.form.placeholders.contactName") || "أدخل اسم المسؤول"}
            />

            <Field
              label={t("clients.form.contactPhone") || "هاتف المسؤول"}
              value={form.contact_phone}
              onChange={(v) => setForm((s) => ({ ...s, contact_phone: v }))}
              placeholder={t("clients.form.placeholders.contactPhone") || "أدخل هاتف المسؤول"}
            />

            <Field
              label={t("clients.form.contactEmail") || "بريد المسؤول"}
              value={form.contact_email}
              onChange={(v) => setForm((s) => ({ ...s, contact_email: v }))}
              placeholder={t("clients.form.placeholders.contactEmail") || "contact@example.com"}
              type="email"
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {t("clients.form.sections.notes") || "ملاحظات"}
          </h2>

          <label className="block">
            <div className="mb-1 text-xs font-medium text-slate-500">
              {t("clients.form.notes") || "ملاحظات"}
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              rows={5}
              placeholder={t("clients.form.placeholders.notes") || "أدخل أي ملاحظات إضافية"}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            />
          </label>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!canSubmit || saving}>
            {saving
              ? t("common.saving") || "جارٍ الحفظ..."
              : t("clients.actions.create") || "إنشاء العميل"}
          </Button>

          <Link href="/clients">
            <Button type="button" variant="secondary">
              {t("common.cancel") || "إلغاء"}
            </Button>
          </Link>
        </div>
      </form>

      {toast && (
        <Toast open type={toast.type} message={toast.msg} onClose={() => setToast(null)} />
      )}
    </div>
  );
}