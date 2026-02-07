"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

type User = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string | null;
};

type Vehicle = {
  id: string;
  fleet_no?: string | null;
  plate_no?: string | null;
  display_name?: string | null;
  status?: string | null;
  is_active?: boolean;
  supervisor_id?: string | null;
  created_at?: string | null;
};

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function extractItems(payload: any): any[] {
  // Supports:
  // 1) { items: [...] }
  // 2) { data: [...] }
  // 3) { data: { items: [...] } }
  // 4) direct array
  const p = payload?.data ?? payload;

  if (Array.isArray(p?.items)) return p.items;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.items)) return p.data.items;
  if (Array.isArray(p)) return p;

  return [];
}

const ui = {
  page: "min-h-screen bg-slate-950 text-slate-100",
  container: "max-w-7xl mx-auto p-4 md:p-6 space-y-4",
  shell:
    "rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]",
  header: "flex items-start md:items-center justify-between gap-3 flex-wrap",
  title: "text-2xl font-semibold tracking-tight",
  subtitle: "text-sm text-slate-300",
  btnPrimary:
    "px-3 py-2 rounded-xl bg-white text-black hover:bg-white/90 active:scale-[0.99] transition disabled:opacity-50",
  btnGhost:
    "px-3 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition disabled:opacity-60",
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
    "w-full max-w-2xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#0b1220] to-[#060a12] shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)]",
  modalHead:
    "px-5 py-4 border-b border-white/10 flex items-center justify-between",
  modalBody: "p-5 space-y-4",
  modalFooter: "px-5 pb-5 flex items-center justify-end gap-2",
  label: "text-xs uppercase tracking-wide text-slate-300",
  hint: "text-xs text-slate-400",
};

function vehicleLabel(v: Vehicle) {
  const fleet = String(v.fleet_no || "").trim();
  const plate = String(v.plate_no || "").trim();
  const disp = String(v.display_name || "").trim();
  if (fleet && plate) return `${fleet} - ${plate}`;
  return fleet || plate || disp || v.id;
}

function isSupervisor(u: User) {
  return String(u.role || "").toUpperCase() === "FIELD_SUPERVISOR";
}

/* ---------------- Toast ---------------- */
function Toast({
  open,
  message,
  type,
  onClose,
}: {
  open: boolean;
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className={cn(
        "fixed bottom-4 right-4 z-[9999] max-w-sm cursor-pointer rounded-xl px-4 py-3 text-white shadow-xl",
        type === "success" ? "bg-emerald-600" : "bg-red-600"
      )}
      role="alert"
    >
      <div className="font-semibold">{message}</div>
      <div className="mt-1 text-xs opacity-80">اضغط لإغلاق</div>
    </div>
  );
}

