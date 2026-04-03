"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";

import { contractsService } from "@/src/services/contracts.service";
import type { Contract } from "@/src/types/contracts.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

type ToastState =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ar-EG").format(d);
}

function formatMoney(value?: number | null, currency?: string | null) {
  if (value == null) return "-";

  try {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: currency || "EGP",
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${value} ${currency || "EGP"}`;
  }
}

export default function ContractsClientPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const clientId = searchParams.get("client_id") || undefined;

  const [rows, setRows] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  const [page, setPage] = useState(1);
  const limit = 20;
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const canManage =
    user?.role === "ADMIN" ||
    user?.role === "ACCOUNTANT" ||
    user?.role === "EXECUTIVE_MANAGER";

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const res = await contractsService.list({
        client_id: clientId,
        page,
        limit,
      });

      setRows(res.items || []);
      setTotal(res.total || 0);
      setPages(res.meta?.pages || 1);
    } catch (error: any) {
      setToast({
        type: "error",
        message: error?.response?.data?.message || "فشل تحميل العقود",
      });
    } finally {
      setLoading(false);
    }
  }, [clientId, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [clientId]);

  const stats = useMemo(() => {
    const active = rows.filter(
      (x) => String(x.status || "").toUpperCase() === "ACTIVE"
    ).length;

    const inactive = rows.filter(
      (x) => String(x.status || "").toUpperCase() === "INACTIVE"
    ).length;

    const expired = rows.filter(
      (x) => String(x.status || "").toUpperCase() === "EXPIRED"
    ).length;

    const draft = rows.filter(
      (x) => String(x.status || "").toUpperCase() === "DRAFT"
    ).length;

    const cancelled = rows.filter(
      (x) => String(x.status || "").toUpperCase() === "CANCELLED"
    ).length;

    return {
      active,
      inactive,
      expired,
      draft,
      cancelled,
    };
  }, [rows]);

  const columns = useMemo<DataTableColumn<Contract>[]>(
    () => [
      {
        key: "contract_no",
        label: "رقم العقد",
        render: (row) => row.contract_no || "-",
      },
      {
        key: "client",
        label: "العميل",
        render: (row) => row.clients?.name || row.client_id || "-",
      },
      {
        key: "start_date",
        label: "تاريخ البداية",
        render: (row) => formatDate(row.start_date),
      },
      {
        key: "end_date",
        label: "تاريخ النهاية",
        render: (row) => formatDate(row.end_date),
      },
      {
        key: "billing_cycle",
        label: "دورة الفاتورة",
        render: (row) => row.billing_cycle || "-",
      },
      {
        key: "contract_value",
        label: "قيمة العقد",
        render: (row) => formatMoney(row.contract_value, row.currency),
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.status || "-"} />,
      },
      {
        key: "actions",
        label: "الإجراءات",
        className: "text-right",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Link href={`/contracts/${row.id}`}>
              <Button variant="secondary">عرض</Button>
            </Link>

            {canManage ? (
              <Link href={`/contracts/${row.id}?mode=edit`}>
                <Button>تعديل</Button>
              </Link>
            ) : null}
          </div>
        ),
      },
    ],
    [canManage]
  );

  return (
    <div className="space-y-6">
      <Toast
        open={!!toast}
        type={toast?.type || "success"}
        message={toast?.message || ""}
        onClose={() => setToast(null)}
      />

      <PageHeader
        title="العقود"
        subtitle={
          clientId
            ? "عرض العقود الخاصة بالعميل المحدد"
            : "إدارة العقود المبرمة مع العملاء"
        }
        actions={
          canManage ? (
            <Link href={clientId ? `/contracts/new?client_id=${clientId}` : "/contracts/new"}>
              <Button>إضافة عقد</Button>
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <KpiCard label="إجمالي العقود" value={total} formatValue />
        <KpiCard label="العقود النشطة" value={stats.active} formatValue />
        <KpiCard label="العقود غير النشطة" value={stats.inactive} formatValue />
        <KpiCard label="العقود المنتهية" value={stats.expired} formatValue />
        <KpiCard label="المسودات / الملغاة" value={stats.draft + stats.cancelled} formatValue />
      </div>

      <Card className="p-4">
        <DataTable<Contract>
          columns={columns}
          rows={rows}
          loading={loading}
          emptyTitle="لا توجد عقود"
          emptyHint="لم يتم العثور على بيانات عقود حالياً."
          total={total}
          page={page}
          pages={pages}
          onPrev={page > 1 ? () => setPage((p) => p - 1) : undefined}
          onNext={page < pages ? () => setPage((p) => p + 1) : undefined}
        />
      </Card>
    </div>
  );
}