"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/store/auth";

import { contractsService } from "@/src/services/contracts.service";
import type { Contract, ContractStatus } from "@/src/types/contracts.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

type ToastState =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG").format(d);
}

function formatMoney(value?: number | null, currency?: string | null) {
  if (value == null) return "—";

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

function normalizeStatus(value?: string | null) {
  return String(value || "").toUpperCase();
}

export default function ContractsClientPage() {
  const router = useRouter();
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

  const [statusFilter, setStatusFilter] = useState<"ALL" | ContractStatus>("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

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
  }, [clientId, statusFilter]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "ALL") return rows;
    return rows.filter((row) => normalizeStatus(row.status) === statusFilter);
  }, [rows, statusFilter]);

  const stats = useMemo(() => {
    const active = rows.filter((x) => normalizeStatus(x.status) === "ACTIVE").length;
    const expired = rows.filter((x) => normalizeStatus(x.status) === "EXPIRED").length;
    const terminated = rows.filter((x) => normalizeStatus(x.status) === "TERMINATED").length;

    const totalValue = rows.reduce((sum, row) => {
      return sum + Number(row.contract_value || 0);
    }, 0);

    return {
      active,
      expired,
      terminated,
      totalValue,
    };
  }, [rows]);

  async function setContractStatus(id: string, status: ContractStatus) {
    if (!canManage) return;

    setBusyId(id);

    try {
      await contractsService.setStatus(id, status);
      setToast({
        type: "success",
        message: "تم تحديث حالة العقد",
      });
      await loadData();
    } catch (error: any) {
      setToast({
        type: "error",
        message: error?.response?.data?.message || "فشل تحديث حالة العقد",
      });
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<DataTableColumn<Contract>[]>(
    () => [
      {
        key: "contract_no",
        label: "رقم العقد",
        render: (row) => (
          <div>
            <div className="font-medium text-[rgb(var(--trex-fg))]">
              {row.contract_no || "—"}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {row.id.slice(0, 8)}…
            </div>
          </div>
        ),
      },
      {
        key: "client",
        label: "العميل",
        render: (row) => row.client?.name || row.client_id || "—",
      },
      {
        key: "period",
        label: "الفترة",
        render: (row) => (
          <div className="text-sm">
            <div>{formatDate(row.start_date)}</div>
            <div className="text-xs text-slate-500">
              إلى: {formatDate(row.end_date)}
            </div>
          </div>
        ),
      },
      {
        key: "billing_cycle",
        label: "دورة الفاتورة",
        render: (row) => row.billing_cycle || "—",
      },
      {
        key: "contract_value",
        label: "قيمة العقد",
        render: (row) => (
          <span className="font-semibold">
            {formatMoney(row.contract_value, row.currency)}
          </span>
        ),
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={row.status || "—"} />,
      },
      {
        key: "actions",
        label: "الإجراءات",
        className: "text-right",
        render: (row) => {
          const st = normalizeStatus(row.status);

          return (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/contracts/${row.id}`}>
                <Button type="button" variant="secondary">
                  عرض
                </Button>
              </Link>

              {canManage ? (
                <Link href={`/contracts/${row.id}?mode=edit`}>
                  <Button type="button" variant="secondary">
                    تعديل
                  </Button>
                </Link>
              ) : null}

              {canManage && st !== "ACTIVE" ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busyId === row.id}
                  isLoading={busyId === row.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setContractStatus(row.id, "ACTIVE");
                  }}
                >
                  تفعيل
                </Button>
              ) : null}

              {canManage && st !== "TERMINATED" ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={busyId === row.id}
                  isLoading={busyId === row.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setContractStatus(row.id, "TERMINATED");
                  }}
                >
                  إنهاء
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canManage, busyId]
  );

  return (
    <div className="space-y-6" dir="rtl">
      <Toast
        open={!!toast}
        type={toast?.type || "success"}
        message={toast?.message || ""}
        dir="rtl"
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
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Link
                href={
                  clientId
                    ? `/contracts/new?client_id=${clientId}`
                    : "/contracts/new"
                }
              >
                <Button type="button" variant="primary">
                  إضافة عقد
                </Button>
              </Link>
            ) : null}

            <Button
              type="button"
              variant="secondary"
              onClick={loadData}
              disabled={loading}
              isLoading={loading}
            >
              تحديث
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="إجمالي العقود" value={String(total)} />
        <KpiCard label="العقود النشطة" value={String(stats.active)} />
        <KpiCard label="المنتهية" value={String(stats.expired)} />
        <KpiCard
          label="قيمة العقود"
          value={formatMoney(stats.totalValue, "EGP")}
        />
      </div>

      <Card>
        <FiltersBar
          left={
            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
              <TrexSelect
                labelText="حالة العقد"
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(value as "ALL" | ContractStatus)
                }
                options={[
                  { value: "ALL", label: "كل الحالات" },
                  { value: "ACTIVE", label: "نشط" },
                  { value: "EXPIRED", label: "منتهي" },
                  { value: "TERMINATED", label: "منتهي/مفسوخ" },
                ]}
              />

              <div className="flex items-end text-xs text-slate-500">
                المعروض:{" "}
                <b className="mx-1 text-[rgb(var(--trex-fg))]">
                  {filteredRows.length}
                </b>
                من{" "}
                <b className="mx-1 text-[rgb(var(--trex-fg))]">{total}</b>
              </div>
            </div>
          }
        />
      </Card>

      <Card>
        <DataTable<Contract>
          title="قائمة العقود"
          columns={columns}
          rows={filteredRows}
          loading={loading}
          emptyTitle="لا توجد عقود"
          emptyHint="لم يتم العثور على بيانات عقود حالياً."
          total={total}
          page={page}
          pages={pages}
          onPrev={page > 1 ? () => setPage((p) => p - 1) : undefined}
          onNext={page < pages ? () => setPage((p) => p + 1) : undefined}
          onRowClick={(row) => router.push(`/contracts/${row.id}`)}
        />
      </Card>
    </div>
  );
}