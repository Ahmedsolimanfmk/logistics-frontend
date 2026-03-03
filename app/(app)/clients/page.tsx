// app/(app)/clients/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { api, unwrapItems } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function ClientsPage() {
  const t = useT();
  const token = useAuth((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Create/Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");

  // Toggle confirm
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<any | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

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
    setEditOpen(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    setName(row?.name || "");
    setEditOpen(true);
  }

  async function submitCreateOrEdit() {
    try {
      const v = name.trim();
      if (!v) {
        setToast({ type: "error", msg: t("clients.errors.nameRequired") || "Name is required" });
        return;
      }

      if (editing) {
        await api.put(`/clients/${editing.id}`, { name: v });
        setToast({ type: "success", msg: t("clients.toast.updated") });
      } else {
        await api.post("/clients", { name: v });
        setToast({ type: "success", msg: t("clients.toast.created") });
      }

      setEditOpen(false);
      setEditing(null);
      setName("");
      await load();
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || t("clients.errors.saveFailed") });
    }
  }

  function askToggle(row: any) {
    setToggleTarget(row);
    setToggleOpen(true);
  }

  async function confirmToggle() {
    if (!toggleTarget?.id) return;
    setToggleLoading(true);
    try {
      await api.patch(`/clients/${toggleTarget.id}/toggle`);
      setToast({ type: "success", msg: t("clients.toast.toggled") });
      setToggleOpen(false);
      setToggleTarget(null);
      await load();
    } catch (e: any) {
      setToast({ type: "error", msg: e?.message || t("clients.errors.toggleFailed") });
    } finally {
      setToggleLoading(false);
    }
  }

  const columns: DataTableColumn<any>[] = useMemo(
    () => [
      {
        key: "name",
        label: t("clients.table.name"),
        render: (row) => row?.name || "—",
      },
      {
        key: "status",
        label: t("clients.table.status"),
        render: (row) =>
          row?.is_active ? (
            <span className="inline-flex items-center gap-2 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              {t("common.active")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-red-700">
              <span className="h-2 w-2 rounded-full bg-red-600" />
              {t("common.disabled")}
            </span>
          ),
      },
      {
        key: "actions",
        label: t("clients.table.actions"),
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            {/* Button عندك مفيهوش size */}
            <Button variant="secondary" onClick={() => openEdit(row)}>
              {t("common.edit")}
            </Button>

            {/* variant="outline" مش موجود عندك غالبًا */}
            <Button variant="secondary" onClick={() => askToggle(row)}>
              {row?.is_active ? t("common.disable") : t("common.enable")}
            </Button>
          </div>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="min-h-screen">
      {/* PageHeader عندك actions مش right */}
      <PageHeader
        title={t("clients.title")}
        subtitle={t("clients.subtitle")}
        actions={
          <Button onClick={openCreate}>
            + {t("clients.actions.add")}
          </Button>
        }
      />

      {/* FiltersBar لازم left */}
      <FiltersBar
        left={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("clients.filters.searchPlaceholder")}
            className={cn(
              "w-full sm:w-[360px] px-3 py-2 rounded-xl",
              "bg-white border border-slate-200 outline-none text-sm",
              "focus:ring-2 focus:ring-slate-200"
            )}
          />
        }
        right={
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">
              {t("common.total")}:{" "}
              <span className="text-slate-900 font-semibold">{items.length}</span>
            </div>

            <Button variant="secondary" onClick={() => setSearch("")} disabled={!search}>
              {t("common.reset")}
            </Button>
          </div>
        }
      />

      <DataTable
        title={t("clients.title")}
        subtitle={t("clients.subtitle")}
        columns={columns}
        rows={items}
        loading={loading}
        emptyTitle={t("clients.empty")}
        emptyHint={t("clients.emptyHint") || ""}
      />

      {/* Create/Edit ConfirmDialog */}
      <ConfirmDialog
        open={editOpen}
        title={editing ? t("clients.modal.editTitle") : t("clients.modal.addTitle")}
        description={
          <div className="space-y-2">
            <div className="text-sm text-slate-600">{t("clients.modal.namePlaceholder")}</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className={cn(
                "w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
              placeholder={t("clients.modal.namePlaceholder")}
            />
          </div>
        }
        confirmText={t("common.save")}
        cancelText={t("common.cancel")}
        tone="info"
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
          setName("");
        }}
        onConfirm={submitCreateOrEdit}
      />

      {/* Toggle ConfirmDialog */}
      <ConfirmDialog
        open={toggleOpen}
        title={t("common.confirm")}
        description={
          toggleTarget?.is_active
            ? t("clients.confirm.disableDesc") || "Disable this client?"
            : t("clients.confirm.enableDesc") || "Enable this client?"
        }
        confirmText={toggleTarget?.is_active ? t("common.disable") : t("common.enable")}
        cancelText={t("common.cancel")}
        tone="warning"
        isLoading={toggleLoading}
        onClose={() => {
          if (toggleLoading) return;
          setToggleOpen(false);
          setToggleTarget(null);
        }}
        onConfirm={confirmToggle}
      />

      {toast && <Toast open type={toast.type} message={toast.msg} onClose={() => setToast(null)} />}
    </div>
  );
}