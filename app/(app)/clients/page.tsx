"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { Toast } from "@/src/components/Toast";


function cn(...v: any[]) {
  return v.filter(Boolean).join(" ");
}

export default function ClientsPage() {
  const token = useAuth((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get(`/clients?search=${encodeURIComponent(search)}`);
      setItems(res.data?.items || []);

    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Failed to load clients" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [token, search]);

  function openCreate() {
    setEditing(null);
    setName("");
    setModalOpen(true);
  }

  function openEdit(c: any) {
    setEditing(c);
    setName(c.name || "");
    setModalOpen(true);
  }

  async function submit() {
    try {
      if (!name.trim()) return;

      if (editing) {
        await api.put(`/clients/${editing.id}`, { name });
        setToast({ type: "success", msg: "Client updated" });
      } else {
        await api.post("/clients", { name });
        setToast({ type: "success", msg: "Client created" });
      }

      setModalOpen(false);
      load();
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Save failed" });
    }
  }

  async function toggle(id: string) {
    try {
      await api.patch(`/clients/${id}/toggle`);
      load();
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || "Toggle failed" });
    }
  }

  return (
    <div className="p-6 space-y-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Clients</h1>
          <p className="text-sm text-slate-400">Manage customers</p>
        </div>
        <button
          onClick={openCreate}
          className="px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-sm"
        >
          + Add Client
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search client..."
        className="px-3 py-2 w-64 rounded-xl bg-slate-950/30 border border-white/10 outline-none text-sm"
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {loading ? (
          <div className="p-4 text-slate-300">Loading…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-white/10">
                  <td className="px-4 py-2">{c.name}</td>
                  <td className="px-4 py-2">
                    {c.is_active ? (
                      <span className="text-emerald-400">Active</span>
                    ) : (
                      <span className="text-red-400">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-2 flex gap-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="px-2 py-1 rounded-lg bg-white/10 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggle(c.id)}
                      className="px-2 py-1 rounded-lg bg-white/10 text-xs"
                    >
                      Toggle
                    </button>
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-slate-300">
                    No clients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 w-full max-w-md">
            <h3 className="font-bold mb-3">{editing ? "Edit Client" : "Add Client"}</h3>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              className="w-full px-3 py-2 rounded-xl bg-slate-950/30 border border-white/10 outline-none"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={submit}
                className="px-3 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          open
          type={toast.type}
          message={toast.msg}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
