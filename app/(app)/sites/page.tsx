"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { useRouter } from "next/navigation";
import { Toast } from "@/src/components/Toast";
import { useT } from "@/src/i18n/useT";

import { sitesService } from "@/src/services/sites.service";
import type {
  Site,
  SiteClientOption,
  SitePayload,
  SiteZoneOption,
} from "@/src/types/sites.types";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

const fmtDate = (d: any) => {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
};

function SiteStatusBadge({ active }: { active?: boolean | null }) {
  if (active === false) {
    return (
      <span className="inline-flex rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        غير نشط
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      نشط
    </span>
  );
}

export default function SitesPage() {
  const t = useT();
  const router = useRouter();
  const { token, hasHydrated } = useAuth() as any;

  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rawItems, setRawItems] = useState<Site[]>([]);
  const [clients, setClients] = useState<SiteClientOption[]>([]);
  const [zones, setZones] = useState<SiteZoneOption[]>([]);

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [zoneId, setZoneId] = useState<string>("");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2500);
  }

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) router.push("/login");
  }, [hasHydrated, token, router]);

  async function loadClients() {
    setClientsLoading(true);
    try {
      const items = await sitesService.listClientsOptions();
      setClients(Array.isArray(items) ? items : []);
    } catch {
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }

  async function loadZones() {
    setZonesLoading(true);
    try {
      const items = await sitesService.listZonesOptions();
      setZones(Array.isArray(items) ? items : []);
    } catch {
      setZones([]);
    } finally {
      setZonesLoading(false);
    }
  }

  async function loadSites() {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await sitesService.list({
        search: search.trim() || undefined,
        client_id: clientFilter || undefined,
        zone_id: zoneFilter || undefined,
        is_active:
          statusFilter === "all"
            ? undefined
            : statusFilter === "active"
              ? true
              : false,
      });

      setRawItems(Array.isArray(res.items) ? res.items : []);
    } catch (e: any) {
      setErr(e?.message || t("sites.errors.loadFailed"));
      setRawItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasHydrated) return;
    if (!token) return;

    loadClients();
    loadZones();
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, token]);

  const items = useMemo(() => rawItems, [rawItems]);

  function resetForm() {
    setEditing(null);
    setName("");
    setAddress("");
    setCode("");
    setClientId("");
    setZoneId("");
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(site: Site) {
    setEditing(site);
    setName(String(site?.name || ""));
    setAddress(String(site?.address || ""));
    setCode(String(site?.code || ""));
    setClientId(String(site?.client_id || site?.client?.id || ""));
    setZoneId(String(site?.zone_id || site?.zone?.id || ""));
    setModalOpen(true);
  }

  async function submit() {
    const vName = name.trim();
    const vClientId = String(clientId || "").trim();

    if (!vName) {
      showToast("error", t("sites.toast.nameRequired"));
      return;
    }

    if (!vClientId) {
      showToast("error", t("sites.toast.clientRequired"));
      return;
    }

    const payload: SitePayload = {
      name: vName,
      client_id: vClientId,
      zone_id: zoneId || null,
      address: address.trim() || null,
      code: code.trim() || null,
    };

    try {
      setSaving(true);

      if (editing?.id) {
        await sitesService.update(editing.id, payload);
        showToast("success", t("sites.toast.updated"));
      } else {
        await sitesService.create(payload);
        showToast("success", t("sites.toast.created"));
      }

      setModalOpen(false);
      resetForm();
      await loadSites();
    } catch (e: any) {
      showToast("error", e?.message || t("sites.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string) {
    try {
      await sitesService.toggle(id);
      showToast("success", t("sites.toast.toggled"));
      await loadSites();
    } catch (e: any) {
      showToast("error", e?.message || t("sites.toast.toggleFailed"));
    }
  }

  if (!hasHydrated || token === null) {
    return (
      <div className="min-h-screen bg-white p-6 text-slate-900" dir="rtl">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {t("common.checkingSession")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">{t("sites.title")}</div>
            <div className="text-sm text-slate-600">{t("sites.subtitle")}</div>
          </div>

          <button
            onClick={openCreate}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700"
          >
            {t("sites.actions.add")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("sites.filters.searchPlaceholder")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none sm:w-72"
          />

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="">{t("sites.filters.allClients")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>

          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="">كل المناطق</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name || z.code || z.id}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="all">{t("common.all")}</option>
            <option value="active">{t("common.active")}</option>
            <option value="inactive">{t("common.disabled")}</option>
          </select>

          <button
            onClick={loadSites}
            disabled={loading}
            className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
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
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-right text-slate-700">
                      {t("sites.table.name")}
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      {t("sites.table.client")}
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      المنطقة
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      {t("sites.table.address")}
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      {t("sites.table.status")}
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      {t("sites.table.created")}
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      {t("sites.table.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((site) => (
                    <tr
                      key={site.id}
                      className={cn("border-t border-slate-200 hover:bg-slate-50")}
                    >
                      <td className="px-4 py-2 font-medium">{site.name || "—"}</td>
                      <td className="px-4 py-2">{site.client?.name || "—"}</td>
                      <td className="px-4 py-2">
                        {site.zone?.name || site.zone?.code || "—"}
                      </td>
                      <td className="px-4 py-2">{site.address || "—"}</td>
                      <td className="px-4 py-2">
                        <SiteStatusBadge active={site.is_active} />
                      </td>
                      <td className="px-4 py-2">{fmtDate(site.created_at)}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
                            onClick={() => openEdit(site)}
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
                            onClick={() => toggleActive(site.id)}
                          >
                            {t("common.toggle")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!items.length ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-700" colSpan={7}>
                        {t("sites.empty")}
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
            className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 p-3"
            onClick={() => {
              if (saving) return;
              setModalOpen(false);
            }}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {editing ? t("sites.modal.editTitle") : t("sites.modal.createTitle")}
                </h3>
                <button
                  onClick={() => {
                    if (saving) return;
                    setModalOpen(false);
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1 hover:bg-slate-50"
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
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                    placeholder={t("sites.placeholders.name")}
                    disabled={saving}
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  {t("sites.fields.client")}
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                    disabled={saving || clientsLoading}
                  >
                    <option value="">
                      {clientsLoading ? t("common.loading") : t("sites.placeholders.noClient")}
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  المنطقة
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                    disabled={saving || zonesLoading}
                  >
                    <option value="">
                      {zonesLoading ? t("common.loading") : "بدون منطقة"}
                    </option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name || z.code || z.id}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm">
                  كود الموقع
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                    placeholder="مثال: SITE-001"
                    disabled={saving}
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  {t("sites.fields.address")}
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                    placeholder={t("sites.placeholders.address")}
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  {t("sites.modal.cancel")}
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? t("common.saving") : t("sites.modal.save")}
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