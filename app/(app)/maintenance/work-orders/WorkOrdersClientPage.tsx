"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";

import useMaintenanceWorkOrders from "@/src/hooks/maintenance/useMaintenanceWorkOrders";
import type { WorkOrderListItem } from "@/src/types/work-orders.types";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import {
  DataTable,
  type DataTableColumn,
} from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function vehicleLabel(row: WorkOrderListItem) {
  const v = row.vehicles;
  const fleet = v?.fleet_no ? String(v.fleet_no).trim() : "";
  const plate = v?.plate_no ? String(v.plate_no).trim() : "";
  const name = v?.display_name ? String(v.display_name).trim() : "";

  if (fleet && plate) return `${fleet} - ${plate}`;
  if (fleet) return fleet;
  if (plate) return plate;
  if (name) return name;
  return "—";
}

export default function WorkOrdersClientPage() {
  const t = useT();
  const token = useAuth((s: any) => s.token);

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  const {
    items,
    meta,
    params,
    loading,
    error,
    setPage,
    setFilters,
    refresh,
  } = useMaintenanceWorkOrders({
    page: 1,
    limit: 20,
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(message: string, type: "success" | "error" = "success") {
    setToastMsg(message);
    setToastType(type);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2500);
  }

  useEffect(() => {
    if (error) {
      showToast(error, "error");
    }
  }, [error]);

  const rows = useMemo(() => {
    return Array.isArray(items) ? (items as WorkOrderListItem[]) : [];
  }, [items]);

  const columns: DataTableColumn<WorkOrderListItem>[] = useMemo(
    () => [
      {
        key: "actions",
        label: t("workOrders.list.columns.actions") || "الإجراءات",
        render: (row) => (
          <Link href={`/maintenance/work-orders/${encodeURIComponent(row.id)}`}>
            <Button variant="secondary">
              {t("workOrders.list.view") || "عرض"}
            </Button>
          </Link>
        ),
      },
      {
        key: "opened_at",
        label: t("workOrders.list.columns.opened") || "تاريخ الفتح",
        render: (row) => fmtDate(row.opened_at),
      },
      {
        key: "status",
        label: t("workOrders.list.columns.status") || "الحالة",
        render: (row) =>
          row.status ? <StatusBadge status={row.status} /> : "—",
      },
      {
        key: "type",
        label: t("workOrders.list.columns.type") || "النوع",
        render: (row) => row.type || "—",
      },
      {
        key: "vendor_name",
        label: t("workOrders.list.columns.vendor") || "المورد",
        render: (row) => row.vendor_name || "—",
      },
      {
        key: "vehicle",
        label: t("workOrders.list.columns.vehicle") || "المركبة",
        render: (row) => (
          <div>
            <div>{vehicleLabel(row)}</div>
            <div className="text-xs font-mono text-gray-500">
              {shortId(row.vehicle_id)}
            </div>
          </div>
        ),
      },
      {
        key: "id",
        label: "ID",
        render: (row) => (
          <div>
            <div className="font-semibold">{shortId(row.id)}</div>
            <div className="text-xs font-mono text-gray-500">{row.id}</div>
          </div>
        ),
      },
    ],
    [t]
  );

  async function applyFilters() {
    await setFilters({
      q: q.trim() || "",
      status: status || "",
    });
  }

  async function clearFilters() {
    setQ("");
    setStatus("");
    await setFilters({
      q: "",
      status: "",
    });
  }

  if (!token) {
    return (
      <div className="space-y-4 p-4">
        <Card>
          <div className="text-sm text-gray-500">
            {t("common.loadingSession") || "جاري تحميل الجلسة..."}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="space-y-4 p-4">
        <PageHeader
          title={t("workOrders.title") || "أوامر الشغل"}
          subtitle={
            `${t("workOrders.breadcrumb") || "الصيانة"} / ${
              t("workOrders.title") || "أوامر الشغل"
            }`
          }
          actions={
            <Button
              variant="secondary"
              onClick={async () => {
                await refresh();
                showToast(t("common.refresh") || "تم التحديث", "success");
              }}
              isLoading={loading}
            >
              {t("workOrders.actions.refresh") || "تحديث"}
            </Button>
          }
        />

        <Card>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs text-gray-500">
                {t("workOrders.filters.searchTitle") || "بحث"}
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="trex-input w-full px-3 py-2 text-sm"
                placeholder={
                  t("workOrders.filters.searchPlaceholder") ||
                  "ابحث برقم الأمر، المركبة، المورد..."
                }
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-gray-500">
                {t("workOrders.filters.status") || "الحالة"}
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="trex-input w-full px-3 py-2 text-sm"
              >
                <option value="">
                  {t("workOrders.status.all") || "الكل"}
                </option>
                <option value="OPEN">
                  {t("workOrders.status.open") || "OPEN"}
                </option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">
                  {t("workOrders.status.completed") || "COMPLETED"}
                </option>
                <option value="CANCELED">
                  {t("workOrders.status.canceled") || "CANCELED"}
                </option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="primary"
                onClick={applyFilters}
                isLoading={loading}
              >
                {t("workOrders.filters.searchBtn") || "تطبيق"}
              </Button>

              <Button variant="ghost" onClick={clearFilters}>
                {t("common.clear") || "مسح"}
              </Button>
            </div>
          </div>
        </Card>

        <DataTable<WorkOrderListItem>
          title={t("workOrders.list.title") || "القائمة"}
          right={
            <div className="text-xs text-gray-500">
              {error ? `⚠ ${error}` : null}
            </div>
          }
          columns={columns}
          rows={rows}
          loading={loading}
          emptyTitle={error ? error : t("workOrders.list.empty") || "لا توجد بيانات"}
          emptyHint={
            error
              ? t("common.tryAgain") || "حاول مرة أخرى"
              : t("workOrders.filters.searchPlaceholder") || "استخدم الفلاتر للبحث"
          }
          total={meta.total}
          page={meta.page}
          pages={meta.pages}
          onPrev={
            meta.page > 1 && !loading
              ? () => setPage(meta.page - 1)
              : undefined
          }
          onNext={
            meta.page < meta.pages && !loading
              ? () => setPage(meta.page + 1)
              : undefined
          }
        />

        <Toast
          open={toastOpen}
          message={toastMsg}
          type={toastType}
          dir="rtl"
          onClose={() => setToastOpen(false)}
        />
      </div>
    </div>
  );
}