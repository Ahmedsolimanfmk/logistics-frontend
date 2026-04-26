"use client";

import { useMemo, useState } from "react";
import { useT } from "@/src/i18n/useT";
import { useVendorsList } from "@/src/hooks/master-data/useVendorsList";
import { vendorsService } from "@/src/services/vendors.service";
import type { Vendor, VendorListFilters } from "@/src/types/vendors.types";

import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";
import { Button } from "@/src/components/ui/Button";

export default function VendorsClient() {
  const t = useT();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const filters: VendorListFilters = useMemo(
    () => ({
      page: 1,
      pageSize: 20,
      q,
      status: status || undefined,
    }),
    [q, status]
  );

  const { items, loading, reload } = useVendorsList(filters);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanCode = code.trim();

    if (!cleanName) return;

    setSaving(true);
    try {
      await vendorsService.create({
        name: cleanName,
        code: cleanCode || null,
        status: "ACTIVE",
      });

      setName("");
      setCode("");
      await reload();
    } catch (err) {
      console.error("CREATE_VENDOR_FAILED:", err);
    } finally {
      setSaving(false);
    }
  }

  const columns: DataTableColumn<Vendor>[] = useMemo(
    () => [
      {
        key: "name",
        label: "الاسم",
        render: (row) => row.name || "—",
      },
      {
        key: "code",
        label: "الكود",
        render: (row) => row.code || "—",
      },
      {
        key: "vendor_type",
        label: "النوع",
        render: (row) => row.vendor_type || "—",
      },
      {
        key: "classification",
        label: "التصنيف",
        render: (row) => row.classification || "—",
      },
      {
        key: "status",
        label: t("common.status"),
        render: (row) =>
          String(row.status || "").toUpperCase() === "ACTIVE"
            ? `🟢 ${t("common.active")}`
            : `🔴 ${t("common.disabled")}`,
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">الموردون ومراكز الصيانة</h1>
        <p className="mt-1 text-sm text-slate-500">
          إدارة الموردين ومراكز الصيانة لاستخدامهم في المشتريات والمصروفات وأوامر العمل.
        </p>
      </div>

      <div className="trex-card p-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <TrexInput
          label="common.search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث باسم المورد أو الكود..."
        />

        <TrexSelect
          label="common.status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
            { value: "SUSPENDED", label: "Suspended" },
          ]}
          placeholderText="كل الحالات"
        />

        <div className="flex items-end">
          <Button type="button" onClick={reload} disabled={loading}>
            {loading ? t("common.loading") : t("common.refresh")}
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleCreate}
        className="trex-card p-4 grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <TrexInput
          labelText="اسم المورد"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: ABC Spare Parts"
          required
        />

        <TrexInput
          labelText="كود المورد"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="اختياري"
        />

        <div className="flex items-end">
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? t("common.saving") : "إضافة مورد"}
          </Button>
        </div>
      </form>

      <DataTable<Vendor>
        columns={columns}
        rows={items}
        loading={loading}
        emptyTitle="لا يوجد موردون"
        emptyHint="ابدأ بإضافة مورد جديد أو غيّر الفلاتر."
      />
    </div>
  );
}