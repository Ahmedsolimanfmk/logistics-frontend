"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { clientsService } from "@/src/services/clients.service";
import type { Client } from "@/src/types/clients.types";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type ClientRow = Client;

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-2 text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-600" />
      نشط
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-red-700">
      <span className="h-2 w-2 rounded-full bg-red-600" />
      غير نشط
    </span>
  );
}

export default function ClientsPage() {
  const t = useT();
  const { token, hasHydrated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function load() {
    if (!token) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await clientsService.list({
        search: search.trim() || undefined,
        page: 1,
        limit: 50,
        is_active:
          activeFilter === "all"
            ? undefined
            : activeFilter === "active"
              ? true
              : false,
      });

      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setToast({
        type: "error",
        msg: e?.response?.data?.message || e?.message || t("clients.errors.loadFailed"),
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasHydrated) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, token, search, activeFilter]);

  const columns: DataTableColumn<ClientRow>[] = useMemo(
    () => [
      {
        key: "name",
        label: t("clients.table.name"),
        render: (row) => row?.name || "—",
      },
      {
        key: "email",
        label: t("clients.table.email"),
        render: (row) => row?.email || "—",
      },
      {
        key: "phone",
        label: t("clients.table.phone") || "الهاتف",
        render: (row) => row?.phone || "—",
      },
      {
        key: "status",
        label: t("clients.table.status") || "الحالة",
        render: (row) => <StatusBadge active={!!row?.is_active} />,
      },
      {
        key: "actions",
        label: t("clients.table.actions"),
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Link href={`/clients/${row.id}`}>
              <Button variant="secondary">{t("clients.actions.viewDetails")}</Button>
            </Link>
            <Link href={`/clients/${row.id}/edit`}>
              <Button variant="secondary">{t("common.edit") || "تعديل"}</Button>
            </Link>
          </div>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="min-h-screen">
      <PageHeader
        title={t("clients.title")}
        subtitle={t("clients.subtitleList")}
        actions={
          <Link href="/clients/new">
            <Button>+ {t("clients.actions.add")}</Button>
          </Link>
        }
      />

      <FiltersBar
        left={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
              className={cn(
                "w-full sm:w-[180px] px-3 py-2 rounded-xl",
                "bg-white border border-slate-200 outline-none text-sm",
                "focus:ring-2 focus:ring-slate-200"
              )}
            >
              <option value="all">{t("common.all") || "الكل"}</option>
              <option value="active">{t("common.active") || "نشط"}</option>
              <option value="inactive">{t("common.disabled") || "غير نشط"}</option>
            </select>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">
              {t("common.total")}:{" "}
              <span className="text-slate-900 font-semibold">{total}</span>
            </div>

            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setActiveFilter("all");
              }}
              disabled={!search && activeFilter === "all"}
            >
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

      {toast && (
        <Toast open type={toast.type} message={toast.msg} onClose={() => setToast(null)} />
      )}
    </div>
  );
}