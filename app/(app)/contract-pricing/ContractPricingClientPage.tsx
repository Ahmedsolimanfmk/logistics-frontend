"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { DataTable } from "@/src/components/ui/DataTable";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

import { contractPricingService } from "@/src/services/contract-pricing.service";
import { clientsService } from "@/src/services/clients.service";
import { contractsService } from "@/src/services/contracts.service";

type Option = {
  label: string;
  value: string;
};

type Filters = {
  search: string;
  client_id: string;
  contract_id: string;
  is_active: string;
};

function extractItems(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.data?.items)) return body.data.items;
  if (Array.isArray(body?.rows)) return body.rows;
  return [];
}

export default function ContractPricingClientPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [clients, setClients] = useState<Option[]>([]);
  const [contracts, setContracts] = useState<Option[]>([]);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    client_id: "",
    contract_id: "",
    is_active: "",
  });

  const [loading, setLoading] = useState(true);
  const [masterLoading, setMasterLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMaster() {
    try {
      setMasterLoading(true);

      const [clientsRes, contractsRes] = await Promise.all([
        clientsService.list({
          page: 1,
          limit: 200,
          is_active: true,
        }),
        contractsService.list({
          page: 1,
          limit: 200,
        }),
      ]);

      const clientsArr = extractItems(clientsRes);
      const contractsArr = extractItems(contractsRes);

      setClients(
        clientsArr.map((c: any) => ({
          value: String(c.id),
          label: c.name || c.company_name || c.client_name || `#${c.id}`,
        }))
      );

      setContracts(
        contractsArr.map((c: any) => ({
          value: String(c.id),
          label:
            c.contract_no ||
            c.code ||
            c.name ||
            c.title ||
            `#${c.id}`,
        }))
      );
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل بيانات الفلاتر");
    } finally {
      setMasterLoading(false);
    }
  }

  async function loadRules() {
    try {
      setLoading(true);
      setError(null);

      const res = await contractPricingService.listRules({
        q: filters.search || undefined,
        client_id: filters.client_id || undefined,
        contract_id: filters.contract_id || undefined,
        is_active:
          filters.is_active === ""
            ? undefined
            : filters.is_active === "true",
        page: 1,
        pageSize: 200,
      });

      setRows(extractItems(res));
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل قواعد التسعير");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMaster();
  }, []);

  useEffect(() => {
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.client_id, filters.contract_id, filters.is_active]);

  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((r: any) =>
      [
        r.clients?.name,
        r.clients?.company_name,
        r.client_contracts?.contract_no,
        r.client_contracts?.code,
        r.routes?.name,
        r.routes?.origin_label,
        r.routes?.destination_label,
        r.vehicle_classes?.name,
        r.cargo_types?.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rows, filters.search]);

  const columns = [
    {
      key: "client",
      label: "العميل",
      render: (r: any) =>
        r.clients?.name || r.clients?.company_name || "—",
    },
    {
      key: "contract",
      label: "العقد",
      render: (r: any) =>
        r.client_contracts?.contract_no ||
        r.client_contracts?.code ||
        "—",
    },
    {
      key: "route",
      label: "المسار",
      render: (r: any) =>
        r.routes?.name ||
        [r.routes?.origin_label, r.routes?.destination_label]
          .filter(Boolean)
          .join(" → ") ||
        "—",
    },
    {
      key: "vehicle_class",
      label: "فئة المركبة",
      render: (r: any) => r.vehicle_classes?.name || "—",
    },
    {
      key: "cargo_type",
      label: "نوع الحمولة",
      render: (r: any) => r.cargo_types?.name || "—",
    },
    {
      key: "price",
      label: "السعر",
      render: (r: any) =>
        `${Number(r.base_price || r.price || 0).toLocaleString("ar-EG")} ${
          r.currency || "EGP"
        }`,
    },
    {
      key: "status",
      label: "الحالة",
      render: (r: any) => (
        <span
          className={
            r.is_active === false
              ? "rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
              : "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
          }
        >
          {r.is_active === false ? "غير نشط" : "نشط"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "الإجراءات",
      render: (r: any) => (
        <Link
          href={`/contract-pricing/${r.id}`}
          className="text-sm font-medium text-blue-700 hover:underline"
        >
          عرض
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            التسعيرة التعاقدية
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            إدارة قواعد تسعير العقود حسب العميل، العقد، المسار، فئة المركبة ونوع الحمولة.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadRules}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            تحديث
          </button>

          <Link
            href="/contract-pricing/new"
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            إضافة قاعدة
          </Link>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-4">
        <TrexInput
          labelText="بحث"
          placeholder="ابحث بالعميل / العقد / المسار"
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              search: e.target.value,
            }))
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") loadRules();
          }}
        />

        <TrexSelect
          labelText="العميل"
          value={filters.client_id}
          options={[{ label: "كل العملاء", value: "" }, ...clients]}
          loading={masterLoading}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              client_id: value,
            }))
          }
        />

        <TrexSelect
          labelText="العقد"
          value={filters.contract_id}
          options={[{ label: "كل العقود", value: "" }, ...contracts]}
          loading={masterLoading}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              contract_id: value,
            }))
          }
        />

        <TrexSelect
          labelText="الحالة"
          value={filters.is_active}
          options={[
            { label: "كل الحالات", value: "" },
            { label: "نشط", value: "true" },
            { label: "غير نشط", value: "false" },
          ]}
          onChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              is_active: value,
            }))
          }
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border bg-white shadow-sm">
        <DataTable
          columns={columns}
          rows={filteredRows}
          loading={loading}
        />
      </div>
    </div>
  );
}