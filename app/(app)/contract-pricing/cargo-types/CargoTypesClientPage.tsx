"use client";

import React, { useEffect, useMemo, useState } from "react";

import { contractPricingService } from "@/src/services/contract-pricing.service";
import type {
  CargoTypePayload,
  CargoTypeRef,
} from "@/src/types/contract-pricing.types";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type ToastState =
  | {
      type: "success" | "error";
      msg: string;
    }
  | null;

type FormState = {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
};

function emptyForm(): FormState {
  return {
    code: "",
    name: "",
    description: "",
    is_active: true,
  };
}

function CargoTypeModal({
  open,
  mode,
  value,
  loading,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  value: FormState;
  loading: boolean;
  onClose: () => void;
  onChange: <K extends keyof FormState>(key: K, nextValue: FormState[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === "create" ? "إضافة نوع منقول" : "تعديل نوع المنقول"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              إدارة أنواع المنقول المستخدمة في قواعد التسعير
            </p>
          </div>

          <Button variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">الكود *</label>
              <input
                value={value.code}
                onChange={(e) => onChange("code", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
                placeholder="مثال: BULK"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">الاسم *</label>
              <input
                value={value.name}
                onChange={(e) => onChange("name", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
                placeholder="مثال: بضائع عامة"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">الوصف</label>
              <textarea
                value={value.description}
                onChange={(e) => onChange("description", e.target.value)}
                className={cn(
                  "min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
                placeholder="وصف اختياري لنوع المنقول"
              />
            </div>

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={value.is_active}
                  onChange={(e) => onChange("is_active", e.target.checked)}
                />
                النوع نشط
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>

            <Button type="submit" isLoading={loading}>
              {mode === "create" ? "حفظ النوع" : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CargoTypesClientPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CargoTypeRef[]>([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [toast, setToast] = useState<ToastState>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  async function load() {
    setLoading(true);
    try {
      const res = await contractPricingService.listCargoTypes({
        q: q || undefined,
        is_active: active === "" ? "" : active === "true",
        page,
        pageSize: 25,
      });

      setItems(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setPages(1);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحميل أنواع المنقول",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [q, active, page]);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(row: CargoTypeRef) {
    setModalMode("edit");
    setEditingId(row.id);
    setForm({
      code: row.code || "",
      name: row.name || "",
      description: row.description || "",
      is_active: row.is_active !== false,
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.code.trim()) {
      setToast({ type: "error", msg: "الكود مطلوب" });
      return;
    }

    if (!form.name.trim()) {
      setToast({ type: "error", msg: "الاسم مطلوب" });
      return;
    }

    const payload: CargoTypePayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
    };

    try {
      setSaving(true);

      if (modalMode === "create") {
        const created = await contractPricingService.createCargoType(payload);
        setItems((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);
        setToast({ type: "success", msg: "تم إنشاء نوع المنقول بنجاح" });
      } else if (editingId) {
        const updated = await contractPricingService.updateCargoType(editingId, payload);
        setItems((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
        setToast({ type: "success", msg: "تم تحديث نوع المنقول بنجاح" });
      }

      closeModal();
      load();
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل حفظ نوع المنقول",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(row: CargoTypeRef) {
    try {
      const updated = await contractPricingService.toggleCargoType(row.id);
      setItems((prev) => prev.map((x) => (x.id === row.id ? updated : x)));
      setToast({
        type: "success",
        msg: "تم تحديث حالة نوع المنقول بنجاح",
      });
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحديث الحالة",
      });
    }
  }

  function resetFilters() {
    setQ("");
    setActive("");
    setPage(1);
  }

  const activeCount = useMemo(
    () => items.filter((x) => x.is_active === true).length,
    [items]
  );

  const inactiveCount = useMemo(
    () => items.filter((x) => x.is_active === false).length,
    [items]
  );

  const columns: DataTableColumn<CargoTypeRef>[] = useMemo(
    () => [
      {
        key: "code",
        label: "الكود",
        render: (row) => row.code || "—",
      },
      {
        key: "name",
        label: "الاسم",
        render: (row) => row.name || "—",
      },
      {
        key: "description",
        label: "الوصف",
        render: (row) => row.description || "—",
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => (
          <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => openEdit(row)}>
              تعديل
            </Button>

            <Button variant="secondary" onClick={() => onToggle(row)}>
              {row.is_active ? "تعطيل" : "تفعيل"}
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="أنواع المنقول"
        subtitle="إدارة أنواع المنقول المستخدمة في قواعد التسعير التعاقدي"
        actions={<Button onClick={openCreate}>+ إضافة نوع منقول</Button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">إجمالي الأنواع</div>
          <div className="mt-1 text-xl font-semibold">{total}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">النشطة</div>
          <div className="mt-1 text-xl font-semibold">{activeCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">غير النشطة</div>
          <div className="mt-1 text-xl font-semibold">{inactiveCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">الصفحات</div>
          <div className="mt-1 text-xl font-semibold">{pages}</div>
        </div>
      </div>

      <FiltersBar
        left={
          <div className="flex w-full flex-col gap-3 md:flex-row">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث بالكود أو الاسم أو الوصف"
              className={cn(
                "w-full md:w-[360px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            />

            <select
              value={active}
              onChange={(e) => {
                setActive(e.target.value as "" | "true" | "false");
                setPage(1);
              }}
              className={cn(
                "w-full md:w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            >
              <option value="">كل الحالات</option>
              <option value="true">النشطة فقط</option>
              <option value="false">غير النشطة فقط</option>
            </select>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">
              الإجمالي: <span className="font-semibold text-slate-900">{total}</span>
            </div>

            <Button variant="secondary" onClick={resetFilters}>
              إعادة تعيين
            </Button>
          </div>
        }
      />

      <DataTable
        title="قائمة أنواع المنقول"
        subtitle="البيانات الأساسية لأنواع المنقول"
        columns={columns}
        rows={items}
        loading={loading}
        emptyTitle="لا توجد أنواع منقول"
        emptyHint="لم يتم العثور على بيانات مطابقة للفلاتر الحالية."
        total={total}
        page={page}
        pages={pages}
        onPrev={page > 1 ? () => setPage((p) => p - 1) : undefined}
        onNext={page < pages ? () => setPage((p) => p + 1) : undefined}
      />

      <CargoTypeModal
        open={modalOpen}
        mode={modalMode}
        value={form}
        loading={saving}
        onClose={closeModal}
        onChange={setField}
        onSubmit={onSubmit}
      />

      <Toast
        open={!!toast}
        type={toast?.type || "success"}
        message={toast?.msg || ""}
        onClose={() => setToast(null)}
      />
    </div>
  );
}