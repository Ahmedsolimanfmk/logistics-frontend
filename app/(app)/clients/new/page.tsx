"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Toast } from "@/src/components/Toast";

import { useT } from "@/src/i18n/useT";
import { api } from "@/src/lib/api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function NewClientPage() {
  const t = useT();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      setToast({
        type: "error",
        msg: t("clients.new.errors.nameRequired"),
      });
      return;
    }

    try {
      setLoading(true);

      await api.post("/clients", {
        name,
        email,
        phone,
        hq_address: address,
        notes,
      });

      setToast({
        type: "success",
        msg: t("clients.new.toast.created"),
      });

      setTimeout(() => {
        router.push("/clients");
      }, 800);
    } catch (err) {
      console.error(err);

      setToast({
        type: "error",
        msg: t("clients.new.errors.createFailed"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t("clients.new.title")}
        subtitle={t("clients.new.subtitle")}
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-6"
      >
        <Card className="p-6 space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm text-slate-600">
              {t("clients.new.form.name")}
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("clients.new.placeholders.name")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm text-slate-600">
              {t("clients.new.form.email")}
            </label>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("clients.new.placeholders.email")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="text-sm text-slate-600">
              {t("clients.new.form.phone")}
            </label>

            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("clients.new.placeholders.phone")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className="text-sm text-slate-600">
              {t("clients.new.form.address")}
            </label>

            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("clients.new.placeholders.address")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm text-slate-600">
              {t("clients.new.form.notes")}
            </label>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("clients.new.placeholders.notes")}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button type="submit" disabled={loading}>
              {loading
                ? t("clients.new.buttons.saving")
                : t("clients.new.buttons.create")}
            </Button>
          </div>
        </Card>
      </form>

      {toast && (
  <Toast
    open
    type={toast.type}
    message={toast.msg}
    onClose={() => setToast(null)}
  />
)}
    </>
  );
}