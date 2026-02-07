"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  license_no: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

const ui = {
  page: "p-4 md:p-6 space-y-4 text-slate-100",
  shell:
    "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]",
  header: "flex items-start md:items-center justify-between gap-3 flex-wrap",
  title: "text-2xl font-semibold tracking-tight",
  subtitle: "text-sm text-slate-300",
  btnPrimary:
    "px-3 py-2 rounded-xl bg-white text-black hover:bg-white/90 active:scale-[0.99] transition",
  btnGhost:
    "px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition",
  input:
    "w-full border border-white/10 bg-white/[0.03] text-slate-100 placeholder:text-slate-400 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-white/20",
  select:
    "border border-white/10 bg-white/[0.03] text-slate-100 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-white/20",
  badgeOn: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/20",
  badgeOff: "bg-slate-500/15 text-slate-200 border border-slate-500/20",
  tableWrap: "rounded-2xl overflow-hidden border border-white/10",
  thead: "bg-white/[0.06] text-slate-200",
  row: "border-t border-white/10 hover:bg-white/[0.03] transition",
  cell: "p-3",
  overlay:
    "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50",
  modal:
    "w-full max-w-xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#0b1220] to-[#060a12] shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]",
  modalHead:
    "px-5 py-4 border-b border-white/10 flex items-center justify-between",
  modalBody: "p-5 space-y-4",
  modalFooter: "px-5 pb-5 flex items-center justify-end gap-2",
  label: "text-xs uppercase tracking-wide text-slate-300",
};

export default function DriversPage() {
  const [q, setQ] = useState("");
  const [isActive, setIsActive] = useState<string>(""); // "", "true", "false"
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNo, setLicenseNo] = useState("");

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

      // ✅ دعم أي api wrapper:
      // - Axios: res.data
      // - Custom wrapper: res (direct body)
      const data: any = (res as any)?.data ?? res;

      if (Array.isArray(data)) {
        setItems(data);
        setTotal(data.length);
      } else {
        const list: Driver[] = data?.items || [];
        setItems(list);

        // ✅ لو total مش موجود لأي سبب، احسبه من طول items
        const t = typeof data?.total === "number" ? data.total : list.length;
        setTotal(t);
      }
    } catch (e: any) {
      console.log("GET /drivers error", e);
      alert(e?.response?.data?.message || e?.message || "فشل تحميل السائقين");
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
      alert("الاسم مطلوب");
      return;
    }

    setLoading(true);
    try {
      if (editing) await api.patch(`/drivers/${editing.id}`, payload);
      else await api.post(`/drivers`, payload);

      setOpen(false);
      await fetchList();
    } catch (e: any) {
      alert(e?.response?.data?.message || "حصل خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(d: Driver) {
    setLoading(true);
    try {
      await api.patch(`/drivers/${d.id}/status`, { is_active: !d.is_active });
      await fetchList();
    } catch (e: any) {
      alert(e?.response?.data?.message || "فشل تغيير الحالة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={ui.page} dir="rtl">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[-120px] h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className={cn("p-4 md:p-6", ui.shell)}>
        <div className={ui.header}>
          <div>
            <h1 className={ui.title}>السائقين</h1>
            <p className={ui.subtitle}>
              إدارة السائقين (إضافة/تعديل + تفعيل/تعطيل + بحث)
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={openCreate} className={ui.btnPrimary}>
              + إضافة سائق
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex gap-2 flex-wrap items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم / الهاتف / الرخصة..."
            className={cn(ui.input, "w-[360px] max-w-full")}
          />

          <select
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            className={ui.select}
          >
            <option value="">الكل</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button
            onClick={() => fetchList()}
            className={ui.btnGhost}
            disabled={loading}
          >
            {loading ? "جارٍ التحديث..." : "تحديث"}
          </button>
        </div>

        {/* Table */}
        <div className={cn("mt-5", ui.tableWrap)}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap" dir="rtl">
              <thead className={ui.thead}>
                <tr className="text-right">
                  <th className={ui.cell}>الاسم</th>
                  <th className={ui.cell}>الهاتف</th>
                  <th className={ui.cell}>الرخصة</th>
                  <th className={ui.cell}>الحالة</th>
                  <th className={cn(ui.cell, "w-[240px]")}>إجراءات</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr className="border-t border-white/10">
                    <td
                      className={cn(
                        ui.cell,
                        "py-10 text-center text-slate-400"
                      )}
                      colSpan={5}
                    >
                      {loading ? "Loading..." : "لا يوجد بيانات"}
                    </td>
                  </tr>
                ) : (
                  items.map((d) => (
                    <tr key={d.id} className={ui.row}>
                      <td className={cn(ui.cell, "font-medium")}>
                        {d.full_name}
                      </td>
                      <td className={ui.cell}>{d.phone || "—"}</td>
                      <td className={ui.cell}>{d.license_no || "—"}</td>
                      <td className={ui.cell}>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs border",
                            d.is_active ? ui.badgeOn : ui.badgeOff
                          )}
                        >
                          {d.is_active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>
                      <td className={ui.cell}>
                        <div className="flex gap-2 justify-start">
                          <button onClick={() => openEdit(d)} className={ui.btnGhost}>
                            تعديل
                          </button>
                          <button onClick={() => toggleActive(d)} className={ui.btnGhost}>
                            {d.is_active ? "تعطيل" : "تفعيل"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t border-white/10 bg-white/[0.02]">
            <div className="text-sm text-slate-300">
              الإجمالي:{" "}
              <span className="font-semibold text-slate-100">{total}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={cn(ui.btnGhost, "disabled:opacity-50")}
              >
                السابق
              </button>

              <div className="text-sm text-slate-300">
                صفحة{" "}
                <span className="font-semibold text-slate-100">{page}</span> /{" "}
                {totalPages}
              </div>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={cn(ui.btnGhost, "disabled:opacity-50")}
              >
                التالي
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className={ui.overlay} onClick={() => setOpen(false)}>
          <div className={ui.modal} onClick={(e) => e.stopPropagation()}>
            <div className={ui.modalHead}>
              <div className="text-lg font-semibold text-slate-100">
                {editing ? "تعديل سائق" : "إضافة سائق"}
              </div>
              <button onClick={() => setOpen(false)} className={ui.btnGhost}>
                ✕
              </button>
            </div>

            <div className={ui.modalBody}>
              <div className="space-y-2">
                <div className={ui.label}>الاسم بالكامل *</div>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={ui.input}
                  placeholder="مثال: أحمد حسن"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className={ui.label}>الهاتف</div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={ui.input}
                    placeholder="01xxxxxxxxx"
                  />
                </div>

                <div className="space-y-2">
                  <div className={ui.label}>رقم الرخصة</div>
                  <input
                    value={licenseNo}
                    onChange={(e) => setLicenseNo(e.target.value)}
                    className={ui.input}
                    placeholder="رقم رخصة القيادة"
                  />
                </div>
              </div>
            </div>

            <div className={ui.modalFooter}>
              <button onClick={() => setOpen(false)} className={ui.btnGhost}>
                إلغاء
              </button>
              <button
                onClick={save}
                disabled={loading}
                className={cn(ui.btnPrimary, "disabled:opacity-60")}
              >
                {loading ? "جارٍ الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
