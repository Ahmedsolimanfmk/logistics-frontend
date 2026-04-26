"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function shortId(id: unknown) {
  const s = String(id ?? "");
  if (s.length <= 14) return s || "—";
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function vehicleLabel(v: Partial<Vehicle>) {
  const fleet = String(v.fleet_no || "").trim();
  const plate = String(v.plate_no || "").trim();
  const display = String(v.display_name || "").trim();

  if (fleet && plate) return `${fleet} — ${plate}${display ? ` (${display})` : ""}`;
  if (fleet) return `${fleet}${display ? ` (${display})` : ""}`;
  if (plate) return `${plate}${display ? ` (${display})` : ""}`;
  return display || shortId(v.id);
}

function licenseMeta(expiryDate: unknown) {
  if (!expiryDate) {
    return { text: "—", tone: "neutral" as const, days: null as number | null };
  }

  const dt = new Date(String(expiryDate));
  if (Number.isNaN(dt.getTime())) {
    return { text: "—", tone: "neutral" as const, days: null as number | null };
  }

  const diff = dt.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return { text: "منتهية", tone: "danger" as const, days };
  if (days <= 7) return { text: `${days} يوم`, tone: "warn" as const, days };
  return { text: `${days} يوم`, tone: "good" as const, days };
}

function LicenseBadge({ expiryDate }: { expiryDate: unknown }) {
  const meta = licenseMeta(expiryDate);

  const cls =
    meta.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : meta.tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : meta.tone === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span className={cn("inline-flex rounded-full border px-2 py-1 text-xs", cls)}>
      {meta.text}
    </span>
  );
}

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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 p-4"
      dir="rtl"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className={cn("w-full", maxWidthClassName)} onMouseDown={(e) => e.stopPropagation()}>
        <Card
          title={
            <div>
              <div className="text-sm font-semibold text-[rgb(var(--trex-fg))]">{title}</div>
              {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
            </div>
          }
          right={
            <Button type="button" variant="ghost" onClick={onClose} aria-label="Close">
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
  const [year, setYear] = useState("");
  const [odometer, setOdometer] = useState("");
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

  const canSubmit = Boolean(fleetNo.trim() && plateNo.trim());

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

      await onSaved();
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
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="primary" onClick={submit} disabled={!canSubmit || loading} isLoading={loading}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <TrexInput
          label="vehicles.fields.fleetNo"
          value={fleetNo}
          onChange={(e) => setFleetNo(e.target.value)}
          disabled={loading}
          required
        />

        <TrexInput
          label="vehicles.fields.plateNo"
          value={plateNo}
          onChange={(e) => setPlateNo(e.target.value)}
          disabled={loading}
          required
        />

        <div className="md:col-span-2">
          <TrexInput
            label="vehicles.fields.displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
          />
        </div>

        <TrexSelect
          label="vehicles.fields.status"
          value={status}
          onChange={setStatus}
          disabled={loading}
          options={[
            { value: "AVAILABLE", label: t("vehicles.status.AVAILABLE") },
            { value: "IN_USE", label: t("vehicles.status.IN_USE") },
            { value: "MAINTENANCE", label: t("vehicles.status.MAINTENANCE") },
            { value: "DISABLED", label: "DISABLED" },
          ]}
        />

        <TrexInput
          label="vehicles.fields.model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={loading}
        />

        <TrexInput
          label="vehicles.fields.year"
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          disabled={loading}
        />

        <TrexInput
          label="vehicles.fields.odometer"
          type="number"
          value={odometer}
          onChange={(e) => setOdometer(e.target.value)}
          disabled={loading}
        />

        <div className="md:col-span-2">
          <TrexInput
            label="vehicles.fields.gps"
            value={gps}
            onChange={(e) => setGps(e.target.value)}
            disabled={loading}
          />
        </div>

        <TrexInput
          labelText="رقم الرخصة"
          value={licenseNo}
          onChange={(e) => setLicenseNo(e.target.value)}
          disabled={loading}
        />

        <TrexInput
          labelText="تاريخ إصدار الرخصة"
          type="date"
          value={licenseIssueDate}
          onChange={(e) => setLicenseIssueDate(e.target.value)}
          disabled={loading}
        />

        <div className="md:col-span-2">
          <TrexInput
            labelText="تاريخ انتهاء الرخصة"
            type="date"
            value={licenseExpiryDate}
            onChange={(e) => setLicenseExpiryDate(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>
    </Modal>
  );
}

export default function VehiclesClientPage() {
  const t = useT();
  const lang = useLang();
  const locale = lang === "en" ? "en-US" : "ar-EG";

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

  const page = Math.max(parseInt(sp.get("page") || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") || "25", 10), 1), 100);
  const q = sp.get("q") || "";
  const status = sp.get("status") || "";
  const active = sp.get("active") || "";

  const queryKey = useMemo(
    () => `${page}|${pageSize}|${q}|${status}|${active}`,
    [page, pageSize, q, status, active]
  );

  function fmtDate(d: unknown) {
    if (!d) return "—";
    const dt = new Date(String(d));
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString(locale);
  }

  function showToast(type: "success" | "error", msg: string) {
    setToastType(type);
    setToastMsg(msg);
    setToastOpen(true);
  }

  function setParam(k: string, v: string) {
    const p = new URLSearchParams(sp.toString());

    if (v) p.set(k, v);
    else p.delete(k);

    if (k !== "page") p.set("page", "1");

    router.push(`/vehicles?${p.toString()}`);
  }

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

      setRows(res.items || []);
      setTotal(res.total || 0);
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
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (token === null) return;
    if (!token) router.push("/login");
  }, [token, router]);

  useEffect(() => {
    if (token === null || !token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, queryKey]);

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
      await load();
    } catch (e: any) {
      showToast("error", e?.message || t("vehicles.toast.toggleFailed"));
    }
  }

  const columns: DataTableColumn<Vehicle>[] = [
    {
      key: "vehicle",
      label: t("vehicles.table.vehicle"),
      render: (v) => <span className="font-medium text-[rgb(var(--trex-fg))]">{vehicleLabel(v)}</span>,
    },
    {
      key: "license_no",
      label: "الرخصة",
      render: (v) => <span className="font-mono text-xs">{v.license_no || "—"}</span>,
    },
    {
      key: "license_expiry_date",
      label: "انتهاء الرخصة",
      render: (v) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm text-slate-600">{fmtDate(v.license_expiry_date)}</span>
          <LicenseBadge expiryDate={v.license_expiry_date} />
        </div>
      ),
    },
    {
      key: "status",
      label: t("vehicles.table.status"),
      render: (v) => (
        <div className="flex flex-col gap-1">
          <span className="text-slate-700">
            {t(`vehicles.status.${String(v.status || "").toUpperCase()}`) || v.status || "—"}
          </span>
          {v.disable_reason ? <span className="text-xs text-rose-600">{String(v.disable_reason)}</span> : null}
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
      render: (v) => <span className="text-slate-600">{fmtDate(v.created_at)}</span>,
    },
    {
      key: "actions",
      label: t("vehicles.table.actions"),
      headerClassName: "w-[320px]",
      render: (v) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/vehicles/${v.id}`);
            }}
          >
            تفاصيل
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(v);
            }}
          >
            {t("common.edit")}
          </Button>

          <Button
            type="button"
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

  if (token === null) {
    return (
      <div className="min-h-screen" dir="rtl">
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          <Card>
            <div className="text-sm text-slate-500">{t("common.checkingSession")}</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
        <Card>
          <div className="space-y-4">
            <PageHeader
              title={t("vehicles.title")}
              subtitle={t("vehicles.subtitle")}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs text-slate-500">
                    {t("common.role")}:{" "}
                    <span className="font-medium text-[rgb(var(--trex-fg))]">{role || "—"}</span>
                  </div>

                  <Button type="button" variant="primary" onClick={openCreate}>
                    {t("vehicles.actions.add")}
                  </Button>

                  <Button type="button" variant="secondary" onClick={load} isLoading={loading}>
                    {t("common.refresh")}
                  </Button>
                </div>
              }
            />

            <FiltersBar
              left={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-72">
                    <TrexInput
                      value={q}
                      onChange={(e) => setParam("q", e.target.value)}
                      placeholder={t("vehicles.filters.searchPlaceholder")}
                    />
                  </div>

                  <TrexSelect
                    value={status}
                    onChange={(value) => setParam("status", value)}
                    options={[
                      { value: "AVAILABLE", label: t("vehicles.status.AVAILABLE") },
                      { value: "IN_USE", label: t("vehicles.status.IN_USE") },
                      { value: "MAINTENANCE", label: t("vehicles.status.MAINTENANCE") },
                      { value: "DISABLED", label: "DISABLED" },
                      { value: "AVAILABLE,IN_USE", label: t("vehicles.filters.activeStatus") },
                    ]}
                    placeholderText={t("vehicles.filters.allStatus")}
                  />

                  <TrexSelect
                    value={active}
                    onChange={(value) => setParam("active", value)}
                    options={[
                      { value: "1", label: t("vehicles.filters.activeOnly") },
                      { value: "0", label: t("vehicles.filters.inactiveOnly") },
                    ]}
                    placeholderText={t("vehicles.filters.allActiveFlag")}
                  />

                  <TrexSelect
                    value={String(pageSize)}
                    onChange={(value) => setParam("pageSize", value)}
                    options={[
                      { value: "10", label: "10" },
                      { value: "25", label: "25" },
                      { value: "50", label: "50" },
                      { value: "100", label: "100" },
                    ]}
                    placeholderText={t("common.rows")}
                  />
                </div>
              }
              right={
                <div className="text-xs text-slate-500">
                  {t("vehicles.meta.total")}:{" "}
                  <span className="font-semibold text-[rgb(var(--trex-fg))]">{total}</span>
                  {" — "}
                  {t("vehicles.meta.page")}{" "}
                  <span className="font-semibold text-[rgb(var(--trex-fg))]">
                    {page}/{totalPages}
                  </span>
                </div>
              }
            />

            {err ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {err}
              </div>
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
                if (row.id) router.push(`/vehicles/${row.id}`);
              }}
              footer={
                <div className="text-xs text-slate-500">
                  {t("vehicles.meta.showing")}{" "}
                  <span className="font-semibold text-[rgb(var(--trex-fg))]">{rows.length}</span>{" "}
                  {t("vehicles.meta.of")}{" "}
                  <span className="font-semibold text-[rgb(var(--trex-fg))]">{total}</span>
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

      <Toast
        open={toastOpen}
        message={toastMsg}
        type={toastType}
        dir="rtl"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}