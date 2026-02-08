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

export default function UsersPage() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);

  const role = roleUpper(user?.role);
  const isAdmin = role === "ADMIN";

<<<<<<< HEAD
=======
  // Filters / Paging
>>>>>>> adcc011 (Add i18n and language switcher)
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [take, setTake] = useState(50);
  const [skip, setSkip] = useState(0);

<<<<<<< HEAD
=======
  // Data
>>>>>>> adcc011 (Add i18n and language switcher)
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

<<<<<<< HEAD
=======
  // Create Modal
>>>>>>> adcc011 (Add i18n and language switcher)
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
      setErr(String(e?.message || "Failed to load users"));
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
    await fetchUsers();
  }

  async function onToggleActive(u: UserRow) {
    if (!confirm(`تأكيد تغيير حالة المستخدم: ${u.full_name} ؟`)) return;
    try {
      await setUserStatus(u.id, !u.is_active);
      await fetchUsers();
    } catch (e: any) {
      alert(e?.message || "Failed");
    }
  }

  async function onResetPassword(u: UserRow) {
    const newPass = prompt(`اكتب كلمة مرور جديدة للمستخدم: ${u.full_name}`);
    if (!newPass) return;
    try {
      await resetUserPassword(u.id, newPass);
      alert("تم تغيير كلمة المرور ✅");
    } catch (e: any) {
      alert(e?.message || "Failed");
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
      alert(e?.message || "Failed to create user");
    } finally {
      setCreateBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">Users</div>
        <div className="mt-2 text-white/70">يجب تسجيل الدخول أولاً.</div>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
        >
          Login
        </button>
      </div>
    );
  }

  if (!canRender) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4">
<<<<<<< HEAD
=======
      {/* Header */}
>>>>>>> adcc011 (Add i18n and language switcher)
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-2xl font-bold">Users</div>
          <div className="text-sm text-white/60">Admin-only user management</div>
        </div>

        <button
          onClick={() => setOpenCreate(true)}
          className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
        >
          + Create User
        </button>
      </div>

<<<<<<< HEAD
=======
      {/* Filters */}
>>>>>>> adcc011 (Add i18n and language switcher)
      <Card
        title="Filters"
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
            Reset
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-white/60 mb-1">Search</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="name / email / phone"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-white/60 mb-1">Role</div>
            <input
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value.toUpperCase())}
              placeholder="ADMIN / ACCOUNTANT / ..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <div className="text-xs text-white/60 mb-1">Status</div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as any)}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 outline-none"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Disabled</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={onSearch}
              className="flex-1 px-4 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15"
            >
              Search
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/60">Rows</span>
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

<<<<<<< HEAD
=======
      {/* Table */}
>>>>>>> adcc011 (Add i18n and language switcher)
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="text-sm text-white/70">
            Total: <span className="font-semibold text-white">{total}</span>
          </div>

          <div className="text-sm text-white/70">
            Page <span className="font-semibold text-white">{page}</span> /{" "}
            <span className="font-semibold text-white">{pages}</span>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1050px] w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-white/60" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-white/60" colSpan={8}>
                    No users found.
                  </td>
                </tr>
              ) : (
                items.map((u) => (
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
                        {u.is_active ? "ACTIVE" : "DISABLED"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/70">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-white/70">{fmtDate(u.updated_at)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => onResetPassword(u)}
                        className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => onToggleActive(u)}
                        className="px-3 py-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                      >
                        {u.is_active ? "Disable" : "Enable"}
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
            Prev
          </button>
          <button
            disabled={skip + take >= total}
            onClick={() => setSkip((s) => s + take)}
            className={cn(
              "px-3 py-1 rounded-xl border border-white/10",
              skip + take >= total ? "opacity-50 cursor-not-allowed" : "bg-white/5 hover:bg-white/10"
            )}
          >
            Next
          </button>
        </div>
      </div>

<<<<<<< HEAD
=======
      {/* Create Modal */}
>>>>>>> adcc011 (Add i18n and language switcher)
      {openCreate ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 text-white overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="font-semibold">Create User</div>
              <button
                onClick={() => setOpenCreate(false)}
                className="px-2 py-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <div className="text-xs text-white/60 mb-1">Full name *</div>
                <input
                  value={cFullName}
                  onChange={(e) => setCFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">Email</div>
                  <input
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none"
                    placeholder="optional"
                  />
                </div>
                <div>
                  <div className="text-xs text-white/60 mb-1">Phone</div>
                  <input
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none"
                    placeholder="optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-white/60 mb-1">Role *</div>
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
                  <div className="text-xs text-white/60 mb-1">Password *</div>
                  <input
                    value={cPassword}
                    onChange={(e) => setCPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 outline-none"
                    type="password"
                    placeholder="min 6 chars"
                  />
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-white/10 flex gap-2 justify-end">
              <button
                onClick={() => setOpenCreate(false)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                disabled={createBusy}
                onClick={onCreate}
                className={cn(
                  "px-4 py-2 rounded-xl border border-white/10 bg-white/10 hover:bg-white/15",
                  createBusy ? "opacity-60 cursor-not-allowed" : ""
                )}
              >
                {createBusy ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
