// app/(app)/clients/[id]/edit/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type ClientDetailsResponse = {
  client: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;

    hq_address?: string | null;

    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;

    tax_no?: string | null;
    notes?: string | null;

    is_active: boolean;
    created_at?: string | null;
    updated_at?: string | null;
  };
};

export default function ClientEditPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const token = useAuth((s) => s.token);

  const id = String(params?.id || "");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hqAddress, setHqAddress] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [taxNo, setTaxNo] = useState("");
  const [notes, setNotes] = useState("");

  const inputClass = useMemo(
    () =>
      cn(
        "w-full px-3 py-2 rounded-xl",
        "bg-white border border-slate-200 outline-none text-sm",
        "focus:ring-2 focus:ring-slate-200"
      ),
    []
  );

  async function load() {
    if (!token || !id) return;

    setLoading(true);
    try {
      const res = await api.get(`/clients/${id}/details`);
      const data = (res as any)?.data ?? res;

      const payload = data as ClientDetailsResponse;
      const c = payload?.client;

      if (!c?.id) {
        setToast({ type: "error", msg: t("clients.details.errors.loadFailed") || "Failed to load client" });
        return;
      }

      setName(c.name ?? "");
      setEmail(c.email ?? "");
      setPhone(c.phone ?? "");
      setHqAddress(c.hq_address ?? "");

      setContactName(c.contact_name ?? "");
      setContactPhone(c.contact_phone ?? "");
      setContactEmail(c.contact_email ?? "");

      setTaxNo(c.tax_no ?? "");
      setNotes(c.notes ?? "");
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || t("clients.details.errors.loadFailed") || "Failed to load client" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  async function onSave() {
    if (!id) return;
    if (saving) return;

    const vName = name.trim();
    if (!vName) {
      setToast({ type: "error", msg: t("clients.errors.nameRequired") || "Name is required" });
      return;
    }

    setSaving(true);
    setToast(null);

    try {
      // 1) Update name (existing endpoint)
      await api.put(`/clients/${id}`, { name: vName });

      // 2) Update profile fields (new endpoint you should add)
      await api.put(`/clients/${id}/profile`, {
        email: email.trim() || null,
        phone: phone.trim() || null,
        hq_address: hqAddress.trim() || null,

        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,

        tax_no: taxNo.trim() || null,
        notes: notes.trim() || null,
      });

      setToast({ type: "success", msg: t("clients.toast.updated") || "Client updated" });

      // رجوع للتفاصيل
      router.push(`/clients/${id}`);
    } catch (e: any) {
      setToast({ type: "error", msg: e?.response?.data?.message || e?.message || t("clients.errors.saveFailed") || "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title={t("clients.edit.title") || "Edit client"}
        subtitle={t("clients.edit.subtitle") || "Update client profile"}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push(`/clients/${id}`)} disabled={saving}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button onClick={onSave} disabled={saving || loading}>
              {saving ? (t("common.saving") || "Saving…") : (t("common.save") || "Save")}
            </Button>
          </div>
        }
      />

      <div className="mt-4 space-y-4">
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">{t("clients.edit.sections.basic") || "Basic info"}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">{t("clients.edit.form.name") || "Name"}</div>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("clients.edit.placeholders.name") || "Client name"} />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">{t("clients.edit.form.email") || "Email"}</div>
              <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("clients.edit.placeholders.email") || "client@email.com"} />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">{t("clients.edit.form.phone") || "Phone"}</div>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("clients.edit.placeholders.phone") || "+20..."} />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">{t("clients.edit.form.hqAddress") || "HQ address"}</div>
              <input className={inputClass} value={hqAddress} onChange={(e) => setHqAddress(e.target.value)} placeholder={t("clients.edit.placeholders.hqAddress") || "Address"} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">{t("clients.edit.sections.contact") || "Contact person"}</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">{t("clients.edit.form.contactName") || "Contact name"}</div>
              <input className={inputClass} value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t("clients.edit.placeholders.contactName") || "Name"} />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">{t("clients.edit.form.contactPhone") || "Contact phone"}</div>
              <input className={inputClass} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={t("clients.edit.placeholders.contactPhone") || "+20..."} />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">{t("clients.edit.form.contactEmail") || "Contact email"}</div>
              <input className={inputClass} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder={t("clients.edit.placeholders.contactEmail") || "contact@email.com"} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">{t("clients.edit.sections.finance") || "Finance"}</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-500 mb-1">{t("clients.edit.form.taxNo") || "Tax number"}</div>
              <input className={inputClass} value={taxNo} onChange={(e) => setTaxNo(e.target.value)} placeholder={t("clients.edit.placeholders.taxNo") || "Tax No"} />
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-1">{t("clients.edit.form.notes") || "Notes"}</div>
              <textarea className={cn(inputClass, "min-h-[90px]")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("clients.edit.placeholders.notes") || "Notes"} />
            </div>
          </div>
        </Card>

        {loading ? <div className="text-sm text-slate-500">{t("common.loading") || "Loading..."}</div> : null}
      </div>

      {toast && <Toast open type={toast.type} message={toast.msg} onClose={() => setToast(null)} />}
    </div>
  );
}