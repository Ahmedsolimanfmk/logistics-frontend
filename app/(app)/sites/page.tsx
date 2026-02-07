"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api, unwrapItems } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter } from "next/navigation";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

const fmtDate = (d: any) => {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
};

export default function SitesPage() {
  const router = useRouter();
  const token = useAuth((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rawItems, setRawItems] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState<string>("");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
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

  async function loadClients() {
    try {
      // ✅ FIX: use unwrapItems on AxiosResponse (reads res.data safely)
      const res = await api.get<any>("/clients");
      const items = unwrapItems(res);
      setClients(Array.isArray(items) ? items : []);
    } catch {
      // ignore
    }
  }

  async function loadSites() {
    if (token === null || !token) return;

    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (clientFilter) qs.set("client_id", clientFilter);

      const res = await api.get<any>(`/sites?${qs.toString()}`);
      setRawItems(unwrapItems(res));
    } catch (e: any) {
      setErr(e?.message || "Failed to fetch sites");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token === null) return;
    if (!token) return;
    loadClients();
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const items = useMemo(() => rawItems, [rawItems]);

  function openCreate() {
    setEditing(null);
    setName("");
    setAddress("");
    setClientId("");
    setModalOpen(true);
  }

  function openEdit(s: any) {
    setEditing(s);
    setName(String(s?.name || ""));
    setAddress(String(s?.address || ""));
    setClientId(String(s?.client_id || s?.clients?.id || ""));
    setModalOpen(true);
  }

  async function submit() {
    const v = name.trim();
    if (!v) return showToast("error", "اسم الموقع مطلوب");

    try {
      if (editing?.id) {
        await api.put(`/sites/${editing.id}`, {
          name: v,
          address: address.trim() || null,
          client_id: clientId || null,
        });
        showToast("success", "تم تحديث الموقع");
      } else {
        await api.post(`/sites`, {
          name: v,
          address: address.trim() || null,
          client_id: clientId || null,
        });
        showToast("success", "تم إضافة الموقع");
      }
      setModalOpen(false);
      await loadSites();
    } catch (e: any) {
      showToast("error", e?.message || "Save failed");
    }
  }

  async function toggleActive(id: string) {
    try {
      await api.patch(`/sites/${id}/toggle`);
      showToast("success", "تم تغيير حالة الموقع");
      await loadSites();
    } catch (e: any) {
      showToast("error", e?.message || "Toggle failed");
    }
  }

  if (token === null) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Checking session…
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold">Sites</div>
          <div className="text-sm text-slate-400">Manage sites per client</div>
        </div>

        <button
          onClick={openCreate}
          className="px-3 py-2 rounded-xl border border-white/10 bg-emerald-600/80 hover:bg-emerald-600 text-sm"
        >
          + Add Site
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search site…"
          className="px-3 py-2 w-72 rounded-xl bg-slate-950/30 border border-white/10 outline-none text-sm"
        />

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none text-sm"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.id}
            </option>
          ))}
        </select>

        <button
          onClick={loadSites}
          disabled={loading}
          className="ml-auto px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm disabled:opacity-60"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Loading…
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-2 text-left text-slate-200">Name</th>
                  <th className="px-4 py-2 text-left text-slate-200">Client</th>
                  <th className="px-4 py-2 text-left text-slate-200">Address</th>
                  <th className="px-4 py-2 text-left text-slate-200">Status</th>
                  <th className="px-4 py-2 text-left text-slate-200">Created</th>
                  <th className="px-4 py-2 text-left text-slate-200">Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((s: any) => (
                  <tr
                    key={s.id}
                    className={cn("border-t border-white/10 hover:bg-white/5")}
                  >
                    <td className="px-4 py-2 font-medium">{s.name || "—"}</td>
                    <td className="px-4 py-2">{s.clients?.name || "—"}</td>
                    <td className="px-4 py-2">{s.address || "—"}</td>
                    <td className="px-4 py-2">
                      {s.is_active === false ? (
                        <span className="text-red-400">Inactive</span>
                      ) : (
                        <span className="text-emerald-400">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-2">{fmtDate(s.created_at)}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                          onClick={() => openEdit(s)}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs"
                          onClick={() => toggleActive(s.id)}
                        >
                          Toggle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!items.length ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-300" colSpan={6}>
                      No sites found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-3"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-slate-900 text-white border border-white/10 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editing ? "Edit Site" : "Create Site"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm">
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
                  placeholder="اسم الموقع"
                />
              </label>

              <label className="grid gap-2 text-sm">
                Client (اختياري)
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
                >
                  <option value="">بدون</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm">
                Address (اختياري)
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
                  placeholder="عنوان الموقع"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                className="px-4 py-2 rounded-xl border border-white/10 bg-emerald-600/80 hover:bg-emerald-600 text-sm font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}
