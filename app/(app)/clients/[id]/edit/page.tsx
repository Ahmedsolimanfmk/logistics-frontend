"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { useAuth } from "@/src/store/auth";

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

function emptyToNull(v: string) {
  const x = v.trim();
  return x ? x : null;
}

function toPayload(form: FormState): ClientPayload {
  return {
    name: form.name.trim(),
    phone: emptyToNull(form.phone),
    email: emptyToNull(form.email),
    hq_address: emptyToNull(form.hq_address),
    contact_name: emptyToNull(form.contact_name),
    contact_phone: emptyToNull(form.contact_phone),
    contact_email: emptyToNull(form.contact_email),
    tax_no: emptyToNull(form.tax_no),
    notes: emptyToNull(form.notes),
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

export default function EditClientPage() {
  const t = useT();
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const params = useParams();

  const id = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

  useEffect(() => {
    async function load() {
      if (!token || !id) return;

      setLoading(true);
      try {
        const client = await clientsService.getById(id);

        setForm({
          name: client?.name || "",
          phone: client?.phone || "",
          email: client?.email || "",
          hq_address: client?.hq_address || "",
          contact_name: client?.contact_name || "",
          contact_phone: client?.contact_phone || "",
          contact_email: client?.contact_email || "",
          tax_no: client?.tax_no || "",
          notes: client?.notes || "",
          is_active: Boolean(client?.is_active),
        });
      } catch (e: any) {
        setToast({
          type: "error",
          msg: e?.response?.data?.message || e?.message || t("clients.errors.loadFailed") || "فشل تحميل بيانات العميل",
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token, id, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !canSubmit || saving) return;

    setSaving(true);
    try {
      await clientsService.update(id, toPayload(form));
      setToast({
        type: "success",
        msg: t("clients.toast.updated") || "تم تحديث العميل بنجاح",
      });
      router.push(`/clients/${id}`);
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || t("clients.errors.updateFailed") || "فشل تحديث العميل",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6">{t("common.loading") || "جارٍ التحميل..."}</div>;
  }

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title={t("clients.edit.title") || "تعديل العميل"}
        subtitle={t("clients.edit.subtitle") || "تحديث بيانات العميل"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/clients/${id}`}>
              <Button variant="secondary">{t("common.back") || "رجوع"}</Button>
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
              : t("common.save") || "حفظ"}
          </Button>

          <Link href={`/clients/${id}`}>
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