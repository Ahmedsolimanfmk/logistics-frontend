"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { clientsService } from "@/src/services/clients.service";
import { useT } from "@/src/i18n/useT";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Toast } from "@/src/components/Toast";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

export default function EditClientPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();

  const id = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    hq_address: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    tax_no: "",
    notes: "",
    is_active: "true",
  });

  function showToast(type: "success" | "error", message: string) {
    setToastType(type);
    setToastMsg(message);
    setToastOpen(true);
  }

  function patch(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function load() {
    if (!id) return;

    setLoading(true);

    try {
      const client = await clientsService.getById(id);

      setForm({
        name: String(client.name || ""),
        email: String(client.email || client.billing_email || ""),
        phone: String(client.phone || ""),
        hq_address: String(client.hq_address || ""),
        contact_name: String(
          client.contact_name || client.primary_contact_name || ""
        ),
        contact_phone: String(
          client.contact_phone || client.primary_contact_phone || ""
        ),
        contact_email: String(
          client.contact_email || client.primary_contact_email || ""
        ),
        tax_no: String(client.tax_no ||  ""),
        notes: String(client.notes || ""),
        is_active: client.is_active === false ? "false" : "true",
      });
    } catch (err: any) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          t("clients.details.errors.loadFailed") ||
          "فشل تحميل بيانات العميل"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const name = form.name.trim();

    if (!name) {
      showToast("error", t("clients.errors.nameRequired") || "اسم العميل مطلوب");
      return;
    }

    setSaving(true);

    try {
      await clientsService.update(id, {
        name,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        hq_address: form.hq_address.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        tax_no: form.tax_no.trim() || null,
        notes: form.notes.trim() || null,
        is_active: form.is_active === "true",
      });

      showToast("success", t("clients.toast.updated") || "تم تحديث العميل");
      router.push(`/clients/${id}`);
    } catch (err: any) {
      showToast(
        "error",
        err?.response?.data?.message ||
          err?.message ||
          t("clients.errors.saveFailed") ||
          "فشل حفظ العميل"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <Card>
          <div className="text-sm text-slate-500">{t("common.loading")}</div>
        </Card>

        <Toast
          open={toastOpen}
          message={toastMsg}
          type={toastType}
          dir="rtl"
          onClose={() => setToastOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        title={t("clients.edit.title") || "تعديل العميل"}
        subtitle={t("clients.edit.subtitle") || "تحديث بيانات العميل"}
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/clients/${id}`)}
            disabled={saving}
          >
            {t("common.back")}
          </Button>
        }
      />

      <form onSubmit={submit}>
        <Card title={t("clients.form.sections.basic") || "البيانات الأساسية"}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TrexInput
              label="clients.form.name"
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder={t("clients.form.placeholders.name")}
              disabled={saving}
              required
            />

            <TrexSelect
              label="clients.form.status"
              value={form.is_active}
              onChange={(value) => patch("is_active", value)}
              disabled={saving}
              options={[
                { value: "true", label: t("common.active") },
                { value: "false", label: t("common.disabled") },
              ]}
            />

            <TrexInput
              label="clients.form.email"
              type="email"
              value={form.email}
              onChange={(e) => patch("email", e.target.value)}
              placeholder={t("clients.form.placeholders.email")}
              disabled={saving}
            />

            <TrexInput
              label="clients.form.phone"
              value={form.phone}
              onChange={(e) => patch("phone", e.target.value)}
              placeholder={t("clients.form.placeholders.phone")}
              disabled={saving}
            />

            <div className="md:col-span-2">
              <TrexInput
                label="clients.form.hqAddress"
                value={form.hq_address}
                onChange={(e) => patch("hq_address", e.target.value)}
                placeholder={t("clients.form.placeholders.hqAddress")}
                disabled={saving}
              />
            </div>

            <TrexInput
              label="clients.form.taxNo"
              value={form.tax_no}
              onChange={(e) => patch("tax_no", e.target.value)}
              placeholder={t("clients.form.placeholders.taxNo")}
              disabled={saving}
            />
          </div>
        </Card>

        <div className="mt-4">
          <Card title={t("clients.form.sections.contact") || "بيانات التواصل"}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <TrexInput
                label="clients.form.contactName"
                value={form.contact_name}
                onChange={(e) => patch("contact_name", e.target.value)}
                placeholder={t("clients.form.placeholders.contactName")}
                disabled={saving}
              />

              <TrexInput
                label="clients.form.contactPhone"
                value={form.contact_phone}
                onChange={(e) => patch("contact_phone", e.target.value)}
                placeholder={t("clients.form.placeholders.contactPhone")}
                disabled={saving}
              />

              <TrexInput
                label="clients.form.contactEmail"
                type="email"
                value={form.contact_email}
                onChange={(e) => patch("contact_email", e.target.value)}
                placeholder={t("clients.form.placeholders.contactEmail")}
                disabled={saving}
              />
            </div>
          </Card>
        </div>

        <div className="mt-4">
          <Card title={t("clients.form.sections.notes") || "ملاحظات"}>
            <label className="grid gap-2 text-sm">
              <span className="text-[rgb(var(--trex-fg))] opacity-80">
                {t("clients.form.notes")}
              </span>

              <textarea
                rows={4}
                className="trex-input w-full px-3 py-2 text-sm"
                value={form.notes}
                onChange={(e) => patch("notes", e.target.value)}
                placeholder={t("clients.form.placeholders.notes")}
                disabled={saving}
              />
            </label>
          </Card>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            isLoading={saving}
          >
            {saving ? t("common.saving") : t("common.save")}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/clients/${id}`)}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        dir="rtl"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}