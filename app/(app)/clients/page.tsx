"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import { clientsService } from "@/src/services/clients.service";
import type { Client } from "@/src/types/clients.types";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

function StatusText({ active }: { active: boolean }) {
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

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG");
}

export default function ClientsPage() {
  const t = useT();
  const router = useRouter();
  const sp = useSearchParams();

  const token = useAuth((s) => s.token);
  const hasHydrated = useAuth((s) => s.hasHydrated);

  const search = sp.get("search") || "";
  const activeFilter = (sp.get("active") || "all") as
    | "all"
    | "active"
    | "inactive";

  const page = Math.max(parseInt(sp.get("page") || "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(sp.get("limit") || "50", 10) || 50, 1),
    200
  );

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());

    if (value) params.set(key, value);
    else params.delete(key);

    if (key !== "page") params.set("page", "1");

    router.push(`/clients?${params.toString()}`);
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
      const res = await clientsService.list({
        search: search.trim() || undefined,
        page,
        limit,
        is_active:
          activeFilter === "all"
            ? undefined
            : activeFilter === "active"
              ? true
              : false,
      });

      setItems(res.items || []);
      setTotal(res.total || 0);
      setPages(res.meta?.pages || 1);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setPages(1);
      setToast({
        type: "error",
        msg:
          e?.response?.data?.message ||
          e?.message ||
          t("clients.errors.loadFailed"),
      });
    } finally {
      setLoading(false);
    }
  }

  const qsKey = useMemo(
    () => `${search}|${activeFilter}|${page}|${limit}`,
    [search, activeFilter, page, limit]
  );

  useEffect(() => {
    if (!hasHydrated) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, token, qsKey]);

  async function toggleClient(row: Client) {
    try {
      await clientsService.toggle(row.id);
      setToast({
        type: "success",
        msg: t("clients.toast.toggled") || "Client status updated",
      });
      await load();
    } catch (e: any) {
      setToast({
        type: "error",
        msg:
          e?.response?.data?.message ||
          e?.message ||
          t("clients.errors.toggleFailed"),
      });
    }
  }

  const columns: DataTableColumn<Client>[] = useMemo(
    () => [
      {
        key: "name",
        label: t("clients.table.name"),
        render: (row) => (
          <div>
            <div className="font-medium text-[rgb(var(--trex-fg))]">
              {row.name || "—"}
            </div>
            {row.code ? (
              <div className="text-xs text-slate-500 font-mono">
                {row.code}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "email",
        label: t("clients.table.email"),
        render: (row) => row.email || row.billing_email || "—",
      },
      {
        key: "phone",
        label: t("clients.table.phone"),
        render: (row) => row.phone || "—",
      },
      {
        key: "contact",
        label: "مسؤول التواصل",
        render: (row) =>
          row.contact_name ||
          row.primary_contact_name ||
          row.contact_phone ||
          row.primary_contact_phone ||
          "—",
      },
      {
        key: "status",
        label: t("clients.table.status"),
        render: (row) => <StatusText active={!!row.is_active} />,
      },
      {
        key: "created",
        label: "تاريخ الإنشاء",
        render: (row) => (
          <span className="text-slate-600">{fmtDate(row.created_at)}</span>
        ),
      },
      {
        key: "actions",
        label: t("clients.table.actions"),
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Link href={`/clients/${row.id}`}>
              <Button type="button" variant="secondary">
                {t("clients.actions.viewDetails")}
              </Button>
            </Link>

            <Link href={`/clients/${row.id}/edit`}>
              <Button type="button" variant="secondary">
                {t("common.edit")}
              </Button>
            </Link>

            <Button
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                toggleClient(row);
              }}
            >
              {t("common.toggle")}
            </Button>
          </div>
        ),
      },
    ],
    [t]
  );

  if (!hasHydrated) {
    return (
      <div className="min-h-screen" dir="rtl">
        <Card>
          <div className="text-sm text-slate-500">
            {t("common.checkingSession")}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-4" dir="rtl">
      <PageHeader
        title={t("clients.title")}
        subtitle={t("clients.subtitleList")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/clients/new">
              <Button type="button" variant="primary">
                + {t("clients.actions.add")}
              </Button>
            </Link>

            <Button
              type="button"
              variant="secondary"
              onClick={load}
              disabled={loading}
              isLoading={loading}
            >
              {t("common.refresh")}
            </Button>
          </div>
        }
      />

      <Card>
        <FiltersBar
          left={
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <TrexInput
                  label="common.search"
                  value={search}
                  onChange={(e) => setParam("search", e.target.value)}
                  placeholder={t("clients.filters.searchPlaceholder")}
                />
              </div>

              <TrexSelect
                label="common.status"
                value={activeFilter}
                onChange={(value) => setParam("active", value)}
                options={[
                  { value: "all", label: t("common.all") },
                  { value: "active", label: t("common.active") },
                  { value: "inactive", label: t("common.disabled") },
                ]}
              />

              <TrexSelect
                label="common.rows"
                value={String(limit)}
                onChange={(value) => setParam("limit", value)}
                options={[
                  { value: "25", label: "25" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                  { value: "200", label: "200" },
                ]}
              />
            </div>
          }
          right={
            <div className="flex items-center gap-3 text-xs text-slate-500">
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

              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/clients?page=1&limit=50")}
                disabled={!search && activeFilter === "all" && limit === 50}
              >
                {t("common.reset")}
              </Button>
            </div>
          }
        />
      </Card>

      <DataTable<Client>
        title={t("clients.title")}
        subtitle={t("clients.subtitle")}
        columns={columns}
        rows={items}
        loading={loading}
        total={total}
        page={page}
        pages={pages}
        onPrev={page <= 1 ? undefined : () => setParam("page", String(page - 1))}
        onNext={
          page >= pages ? undefined : () => setParam("page", String(page + 1))
        }
        emptyTitle={t("clients.empty")}
        emptyHint={t("clients.emptyHint") || ""}
        onRowClick={(row) => router.push(`/clients/${row.id}`)}
      />

      {toast ? (
        <Toast
          open
          type={toast.type}
          message={toast.msg}
          dir="rtl"
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}