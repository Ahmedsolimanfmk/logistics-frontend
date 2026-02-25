"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

// ✅ Theme Components
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Card } from "@/src/components/ui/Card";
import { Toast } from "@/src/components/Toast"; // عندك نسختين: ui/Toast و components/Toast
// لو عندك Toast في ui (زي اللي كتبته قبل كده): غيّر السطر اللي فوق إلى:
// import { Toast } from "@/src/components/ui/Toast";

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
  const p = payload?.data ?? payload;

  if (Array.isArray(p?.items)) return p.items;
  if (Array.isArray(p?.data)) return p.data;
  if (Array.isArray(p?.data?.items)) return p.data.items;
  if (Array.isArray(p)) return p;

  return [];
}

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

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none " +
  "placeholder:text-gray-400 focus:ring-2 focus:ring-black/10";

const selectCls =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10";

/* ---------------- Modal Shell (Unified) ---------------- */
function Modal({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  maxWidthClassName = "max-w-2xl",
}: {
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
      dir="rtl"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn("w-full", maxWidthClassName)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Card
          title={
            <div>
              <div className="text-sm font-semibold text-gray-900">{title}</div>
              {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
            </div>
          }
          right={
            <Button variant="ghost" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          }
        >
          <div className="space-y-4">{children}</div>

          {footer ? <div className="mt-4 flex items-center justify-start gap-2">{footer}</div> : null}
        </Card>
      </div>
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
      const msg = e?.response?.data?.message || e?.message || "فشل إنشاء المشرف";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="إضافة مشرف"
      subtitle="سيتم إنشاء مستخدم بدور FIELD_SUPERVISOR"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit || saving} isLoading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      {/* منع autofill اللي كان بيثبت ايميل/باسورد الأدمن */}
      <input style={{ position: "absolute", left: "-9999px", top: "-9999px" }} autoComplete="username" name="fake-username" />
      <input style={{ position: "absolute", left: "-9999px", top: "-9999px" }} autoComplete="current-password" name="fake-password" type="password" />

      <div className="grid gap-2">
        <div className="text-xs text-gray-500">اسم المشرف *</div>
        <input
          className={inputCls}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="off"
          name="supervisor_full_name"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="grid gap-2">
          <div className="text-xs text-gray-500">الهاتف</div>
          <input
            className={inputCls}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="off"
            name="supervisor_phone"
          />
        </div>

        <div className="grid gap-2">
          <div className="text-xs text-gray-500">البريد</div>
          <input
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            name="supervisor_email"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="text-xs text-gray-500">كلمة المرور *</div>
        <input
          type="password"
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          name="supervisor_new_password"
        />
      </div>
    </Modal>
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
  // ✅ Hooks unconditionally
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set());

  const supervisorId = supervisor?.id || "";
  const isOpenOk = Boolean(open && supervisorId);

  const selectedIdsArr = useMemo(() => {
    if (!supervisorId) return [] as string[];
    return vehicles
      .filter((v) => String(v.supervisor_id || "") === supervisorId)
      .map((v) => v.id);
  }, [vehicles, supervisorId]);

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

  // ✅ return after hooks
  if (!isOpenOk) return null;

  const columns: DataTableColumn<Vehicle>[] = [
    {
      key: "select",
      label: "اختيار",
      headerClassName: "w-[80px]",
      render: (v) => {
        const checked = localSelected.has(v.id);
        const ownedByOther = v.supervisor_id && v.supervisor_id !== supervisorId;

        return (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggle(v.id)}
            disabled={saving || Boolean(ownedByOther)}
            className="h-4 w-4"
            title={ownedByOther ? "مربوطة بمشرف آخر" : ""}
          />
        );
      },
    },
    { key: "vehicle", label: "العربية", render: (v) => <span className="font-medium">{vehicleLabel(v)}</span> },
    { key: "status", label: "الحالة", render: (v) => v.status || "—" },
    {
      key: "active",
      label: "نشط",
      render: (v) => <StatusBadge status={v.is_active === false ? "INACTIVE" : "ACTIVE"} />,
    },
    {
      key: "owner",
      label: "المشرف الحالي",
      render: (v) =>
        v.supervisor_id ? (v.supervisor_id === supervisorId ? "هذا المشرف" : "مشرف آخر") : "—",
    },
  ];

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={`سيارات المشرف: ${supervisor!.full_name}`}
      subtitle="لكل عربية مشرف واحد فقط."
      maxWidthClassName="max-w-4xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={save} isLoading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <FiltersBar
        left={
          <input
            className={cn(inputCls, "max-w-md")}
            placeholder="بحث: fleet / plate / status..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            name="vehicles_search"
          />
        }
        right={
          <div className="text-sm text-gray-600">
            Selected: <span className="font-semibold text-gray-900">{localSelected.size}</span>
          </div>
        }
      />

      <DataTable
        title="قائمة العربيات"
        subtitle="* الحفظ يعتمد على PATCH /vehicles/:id لتحديث supervisor_id"
        columns={columns}
        rows={list}
        loading={false}
        emptyTitle="لا يوجد نتائج"
        emptyHint="جرّب تغيير البحث."
        minWidthClassName="min-w-[900px]"
      />
    </Modal>
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

  const columns: DataTableColumn<User>[] = [
    { key: "full_name", label: "الاسم", render: (u) => <span className="font-medium">{u.full_name}</span> },
    { key: "phone", label: "الهاتف", render: (u) => u.phone || "—" },
    { key: "email", label: "البريد", render: (u) => u.email || "—" },
    {
      key: "status",
      label: "الحالة",
      render: (u) => <StatusBadge status={u.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "vehicles_count",
      label: "عدد العربيات",
      render: (u) => <span className="font-semibold">{vehiclesBySupervisor.get(u.id) || 0}</span>,
    },
    {
      key: "actions",
      label: "إجراءات",
      headerClassName: "w-[240px]",
      render: (u) => (
        <div className="flex gap-2 justify-start">
          <Button
            variant="secondary"
            onClick={() => openManage(u)}
            disabled={!canManage}
            title={!canManage ? "غير مصرح لك" : ""}
          >
            إدارة العربيات
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <Card>
          <div className="space-y-4">
            <PageHeader
              title="المشرفين"
              subtitle="إدارة مشرفين التشغيل + ربط العربيات بكل مشرف (لكل عربية مشرف واحد)"
              actions={
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={loadAll} isLoading={loading}>
                    تحديث
                  </Button>

                  <Button
                    variant="primary"
                    onClick={() => setCreateOpen(true)}
                    disabled={!canCreate}
                    title={!canCreate ? "إنشاء المشرفين ADMIN فقط" : ""}
                  >
                    + إضافة مشرف
                  </Button>
                </div>
              }
            />

            <FiltersBar
              left={
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="بحث بالاسم / الهاتف / البريد..."
                    className={cn(inputCls, "w-[420px] max-w-full")}
                    autoComplete="off"
                    name="supervisors_search"
                  />

                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value)}
                    className={selectCls}
                    name="supervisors_active_filter"
                  >
                    <option value="">الكل</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>

                  <div className="text-sm text-gray-600">
                    الإجمالي:{" "}
                    <span className="font-semibold text-gray-900">{supervisors.length}</span>
                  </div>
                </div>
              }
            />

            <DataTable
              title="قائمة المشرفين"
              subtitle="* الربط يعتمد على vehicles.supervisor_id و PATCH /vehicles/:id لتحديثه"
              columns={columns}
              rows={supervisors}
              loading={loading}
              emptyTitle="لا يوجد مشرفين"
              emptyHint="جرّب تغيير الفلاتر أو البحث."
              minWidthClassName="min-w-[1000px]"
            />
          </div>
        </Card>
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
        dir="rtl"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}