"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";

// ✅ UI system (Light)
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  license_no: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

// ✅ Light Card (local helper)
function Card({
  title,
  right,
  children,
}: {
  title?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {title ? (
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="font-semibold text-gray-900">{title}</div>
          {right ? <div className="flex items-center gap-2">{right}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function DriversPage() {
  // Filters
  const [q, setQ] = useState("");
  const [isActive, setIsActive] = useState<string>(""); // "", "true", "false"

  // Paging
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Data
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(message: string, type: "success" | "error" = "success") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2600);
  }

  // ConfirmDialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<React.ReactNode>("تأكيد");
  const [confirmDesc, setConfirmDesc] = useState<React.ReactNode>("");
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void> | void)>(null);

  function openConfirm(opts: {
    title?: React.ReactNode;
    description?: React.ReactNode;
    action: () => Promise<void> | void;
  }) {
    setConfirmTitle(opts.title ?? "تأكيد");
    setConfirmDesc(opts.description ?? "");
    setConfirmAction(() => opts.action);
    setConfirmOpen(true);
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  async function fetchList() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (isActive) params.set("is_active", isActive);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await api.get(`/drivers?${params.toString()}`);
      const data: any = (res as any)?.data ?? res;

      if (Array.isArray(data)) {
        setItems(data);
        setTotal(data.length);
      } else {
        const list: Driver[] = data?.items || [];
        setItems(list);
        const t = typeof data?.total === "number" ? data.total : list.length;
        setTotal(t);
      }
    } catch (e: any) {
      console.log("GET /drivers error", e);
      showToast(e?.response?.data?.message || e?.message || "فشل تحميل السائقين", "error");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, isActive, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [q, isActive]);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNo, setLicenseNo] = useState("");

  function openCreate() {
    setEditing(null);
    setFullName("");
    setPhone("");
    setLicenseNo("");
    setOpen(true);
  }

  function openEdit(d: Driver) {
    setEditing(d);
    setFullName(d.full_name || "");
    setPhone(d.phone || "");
    setLicenseNo(d.license_no || "");
    setOpen(true);
  }

  async function save() {
    const payload = {
      full_name: fullName.trim(),
      phone: phone.trim() ? phone.trim() : null,
      license_no: licenseNo.trim() ? licenseNo.trim() : null,
    };

    if (!payload.full_name) {
      showToast("الاسم مطلوب", "error");
      return;
    }

    setLoading(true);
    try {
      if (editing) await api.patch(`/drivers/${editing.id}`, payload);
      else await api.post(`/drivers`, payload);

      setOpen(false);
      showToast(editing ? "تم التعديل بنجاح" : "تمت الإضافة بنجاح", "success");
      await fetchList();
    } catch (e: any) {
      showToast(e?.response?.data?.message || "حصل خطأ أثناء الحفظ", "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(d: Driver) {
    openConfirm({
      title: d.is_active ? "تأكيد التعطيل" : "تأكيد التفعيل",
      description: (
        <div className="space-y-1">
          <div>
            هل أنت متأكد من {d.is_active ? "تعطيل" : "تفعيل"} السائق:
            <span className="font-semibold"> {d.full_name}</span> ؟
          </div>
          <div className="text-xs text-gray-500">يمكنك التراجع لاحقًا بتغيير الحالة مرة أخرى.</div>
        </div>
      ),
      action: async () => {
        setConfirmBusy(true);
        try {
          await api.patch(`/drivers/${d.id}/status`, { is_active: !d.is_active });
          showToast("تم تحديث الحالة", "success");
          await fetchList();
        } catch (e: any) {
          showToast(e?.response?.data?.message || "فشل تغيير الحالة", "error");
        } finally {
          setConfirmBusy(false);
          setConfirmOpen(false);
        }
      },
    });
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title="السائقين"
          subtitle="إدارة السائقين (إضافة/تعديل + تفعيل/تعطيل + بحث)"
          actions={
            // RTL: نخلي زر الإضافة في يسار الهيدر طبيعيًا
            <Button onClick={openCreate}>+ إضافة سائق</Button>
          }
        />

        {/* Filters */}
        <Card
          title="الفلاتر"
          right={
            <Button
              variant="ghost"
              onClick={() => {
                setQ("");
                setIsActive("");
                setPage(1);
              }}
            >
              إعادة ضبط
            </Button>
          }
        >
          <FiltersBar
            left={
              <div className="flex flex-wrap items-end gap-2 w-full">
                <div className="w-[360px] max-w-full">
                  <div className="text-xs text-gray-600 mb-1">بحث</div>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="بحث بالاسم / الهاتف / الرخصة..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">الحالة</div>
                  <select
                    value={isActive}
                    onChange={(e) => setIsActive(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="">الكل</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => fetchList()} isLoading={loading}>
                    تحديث
                  </Button>

                  <div className="text-sm text-gray-600">
                    صفحة <span className="font-semibold text-gray-900">{page}</span> /{" "}
                    <span className="font-semibold text-gray-900">{totalPages}</span>
                  </div>
                </div>
              </div>
            }
          />
        </Card>

        {/* Table */}
        <DataTable<Driver>
          title="قائمة السائقين"
          columns={[
            { key: "full_name", label: "الاسم" },
            { key: "phone", label: "الهاتف", render: (d) => d.phone || "—" },
            { key: "license_no", label: "الرخصة", render: (d) => d.license_no || "—" },
            {
              key: "is_active",
              label: "الحالة",
              render: (d) => (
                <span
                  className={
                    d.is_active
                      ? "inline-flex items-center px-2 py-1 rounded-full text-xs border bg-green-50 text-green-700 border-green-200"
                      : "inline-flex items-center px-2 py-1 rounded-full text-xs border bg-gray-50 text-gray-700 border-gray-200"
                  }
                >
                  {d.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "إجراءات",
              // RTL: عمود الإجراءات غالبًا آخر عمود (هيظهر على الشمال) فنحاذيه "يسار"
              className: "text-left",
              headerClassName: "text-left",
              render: (d) => (
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => openEdit(d)}>
                    تعديل
                  </Button>
                  <Button variant="secondary" onClick={() => toggleActive(d)}>
                    {d.is_active ? "تعطيل" : "تفعيل"}
                  </Button>
                </div>
              ),
            },
          ]}
          rows={items}
          loading={loading}
          emptyTitle="لا يوجد بيانات"
          emptyHint="جرّب تغيير البحث أو الفلاتر."
          total={total}
          page={page}
          pages={totalPages}
          onPrev={page <= 1 ? undefined : () => setPage((p) => Math.max(1, p - 1))}
          onNext={page >= totalPages ? undefined : () => setPage((p) => Math.min(totalPages, p + 1))}
          footer={
            <div className="text-sm text-gray-600">
              الإجمالي: <span className="font-semibold text-gray-900">{total}</span>
            </div>
          }
          minWidthClassName="min-w-[900px]"
        />

        {/* Create/Edit Modal (Light) */}
        {open ? (
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <div
              dir="rtl"
              className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white text-gray-900 overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="font-semibold">{editing ? "تعديل سائق" : "إضافة سائق"}</div>
                <button onClick={() => setOpen(false)} className="px-2 py-1 rounded-lg hover:bg-gray-100">
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <div className="text-xs text-gray-600 mb-1">الاسم بالكامل *</div>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    placeholder="مثال: أحمد حسن"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">الهاتف</div>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder="01xxxxxxxxx"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">رقم الرخصة</div>
                    <input
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder="رقم رخصة القيادة"
                    />
                  </div>
                </div>

                {editing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="text-xs text-gray-500">
                      إنشاء: <span className="text-gray-800">{fmtDate(editing.created_at)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      آخر تحديث: <span className="text-gray-800">{fmtDate(editing.updated_at)}</span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="px-4 py-3 border-t border-gray-200 flex gap-2 justify-start">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={save} isLoading={loading} disabled={loading}>
                  {loading ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
  open={confirmOpen}
  title={confirmTitle}
  description={confirmDesc}
  confirmText="تأكيد"
  cancelText="إلغاء"
  tone="danger"
  isLoading={confirmBusy}
  dir="rtl"
  onClose={() => {
    if (confirmBusy) return;
    setConfirmOpen(false);
  }}
  onConfirm={async () => {
    if (!confirmAction) return;
    await confirmAction();
  }}
/>

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