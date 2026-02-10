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

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function fmtTpl(template: string, vars: Record<string, any>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export default function UsersPage() {
  const t = useT();
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);

  const role = roleUpper(user?.role);
  const isAdmin = role === "ADMIN";

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

  useEffect(() => {
    hydrate?.();
  }, [hydrate]);

  useEffect(() => {
    if (!token) return;
    if (!user) return;
    if (!isAdmin) router.replace("/dashboard");
  }, [token, user, isAdmin, router]);

  const canRender = !!token && !!user && isAdmin;

  async function fetchUsers() {
    setLoading(true);
    setErr(null);
    try {
      const res = await listUsers({
        q: q.trim() || undefined,
        role: roleFilter || undefined,
        is_active: activeFilter || undefined,
        take,
        skip,
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
  const pages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / take)),
    [total, take]
  );

  function resetPaging() {
    setSkip(0);
  }

  async function onSearch() {
    resetPaging();
    await fetchUsers();
  }

  async function onToggleActive(u: UserRow) {
    const msg = fmtTpl(t("users.confirm.toggleStatus"), { name: u.full_name });
    if (!confirm(msg)) return;
    try {
      await setUserStatus(u.id, !u.is_active);
      await fetchUsers();
    } catch (e: any) {
      alert(e?.message || t("common.failed"));
    }
  }

  async function onResetPassword(u: UserRow) {
    const msg = fmtTpl(t("users.prompt.newPassword"), { name: u.full_name });
    const newPass = prompt(msg);
    if (!newPass) return;
    try {
      await resetUserPassword(u.id, newPass);
      alert(t("users.alert.passwordChanged"));
    } catch (e: any) {
      alert(e?.message || t("common.failed"));
    }
  }

  async function onCreate() {
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
      await fetchUsers();
    } catch (e: any) {
      alert(e?.message || t("users.errors.createFailed"));
    } finally {
      setCreateBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">{t("users.title")}</div>
        <div className="mt-2 text-white/70">{t("users.mustLogin")}</div>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
        >
          {t("common.login")}
        </button>
      </div>
    );
  }

  if (!canRender) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-2xl font-bold">{t("users.title")}</div>
          <div className="text-sm text-white/60">{t("users.subtitle")}</div>
        </div>

        <button
          onClick={() => setOpenCreate(true)}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
        >
          {t("users.actions.create")}
        </button>
      </div>

      {/* Filters */}
      <Card
        title={t("users.filters.title")}
        right={
          <button
            onClick={() => {
              setQ("");
              setRoleFilter("");
              setActiveFilter("");
              resetPaging();
              fetchUsers();
            }}
            className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {t("common.reset")}
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-white/60 mb-1">{t("common.search")}</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("users.filters.searchPlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-white/60 mb-1">{t("users.filters.role")}</div>
            <input
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value.toUpperCase())}
              placeholder={t("users.filters.rolePlaceholder")}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-white/60 mb-1">{t("users.filters.status")}</div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 outline-none"
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("common.active")}</option>
              <option value="false">{t("common.disabled")}</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={onSearch}
              className="flex-1 px-4 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15"
            >
              {t("common.search")}
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/60">{t("common.rows")}</span>
              <select
                value={take}
                onChange={(e) => {
                  setTake(Number(e.target.value));
                  resetPaging();
                }}
                className="rounded-xl border border-white/10 bg-slate-950 px-2 py-2 outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>

        {err ? <div className="mt-3 text-sm text-red-300">⚠️ {err}</div> : null}
      </Card>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="text-sm text-white/70">
            {t("common.total")}: <span className="font-semibold text-white">{total}</span>
          </div>

          <div className="text-sm text-white/70">
            {t("common.page")} <span className="font-semibold text-white">{page}</span> /{" "}
            <span className="font-semibold text-white">{pages}</span>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1050px] w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="text-left px-4 py-3">{t("users.table.name")}</th>
                <th className="text-left px-4 py-3">{t("users.table.email")}</th>
                <th className="text-left px-4 py-3">{t("users.table.phone")}</th>
                <th className="text-left px-4 py-3">{t("users.table.role")}</th>
                <th className="text-left px-4 py-3">{t("users.table.status")}</th>
                <th className="text-left px-4 py-3">{t("users.table.created")}</th>
                <th className="text-left px-4 py-3">{t("users.table.updated")}</th>
                <th className="text-right px-4 py-3">{t("users.table.actions")}</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-white/60" colSpan={8}>
                    {t("common.loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-white/60" colSpan={8}>
                    {t("users.empty")}
                  </td>
                </tr>
              ) : (
                items.map((u: any) => (
                  <tr key={u.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-medium text-white">{u.full_name}</td>
                    <td className="px-4 py-3 text-white/80">{u.email || "—"}</td>
                    <td className="px-4 py-3 text-white/80">{u.phone || "—"}</td>
                    <td className="px-4 py-3 text-white/80">{u.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2 py-1 rounded-full text-xs border",
                          u.is_active
                            ? "bg-green-500/10 text-green-200 border-green-500/20"
                            : "bg-red-500/10 text-red-200 border-red-500/20"
                        )}
                      >
                        {u.is_active ? t("common.activeUpper") : t("common.disabledUpper")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-white/70">{fmtDate(u.updated_at)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => onResetPassword(u)}
                        className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        {t("users.actions.resetPw")}
                      </button>
                      <button
                        onClick={() => onToggleActive(u)}
                        className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        {u.is_active ? t("users.actions.disable") : t("users.actions.enable")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-end gap-2">
          <button
            disabled={skip <= 0}
            onClick={() => setSkip((s) => Math.max(0, s - take))}
            className={cn(
              "px-3 py-1 rounded-xl border border-white/10",
              skip <= 0 ? "opacity-50 cursor-not-allowed" : "bg-white/5 hover:bg-white/10"
            )}
          >
            {t("common.prev")}
          </button>
          <button
            disabled={skip + take >= total}
            onClick={() => setSkip((s) => s + take)}
            className={cn(
              "px-3 py-1 rounded-xl border border-white/10",
              skip + take >= total ? "opacity-50 cursor-not-allowed" : "bg-white/5 hover:bg-white/10"
            )}
          >
            {t("common.next")}
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {openCreate ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 text-white overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="font-semibold">{t("users.modal.title")}</div>
              <button
                onClick={() => setOpenCreate(false)}
                className="px-2 py-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs text-white/60 mb-1">{t("users.modal.fullName")} *</div>
                <input
                  value={cFullName}
                  onChange={(e) => setCFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">{t("users.modal.email")}</div>
                  <input
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none"
                    placeholder={t("common.optional")}
                  />
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">{t("users.modal.phone")}</div>
                  <input
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none"
                    placeholder={t("common.optional")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">{t("users.modal.role")} *</div>
                  <select
                    value={cRole}
                    onChange={(e) => setCRole(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none"
                  >
                    <option value="FIELD_SUPERVISOR">FIELD_SUPERVISOR</option>
                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="HR">HR</option>
                    <option value="GENERAL_SUPERVISOR">GENERAL_SUPERVISOR</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs text-white/60 mb-1">{t("users.modal.password")} *</div>
                  <input
                    value={cPassword}
                    onChange={(e) => setCPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none"
                    type="password"
                    placeholder={t("users.modal.passwordHint")}
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-white/10 flex gap-2 justify-end">
              <button
                onClick={() => setOpenCreate(false)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
              >
                {t("common.cancel")}
              </button>
              <button
                disabled={createBusy}
                onClick={onCreate}
                className={cn(
                  "px-4 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15",
                  createBusy ? "opacity-60 cursor-not-allowed" : ""
                )}
              >
                {createBusy ? t("users.modal.creating") : t("users.modal.create")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
