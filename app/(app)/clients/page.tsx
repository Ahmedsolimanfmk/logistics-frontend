// app/(app)/clients/ClientsPage.tsx
"use client";

import { useEffect, useState } from "react";
import { api, unwrapItems } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { Toast } from "@/src/components/Toast";
import { useT } from "@/src/i18n/useT";

function cn(...v: any[]) {
  return v.filter(Boolean).join(" ");
}

export default function ClientsPage() {
  const t = useT();
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
      setItems(unwrapItems(res));
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || t("clients.errors.loadFailed") });
      setItems([]);
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
    setName(c?.name || "");
    setModalOpen(true);
  }

  async function submit() {
    try {
      if (!name.trim()) return;

      if (editing) {
        await api.put(`/clients/${editing.id}`, { name: name.trim() });
        setToast({ type: "success", msg: t("clients.toast.updated") });
      } else {
        await api.post("/clients", { name: name.trim() });
        setToast({ type: "success", msg: t("clients.toast.created") });
      }

      setModalOpen(false);
      await load();
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || t("clients.errors.saveFailed") });
    }
  }

  async function toggle(id: string) {
    try {
      await api.patch(`/clients/${id}/toggle`);
      setToast({ type: "success", msg: t("clients.toast.toggled") });
      await load();
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || t("clients.errors.toggleFailed") });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">{t("clients.title")}</h1>
            <p className="text-sm text-slate-600">{t("clients.subtitle")}</p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
          >
            + {t("clients.actions.add")}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("clients.filters.searchPlaceholder")}
            className={cn(
              "w-full sm:w-80 px-3 py-2 rounded-xl",
              "bg-white border border-slate-200 outline-none text-sm",
              "focus:ring-2 focus:ring-slate-200"
            )}
          />

          <div className="text-xs text-slate-500">
            {t("common.total")}: <span className="text-slate-900 font-semibold">{items.length}</span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-4 text-sm text-slate-600">{t("common.loading")}</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      {t("clients.table.name")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      {t("clients.table.status")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">
                      {t("clients.table.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((c) => (
                    <tr key={c.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-3">{c.name || "—"}</td>

                      <td className="px-4 py-3">
                        {c.is_active ? (
                          <span className="inline-flex items-center gap-2 text-emerald-700">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            {t("common.active")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-red-700">
                            <span className="h-2 w-2 rounded-full bg-red-600" />
                            {t("common.disabled")}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs"
                          >
                            {t("common.edit")}
                          </button>

                          <button
                            onClick={() => toggle(c.id)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs"
                          >
                            {t("common.toggle")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!items.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-10 text-center text-slate-600">
                        {t("clients.empty")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
            <div
              className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900">
                  {editing ? t("clients.modal.editTitle") : t("clients.modal.addTitle")}
                </h3>

                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-xs text-slate-500">{t("clients.modal.namePlaceholder")}</div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("clients.modal.namePlaceholder")}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                    "focus:ring-2 focus:ring-slate-200"
                  )}
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm"
                >
                  {t("common.cancel")}
                </button>

                <button
                  onClick={submit}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
                >
                  {t("common.save")}
                </button>
              </div>
            </div>

            {/* click outside closes */}
            <button
              aria-label="close"
              className="absolute inset-0"
              onClick={() => setModalOpen(false)}
            />
          </div>
        )}

        {toast && (
          <Toast open type={toast.type} message={toast.msg} onClose={() => setToast(null)} />
        )}
      </div>
    </div>
  );
}