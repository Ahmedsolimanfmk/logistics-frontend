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
  const token = useAuth((s: any) => s.token);

  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rawItems, setRawItems] = useState<Site[]>([]);
  const [clients, setClients] = useState<SiteClientOption[]>([]);

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [siteType, setSiteType] = useState("");
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

  async function loadSites() {
    if (token === null || !token) return;

    setLoading(true);
    setErr(null);

    try {
      const res = await sitesService.list({
        search: search.trim() || undefined,
        client_id: clientFilter || undefined,
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
    if (token === null) return;
    if (!token) return;

    loadClients();
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const items = useMemo(() => rawItems, [rawItems]);

  function resetForm() {
    setEditing(null);
    setName("");
    setAddress("");
    setCity("");
    setSiteType("");
    setClientId("");
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(s: Site) {
    setEditing(s);
    setName(String(s?.name || ""));
    setAddress(String(s?.address || ""));
    setCity(String((s as any)?.city || ""));
    setSiteType(String((s as any)?.site_type || ""));
    setClientId(String(s?.client_id || s?.clients?.id || ""));
    setModalOpen(true);
  }

  async function submit() {
    const vName = name.trim();
    const vClientId = String(clientId || "").trim();

    if (!vName) {
      showToast("error", "اسم الموقع مطلوب");
      return;
    }

    if (!vClientId) {
      showToast("error", "العميل مطلوب");
      return;
    }

    const payload: SitePayload = {
      name: vName,
      client_id: vClientId,
      address: address.trim() || null,
      city: city.trim() || null,
      site_type: siteType.trim() || null,
    };

    try {
      setSaving(true);

      if (editing?.id) {
        await sitesService.update(editing.id, payload);
        showToast("success", "تم تحديث الموقع بنجاح");
      } else {
        await sitesService.create(payload);
        showToast("success", "تم إنشاء الموقع بنجاح");
      }

      setModalOpen(false);
      resetForm();
      await loadSites();
    } catch (e: any) {
      showToast("error", e?.message || "فشل حفظ الموقع");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string) {
    try {
      await sitesService.toggle(id);
      showToast("success", "تم تحديث حالة الموقع");
      await loadSites();
    } catch (e: any) {
      showToast("error", e?.message || "فشل تغيير حالة الموقع");
    }
  }

  if (token === null) {
    return (
      <div className="min-h-screen bg-white text-slate-900 p-6" dir="rtl">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {t("common.checkingSession")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-bold">المواقع</div>
            <div className="text-sm text-slate-600">
              إدارة مواقع العملاء التشغيلية وربطها بالعميل
            </div>
          </div>

          <button
            onClick={openCreate}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm text-white"
          >
            إضافة موقع
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو العنوان"
            className="px-3 py-2 w-full sm:w-80 rounded-xl bg-white border border-slate-200 outline-none text-sm"
          />

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none text-sm"
          >
            <option value="">كل العملاء</option>
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
              <table className="min-w-[1000px] w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-right text-slate-700">
                      اسم الموقع
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      العميل
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      النوع
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      المدينة
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      العنوان
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      الحالة
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      تاريخ الإنشاء
                    </th>
                    <th className="px-4 py-2 text-right text-slate-700">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((s) => (
                    <tr
                      key={s.id}
                      className={cn("border-t border-slate-200 hover:bg-slate-50")}
                    >
                      <td className="px-4 py-2 font-medium">{s.name || "—"}</td>
                      <td className="px-4 py-2">{s.clients?.name || "—"}</td>
                      <td className="px-4 py-2">
                        {(s as any)?.site_type || "—"}
                      </td>
                      <td className="px-4 py-2">{(s as any)?.city || "—"}</td>
                      <td className="px-4 py-2">{s.address || "—"}</td>
                      <td className="px-4 py-2">
                        <SiteStatusBadge active={s.is_active} />
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
                      <td className="px-4 py-6 text-slate-700" colSpan={8}>
                        لا توجد مواقع حالياً
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
              className="w-full max-w-2xl rounded-2xl bg-white text-slate-900 border border-slate-200 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {editing ? "تعديل الموقع" : "إضافة موقع جديد"}
                </h3>
                <button
                  onClick={() => {
                    if (saving) return;
                    setModalOpen(false);
                  }}
                  className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                <label className="grid gap-2 text-sm">
                  اسم الموقع *
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
                    placeholder="مثال: موقع السخنة"
                    disabled={saving}
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  العميل *
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
                    disabled={saving || clientsLoading}
                  >
                    <option value="">
                      {clientsLoading ? "جارٍ تحميل العملاء..." : "اختر العميل"}
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.id}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="grid gap-2 text-sm">
                    المدينة
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
                      placeholder="مثال: السويس"
                      disabled={saving}
                    />
                  </label>

                  <label className="grid gap-2 text-sm">
                    نوع الموقع
                    <input
                      value={siteType}
                      onChange={(e) => setSiteType(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
                      placeholder="مثال: مصنع / مخزن / ميناء"
                      disabled={saving}
                    />
                  </label>
                </div>

                <label className="grid gap-2 text-sm">
                  العنوان
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
                    placeholder="العنوان التفصيلي"
                    disabled={saving}
                  />
                </label>

                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  الموقع يتبع العميل مباشرة، ولا يتم تعطيله تلقائيًا بانتهاء العقد.
                  انتهاء العقد يؤثر على التعاقد والتسعير وليس على وجود الموقع نفسه.
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm disabled:opacity-60"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "جارٍ الحفظ..." : t("common.save")}
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