"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/Button";
import { clientsService } from "@/src/services/clients.service";
import { arPaymentsService } from "@/src/services/ar-payments.service";
import type { Client } from "@/src/types/clients.types";

export type CreatePaymentDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreatePaymentDialog({
  open,
  onClose,
  onSuccess,
}: CreatePaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({
    client_id: "",
    payment_date: new Date().toISOString().slice(0, 10),
    amount: "",
    method: "BANK_TRANSFER",
    reference: "",
    notes: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        client_id: "",
        payment_date: new Date().toISOString().slice(0, 10),
        amount: "",
        method: "BANK_TRANSFER",
        reference: "",
        notes: "",
      });
      setError("");
      loadClients();
    }
  }, [open]);

  async function loadClients() {
    try {
      const res = await clientsService.list({ limit: 500, is_active: true });
      setClients(res.items || []);
    } catch (e) {
      console.error("Failed to load clients", e);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) {
      setError("الرجاء اختيار العميل");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("الرجاء إدخال مبلغ صحيح");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await arPaymentsService.create({
        client_id: form.client_id,
        payment_date: form.payment_date || undefined,
        amount: Number(form.amount),
        method: form.method as any,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "فشل إنشاء الدفعة"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dir-rtl" dir="rtl">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">تسجيل دفعة / سند قبض (AR)</h2>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              العميل <span className="text-red-500">*</span>
            </label>
            <select
              required
              className="trex-input w-full px-3 py-2 text-sm"
              value={form.client_id}
              onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">اختر العميل</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                المبلغ <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="trex-input w-full px-3 py-2 text-sm"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                تاريخ الدفع
              </label>
              <input
                type="date"
                required
                className="trex-input w-full px-3 py-2 text-sm"
                value={form.payment_date}
                onChange={(e) =>
                  setForm({ ...form, payment_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                طريقة الدفع <span className="text-red-500">*</span>
              </label>
              <select
                required
                className="trex-input w-full px-3 py-2 text-sm"
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
              >
                <option value="BANK_TRANSFER">حوالة بنكية</option>
                <option value="CASH">نقدي</option>
                <option value="CHEQUE">شيك</option>
                <option value="CREDIT_CARD">بطاقة ائتمانية</option>
                <option value="OTHER">أخرى</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                المرجع (رقم الحوالة/الشيك)
              </label>
              <input
                type="text"
                className="trex-input w-full px-3 py-2 text-sm"
                value={form.reference}
                onChange={(e) =>
                  setForm({ ...form, reference: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              ملاحظات
            </label>
            <textarea
              className="trex-input min-h-[80px] w-full px-3 py-2 text-sm"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={loading}>
              تسجيل الدفعة
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
