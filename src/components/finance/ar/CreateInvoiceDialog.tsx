"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/Button";
import { Toast } from "@/src/components/Toast";
import { clientsService } from "@/src/services/clients.service";
import { arInvoicesService } from "@/src/services/ar-invoices.service";
import type { Client } from "@/src/types/clients.types";

export type CreateInvoiceDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreateInvoiceDialog({
  open,
  onClose,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [form, setForm] = useState({
    client_id: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    amount: "",
    vat_amount: "",
    notes: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        client_id: "",
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: "",
        amount: "",
        vat_amount: "",
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
      await arInvoicesService.create({
        client_id: form.client_id,
        issue_date: form.issue_date || undefined,
        due_date: form.due_date || undefined,
        amount: Number(form.amount),
        vat_amount: form.vat_amount ? Number(form.vat_amount) : undefined,
        notes: form.notes || undefined,
      });

      onSuccess();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "فشل إنشاء الفاتورة"
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dir-rtl" dir="rtl">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">إنشاء فاتورة جديدة (AR)</h2>

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
                تاريخ الإصدار
              </label>
              <input
                type="date"
                required
                className="trex-input w-full px-3 py-2 text-sm"
                value={form.issue_date}
                onChange={(e) =>
                  setForm({ ...form, issue_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                تاريخ الاستحقاق
              </label>
              <input
                type="date"
                className="trex-input w-full px-3 py-2 text-sm"
                value={form.due_date}
                onChange={(e) =>
                  setForm({ ...form, due_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                المبلغ (الأساسي) <span className="text-red-500">*</span>
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
                مبلغ الضريبة (VAT)
              </label>
              <input
                type="number"
                step="0.01"
                className="trex-input w-full px-3 py-2 text-sm"
                value={form.vat_amount}
                onChange={(e) =>
                  setForm({ ...form, vat_amount: e.target.value })
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
              إنشاء الفاتورة
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
