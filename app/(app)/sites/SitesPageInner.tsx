"use client";
const hasHydrated = useAuth((s) => s.hasHydrated);


import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { useAuth } from "@/src/store/auth";

import { sitesService } from "@/src/services/sites.service";
import type {
  Site,
  SiteClientOption,
  SitePayload,
  SiteZoneOption,
} from "@/src/types/sites.types";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ar-EG");
}

function StatusText({ active }: { active?: boolean | null }) {
  return active === false ? (
    <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
      غير نشط
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
      نشط
    </span>
  );
}

function SiteModal({
  open,
  editing,
  clients,
  zones,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  editing: Site | null;
  clients: SiteClientOption[];
  zones: SiteZoneOption[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: SitePayload) => Promise<void>;
}) {
  const t = useT();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [isActive, setIsActive] = useState("true");

  useEffect(() => {
    if (!open) return;

    setName(editing?.name || "");
    setCode(editing?.code || "");
    setAddress(editing?.address || "");
    setClientId(editing?.client_id || "");
    setZoneId(editing?.zone_id || "");
    setIsActive(editing?.is_active === false ? "false" : "true");
  }, [open, editing]);

  if (!open) return null;

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name || client.id,
  }));

  const zoneOptions = zones.map((zone) => ({
    value: zone.id,
    label: [zone.name || zone.id, zone.code ? `(${zone.code})` : null]
      .filter(Boolean)
      .join(" "),
  }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    await onSubmit({
      name: name.trim(),
      code: code.trim() || null,
      address: address.trim() || null,
      client_id: clientId,
      zone_id: zoneId || null,
      is_active: isActive === "true",
    });
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/25 p-4"
      dir="rtl"
      onMouseDown={() => {
        if (!saving) onClose();
      }}
    >
      <div className="w-full max-w-3xl" onMouseDown={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <Card
            title={editing ? t("sites.modal.editTitle") : t("sites.modal.createTitle")}
            right={
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                ✕
              </Button>
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <TrexInput
                label="sites.fields.name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("sites.placeholders.name")}
                disabled={saving}
                required
              />

              <TrexInput
                labelText="الكود"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="اختياري"
                disabled={saving}
              />

              <TrexSelect
                label="sites.fields.client"
                value={clientId}
                onChange={setClientId}
                options={clientOptions}
                placeholderText={t("sites.placeholders.noClient")}
                disabled={saving}
              />

              <TrexSelect
                labelText="المنطقة"
                value={zoneId}
                onChange={setZoneId}
                options={zoneOptions}
                placeholderText="بدون منطقة"
                disabled={saving}
              />

              <TrexSelect
                label="common.status"
                value={isActive}
                onChange={setIsActive}
                options={[
                  { value: "true", label: t("common.active") },
                  { value: "false", label: t("common.disabled") },
                ]}
                disabled={saving}
              />

              <div className="md:col-span-2">
                <TrexInput
                  label="sites.fields.address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("sites.placeholders.address")}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button type="submit" variant="primary" disabled={saving || !name.trim() || !clientId} isLoading={saving}>
                {t("sites.modal.save")}
              </Button>

              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
                {t("sites.modal.cancel")}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}

export default function SitesPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const token = useAuth((s) => s.token);
  const hasHydrated = useAuth((s) => s.hasHydrated);

  const search = sp.get("search") || "";
  const clientId = sp.get("client_id") || "";
  const zoneId = sp.get("zone_id") || "";
  const status = (sp.get("status") || "all") as "all" | "active" | "inactive";
  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(sp.get("limit") || "50", 10) || 50, 1), 200);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<Site[]>([]);
  const [clients, setClients] = useState<SiteClientOption[]>([]);
  const [zones, setZones] = useState<SiteZoneOption[]>([]);

  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Site | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());

    if (value) params.set(key, value);
    else params.delete(key);

    if (key !== "page") params.set("page", "1");

    router.push(`/sites?${params.toString()}`);
  }

  async function loadOptions() {
    try {
      const [clientsRes, zonesRes] = await Promise.all([
        sitesService.listClientsOptions(),
        sitesService.listZonesOptions(),
      ]);

      setClients(clientsRes || []);
      setZones(zonesRes || []);
    } catch (e: any) {
      showToast("error", e?.message || "فشل تحميل القوائم");
    }
  }

  async function load() {
    if (!token) {
      setItems([]);
      setTotal(0);
      setPages(1);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await sitesService.list({
        page,
        limit,
        search: search.trim() || undefined,
        client_id: clientId || undefined,
        zone_id: zoneId || undefined,
        is_active:
          status === "all" ? undefined : status === "active" ? true : false,
      });

      setItems(res.items || []);
      setTotal(res.total || 0);
      setPages(res.meta?.pages || 1);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setPages(1);
      showToast("error", e?.message || t("sites.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  const qsKey = useMemo(
    () => `${search}|${clientId}|${zoneId}|${status}|${page}|${limit}`,
    [search, clientId, zoneId, status, page, limit]
  );

  useEffect(() => {
    if (!hasHydrated) return;
    loadOptions();
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, token, qsKey]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(site: Site) {
    setEditing(site);
    setModalOpen(true);
  }

  async function saveSite(payload: SitePayload) {
    if (!payload.name.trim()) {
      showToast("error", t("sites.toast.nameRequired"));
      return;
    }

    if (!payload.client_id) {
      showToast("error", t("sites.toast.clientRequired"));
      return;
    }

    setSaving(true);

    try {
      if (editing?.id) {
        await sitesService.update(editing.id, payload);
        showToast("success", t("sites.toast.updated"));
      } else {
        await sitesService.create(payload);
        showToast("success", t("sites.toast.created"));
      }

      setModalOpen(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      showToast("error", e?.message || t("sites.toast.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(site: Site) {
    try {
      await sitesService.toggle(site.id);
      showToast("success", t("sites.toast.toggled"));
      await load();
    } catch (e: any) {
      showToast("error", e?.message || t("sites.toast.toggleFailed"));
    }
  }

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: client.name || client.id,
  }));

  const zoneOptions = zones.map((zone) => ({
    value: zone.id,
    label: [zone.name || zone.id, zone.code ? `(${zone.code})` : null]
      .filter(Boolean)
      .join(" "),
  }));

  const columns: DataTableColumn<Site>[] = useMemo(
    () => [
      {
        key: "name",
        label: t("sites.table.name"),
        render: (row) => (
          <div>
            <div className="font-medium text-[rgb(var(--trex-fg))]">{row.name}</div>
            {row.code ? <div className="font-mono text-xs text-slate-500">{row.code}</div> : null}
          </div>
        ),
      },
      {
        key: "client",
        label: t("sites.table.client"),
        render: (row) => row.client?.name || "—",
      },
      {
        key: "zone",
        label: "المنطقة",
        render: (row) => row.zone?.name || row.zone?.code || "—",
      },
      {
        key: "address",
        label: t("sites.table.address"),
        render: (row) => row.address || "—",
      },
      {
        key: "status",
        label: t("sites.table.status"),
        render: (row) => <StatusText active={row.is_active} />,
      },
      {
        key: "created",
        label: t("sites.table.created"),
        render: (row) => <span className="text-slate-600">{fmtDate(row.created_at)}</span>,
      },
      {
        key: "actions",
        label: t("sites.table.actions"),
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                openEdit(row);
              }}
            >
              {t("common.edit")}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                toggle(row);
              }}
            >
              {t("common.toggle")}
            </Button>
          </div>
        ),
      },
    ],
    [t, clients, zones]
  );

  if (!hasHydrated) {
    return (
      <div className="space-y-4" dir="rtl">
        <Card>
          <div className="text-sm text-slate-500">{t("common.checkingSession")}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <PageHeader
        title={t("sites.title")}
        subtitle={t("sites.subtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={openCreate}>
              {t("sites.actions.add")}
            </Button>

            <Button type="button" variant="secondary" onClick={load} disabled={loading} isLoading={loading}>
              {t("common.refresh")}
            </Button>
          </div>
        }
      />

      <Card>
        <FiltersBar
          left={
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <TrexInput
                  label="common.search"
                  value={search}
                  onChange={(e) => setParam("search", e.target.value)}
                  placeholder={t("sites.filters.searchPlaceholder")}
                />
              </div>

              <TrexSelect
                label="sites.fields.client"
                value={clientId}
                onChange={(value) => setParam("client_id", value)}
                options={clientOptions}
                placeholderText={t("sites.filters.allClients")}
              />

              <TrexSelect
                labelText="المنطقة"
                value={zoneId}
                onChange={(value) => setParam("zone_id", value)}
                options={zoneOptions}
                placeholderText="كل المناطق"
              />

              <TrexSelect
                label="common.status"
                value={status}
                onChange={(value) => setParam("status", value)}
                options={[
                  { value: "all", label: t("common.all") },
                  { value: "active", label: t("common.active") },
                  { value: "inactive", label: t("common.disabled") },
                ]}
              />
            </div>
          }
          right={
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>
                {t("common.total")}:{" "}
                <b className="text-[rgb(var(--trex-fg))]">{total}</b>
              </span>

              <span>
                {t("common.page")}:{" "}
                <b className="text-[rgb(var(--trex-fg))]">
                  {page}/{pages}
                </b>
              </span>

              <TrexSelect
                value={String(limit)}
                onChange={(value) => setParam("limit", value)}
                options={[
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                  { value: "200", label: "200" },
                ]}
                placeholderText={t("common.rows")}
              />

              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/sites?page=1&limit=50")}
              >
                {t("common.reset")}
              </Button>
            </div>
          }
        />
      </Card>

      <DataTable<Site>
        title={t("sites.table.name")}
        columns={columns}
        rows={items}
        loading={loading}
        total={total}
        page={page}
        pages={pages}
        onPrev={page <= 1 ? undefined : () => setParam("page", String(page - 1))}
        onNext={page >= pages ? undefined : () => setParam("page", String(page + 1))}
        emptyTitle={t("sites.empty")}
        emptyHint=""
        onRowClick={(row) => openEdit(row)}
      />

      <SiteModal
        open={modalOpen}
        editing={editing}
        clients={clients}
        zones={zones}
        saving={saving}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setEditing(null);
          }
        }}
        onSubmit={saveSite}
      />

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        dir="rtl"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}