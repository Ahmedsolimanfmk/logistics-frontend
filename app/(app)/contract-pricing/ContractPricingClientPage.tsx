"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/store/auth";

import { clientsService } from "@/src/services/clients.service";
import { contractsService } from "@/src/services/contracts.service";
import { contractPricingService } from "@/src/services/contract-pricing.service";

import type { Client } from "@/src/types/clients.types";
import type { Contract } from "@/src/types/contracts.types";
import type {
  CargoTypeRef,
  PricingRule,
  PricingRouteRef,
  VehicleClassRef,
} from "@/src/types/contract-pricing.types";

import { Toast } from "@/src/components/Toast";
import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

type ToastState =
  | {
      type: "success" | "error";
      msg: string;
    }
  | null;

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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG").format(d);
}

function boolToStatus(isActive?: boolean) {
  return isActive ? "ACTIVE" : "INACTIVE";
}

function contractLooksUsable(contract: Contract) {
  if (!contract) return false;

  const status = String(contract.status || "").toUpperCase();
  if (status && status !== "ACTIVE") return false;

  if (contract.end_date) {
    const end = new Date(contract.end_date);
    if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) {
      return false;
    }
  }

  return true;
}

export default function ContractPricingClientPage() {
  const token = useAuth((s) => s.token);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PricingRule[]>([]);
  const [total, setTotal] = useState(0);

  const [clients, setClients] = useState<Client[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [routes, setRoutes] = useState<PricingRouteRef[]>([]);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClassRef[]>([]);
  const [cargoTypes, setCargoTypes] = useState<CargoTypeRef[]>([]);

  const [toast, setToast] = useState<ToastState>(null);

  const [q, setQ] = useState("");
  const [clientId, setClientId] = useState("");
  const [contractId, setContractId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [vehicleClassId, setVehicleClassId] = useState("");
  const [cargoTypeId, setCargoTypeId] = useState("");
  const [isActive, setIsActive] = useState<"" | "true" | "false">("");

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [pages, setPages] = useState(1);

  async function loadLookups() {
    try {
      const [clientsRes, vehicleClassesRes, cargoTypesRes] = await Promise.all([
        clientsService.list({ page: 1, limit: 200 }),
        contractPricingService.listVehicleClasses({ page: 1, pageSize: 200 }),
        contractPricingService.listCargoTypes({ page: 1, pageSize: 200 }),
      ]);

      setClients(clientsRes.items || []);
      setVehicleClasses(vehicleClassesRes.items || []);
      setCargoTypes(cargoTypesRes.items || []);
    } catch (e: any) {
      setToast({
        type: "error",
        msg:
          e?.response?.data?.message ||
          e?.message ||
          "فشل تحميل البيانات المساعدة",
      });
    }
  }

  async function loadContractsByClient(nextClientId: string) {
    if (!nextClientId) {
      setContracts([]);
      setRoutes([]);
      setContractId("");
      setRouteId("");
      return;
    }

    try {
      const [contractsRes, routesRes] = await Promise.all([
        contractsService.list({
          client_id: nextClientId,
          page: 1,
          limit: 200,
        }),
        contractPricingService.listRoutes({
          client_id: nextClientId,
          page: 1,
          pageSize: 200,
          is_active: true,
        }),
      ]);

      const usableContracts = (contractsRes.items || []).filter(contractLooksUsable);

      setContracts(usableContracts);
      setRoutes(routesRes.items || []);
    } catch (e: any) {
      setContracts([]);
      setRoutes([]);
      setToast({
        type: "error",
        msg:
          e?.response?.data?.message ||
          e?.message ||
          "فشل تحميل العقود أو المسارات",
      });
    }
  }

  async function loadRules() {
    if (!token) return;

    setLoading(true);
    try {
      const res = await contractPricingService.listRules({
        q: q || undefined,
        client_id: clientId || undefined,
        contract_id: contractId || undefined,
        route_id: routeId || undefined,
        vehicle_class_id: vehicleClassId || undefined,
        cargo_type_id: cargoTypeId || undefined,
        is_active: isActive === "" ? "" : isActive === "true",
        page,
        pageSize,
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
        msg:
          e?.response?.data?.message ||
          e?.message ||
          "فشل تحميل قواعد التسعير",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    token,
    q,
    clientId,
    contractId,
    routeId,
    vehicleClassId,
    cargoTypeId,
    isActive,
    page,
  ]);

  useEffect(() => {
    loadContractsByClient(clientId);
  }, [clientId]);

  const activeCount = useMemo(
    () => items.filter((x) => x.is_active === true).length,
    [items]
  );

  const inactiveCount = useMemo(
    () => items.filter((x) => x.is_active === false).length,
    [items]
  );

  const withRouteCount = useMemo(
    () => items.filter((x) => !!x.route_id).length,
    [items]
  );

  const columns: DataTableColumn<PricingRule>[] = useMemo(
    () => [
      {
        key: "contract",
        label: "العقد",
        render: (row) =>
          row.client_contracts?.contract_no || row.contract_id || "—",
      },
      {
        key: "client",
        label: "العميل",
        render: (row) => row.clients?.name || row.client_id || "—",
      },
      {
        key: "route",
        label: "المسار",
        render: (row) => row.routes?.name || row.routes?.code || "—",
      },
      {
        key: "vehicle_class",
        label: "فئة السيارة",
        render: (row) =>
          row.vehicle_classes?.name || row.vehicle_classes?.code || "—",
      },
      {
        key: "cargo_type",
        label: "نوع المنقول",
        render: (row) =>
          row.cargo_types?.name || row.cargo_types?.code || "—",
      },
      {
        key: "trip_type",
        label: "نوع الرحلة",
        render: (row) => row.trip_type || "—",
      },
      {
        key: "base_price",
        label: "السعر الأساسي",
        render: (row) => formatMoney(row.base_price, row.currency),
      },
      {
        key: "priority",
        label: "الأولوية",
        render: (row) => row.priority ?? "—",
      },
      {
        key: "effective",
        label: "الفترة",
        render: (row) =>
          `${formatDate(row.effective_from)} → ${formatDate(row.effective_to)}`,
      },
      {
        key: "status",
        label: "الحالة",
        render: (row) => <StatusBadge status={boolToStatus(row.is_active)} />,
      },
      {
        key: "actions",
        label: "الإجراءات",
        render: (row) => (
          <div className="flex flex-wrap gap-2">
            <Link href={`/contract-pricing/${row.id}`}>
              <Button variant="secondary">عرض</Button>
            </Link>

            <Link href={`/contract-pricing/${row.id}?mode=edit`}>
              <Button variant="secondary">تعديل</Button>
            </Link>

            <button
              type="button"
              onClick={async () => {
                try {
                  const updated = await contractPricingService.toggleRule(row.id);
                  setItems((prev) =>
                    prev.map((x) => (x.id === row.id ? updated : x))
                  );
                  setToast({
                    type: "success",
                    msg: "تم تحديث حالة القاعدة بنجاح",
                  });
                } catch (e: any) {
                  setToast({
                    type: "error",
                    msg:
                      e?.response?.data?.message ||
                      e?.message ||
                      "فشل تحديث الحالة",
                  });
                }
              }}
              className={cn(
                "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium",
                "border border-black/10 bg-[rgba(var(--trex-surface),0.7)] text-[rgb(var(--trex-fg))]",
                "hover:bg-[rgba(var(--trex-surface),0.9)]"
              )}
            >
              {row.is_active ? "تعطيل" : "تفعيل"}
            </button>
          </div>
        ),
      },
    ],
    []
  );

  function resetFilters() {
    setQ("");
    setClientId("");
    setContractId("");
    setRouteId("");
    setVehicleClassId("");
    setCargoTypeId("");
    setIsActive("");
    setPage(1);
    setContracts([]);
    setRoutes([]);
  }

  return (
    <div className="min-h-screen space-y-6">
      <PageHeader
        title="قواعد التسعير التعاقدي"
        subtitle="إدارة قواعد تسعير الرحلات المرتبطة بالعقود"
        actions={
          <Link href="/contract-pricing/new">
            <Button>+ إضافة قاعدة تسعير</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="إجمالي القواعد" value={total} formatValue />
        <KpiCard label="القواعد النشطة" value={activeCount} formatValue />
        <KpiCard label="القواعد غير النشطة" value={inactiveCount} formatValue />
        <KpiCard label="مرتبطة بمسار" value={withRouteCount} formatValue />
      </div>

      <FiltersBar
        left={
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="بحث بالملاحظات أو العقد أو العميل"
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            />

            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setContractId("");
                setRouteId("");
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
              value={contractId}
              onChange={(e) => {
                setContractId(e.target.value);
                setPage(1);
              }}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            >
              <option value="">كل العقود</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.id}>
                  {contract.contract_no || contract.id}
                </option>
              ))}
            </select>

            <select
              value={routeId}
              onChange={(e) => {
                setRouteId(e.target.value);
                setPage(1);
              }}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            >
              <option value="">كل المسارات</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name || route.code || route.id}
                </option>
              ))}
            </select>

            <select
              value={vehicleClassId}
              onChange={(e) => {
                setVehicleClassId(e.target.value);
                setPage(1);
              }}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            >
              <option value="">كل فئات السيارات</option>
              {vehicleClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || item.code}
                </option>
              ))}
            </select>

            <select
              value={cargoTypeId}
              onChange={(e) => {
                setCargoTypeId(e.target.value);
                setPage(1);
              }}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none",
                "focus:ring-2 focus:ring-slate-200"
              )}
            >
              <option value="">كل أنواع المنقول</option>
              {cargoTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || item.code}
                </option>
              ))}
            </select>
          </div>
        }
        right={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={isActive}
              onChange={(e) => {
                setIsActive(e.target.value as "" | "true" | "false");
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
        title="قواعد التسعير"
        subtitle="قائمة القواعد المعرّفة على العقود"
        columns={columns}
        rows={items}
        loading={loading}
        emptyTitle="لا توجد قواعد تسعير"
        emptyHint="لم يتم العثور على قواعد مطابقة للفلاتر الحالية."
        total={total}
        page={page}
        pages={pages}
        onPrev={page > 1 ? () => setPage((p) => p - 1) : undefined}
        onNext={page < pages ? () => setPage((p) => p + 1) : undefined}
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