"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/src/store/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { useLang } from "@/src/i18n/lang";

import { vehiclesService } from "@/src/services/vehicles.service";
import type { Vehicle, VehiclePayload } from "@/src/types/vehicles.types";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { FiltersBar } from "@/src/components/ui/FiltersBar";
import { Card } from "@/src/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function vehicleLabel(v: Partial<Vehicle>) {
  const a = String(v.fleet_no || "").trim();
  const b = String(v.plate_no || "").trim();
  const dn = String(v.display_name || "").trim();

  if (a && b) return `${a} — ${b}${dn ? ` (${dn})` : ""}`;
  if (a) return `${a}${dn ? ` (${dn})` : ""}`;
  if (b) return `${b}${dn ? ` (${dn})` : ""}`;
  return dn || shortId(v.id);
}

function licenseMeta(expiryDate: any) {
  if (!expiryDate) return { text: "—", tone: "neutral" as const, days: null as number | null };

  const dt = new Date(String(expiryDate));
  if (Number.isNaN(dt.getTime())) {
    return { text: "—", tone: "neutral" as const, days: null as number | null };
  }

  const now = new Date();
  const diff = dt.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { text: "منتهية", tone: "danger" as const, days };
  if (days <= 7) return { text: `${days} يوم`, tone: "warn" as const, days };
  return { text: `${days} يوم`, tone: "good" as const, days };
}

function LicenseBadge({ expiryDate }: { expiryDate: any }) {
  const meta = licenseMeta(expiryDate);

  const cls =
    meta.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : meta.tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : meta.tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs", cls)}>{meta.text}</span>;
}

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none " +
  "placeholder:text-gray-400 focus:ring-2 focus:ring-black/10";

const selectCls =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-black/10";

