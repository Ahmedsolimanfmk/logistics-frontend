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
  const token = useAuth((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function load() {
    if (!token) return;

    setLoading(true);
    try {
      const res = await clientsService.list({
        search,
        page: 1,
        limit: 50,
      });

      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setToast({
        type: "error",
        msg: e?.message || t("clients.errors.loadFailed"),
      });
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search]);

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
        label: "الهاتف",
        render: (row) => row?.phone || "—",
      },
      {
        key: "status",
        label: "الحالة",
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
              <Button variant="secondary">تعديل</Button>
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
              <span className="text-slate-900 font-semibold">{total}</span>
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

      {toast && (
        <Toast open type={toast.type} message={toast.msg} onClose={() => setToast(null)} />
      )}
    </div>
  );
}