"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { unwrapItems, unwrapTotal } from "@/src/lib/api";
import {
  listUsers,
  createUser,
  resetUserPassword,
  setUserStatus,
  type UserRow,
} from "@/src/lib/users.api";
import { useT } from "@/src/i18n/useT";

// ✅ UI System (Light)
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable } from "@/src/components/ui/DataTable";

// ✅ Toast + ConfirmDialog
import { Toast } from "@/src/components/Toast";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

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

export default function UsersPage() {
  const t = useT();
  const router = useRouter();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);

  const role = roleUpper(user?.role);
  const isAdmin = role === "ADMIN";
  const canRender = !!token && !!user && isAdmin;

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(message: string, type: "success" | "error" = "success") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
  }

  // ConfirmDialog (toggle status)
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

  // Filters / Paging
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [take, setTake] = useState(50);
  const [skip, setSkip] = useState(0);

  // Data
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Create Modal
  const [openCreate, setOpenCreate] = useState(false);
  const [cFullName, setCFullName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cRole, setCRole] = useState("FIELD_SUPERVISOR");
  const [cPassword, setCPassword] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  // Reset Password Modal
  const [openResetPw, setOpenResetPw] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [newPass, setNewPass] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  useEffect(() => {
    hydrate?.();
  }, [hydrate]);

  useEffect(() => {
    if (!token) return;
    if (!user) return;
    if (!isAdmin) router.replace("/dashboard");
  }, [token, user, isAdmin, router]);

  async function fetchUsers(next?: { resetSkip?: boolean }) {
    if (next?.resetSkip) setSkip(0);

    setLoading(true);
    setErr(null);
    try {
      const res = await listUsers({
        q: q.trim() || undefined,
        role: roleFilter || undefined,
        is_active: activeFilter || undefined,
        take,
        skip: next?.resetSkip ? 0 : skip,
      });
      setItems(unwrapItems<UserRow>(res));
      setTotal(unwrapTotal(res));
    } catch (e: any) {
      setErr(String(e?.message || t("users.errors.loadFailed")));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canRender) return;
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRender, take, skip]);

  const page = useMemo(() => Math.floor(skip / take) + 1, [skip, take]);
  const pages = useMemo(() => Math.max(1, Math.ceil((total || 0) / take)), [total, take]);

  function resetPaging() {
    setSkip(0);
  }

  async function onSearch() {
    resetPaging();
    await fetchUsers({ resetSkip: true });
  }

  async function onToggleActive(u: UserRow) {
    const msg = t("users.confirm.toggleStatus", { name: u.full_name });

    openConfirm({
      title: u.is_active ? "تأكيد التعطيل" : "تأكيد التفعيل",
      description: msg,
      action: async () => {
        setConfirmBusy(true);
        try {
          await setUserStatus(u.id, !u.is_active);
          showToast(t("common.saved") || t("common.success"), "success");
          await fetchUsers();
        } catch (e: any) {
          showToast(e?.message || t("common.failed"), "error");
        } finally {
          setConfirmBusy(false);
          setConfirmOpen(false);
        }
      },
    });
  }

  function openResetPassword(u: UserRow) {
    setResetTarget(u);
    setNewPass("");
    setOpenResetPw(true);
  }

  async function onSubmitResetPassword() {
    if (!resetTarget) return;
    if (!newPass.trim()) {
      showToast(t("users.errors.passwordRequired") || t("common.required"), "error");
      return;
    }

    setResetBusy(true);
    try {
      await resetUserPassword(resetTarget.id, newPass.trim());
      setOpenResetPw(false);
      setResetTarget(null);
      setNewPass("");
      showToast(t("users.alert.passwordChanged"), "success");
    } catch (e: any) {
      showToast(e?.message || t("common.failed"), "error");
    } finally {
      setResetBusy(false);
    }
  }

  async function onCreate() {
    if (!cFullName.trim()) {
      showToast(t("users.errors.fullNameRequired") || t("common.required"), "error");
      return;
    }
    if (!cPassword) {
      showToast(t("users.errors.passwordRequired") || t("common.required"), "error");
      return;
    }

    setCreateBusy(true);
    try {
      await createUser({
        full_name: cFullName.trim(),
        email: cEmail.trim() ? cEmail.trim() : null,
        phone: cPhone.trim() ? cPhone.trim() : null,
        role: cRole,
        password: cPassword,
      });

      setOpenCreate(false);
      setCFullName("");
      setCEmail("");
      setCPhone("");
      setCRole("FIELD_SUPERVISOR");
      setCPassword("");
      resetPaging();
      showToast(t("common.created") || t("common.success"), "success");
      await fetchUsers({ resetSkip: true });
    } catch (e: any) {
      showToast(e?.message || t("users.errors.createFailed"), "error");
    } finally {
      setCreateBusy(false);
    }
  }

  // ===== Guards =====
  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <Card>
            <div className="text-lg font-semibold text-gray-900">{t("users.title")}</div>
            <div className="mt-2 text-gray-600">{t("users.mustLogin")}</div>
            <div className="mt-4">
              <Button onClick={() => router.push("/login")}>{t("common.login")}</Button>
            </div>
          </Card>
        </div>

        <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
      </div>
    );
  }

  if (!canRender) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <Card>
            <div className="text-gray-700">{t("common.loading")}</div>
          </Card>
        </div>

        <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
      </div>
    );
  }

  // ===== Page =====
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title={t("users.title")}
          subtitle={t("users.subtitle")}
          actions={<Button onClick={() => setOpenCreate(true)}>{t("users.actions.create")}</Button>}
        />

        {/* Filters */}
        <Card
          title={t("users.filters.title")}
          right={
            <Button
              variant="ghost"
              onClick={() => {
                setQ("");
                setRoleFilter("");
                setActiveFilter("");
                resetPaging();
                fetchUsers({ resetSkip: true });
              }}
            >
              {t("common.reset")}
            </Button>
          }
        >
          <FiltersBar
            left={
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                <div>
                  <div className="text-xs text-gray-600 mb-1">{t("common.search")}</div>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("users.filters.searchPlaceholder")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">{t("users.filters.role")}</div>
                  <input
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value.toUpperCase())}
                    placeholder={t("users.filters.rolePlaceholder")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">{t("users.filters.status")}</div>
                  <select
                    value={activeFilter}
                    onChange={(e) => setActiveFilter(e.target.value as any)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="">{t("common.all")}</option>
                    <option value="true">{t("common.active")}</option>
                    <option value="false">{t("common.disabled")}</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={onSearch} className="flex-1">
                    {t("common.search")}
                  </Button>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600">{t("common.rows")}</span>
                    <select
                      value={take}
                      onChange={(e) => {
                        setTake(Number(e.target.value));
                        resetPaging();
                      }}
                      className="rounded-xl border border-gray-200 bg-white px-2 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            }
          />

          {err ? <div className="mt-3 text-sm text-red-600">⚠️ {err}</div> : null}
        </Card>

        {/* Table */}
        <DataTable<UserRow>
          title={t("users.title")}
          columns={[
            { key: "full_name", label: t("users.table.name") },
            { key: "email", label: t("users.table.email") },
            { key: "phone", label: t("users.table.phone") },
            { key: "role", label: t("users.table.role") },
            {
              key: "is_active",
              label: t("users.table.status"),
              render: (u) => (
                <span
                  className={
                    u.is_active
                      ? "inline-flex items-center px-2 py-1 rounded-full text-xs border bg-green-50 text-green-700 border-green-200"
                      : "inline-flex items-center px-2 py-1 rounded-full text-xs border bg-red-50 text-red-700 border-red-200"
                  }
                >
                  {u.is_active ? t("common.activeUpper") : t("common.disabledUpper")}
                </span>
              ),
            },
            { key: "created_at", label: t("users.table.created"), render: (u) => fmtDate((u as any).created_at) },
            { key: "updated_at", label: t("users.table.updated"), render: (u) => fmtDate((u as any).updated_at) },
            {
              key: "actions",
              label: t("users.table.actions"),
              className: "text-left",
              headerClassName: "text-left",
              render: (u) => (
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => openResetPassword(u)}>
                    {t("users.actions.resetPw")}
                  </Button>
                  <Button variant="secondary" onClick={() => onToggleActive(u)}>
                    {u.is_active ? t("users.actions.disable") : t("users.actions.enable")}
                  </Button>
                </div>
              ),
            },
          ]}
          rows={items}
          loading={loading}
          emptyTitle={t("users.empty")}
          emptyHint={t("common.tryAdjustFilters") || t("common.noData")}
          total={total}
          page={page}
          pages={pages}
          onPrev={skip <= 0 ? undefined : () => setSkip((s) => Math.max(0, s - take))}
          onNext={skip + take >= total ? undefined : () => setSkip((s) => s + take)}
        />

        {/* Create Modal (Light) */}
        {openCreate ? (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div dir="rtl" className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white text-gray-900 overflow-hidden shadow-xl">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="font-semibold">{t("users.modal.title")}</div>
                <button onClick={() => setOpenCreate(false)} className="px-2 py-1 rounded-lg hover:bg-gray-100">
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs text-gray-600 mb-1">{t("users.modal.fullName")} *</div>
                  <input
                    value={cFullName}
                    onChange={(e) => setCFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">{t("users.modal.email")}</div>
                    <input
                      value={cEmail}
                      onChange={(e) => setCEmail(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder={t("common.optional")}
                    />
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">{t("users.modal.phone")}</div>
                    <input
                      value={cPhone}
                      onChange={(e) => setCPhone(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder={t("common.optional")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">{t("users.modal.role")} *</div>
                    <select
                      value={cRole}
                      onChange={(e) => setCRole(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    >
                      <option value="FIELD_SUPERVISOR">FIELD_SUPERVISOR</option>
                      <option value="ACCOUNTANT">ACCOUNTANT</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="HR">HR</option>
                      <option value="GENERAL_SUPERVISOR">GENERAL_SUPERVISOR</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">{t("users.modal.password")} *</div>
                    <input
                      value={cPassword}
                      onChange={(e) => setCPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                      type="password"
                      placeholder={t("users.modal.passwordHint")}
                    />
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-200 flex gap-2 justify-start">
                <Button variant="secondary" onClick={() => setOpenCreate(false)}>
                  {t("common.cancel")}
                </Button>
                <Button isLoading={createBusy} disabled={createBusy} onClick={onCreate}>
                  {t("users.modal.create")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Reset Password Modal (Light) */}
        {openResetPw ? (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div dir="rtl" className="w-full max-w-md rounded-2xl border border-gray-200 bg-white text-gray-900 overflow-hidden shadow-xl">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="font-semibold">
                  {t("users.actions.resetPw")} — {resetTarget?.full_name || "—"}
                </div>
                <button
                  onClick={() => {
                    setOpenResetPw(false);
                    setResetTarget(null);
                    setNewPass("");
                  }}
                  className="px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <div className="text-xs text-gray-600 mb-1">
                    {t("users.prompt.newPassword", { name: resetTarget?.full_name || "" })}
                  </div>
                  <input
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-gray-200"
                    type="password"
                    placeholder={t("users.modal.passwordHint")}
                  />
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-200 flex gap-2 justify-start">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOpenResetPw(false);
                    setResetTarget(null);
                    setNewPass("");
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button isLoading={resetBusy} disabled={resetBusy} onClick={onSubmitResetPassword}>
                  {t("common.save") || t("common.confirm")}
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