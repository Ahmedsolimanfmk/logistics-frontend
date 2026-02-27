"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { api } from "@/src/lib/api";
import type { InventoryRequest } from "@/src/lib/inventory.api";

// ✅ Design System
import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/src/components/ui/DataTable";

function isUuid(v: any) {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

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

function extractRequest(resData: any): InventoryRequest | null {
  const r = resData?.request || resData?.data?.request || resData?.data || resData;
  if (r && typeof r === "object" && (r as any).id) return r as InventoryRequest;
  return null;
}

export default function InventoryRequestDetailsPage() {
  const t = useT();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = params?.id;
  const fromWo = searchParams.get("work_order_id") || "";

  const [loading, setLoading] = useState(true);
  const [req, setReq] = useState<InventoryRequest | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const [rejectReason, setRejectReason] = useState("");
  const [notes, setNotes] = useState("");
  const [createdIssueId, setCreatedIssueId] = useState<string | null>(null);

  // ✅ Guard: لو بالغلط فتح /inventory/requests/new على صفحة [id]
  useEffect(() => {
    if (!id) return;

    if (id === "new") {
      router.replace("/inventory/requests/new");
      return;
    }

    if (!isUuid(id)) {
      setLoading(false);
      setReq(null);
      setToast({ open: true, message: "Invalid request id", type: "error" });
    }
  }, [id, router]);

  async function load() {
    if (!id || id === "new" || !isUuid(id)) return;

    setLoading(true);
    try {
      const res = await api.get(`/inventory/requests/${id}`);
      const r = extractRequest(res.data);
      setReq(r);
    } catch (e: any) {
      setReq(null);
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const statusUpper = String((req as any)?.status || "").toUpperCase();
  const workOrderId = (req as any)?.work_order_id || fromWo || "";

  const lines = useMemo(() => ((req as any)?.lines as any[]) || [], [req]);
  const reservations = useMemo(() => ((req as any)?.reservations as any[]) || [], [req]);

  async function approveAndReserve() {
    if (!id || !isUuid(id)) return;
    setBusy("approve");
    try {
      await api.post(`/inventory/requests/${id}/approve`, { notes: notes || null });
      setToast({ open: true, message: t("inventory.approvedOk") || "Approved", type: "success" });
      await load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!id || !isUuid(id)) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setToast({
        open: true,
        message: t("inventory.rejectPrompt") || "Enter reject reason",
        type: "error",
      });
      return;
    }

    setBusy("reject");
    try {
      await api.post(`/inventory/requests/${id}/reject`, { reason });
      setToast({ open: true, message: t("inventory.rejectedOk") || "Rejected", type: "success" });
      setRejectReason("");
      await load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function unreserve() {
    if (!id || !isUuid(id)) return;
    setBusy("unreserve");
    try {
      const res = await api.post(`/inventory/requests/${id}/unreserve`, { notes: notes || null });
      const n = res?.data?.unreserved_count ?? null;
      setToast({
        open: true,
        message: n != null ? `Unreserved: ${n}` : t("inventory.unreservedOk") || "Unreserved",
        type: "success",
      });
      await load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function createIssueDraftFromRequest() {
    if (!id || !isUuid(id)) return;
    setBusy("createIssue");
    try {
      const res = await api.post(`/inventory/issues`, { request_id: id, notes: notes || null });
      const issueId = res?.data?.issue?.id || res?.data?.id || null;
      setCreatedIssueId(issueId);

      setToast({ open: true, message: t("issues.createdOk") || "Issue created", type: "success" });
      if (issueId) router.push(`/inventory/issues/${issueId}`);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function postIssue(issueId: string) {
    setBusy("postIssue");
    try {
      await api.post(`/inventory/issues/${issueId}/post`, { notes: notes || null });
      setToast({ open: true, message: t("issues.postedOk") || "Issue posted", type: "success" });
      await load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  // ✅ Tables (Design System)
  const linesColumns: DataTableColumn<any>[] = [
    {
      key: "part",
      label: t("inventory.colPart") || "Part",
      render: (l) => (
        <div>
          <div className="text-gray-900 font-semibold">{l?.parts?.name || "—"}</div>
          <div className="text-xs text-gray-500 font-mono">{shortId(l?.part_id)}</div>
        </div>
      ),
    },
    {
      key: "needed_qty",
      label: t("inventory.colNeededQty") || "Needed Qty",
      render: (l) => String(l?.needed_qty ?? 0),
    },
    {
      key: "notes",
      label: t("inventory.colLineNotes") || "Notes",
      render: (l) => <span className="text-gray-700">{l?.notes || "—"}</span>,
    },
  ];

  const reservationsColumns: DataTableColumn<any>[] = [
    {
      key: "internal_serial",
      label: t("inventory.colInternalSerial") || "Internal Serial",
      render: (r) => (
        <span className="font-mono text-xs text-gray-800">
          {r?.part_items?.internal_serial || "—"}
        </span>
      ),
    },
    {
      key: "manufacturer_serial",
      label: t("inventory.colManufacturerSerial") || "Manufacturer Serial",
      render: (r) => (
        <span className="font-mono text-xs text-gray-800">
          {r?.part_items?.manufacturer_serial || "—"}
        </span>
      ),
    },
    {
      key: "part",
      label: t("inventory.colPart") || "Part",
      render: (r) => {
        const item = r?.part_items;
        return (
          <div>
            <div className="text-gray-900">{item?.parts?.name || "—"}</div>
            <div className="text-xs text-gray-500 font-mono">{shortId(item?.part_id)}</div>
          </div>
        );
      },
    },
    {
      key: "item_status",
      label: t("inventory.colItemStatus") || "Item Status",
      render: (r) => <StatusBadge status={r?.part_items?.status || ""} />,
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title={t("inventory.requestDetailsTitle") || "Request Details"}
        subtitle={
          <span className="text-xs text-slate-400 font-mono">
            ID: {id ? shortId(id) : "—"}{" "}
            {workOrderId ? ` • work_order_id: ${shortId(workOrderId)}` : ""}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/inventory/requests">
              <Button variant="secondary">← {t("common.back") || "Back"}</Button>
            </Link>
            <Button variant="secondary" onClick={load} isLoading={loading}>
              {t("common.refresh") || "Refresh"}
            </Button>
          </div>
        }
      />

      <Card
        title={`${t("inventory.requestDetailsTitle") || "Request Details"} #${shortId(id)}`}
        right={<StatusBadge status={(req as any)?.status} />}
      >
        {loading ? (
          <div className="text-sm text-gray-600">{t("common.loading") || "Loading…"}</div>
        ) : !req ? (
          <div className="text-sm text-gray-600">{t("common.notFound") || "Not found"}</div>
        ) : (
          <div className="space-y-4">
            {/* Summary blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">{t("inventory.createdAt") || "Created at"}</div>
                <div className="text-sm text-gray-900">{fmtDate((req as any).created_at)}</div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">{t("inventory.warehouse") || "Warehouse"}</div>
                <div className="text-sm text-gray-900">{(req as any)?.warehouses?.name || "—"}</div>
                <div className="text-xs text-gray-500 font-mono">{shortId((req as any)?.warehouse_id)}</div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-3">
                <div className="text-xs text-gray-500">{t("inventory.workOrderId") || "Work Order"}</div>
                <div className="text-sm font-mono text-gray-900">{workOrderId ? shortId(workOrderId) : "—"}</div>
                {workOrderId ? (
                  <Link className="mt-2 inline-flex text-xs underline text-gray-700" href={`/maintenance/work-orders/${workOrderId}`}>
                    Open Work Order →
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Notes / Reject */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">{t("inventory.notes") || "Notes"}</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("common.optional") || "Optional"}
                  className="w-full min-h-[90px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">{t("inventory.rejectPrompt") || "Reject reason"}</div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("inventory.rejectPrompt") || "Why reject?"}
                  className="w-full min-h-[90px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>
            </div>

            {/* Actions */}
            <Card title={t("common.actions") || "Actions"}>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={busy !== null || statusUpper !== "PENDING"}
                  onClick={approveAndReserve}
                  isLoading={busy === "approve"}
                >
                  {t("inventory.approve") || "Approve"}
                </Button>

                <Button
                  variant="danger"
                  disabled={busy !== null || statusUpper !== "PENDING"}
                  onClick={reject}
                  isLoading={busy === "reject"}
                >
                  {t("inventory.reject") || "Reject"}
                </Button>

                <Button
                  variant="secondary"
                  disabled={busy !== null || statusUpper !== "APPROVED"}
                  onClick={unreserve}
                  isLoading={busy === "unreserve"}
                >
                  {t("inventory.unreserve") || "Unreserve"}
                </Button>

                <div className="w-full h-px bg-gray-200 my-2" />

                <Button
                  variant="secondary"
                  disabled={busy !== null || statusUpper !== "APPROVED"}
                  onClick={createIssueDraftFromRequest}
                  isLoading={busy === "createIssue"}
                >
                  {t("inventory.createIssue") || "Create Issue"}
                </Button>

                {createdIssueId ? (
                  <>
                    <Link href={`/inventory/issues/${createdIssueId}`}>
                      <Button variant="ghost">Open Issue #{shortId(createdIssueId)}</Button>
                    </Link>

                    <Button
                      variant="primary"
                      disabled={busy !== null}
                      onClick={() => postIssue(createdIssueId)}
                      isLoading={busy === "postIssue"}
                    >
                      {t("issues.post") || "Post Issue"}
                    </Button>
                  </>
                ) : null}
              </div>

              <div className="mt-3 text-xs text-gray-600">
                ℹ️ Status: <span className="font-semibold text-gray-900">{statusUpper || "—"}</span>
              </div>
            </Card>

            {/* Lines */}
            <DataTable
              title={t("inventory.lines") || "Lines"}
              columns={linesColumns}
              rows={Array.isArray(lines) ? lines : []}
              loading={false}
              emptyTitle={t("common.noData") || "No data"}
              emptyHint={t("inventory.noLinesHint") ?? "لا توجد بنود داخل الطلب."}
              minWidthClassName="min-w-[900px]"
            />

            {/* Reservations */}
            <DataTable
              title={t("inventory.reservations") || "Reservations"}
              columns={reservationsColumns}
              rows={Array.isArray(reservations) ? reservations : []}
              loading={false}
              emptyTitle={t("issues.noReserved") || "No reserved items"}
              emptyHint={t("inventory.noReservationsHint") ?? "لم يتم حجز عناصر لهذا الطلب بعد."}
              minWidthClassName="min-w-[900px]"
            />
          </div>
        )}
      </Card>
    </div>
  );
}