function Modal({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  maxWidthClassName = "max-w-3xl",
}: {
  open: boolean;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  maxWidthClassName?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/20 flex items-center justify-center p-4"
      dir="rtl"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={cn("w-full", maxWidthClassName)} onMouseDown={(e) => e.stopPropagation()}>
        <Card
          title={
            <div>
              <div className="text-sm font-semibold text-gray-900">{title}</div>
              {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
            </div>
          }
          right={
            <Button variant="ghost" onClick={onClose} aria-label="Close">
              ✕
            </Button>
          }
        >
          <div className="space-y-4">{children}</div>
          {footer ? <div className="mt-4 flex items-center justify-start gap-2">{footer}</div> : null}
        </Card>
      </div>
    </div>
  );
}

function VehicleModal({
  open,
  mode,
  initial,
  onClose,
  onSaved,
  showToast,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: Vehicle;
  onClose: () => void;
  onSaved: () => void;
  showToast: (type: "success" | "error", msg: string) => void;
}) {
  const t = useT();

  const [loading, setLoading] = useState(false);

  const [fleetNo, setFleetNo] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("AVAILABLE");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [odometer, setOdometer] = useState<string>("");
  const [gps, setGps] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [licenseIssueDate, setLicenseIssueDate] = useState("");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");

  useEffect(() => {
    if (!open) return;

    setFleetNo(String(initial?.fleet_no || ""));
    setPlateNo(String(initial?.plate_no || ""));
    setDisplayName(String(initial?.display_name || ""));
    setStatus(String(initial?.status || "AVAILABLE"));
    setModel(String(initial?.model || ""));
    setYear(initial?.year ? String(initial.year) : "");
    setOdometer(initial?.current_odometer ? String(initial.current_odometer) : "");
    setGps(String(initial?.gps_device_id || ""));
    setLicenseNo(String(initial?.license_no || ""));
    setLicenseIssueDate(initial?.license_issue_date ? String(initial.license_issue_date).slice(0, 10) : "");
    setLicenseExpiryDate(initial?.license_expiry_date ? String(initial.license_expiry_date).slice(0, 10) : "");
  }, [open, initial]);

  const canSubmit = !!fleetNo.trim() && !!plateNo.trim();

  async function submit() {
    if (!canSubmit) return;

    setLoading(true);
    try {
      const payload: VehiclePayload = {
        fleet_no: fleetNo.trim(),
        plate_no: plateNo.trim(),
        display_name: displayName.trim() || null,
        status: status || "AVAILABLE",
        model: model.trim() || null,
        year: year ? Number(year) : null,
        current_odometer: odometer ? Number(odometer) : null,
        gps_device_id: gps.trim() || null,
        license_no: licenseNo.trim() || null,
        license_issue_date: licenseIssueDate || null,
        license_expiry_date: licenseExpiryDate || null,
      };

      if (mode === "create") {
        await vehiclesService.create(payload);
        showToast("success", t("vehicles.toast.created"));
      } else if (initial?.id) {
        await vehiclesService.update(initial.id, payload);
        showToast("success", t("vehicles.toast.updated"));
      }

      onSaved();
      onClose();
    } catch (e: any) {
      showToast("error", e?.message || t("vehicles.toast.saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!loading) onClose();
      }}
      title={mode === "create" ? t("vehicles.modal.addTitle") : t("vehicles.modal.editTitle")}
      subtitle={t("vehicles.subtitle")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={submit} disabled={!canSubmit || loading} isLoading={loading}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span className="text-xs text-gray-500">{t("vehicles.fields.fleetNo")} *</span>
          <input value={fleetNo} onChange={(e) => setFleetNo(e.target.value)} disabled={loading} className={inputCls} />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-xs text-gray-500">{t("vehicles.fields.plateNo")} *</span>
          <input value={plateNo} onChange={(e) => setPlateNo(e.target.value)} disabled={loading} className={inputCls} />
        </label>

        <label className="grid gap-2 text-sm md:col-span-2">
          <span className="text-xs text-gray-500">{t("vehicles.fields.displayName")}</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            className={inputCls}
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-xs text-gray-500">{t("vehicles.fields.status")}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading} className={selectCls}>
            <option value="AVAILABLE">{t("vehicles.status.AVAILABLE")}</option>
            <option value="IN_USE">{t("vehicles.status.IN_USE")}</option>
            <option value="MAINTENANCE">{t("vehicles.status.MAINTENANCE")}</option>
            <option value="DISABLED">DISABLED</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-xs text-gray-500">{t("vehicles.fields.model")}</span>
          <input value={model} onChange={(e) => setModel(e.target.value)} disabled={loading} className={inputCls} />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-xs text-gray-500">{t("vehicles.fields.year")}</span>
          <input value={year} onChange={(e) => setYear(e.target.value)} disabled={loading} type="number" className={inputCls} />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-xs text-gray-500">{t("vehicles.fields.odometer")}</span>
          <input
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            disabled={loading}
            type="number"
            className={inputCls}
          />
        </label>

        <label className="grid gap-2 text-sm md:col-span-2">
          <span className="text-xs text-gray-500">{t("vehicles.fields.gps")}</span>
          <input value={gps} onChange={(e) => setGps(e.target.value)} disabled={loading} className={inputCls} />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-xs text-gray-500">رقم الرخصة</span>
          <input
            value={licenseNo}
            onChange={(e) => setLicenseNo(e.target.value)}
            disabled={loading}
            className={inputCls}
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-xs text-gray-500">تاريخ إصدار الرخصة</span>
          <input
            value={licenseIssueDate}
            onChange={(e) => setLicenseIssueDate(e.target.value)}
            disabled={loading}
            type="date"
            className={inputCls}
          />
        </label>

        <label className="grid gap-2 text-sm md:col-span-2">
          <span className="text-xs text-gray-500">تاريخ انتهاء الرخصة</span>
          <input
            value={licenseExpiryDate}
            onChange={(e) => setLicenseExpiryDate(e.target.value)}
            disabled={loading}
            type="date"
            className={inputCls}
          />
        </label>
      </div>
    </Modal>
  );
}

export default function VehiclesClientPage() {
  const t = useT();
  const lang = useLang();
  const locale = lang === "en" ? "en-US" : "ar-EG";

  const fmtDate = (d: any) => {
    if (!d) return "—";
    const dt = new Date(String(d));
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString(locale);
  };

  const router = useRouter();
  const sp = useSearchParams();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const role = String(user?.role || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Vehicle | null>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (token === null) return;
    if (!token) router.push("/login");
  }, [token, router]);

  const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10), 1), 100);
  const q = sp.get("q") || "";
  const status = sp.get("status") || "";
  const active = sp.get("active") || "";

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(sp.toString());
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    router.push(`/vehicles?${p.toString()}`);
  };

  async function load() {
    if (token === null || !token) return;
    setLoading(true);
    setErr(null);

    try {
      const res = await vehiclesService.list({
        page,
        pageSize,
        q,
        status,
        active,
      });

      setRows(res.items);
      setTotal(res.total);
      setTotalPages(res.pages || 1);
    } catch (e: any) {
      setErr(e?.message || t("vehicles.errors.loadFailed"));
      setRows([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token === null) return;
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, pageSize, q, status, active]);

  function openCreate() {
    setEditing(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditing(v);
    setModalMode("edit");
    setModalOpen(true);
  }

  async function toggle(v: Vehicle) {
    try {
      await vehiclesService.toggle(v.id);
      showToast("success", t("vehicles.toast.toggled"));
      load();
    } catch (e: any) {
      showToast("error", e?.message || t("vehicles.toast.toggleFailed"));
    }
  }

  if (token === null) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <Card>
            <div className="text-sm text-gray-700">{t("common.checkingSession")}</div>
          </Card>
        </div>
      </div>
    );
  }

  const columns: DataTableColumn<Vehicle>[] = [
    {
      key: "vehicle",
      label: t("vehicles.table.vehicle"),
      render: (v) => <span className="font-medium text-gray-900">{vehicleLabel(v)}</span>,
    },
    {
      key: "license_no",
      label: "الرخصة",
      render: (v) => <span className="font-mono text-gray-700">{v.license_no || "—"}</span>,
    },
    {
      key: "license_expiry_date",
      label: "انتهاء الرخصة",
      render: (v) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-gray-700">{fmtDate(v.license_expiry_date)}</span>
          <LicenseBadge expiryDate={v.license_expiry_date} />
        </div>
      ),
    },
    {
      key: "status",
      label: t("vehicles.table.status"),
      render: (v) => (
        <div className="flex flex-col gap-1">
          <span className="text-gray-700">
            {t(`vehicles.status.${String(v.status || "").toUpperCase()}`) || v.status || "—"}
          </span>
          {v?.disable_reason ? <span className="text-xs text-rose-600">{String(v.disable_reason)}</span> : null}
        </div>
      ),
    },
    {
      key: "is_active",
      label: t("vehicles.table.active"),
      render: (v) => <StatusBadge status={v.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "created_at",
      label: t("vehicles.table.created"),
      render: (v) => <span className="text-gray-700">{fmtDate(v.created_at)}</span>,
    },
    {
      key: "actions",
      label: t("vehicles.table.actions"),
      headerClassName: "w-[320px]",
      render: (v) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/vehicles/${v.id}`);
            }}
          >
            تفاصيل
          </Button>

          <Button
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(v);
            }}
          >
            {t("common.edit")}
          </Button>

          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              toggle(v);
            }}
          >
            {t("common.toggle")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        <Card>
          <div className="space-y-4">
            <PageHeader
              title={t("vehicles.title")}
              subtitle={t("vehicles.subtitle")}
              actions={
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-600">
                    {t("common.role")}: <span className="font-medium text-gray-900">{role || "—"}</span>
                  </div>

                  <Button variant="primary" onClick={openCreate}>
                    {t("vehicles.actions.add")}
                  </Button>

                  <Button variant="secondary" onClick={load} isLoading={loading}>
                    {t("common.refresh")}
                  </Button>
                </div>
              }
            />

            <FiltersBar
              left={
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={q}
                    onChange={(e) => setParam("q", e.target.value)}
                    placeholder={t("vehicles.filters.searchPlaceholder")}
                    className={cn(inputCls, "w-64")}
                  />

                  <select value={status} onChange={(e) => setParam("status", e.target.value)} className={selectCls}>
                    <option value="">{t("vehicles.filters.allStatus")}</option>
                    <option value="AVAILABLE">{t("vehicles.status.AVAILABLE")}</option>
                    <option value="IN_USE">{t("vehicles.status.IN_USE")}</option>
                    <option value="MAINTENANCE">{t("vehicles.status.MAINTENANCE")}</option>
                    <option value="DISABLED">DISABLED</option>
                    <option value="AVAILABLE,IN_USE">{t("vehicles.filters.activeStatus")}</option>
                  </select>

                  <select value={active} onChange={(e) => setParam("active", e.target.value)} className={selectCls}>
                    <option value="">{t("vehicles.filters.allActiveFlag")}</option>
                    <option value="1">{t("vehicles.filters.activeOnly")}</option>
                    <option value="0">{t("vehicles.filters.inactiveOnly")}</option>
                  </select>
                </div>
              }
              right={
                <div className="text-xs text-gray-600">
                  {t("vehicles.meta.total")}: <span className="font-semibold text-gray-900">{total}</span> —{" "}
                  {t("vehicles.meta.page")} <span className="font-semibold text-gray-900">{page}/{totalPages}</span>
                </div>
              }
            />

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{err}</div>
            ) : null}

            <DataTable<Vehicle>
              columns={columns}
              rows={rows}
              loading={loading}
              emptyTitle={t("vehicles.empty")}
              emptyHint={t("vehicles.filters.searchPlaceholder")}
              page={page}
              pages={totalPages}
              total={total}
              onPrev={page > 1 ? () => setParam("page", String(page - 1)) : undefined}
              onNext={page < totalPages ? () => setParam("page", String(page + 1)) : undefined}
              onRowClick={(row) => {
                if (row?.id) router.push(`/vehicles/${row.id}`);
              }}
              footer={
                <div className="text-xs text-gray-600">
                  {t("vehicles.meta.showing")} <span className="font-semibold text-gray-900">{rows.length}</span>{" "}
                  {t("vehicles.meta.of")} <span className="font-semibold text-gray-900">{total}</span>
                </div>
              }
              minWidthClassName="min-w-[1400px]"
            />
          </div>
        </Card>
      </div>

      <VehicleModal
        open={modalOpen}
        mode={modalMode}
        initial={editing || undefined}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        showToast={showToast}
      />

      <Toast open={toastOpen} message={toastMsg} type={toastType} dir="rtl" onClose={() => setToastOpen(false)} />
    </div>
  );
}