"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useRouter } from "next/navigation";

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
  phone2?: string | null;
  national_id?: string | null;
  hire_date?: string | null;
  license_no: string | null;
  license_issue_date?: string | null;
  license_expiry_date?: string | null;
  status?: string | null;
  disable_reason?: string | null;
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

function licenseMeta(expiryDate: any) {
  if (!expiryDate) return { text: "—", tone: "neutral" as const, days: null as number | null };

  const dt = new Date(String(expiryDate));
  if (Number.isNaN(dt.getTime())) {
    return { text: "—", tone: "neutral" as const, days: null as number | null };
  }

  const now = new Date();
  const diff = dt.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { text: "منتهية", tone: "danger" as const, days };
  if (days <= 7) return { text: `${days} يوم`, tone: "warn" as const, days };
  return { text: `${days} يوم`, tone: "good" as const, days };
}

function LicenseBadge({ expiryDate }: { expiryDate: any }) {
  const meta = licenseMeta(expiryDate);

  const cls =
    meta.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : meta.tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : meta.tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${cls}`}>{meta.text}</span>;
}

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
  const router = useRouter();

  const [q, setQ] = useState("");
  const [isActive, setIsActive] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(message: string, type: "success" | "error" = "success") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2600);
  }

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

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

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

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseIssueDate, setLicenseIssueDate] = useState("");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");
  const [hireDate, setHireDate] = useState("");

  function openCreate() {
    setEditing(null);
    setFullName("");
    setPhone("");
    setPhone2("");
    setNationalId("");
    setLicenseNo("");
    setLicenseIssueDate("");
    setLicenseExpiryDate("");
    setHireDate("");
    setOpen(true);
  }

  function openEdit(d: Driver) {
    setEditing(d);
    setFullName(d.full_name || "");
    setPhone(d.phone || "");
    setPhone2(d.phone2 || "");
    setNationalId(d.national_id || "");
    setLicenseNo(d.license_no || "");
    setLicenseIssueDate(d.license_issue_date ? String(d.license_issue_date).slice(0, 10) : "");
    setLicenseExpiryDate(d.license_expiry_date ? String(d.license_expiry_date).slice(0, 10) : "");
    setHireDate(d.hire_date ? String(d.hire_date).slice(0, 10) : "");
    setOpen(true);
  }

  async function save() {
    const payload = {
      full_name: fullName.trim(),
      phone: phone.trim() ? phone.trim() : null,
      phone2: phone2.trim() ? phone2.trim() : null,
      national_id: nationalId.trim() ? nationalId.trim() : null,
      license_no: licenseNo.trim() ? licenseNo.trim() : null,
      license_issue_date: licenseIssueDate || null,
      license_expiry_date: licenseExpiryDate || null,
      hire_date: hireDate || null,
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
          subtitle="إدارة السائقين وبيانات الرخص والتعيين"
          actions={<Button onClick={openCreate}>+ إضافة سائق</Button>}
        />

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
                    placeholder="بحث بالاسم / الهاتف / الرخصة / الرقم القومي..."
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

        <DataTable<Driver>
          title="قائمة السائقين"
          columns={[
            { key: "full_name", label: "الاسم" },
            {
              key: "phone",
              label: "التواصل",
              render: (d) => (
                <div className="flex flex-col items-start gap-1">
                  <span>{d.phone || "—"}</span>
                  <span className="text-xs text-gray-500">{d.phone2 || "—"}</span>
                </div>
              ),
            },
            {
              key: "national_id",
              label: "الرقم القومي",
              render: (d) => d.national_id || "—",
            },
            {
              key: "license_no",
              label: "الرخصة",
              render: (d) => (
                <div className="flex flex-col items-start gap-1">
                  <span>{d.license_no || "—"}</span>
                  <LicenseBadge expiryDate={d.license_expiry_date} />
                </div>
              ),
            },
            {
              key: "license_expiry_date",
              label: "انتهاء الرخصة",
              render: (d) => fmtDate(d.license_expiry_date),
            },
            {
              key: "hire_date",
              label: "تاريخ التعيين",
              render: (d) => fmtDate(d.hire_date),
            },
            {
              key: "is_active",
              label: "الحالة",
              render: (d) => (
                <div className="flex flex-col items-start gap-1">
                  <span
                    className={
                      d.is_active
                        ? "inline-flex items-center px-2 py-1 rounded-full text-xs border bg-green-50 text-green-700 border-green-200"
                        : "inline-flex items-center px-2 py-1 rounded-full text-xs border bg-gray-50 text-gray-700 border-gray-200"
                    }
                  >
                    {d.status || (d.is_active ? "ACTIVE" : "INACTIVE")}
                  </span>
                  {d.disable_reason ? <span className="text-xs text-rose-600">{d.disable_reason}</span> : null}
                </div>
              ),
            },
            {
              key: "actions",
              label: "إجراءات",
              className: "text-left",
              headerClassName: "text-left",
              render: (d) => (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/drivers/${d.id}`);
                    }}
                  >
                    تفاصيل
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(d);
                    }}
                  >
                    تعديل
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(d);
                    }}
                  >
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
          onRowClick={(row) => {
            if (row?.id) router.push(`/drivers/${row.id}`);
          }}
          footer={
            <div className="text-sm text-gray-600">
              الإجمالي: <span className="font-semibold text-gray-900">{total}</span>
            </div>
          }
          minWidthClassName="min-w-[1400px]"
        />

        {open ? (
          <div
            className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <div
              dir="rtl"
              className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white text-gray-900 overflow-hidden shadow-xl"
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
                    <div className="text-xs text-gray-600 mb-1">هاتف إضافي</div>
                    <input
                      value={phone2}
                      onChange={(e) => setPhone2(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">الرقم القومي</div>
                    <input
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">رقم الرخصة</div>
                    <input
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">تاريخ إصدار الرخصة</div>
                    <input
                      value={licenseIssueDate}
                      onChange={(e) => setLicenseIssueDate(e.target.value)}
                      type="date"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">تاريخ انتهاء الرخصة</div>
                    <input
                      value={licenseExpiryDate}
                      onChange={(e) => setLicenseExpiryDate(e.target.value)}
                      type="date"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-600 mb-1">تاريخ التعيين</div>
                    <input
                      value={hireDate}
                      onChange={(e) => setHireDate(e.target.value)}
                      type="date"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
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

      <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
    </div>
  );
}