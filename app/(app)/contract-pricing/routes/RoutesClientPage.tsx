"use client";

import React, { useEffect, useMemo, useState } from "react";

import { clientsService } from "@/src/services/clients.service";
import { api } from "@/src/lib/api";
import { contractPricingService } from "@/src/services/contract-pricing.service";

import type { Client } from "@/src/types/clients.types";
import type {
  PricingRouteRef,
  RoutePayload,
} from "@/src/types/contract-pricing.types";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type SiteRef = {
  id: string;
  name?: string | null;
  client_id?: string | null;
  zone_id?: string | null;
  is_active?: boolean;
};

type ToastState =
  | {
      type: "success" | "error";
      msg: string;
    }
  | null;

type FormState = {
  code: string;
  name: string;
  client_id: string;
  pickup_site_id: string;
  dropoff_site_id: string;
  origin_label: string;
  destination_label: string;
  distance_km: string;
  notes: string;
  is_active: boolean;
};

function emptyForm(): FormState {
  return {
    code: "",
    name: "",
    client_id: "",
    pickup_site_id: "",
    dropoff_site_id: "",
    origin_label: "",
    destination_label: "",
    distance_km: "",
    notes: "",
    is_active: true,
  };
}

async function listSitesByClient(clientId: string): Promise<SiteRef[]> {
  if (!clientId) return [];

  const res = await api.get("/sites", {
    params: {
      client_id: clientId,
      page: 1,
      limit: 200,
    },
  });

  const body = res.data ?? res;
  const items = Array.isArray(body?.items)
    ? body.items
    : Array.isArray(body?.data?.items)
    ? body.data.items
    : Array.isArray(body?.data)
    ? body.data
    : [];

  return items as SiteRef[];
}

