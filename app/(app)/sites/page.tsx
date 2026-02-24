"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api, unwrapItems } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useRouter } from "next/navigation";
import { Toast } from "@/src/components/Toast";
import { useT } from "@/src/i18n/useT";

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
  const t = useT();

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
      setErr(e?.message || t("sites.errors.loadFailed"));
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
    if (!v) return showToast("error", t("sites.toast.nameRequired"));

    try {
      if (editing?.id) {
        await api.put(`/sites/${editing.id}`, {
          name: v,
          address: address.trim() || null,
          client_id: clientId || null,
        });
        showToast("success", t("sites.toast.updated"));
      } else {
        await api.post(`/sites`, {
          name: v,
          address: address.trim() || null,
          client_id: clientId || null,
        });
        showToast("success", t("sites.toast.created"));
      }
      setModalOpen(false);
      await loadSites();
    } catch (e: any) {
      showToast("error", e?.message || t("sites.toast.saveFailed"));
    }
  }

  async function toggleActive(id: string) {
    try {
      await api.patch(`/sites/${id}/toggle`);
      showToast("success", t("sites.toast.toggled"));
      await loadSites();
    } catch (e: any) {
      showToast("error", e?.message || t("sites.toast.toggleFailed"));
    }
  }

  if (token === null) {
    return (
      <div className="min-h-screen bg-white text-slate-900 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {t("common.checkingSession")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">{t("sites.title")}</div>
            <div className="text-sm text-slate-600">{t("sites.subtitle")}</div>
          </div>

          <button
            onClick={openCreate}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm text-white"
          >
            {t("sites.actions.add")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("sites.filters.searchPlaceholder")}
            className="px-3 py-2 w-full sm:w-80 rounded-xl bg-white border border-slate-200 outline-none text-sm"
          />

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-sm"
          >
            <option value="">{t("sites.filters.allClients")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>

          <button
            onClick={loadSites}
            disabled={loading}
            className="ml-auto px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm disabled:opacity-60"
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>
        </div>

        {err ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            {t("common.loading")}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-slate-700">{t("sites.table.name")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("sites.table.client")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("sites.table.address")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("sites.table.status")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("sites.table.created")}</th>
                    <th className="px-4 py-2 text-left text-slate-700">{t("sites.table.actions")}</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((s: any) => (
                    <tr key={s.id} className={cn("border-t border-slate-200 hover:bg-slate-50")}>
                      <td className="px-4 py-2 font-medium">{s.name || "—"}</td>
                      <td className="px-4 py-2">{s.clients?.name || "—"}</td>
                      <td className="px-4 py-2">{s.address || "—"}</td>
                      <td className="px-4 py-2">
                        {s.is_active === false ? (
                          <span className="text-red-700 font-medium">{t("common.disabled")}</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">{t("common.active")}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">{fmtDate(s.created_at)}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs"
                            onClick={() => openEdit(s)}
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs"
                            onClick={() => toggleActive(s.id)}
                          >
                            {t("common.toggle")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!items.length ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-700" colSpan={6}>
                        {t("sites.empty")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {modalOpen ? (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-3"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl bg-white text-slate-900 border border-slate-200 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {editing ? t("sites.modal.editTitle") : t("sites.modal.createTitle")}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2 text-sm">
                  {t("sites.fields.name")}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
                    placeholder={t("sites.placeholders.name")}
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  {t("sites.fields.client")} ({t("common.optional")})
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
                  >
                    <option value="">{t("sites.placeholders.noClient")}</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  {t("sites.fields.address")} ({t("common.optional")})
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
                    placeholder={t("sites.placeholders.address")}
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={submit}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white"
                >
                  {t("common.save")}
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
    </div>
  );
}