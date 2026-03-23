"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { vendorsService } from "@/src/services/vendors.service";
import type { Vendor, VendorPayload } from "@/src/types/vendors.types";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-black/10";

const selectCls =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10";

function VendorModal({
  open,
  initial,
  onClose,
  onSaved,
  showToast,
}: {
  open: boolean;
  initial?: Vendor | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (type: "success" | "error", msg: string) => void;
}) {
  const t = useT();
  const isEdit = !!initial?.id;

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [vendorType, setVendorType] = useState("MAINTENANCE_CENTER");
  const [classification, setClassification] = useState("EXTERNAL");
  const [status, setStatus] = useState("ACTIVE");

  const [specialization, setSpecialization] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [taxNo, setTaxNo] = useState("");
  const [commercialRegister, setCommercialRegister] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [openingBalance, setOpeningBalance] = useState<string>("");
  const [creditLimit, setCreditLimit] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    setName(String(initial?.name || ""));
    setCode(String(initial?.code || ""));
    setVendorType(String(initial?.vendor_type || "MAINTENANCE_CENTER"));
    setClassification(String(initial?.classification || "EXTERNAL"));
    setStatus(String(initial?.status || "ACTIVE"));

    setSpecialization(String(initial?.specialization || ""));
    setContactPerson(String(initial?.contact_person || ""));
    setPhone(String(initial?.phone || ""));
    setPhone2(String(initial?.phone2 || ""));
    setEmail(String(initial?.email || ""));
    setAddress(String(initial?.address || ""));
    setCity(String(initial?.city || ""));
    setTaxNo(String(initial?.tax_no || ""));
    setCommercialRegister(String(initial?.commercial_register || ""));
    setPaymentTerms(String(initial?.payment_terms || ""));
    setOpeningBalance(initial?.opening_balance != null ? String(initial.opening_balance) : "");
    setCreditLimit(initial?.credit_limit != null ? String(initial.credit_limit) : "");
  }, [open, initial]);

  if (!open) return null;

  async function submit() {
    if (!name.trim()) {
      showToast("error", "اسم المورد / مركز الصيانة مطلوب");
      return;
    }

    setLoading(true);
    try {
      const payload: VendorPayload = {
        name: name.trim(),
        code: code.trim() || null,
        vendor_type: vendorType || null,
        classification: classification || null,
        status: status || null,

        specialization: specialization.trim() || null,
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        phone2: phone2.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        tax_no: taxNo.trim() || null,
        commercial_register: commercialRegister.trim() || null,
        payment_terms: paymentTerms.trim() || null,
        opening_balance: openingBalance === "" ? null : Number(openingBalance),
        credit_limit: creditLimit === "" ? null : Number(creditLimit),
      };

      if (isEdit && initial?.id) {
        await vendorsService.update(initial.id, payload);
        showToast("success", "تم تحديث المورد بنجاح");
      } else {
        await vendorsService.create(payload);
        showToast("success", "تم إنشاء المورد بنجاح");
      }

      onSaved();
      onClose();
    } catch (e: any) {
      showToast("error", e?.message || "فشل حفظ المورد");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white text-slate-900 border border-slate-200 p-4"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{isEdit ? "تعديل المورد / المركز" : "إضافة مورد / مركز صيانة"}</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span>الاسم *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>الكود</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>النوع</span>
            <select value={vendorType} onChange={(e) => setVendorType(e.target.value)} className={selectCls}>
              <option value="MAINTENANCE_CENTER">MAINTENANCE_CENTER</option>
              <option value="PARTS_SUPPLIER">PARTS_SUPPLIER</option>
              <option value="SERVICE_PROVIDER">SERVICE_PROVIDER</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span>التصنيف</span>
            <select value={classification} onChange={(e) => setClassification(e.target.value)} className={selectCls}>
              <option value="INTERNAL">INTERNAL</option>
              <option value="EXTERNAL">EXTERNAL</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span>الحالة</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span>التخصص</span>
            <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>مسؤول التواصل</span>
            <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>الهاتف</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>هاتف إضافي</span>
            <input value={phone2} onChange={(e) => setPhone2(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>البريد الإلكتروني</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm md:col-span-2">
            <span>العنوان</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>المدينة</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>الرقم الضريبي</span>
            <input value={taxNo} onChange={(e) => setTaxNo(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>السجل التجاري</span>
            <input value={commercialRegister} onChange={(e) => setCommercialRegister(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>شروط الدفع</span>
            <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>الرصيد الافتتاحي</span>
            <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className={inputCls} />
          </label>

          <label className="grid gap-2 text-sm">
            <span>الحد الائتماني</span>
            <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} className={inputCls} />
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm"
          >
            إلغاء
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const token = useAuth((s: any) => s.token);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (token === null) return;
    if (!token) router.push("/login");
  }, [token, router]);

  const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10), 1), 100);
  const q = sp.get("q") || "";
  const vendorType = sp.get("vendor_type") || "";
  const classification = sp.get("classification") || "";
  const status = sp.get("status") || "";

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    router.push(`/vendors?${p.toString()}`);
  };

  async function load() {
    if (token === null || !token) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await vendorsService.list({
        page,
        pageSize,
        q,
        vendor_type: vendorType,
        classification,
        status,
      });

      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.pages || 1);
    } catch (e: any) {
      setErr(e?.message || "فشل تحميل الموردين");
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token === null) return;
    if (!token) return;
    load();
  }, [token, page, pageSize, q, vendorType, classification, status]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    setModalOpen(true);
  }

  async function toggle(v: Vendor) {
    try {
      await vendorsService.toggle(v.id);
      showToast("success", "تم تحديث الحالة");
      load();
    } catch (e: any) {
      showToast("error", e?.message || "فشل تحديث الحالة");
    }
  }

  const columns: DataTableColumn<Vendor>[] = [
    {
      key: "name",
      label: "الاسم",
      render: (v) => (
        <div>
          <div className="font-medium text-gray-900">{v.name}</div>
          <div className="text-xs text-gray-500">{v.code || "—"}</div>
        </div>
      ),
    },
    {
      key: "vendor_type",
      label: "النوع",
      render: (v) => v.vendor_type || "—",
    },
    {
      key: "classification",
      label: "التصنيف",
      render: (v) => v.classification || "—",
    },
    {
      key: "status",
      label: "الحالة",
      render: (v) => <StatusBadge status={String(v.status || (v.is_active ? "ACTIVE" : "INACTIVE"))} />,
    },
    {
      key: "contact",
      label: "التواصل",
      render: (v) => (
        <div>
          <div>{v.contact_person || "—"}</div>
          <div className="text-xs text-gray-500">{v.phone || v.email || "—"}</div>
        </div>
      ),
    },
    {
      key: "city",
      label: "المدينة",
      render: (v) => v.city || "—",
    },
    {
      key: "created_at",
      label: "الإنشاء",
      render: (v) => fmtDate(v.created_at),
    },
    {
      key: "actions",
      label: "الإجراءات",
      render: (v) => (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => openEdit(v)}>
            تعديل
          </Button>
          <Button variant="ghost" onClick={() => toggle(v)}>
            تبديل
          </Button>
        </div>
      ),
    },
  ];

  if (token === null) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <Card>
            <div className="text-sm text-gray-700">جارٍ فحص الجلسة...</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <Card>
          <div className="space-y-4">
            <PageHeader
              title="الموردون / مراكز الصيانة"
              subtitle="إدارة مراكز الصيانة الداخلية والخارجية والموردين"
              actions={
                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={openCreate}>
                    إضافة
                  </Button>
                  <Button variant="secondary" onClick={load} isLoading={loading}>
                    تحديث
                  </Button>
                </div>
              }
            />

            <FiltersBar
              left={
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={q}
                    onChange={(e) => setParam("q", e.target.value)}
                    placeholder="بحث بالاسم / الكود / الهاتف"
                    className={cn(inputCls, "w-64")}
                  />

                  <select value={vendorType} onChange={(e) => setParam("vendor_type", e.target.value)} className={selectCls}>
                    <option value="">كل الأنواع</option>
                    <option value="MAINTENANCE_CENTER">MAINTENANCE_CENTER</option>
                    <option value="PARTS_SUPPLIER">PARTS_SUPPLIER</option>
                    <option value="SERVICE_PROVIDER">SERVICE_PROVIDER</option>
                  </select>

                  <select value={classification} onChange={(e) => setParam("classification", e.target.value)} className={selectCls}>
                    <option value="">كل التصنيفات</option>
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="EXTERNAL">EXTERNAL</option>
                  </select>

                  <select value={status} onChange={(e) => setParam("status", e.target.value)} className={selectCls}>
                    <option value="">كل الحالات</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              }
              right={
                <div className="text-xs text-gray-600">
                  الإجمالي: <span className="font-semibold text-gray-900">{total}</span> — الصفحة{" "}
                  <span className="font-semibold text-gray-900">{page}/{totalPages}</span>
                </div>
              }
            />

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
            ) : null}

            <DataTable<Vendor>
              columns={columns}
              rows={rows}
              loading={loading}
              emptyTitle="لا يوجد موردون"
              emptyHint="جرّب تغيير الفلاتر أو إضافة مورد جديد"
              total={total}
              page={page}
              pages={totalPages}
              onPrev={page > 1 ? () => setParam("page", String(page - 1)) : undefined}
              onNext={page < totalPages ? () => setParam("page", String(page + 1)) : undefined}
              footer={
                <div className="text-xs text-gray-600">
                  المعروض <span className="font-semibold text-gray-900">{rows.length}</span> من{" "}
                  <span className="font-semibold text-gray-900">{total}</span>
                </div>
              }
            />
          </div>
        </Card>
      </div>

      <VendorModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        showToast={showToast}
      />

      <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
    </div>
  );
}