function RouteModal({
  open,
  mode,
  value,
  clients,
  sites,
  loading,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  value: FormState;
  clients: Client[];
  sites: SiteRef[];
  loading: boolean;
  onClose: () => void;
  onChange: <K extends keyof FormState>(key: K, nextValue: FormState[K]) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === "create" ? "إضافة مسار" : "تعديل المسار"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              إدارة المسارات المستخدمة في التشغيل وقواعد التسعير
            </p>
          </div>

          <Button variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">الكود</label>
              <input
                value={value.code}
                onChange={(e) => onChange("code", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
                placeholder="مثال: CAI-AIN-01"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">الاسم *</label>
              <input
                value={value.name}
                onChange={(e) => onChange("name", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
                placeholder="مثال: القاهرة → العين السخنة"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">العميل</label>
              <select
                value={value.client_id}
                onChange={(e) => onChange("client_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
              >
                <option value="">بدون عميل محدد</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">موقع التحميل</label>
              <select
                value={value.pickup_site_id}
                onChange={(e) => onChange("pickup_site_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
              >
                <option value="">بدون تحديد</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name || site.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">موقع التفريغ</label>
              <select
                value={value.dropoff_site_id}
                onChange={(e) => onChange("dropoff_site_id", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
              >
                <option value="">بدون تحديد</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name || site.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">المسافة (كم)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value.distance_km}
                onChange={(e) => onChange("distance_km", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
                placeholder="مثال: 120"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">وصف البداية</label>
              <input
                value={value.origin_label}
                onChange={(e) => onChange("origin_label", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
                placeholder="مثال: مخزن القاهرة"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">وصف النهاية</label>
              <input
                value={value.destination_label}
                onChange={(e) => onChange("destination_label", e.target.value)}
                className={cn(
                  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
                placeholder="مثال: ميناء السخنة"
              />
            </div>

            <div className="xl:col-span-3">
              <label className="mb-1 block text-sm font-medium">ملاحظات</label>
              <textarea
                value={value.notes}
                onChange={(e) => onChange("notes", e.target.value)}
                className={cn(
                  "min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                  "focus:ring-2 focus:ring-slate-200"
                )}
                placeholder="ملاحظات إضافية على المسار"
              />
            </div>

            <div className="xl:col-span-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={value.is_active}
                  onChange={(e) => onChange("is_active", e.target.checked)}
                />
                المسار نشط
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              إلغاء
            </Button>

            <Button type="submit" isLoading={loading}>
              {mode === "create" ? "حفظ المسار" : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RoutesClientPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PricingRouteRef[]>([]);
  const [total, setTotal] = useState(0);

  const [clients, setClients] = useState<Client[]>([]);
  const [filterSites, setFilterSites] = useState<SiteRef[]>([]);
  const [modalSites, setModalSites] = useState<SiteRef[]>([]);

  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState("");
  const [pickupSiteId, setPickupSiteId] = useState("");
  const [dropoffSiteId, setDropoffSiteId] = useState("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const [toast, setToast] = useState<ToastState>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  async function loadClients() {
    try {
      const res = await clientsService.list({ page: 1, limit: 200 });
      setClients(res.items || []);
    } catch (e: any) {
      setClients([]);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحميل العملاء",
      });
    }
  }

  async function load() {
    setLoading(true);
    try {
      const res = await contractPricingService.listRoutes({
        q: q || undefined,
        client_id: clientId || undefined,
        pickup_site_id: pickupSiteId || undefined,
        dropoff_site_id: dropoffSiteId || undefined,
        is_active: active === "" ? "" : active === "true",
        page,
        pageSize: 25,
      });

      setItems(res.items || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setPages(1);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحميل المسارات",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadFilterSites(clientIdValue: string) {
    if (!clientIdValue) {
      setFilterSites([]);
      return;
    }

    try {
      const sites = await listSitesByClient(clientIdValue);
      setFilterSites((sites || []).filter((x) => x.is_active !== false));
    } catch (e: any) {
      setFilterSites([]);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحميل مواقع الفلاتر",
      });
    }
  }

  async function loadModalSites(clientIdValue: string) {
    if (!clientIdValue) {
      setModalSites([]);
      return;
    }

    try {
      const sites = await listSitesByClient(clientIdValue);
      setModalSites((sites || []).filter((x) => x.is_active !== false));
    } catch (e: any) {
      setModalSites([]);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحميل مواقع المسار",
      });
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    load();
  }, [q, clientId, pickupSiteId, dropoffSiteId, active, page]);

  useEffect(() => {
    loadFilterSites(clientId);
  }, [clientId]);

  useEffect(() => {
    loadModalSites(form.client_id);
  }, [form.client_id]);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setModalSites([]);
    setModalOpen(true);
  }

  async function openEdit(row: PricingRouteRef) {
    setModalMode("edit");
    setEditingId(row.id);

    const nextForm: FormState = {
      code: row.code || "",
      name: row.name || "",
      client_id: row.client_id || "",
      pickup_site_id: row.pickup_site_id || "",
      dropoff_site_id: row.dropoff_site_id || "",
      origin_label: row.origin_label || "",
      destination_label: row.destination_label || "",
      distance_km: row.distance_km != null ? String(row.distance_km) : "",
      notes: row.notes || "",
      is_active: row.is_active !== false,
    };

    setForm(nextForm);
    setModalOpen(true);

    if (nextForm.client_id) {
      await loadModalSites(nextForm.client_id);
    } else {
      setModalSites([]);
    }
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setModalSites([]);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "client_id") {
        next.pickup_site_id = "";
        next.dropoff_site_id = "";
      }

      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setToast({ type: "error", msg: "الاسم مطلوب" });
      return;
    }

    const distanceValue =
      form.distance_km.trim() === "" ? null : Number(form.distance_km);

    if (distanceValue !== null && (!Number.isFinite(distanceValue) || distanceValue < 0)) {
      setToast({ type: "error", msg: "المسافة يجب أن تكون رقمًا صالحًا" });
      return;
    }

    const payload: RoutePayload = {
      code: form.code.trim() || null,
      name: form.name.trim(),
      client_id: form.client_id || null,
      pickup_site_id: form.pickup_site_id || null,
      dropoff_site_id: form.dropoff_site_id || null,
      origin_label: form.origin_label.trim() || null,
      destination_label: form.destination_label.trim() || null,
      distance_km: distanceValue,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };

    try {
      setSaving(true);

      if (modalMode === "create") {
        const created = await contractPricingService.createRoute(payload);
        setItems((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);
        setToast({ type: "success", msg: "تم إنشاء المسار بنجاح" });
      } else if (editingId) {
        const updated = await contractPricingService.updateRoute(editingId, payload);
        setItems((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
        setToast({ type: "success", msg: "تم تحديث المسار بنجاح" });
      }

      closeModal();
      load();
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل حفظ المسار",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(row: PricingRouteRef) {
    try {
      const updated = await contractPricingService.toggleRoute(row.id);
      setItems((prev) => prev.map((x) => (x.id === row.id ? updated : x)));
      setToast({
        type: "success",
        msg: "تم تحديث حالة المسار بنجاح",
      });
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || "فشل تحديث الحالة",
      });
    }
  }

  function resetFilters() {
    setQ("");
    setClientId("");
    setPickupSiteId("");
    setDropoffSiteId("");
    setActive("");
    setPage(1);
    setFilterSites([]);
  }

  const activeCount = useMemo(
    () => items.filter((x) => x.is_active === true).length,
    [items]
  );

  const inactiveCount = useMemo(
    () => items.filter((x) => x.is_active === false).length,
    [items]
  );

  const withClientCount = useMemo(
    () => items.filter((x) => !!x.client_id).length,
    [items]
  );

  const columns: DataTableColumn<PricingRouteRef>[] = useMemo(
    () => [
      {
        key: "name",
        label: "المسار",
        render: (row) => row.name || "—",
      },
      {
        key: "client",
        label: "العميل",
        render: (row) => row.clients?.name || "—",
      },
      {
        key: "pickup_site",
        label: "التحميل",
        render: (row) => row.pickup_site?.name || row.origin_label || "—",
      },
      {
        key: "dropoff_site",
        label: "التفريغ",
        render: (row) => row.dropoff_site?.name || row.destination_label || "—",
      },
      {
        key: "distance_km",
        label: "المسافة",
        render: (row) => (row.distance_km != null ? `${row.distance_km} كم` : "—"),
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => (
          <StatusBadge status={row.is_active ? "ACTIVE" : "INACTIVE"} />
        ),
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => openEdit(row)}>
              تعديل
            </Button>

            <Button variant="secondary" onClick={() => onToggle(row)}>
              {row.is_active ? "تعطيل" : "تفعيل"}
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="المسارات"
        subtitle="إدارة المسارات المستخدمة في التشغيل وقواعد التسعير"
        actions={<Button onClick={openCreate}>+ إضافة مسار</Button>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">إجمالي المسارات</div>
          <div className="mt-1 text-xl font-semibold">{total}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">النشطة</div>
          <div className="mt-1 text-xl font-semibold">{activeCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">غير النشطة</div>
          <div className="mt-1 text-xl font-semibold">{inactiveCount}</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">مرتبطة بعميل</div>
          <div className="mt-1 text-xl font-semibold">{withClientCount}</div>
        </div>
      </div>

      <FiltersBar
        left={
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="ابحث بالكود أو الاسم أو الملاحظات"
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            />

            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setPickupSiteId("");
                setDropoffSiteId("");
                setPage(1);
              }}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            >
              <option value="">كل العملاء</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <select
              value={pickupSiteId}
              onChange={(e) => {
                setPickupSiteId(e.target.value);
                setPage(1);
              }}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
              disabled={!clientId}
            >
              <option value="">كل مواقع التحميل</option>
              {filterSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name || site.id}
                </option>
              ))}
            </select>

            <select
              value={dropoffSiteId}
              onChange={(e) => {
                setDropoffSiteId(e.target.value);
                setPage(1);
              }}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
              disabled={!clientId}
            >
              <option value="">كل مواقع التفريغ</option>
              {filterSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name || site.id}
                </option>
              ))}
            </select>
          </div>
        }
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={active}
              onChange={(e) => {
                setActive(e.target.value as "" | "true" | "false");
                setPage(1);
              }}
              className={cn(
                "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            >
              <option value="">كل الحالات</option>
              <option value="true">النشطة فقط</option>
              <option value="false">غير النشطة فقط</option>
            </select>

            <Button variant="secondary" onClick={resetFilters}>
              إعادة تعيين
            </Button>
          </div>
        }
      />

      <DataTable
        title="قائمة المسارات"
        subtitle="البيانات الأساسية للمسارات"
        columns={columns}
        rows={items}
        loading={loading}
        emptyTitle="لا توجد مسارات"
        emptyHint="لم يتم العثور على بيانات مطابقة للفلاتر الحالية."
        total={total}
        page={page}
        pages={pages}
        onPrev={page > 1 ? () => setPage((p) => p - 1) : undefined}
        onNext={page < pages ? () => setPage((p) => p + 1) : undefined}
      />

      <RouteModal
        open={modalOpen}
        mode={modalMode}
        value={form}
        clients={clients}
        sites={modalSites}
        loading={saving}
        onClose={closeModal}
        onChange={setField}
        onSubmit={onSubmit}
      />

      <Toast
        open={!!toast}
        type={toast?.type || "success"}
        message={toast?.msg || ""}
        onClose={() => setToast(null)}
      />
    </div>
  );
}