/* ---------------- Create Supervisor Modal ---------------- */
function CreateSupervisorModal({
  open,
  onClose,
  onCreated,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  showToast: (type: "success" | "error", msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    setFullName("");
    setPhone("");
    setEmail("");
    setPassword("");
  }, [open]);

  if (!open) return null;

  const canSubmit = Boolean(fullName.trim() && password.trim());

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await api.post("/users", {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        password: password.trim(),
        role: "FIELD_SUPERVISOR",
      });

      showToast("success", "تم إنشاء المشرف");
      onCreated();
      onClose();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "فشل إنشاء المشرف";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={ui.overlay} onClick={onClose}>
      <div className={ui.modal} onClick={(e) => e.stopPropagation()}>
        <div className={ui.modalHead}>
          <div>
            <div className="text-lg font-semibold">إضافة مشرف</div>
            <div className={ui.hint}>سيتم إنشاء مستخدم بدور FIELD_SUPERVISOR</div>
          </div>
          <button onClick={onClose} className={ui.btnGhost}>
            ✕
          </button>
        </div>

        <div className={ui.modalBody}>
          {/* منع autofill اللي كان بيثبت ايميل/باسورد الأدمن */}
          <input
            style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
            autoComplete="username"
            name="fake-username"
          />
          <input
            style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
            autoComplete="current-password"
            name="fake-password"
            type="password"
          />

          <div className="grid gap-2">
            <div className={ui.label}>اسم المشرف *</div>
            <input
              className={ui.input}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="off"
              name="supervisor_full_name"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <div className={ui.label}>الهاتف</div>
              <input
                className={ui.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="off"
                name="supervisor_phone"
              />
            </div>
            <div className="grid gap-2">
              <div className={ui.label}>البريد</div>
              <input
                className={ui.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                name="supervisor_email"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className={ui.label}>كلمة المرور *</div>
            <input
              type="password"
              className={ui.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              name="supervisor_new_password"
            />
          </div>
        </div>

        <div className={ui.modalFooter}>
          <button onClick={onClose} className={ui.btnGhost} disabled={saving}>
            إلغاء
          </button>
          <button onClick={submit} className={ui.btnPrimary} disabled={!canSubmit || saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Manage Vehicles Modal ---------------- */
function ManageSupervisorVehiclesModal({
  open,
  supervisor,
  vehicles,
  onClose,
  onSaved,
  showToast,
}: {
  open: boolean;
  supervisor: User | null;
  vehicles: Vehicle[];
  onClose: () => void;
  onSaved: () => void;
  showToast: (type: "success" | "error", msg: string) => void;
}) {
  // ✅ Hooks MUST be called unconditionally
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());

  const supervisorId = supervisor?.id || "";
  const isOpenOk = Boolean(open && supervisorId);

  // ✅ Compute selected ids safely (no Set in deps)
  const selectedIdsArr = useMemo(() => {
    if (!supervisorId) return [] as string[];
    return vehicles
      .filter((v) => String(v.supervisor_id || "") === supervisorId)
      .map((v) => v.id);
  }, [vehicles, supervisorId]);

  // ✅ Sync localSelected when modal opens / supervisor changes
  useEffect(() => {
    if (!isOpenOk) return;
    setQ("");
    setLocalSelected(new Set(selectedIdsArr));
  }, [isOpenOk, supervisorId, selectedIdsArr]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    const base = vehicles.filter((v) => v.is_active !== false);
    if (!s) return base;

    return base.filter((v) => {
      const text = `${vehicleLabel(v)} ${v.status || ""}`.toLowerCase();
      return text.includes(s);
    });
  }, [vehicles, q]);

  function toggle(id: string) {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!supervisorId) return;

    setSaving(true);
    try {
      const current = new Set(selectedIdsArr);
      const wanted = localSelected;

      const toAdd = Array.from(wanted).filter((id) => !current.has(id));
      const toRemove = Array.from(current).filter((id) => !wanted.has(id));

      for (const id of toAdd) {
        await api.patch(`/vehicles/${id}`, { supervisor_id: supervisorId });
      }
      for (const id of toRemove) {
        await api.patch(`/vehicles/${id}`, { supervisor_id: null });
      }

      showToast("success", "تم حفظ سيارات المشرف");
      onSaved();
      onClose();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "فشل الحفظ (تأكد أن PATCH /vehicles/:id يدعم supervisor_id)";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  }

  // ✅ return AFTER all hooks
  if (!isOpenOk) return null;

  return (
    <div className={ui.overlay} onClick={onClose}>
      <div className={cn(ui.modal, "max-w-3xl")} onClick={(e) => e.stopPropagation()}>
        <div className={ui.modalHead}>
          <div>
            <div className="text-lg font-semibold text-slate-100">
              سيارات المشرف: {supervisor!.full_name}
            </div>
            <div className={ui.hint}>لكل عربية مشرف واحد فقط.</div>
          </div>
          <button onClick={onClose} className={ui.btnGhost}>✕</button>
        </div>

        <div className={ui.modalBody}>
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <input
              className={cn(ui.input, "max-w-md")}
              placeholder="بحث: fleet / plate / status..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              name="vehicles_search"
            />
            <div className="text-sm text-slate-300">
              Selected: <span className="font-semibold text-slate-100">{localSelected.size}</span>
            </div>
          </div>

          <div className={cn(ui.tableWrap, "mt-2")}>
            <div className="overflow-auto max-h-[55vh]">
              <table className="w-full text-sm">
                <thead className={ui.thead}>
                  <tr className="text-right">
                    <th className={cn(ui.cell, "w-[70px]")}>اختيار</th>
                    <th className={ui.cell}>العربية</th>
                    <th className={ui.cell}>الحالة</th>
                    <th className={ui.cell}>نشط</th>
                    <th className={ui.cell}>المشرف الحالي</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr className="border-t border-white/10">
                      <td colSpan={5} className={cn(ui.cell, "py-10 text-center text-slate-400")}>
                        لا يوجد نتائج
                      </td>
                    </tr>
                  ) : null}

                  {list.map((v) => {
                    const checked = localSelected.has(v.id);
                    const ownedByOther = v.supervisor_id && v.supervisor_id !== supervisorId;

                    return (
                      <tr key={v.id} className={ui.row}>
                        <td className={ui.cell}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(v.id)}
                            disabled={saving || Boolean(ownedByOther)}
                            className="h-4 w-4 accent-white"
                            title={ownedByOther ? "مربوطة بمشرف آخر" : ""}
                          />
                        </td>
                        <td className={cn(ui.cell, "font-medium")}>{vehicleLabel(v)}</td>
                        <td className={ui.cell}>{v.status || "—"}</td>
                        <td className={ui.cell}>
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs border",
                              v.is_active === false ? ui.badgeOff : ui.badgeOn
                            )}
                          >
                            {v.is_active === false ? "INACTIVE" : "ACTIVE"}
                          </span>
                        </td>
                        <td className={ui.cell}>
                          {v.supervisor_id
                            ? v.supervisor_id === supervisorId
                              ? "هذا المشرف"
                              : "مشرف آخر"
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-white/10 bg-white/[0.02] text-xs text-slate-400">
              * الحفظ يعتمد على PATCH /vehicles/:id لتحديث supervisor_id
            </div>
          </div>
        </div>

        <div className={ui.modalFooter}>
          <button onClick={onClose} className={ui.btnGhost} disabled={saving}>إلغاء</button>
          <button onClick={save} className={ui.btnPrimary} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function SupervisorsPage() {
  const user = useAuth((s) => s.user);
  const role = String(user?.role || "").toUpperCase();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [q, setQ] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [manageOpen, setManageOpen] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<User | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  const canCreate = role === "ADMIN";
  const canManage = role === "ADMIN" || role === "HR" || role === "GENERAL_SUPERVISOR";

  async function loadAll() {
    setLoading(true);
    try {
      const uRes = await api.get("/users");
      const uItems = extractItems(uRes);

      const vRes = await api.get("/vehicles?limit=200");
      const vItems = extractItems(vRes);

      setUsers(uItems);
      setVehicles(vItems);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "فشل تحميل البيانات";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supervisors = useMemo(() => {
    let list = users.filter(isSupervisor);

    if (activeFilter === "true") list = list.filter((u) => u.is_active === true);
    if (activeFilter === "false") list = list.filter((u) => u.is_active === false);

    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter((u) => {
        const text = `${u.full_name || ""} ${u.email || ""} ${u.phone || ""}`.toLowerCase();
        return text.includes(s);
      });
    }

    list.sort((a, b) => {
      const aa = a.is_active ? 0 : 1;
      const bb = b.is_active ? 0 : 1;
      if (aa !== bb) return aa - bb;
      return String(a.full_name || "").localeCompare(String(b.full_name || ""), "ar");
    });

    return list;
  }, [users, q, activeFilter]);

  const vehiclesBySupervisor = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vehicles) {
      const sid = String(v.supervisor_id || "");
      if (!sid) continue;
      map.set(sid, (map.get(sid) || 0) + 1);
    }
    return map;
  }, [vehicles]);

  function openManage(u: User) {
    setSelectedSupervisor(u);
    setManageOpen(true);
  }

  return (
    <div className={ui.page} dir="rtl">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-[-120px] left-[-120px] h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
      </div>

      <div className={ui.container}>
        <div className={cn("p-4 md:p-6", ui.shell)}>

          <div className={ui.header}>
            <div>
              <h1 className={ui.title}>المشرفين</h1>
              <p className={ui.subtitle}>
                إدارة مشرفين التشغيل + ربط العربيات بكل مشرف (لكل عربية مشرف واحد)
              </p>
            </div>

            <div className="flex gap-2">
              <button onClick={loadAll} className={ui.btnGhost} disabled={loading}>
                {loading ? "جارٍ التحديث..." : "تحديث"}
              </button>

              <button
                onClick={() => setCreateOpen(true)}
                className={ui.btnPrimary}
                disabled={!canCreate}
                title={!canCreate ? "إنشاء المشرفين ADMIN فقط" : ""}
              >
                + إضافة مشرف
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-2 flex-wrap items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="بحث بالاسم / الهاتف / البريد..."
              className={cn(ui.input, "w-[420px] max-w-full")}
              autoComplete="off"
              name="supervisors_search"
            />

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className={ui.select}
              name="supervisors_active_filter"
            >
              <option value="">الكل</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <div className="text-sm text-slate-300">
              الإجمالي: <span className="font-semibold text-slate-100">{supervisors.length}</span>
            </div>
          </div>

          <div className={cn("mt-5", ui.tableWrap)}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={ui.thead}>
                  <tr className="text-right">
                    <th className={ui.cell}>الاسم</th>
                    <th className={ui.cell}>الهاتف</th>
                    <th className={ui.cell}>البريد</th>
                    <th className={ui.cell}>الحالة</th>
                    <th className={ui.cell}>عدد العربيات</th>
                    <th className={cn(ui.cell, "w-[240px]")}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisors.length === 0 ? (
                    <tr className="border-t border-white/10">
                      <td colSpan={6} className={cn(ui.cell, "py-10 text-center text-slate-400")}>
                        {loading ? "Loading..." : "لا يوجد مشرفين"}
                      </td>
                    </tr>
                  ) : null}

                  {supervisors.map((u) => {
                    const count = vehiclesBySupervisor.get(u.id) || 0;

                    return (
                      <tr key={u.id} className={ui.row}>
                        <td className={cn(ui.cell, "font-medium")}>{u.full_name}</td>
                        <td className={ui.cell}>{u.phone || "—"}</td>
                        <td className={ui.cell}>{u.email || "—"}</td>
                        <td className={ui.cell}>
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs border",
                              u.is_active ? ui.badgeOn : ui.badgeOff
                            )}
                          >
                            {u.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className={ui.cell}>
                          <span className="font-semibold">{count}</span>
                        </td>
                        <td className={ui.cell}>
                          <div className="flex gap-2 justify-start">
                            <button
                              className={ui.btnGhost}
                              onClick={() => openManage(u)}
                              disabled={!canManage}
                              title={!canManage ? "غير مصرح لك" : ""}
                            >
                              إدارة العربيات
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-white/10 bg-white/[0.02] text-xs text-slate-400">
              * الربط يعتمد على vehicles.supervisor_id و PATCH /vehicles/:id لتحديثه
            </div>
          </div>

        </div>
      </div>

      <CreateSupervisorModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => loadAll()}
        showToast={showToast}
      />

      <ManageSupervisorVehiclesModal
        open={manageOpen}
        supervisor={selectedSupervisor}
        vehicles={vehicles}
        onClose={() => setManageOpen(false)}
        onSaved={() => loadAll()}
        showToast={showToast}
      />

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}
