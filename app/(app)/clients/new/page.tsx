"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type ToastState = { type: "success" | "error"; msg: string } | null;

export default function NewClientPage() {
  const t = useT();
  const router = useRouter();
  const token = useAuth((s) => s.token);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Prisma fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [hqAddress, setHqAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const [taxNo, setTaxNo] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || loading) return;

    const vName = name.trim();
    if (!vName) {
      setToast({ type: "error", msg: t("clients.errors.nameRequired") || "Name is required" });
      return;
    }

    setLoading(true);
    setToast(null);

    try {
      await api.post("/clients", {
        name: vName,
        email: email.trim() || null,
        phone: phone.trim() || null,
        hq_address: hqAddress.trim() || null,
        contact_name: contactName.trim() || null,
        contact_phone: contactPhone.trim() || null,
        contact_email: contactEmail.trim() || null,
        tax_no: taxNo.trim() || null,
        notes: notes.trim() || null,
      });

      setToast({ type: "success", msg: t("clients.new.toast.created") || "Client created" });

      // رجّع للقائمة بعد نجاح بسيط
      setTimeout(() => router.replace("/clients"), 400);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || t("clients.new.errors.createFailed") || "Create failed";
      setToast({ type: "error", msg: String(msg) });
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      <PageHeader
        title={t("clients.new.title")}
        subtitle={t("clients.new.subtitle")}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/clients")} disabled={loading}>
              {t("clients.new.buttons.back")}
            </Button>
            <Button onClick={() => (document.getElementById("new-client-form") as any)?.requestSubmit?.()} disabled={loading}>
              {loading ? t("clients.new.buttons.creating") : t("clients.new.buttons.create")}
            </Button>
          </div>
        }
      />

      <div className="max-w-3xl">
        <Card className="p-4">
          <form id="new-client-form" onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* name */}
              <div>
                <label className="text-sm text-slate-700">{t("clients.new.form.name")}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn("mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200")}
                  placeholder={t("clients.new.placeholders.name")}
                />
              </div>

              {/* email */}
              <div>
                <label className="text-sm text-slate-700">{t("clients.new.form.email")}</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn("mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200")}
                  placeholder={t("clients.new.placeholders.email")}
                />
              </div>

              {/* phone */}
              <div>
                <label className="text-sm text-slate-700">{t("clients.new.form.phone")}</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={cn("mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200")}
                  placeholder={t("clients.new.placeholders.phone")}
                />
              </div>

              {/* tax no */}
              <div>
                <label className="text-sm text-slate-700">{t("clients.new.form.taxNo")}</label>
                <input
                  value={taxNo}
                  onChange={(e) => setTaxNo(e.target.value)}
                  className={cn("mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200")}
                  placeholder={t("clients.new.placeholders.taxNo")}
                />
              </div>

              {/* HQ address */}
              <div className="md:col-span-2">
                <label className="text-sm text-slate-700">{t("clients.new.form.hqAddress")}</label>
                <input
                  value={hqAddress}
                  onChange={(e) => setHqAddress(e.target.value)}
                  className={cn("mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200")}
                  placeholder={t("clients.new.placeholders.hqAddress")}
                />
              </div>

              {/* contact name */}
              <div>
                <label className="text-sm text-slate-700">{t("clients.new.form.contactName")}</label>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className={cn("mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200")}
                  placeholder={t("clients.new.placeholders.contactName")}
                />
              </div>

              {/* contact phone */}
              <div>
                <label className="text-sm text-slate-700">{t("clients.new.form.contactPhone")}</label>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className={cn("mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200")}
                  placeholder={t("clients.new.placeholders.contactPhone")}
                />
              </div>

              {/* ✅ contact email */}
              <div className="md:col-span-2">
                <label className="text-sm text-slate-700">{t("clients.new.form.contactEmail")}</label>
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className={cn("mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200")}
                  placeholder={t("clients.new.placeholders.contactEmail")}
                />
              </div>

              {/* notes */}
              <div className="md:col-span-2">
                <label className="text-sm text-slate-700">{t("clients.new.form.notes")}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className={cn("mt-1 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200")}
                  placeholder={t("clients.new.placeholders.notes")}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" type="button" onClick={() => router.push("/clients")} disabled={loading}>
                {t("clients.new.buttons.back")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t("clients.new.buttons.creating") : t("clients.new.buttons.create")}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {toast ? (
        <Toast
          open={true}
          type={toast.type}
          message={toast.msg}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}