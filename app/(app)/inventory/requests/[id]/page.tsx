"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { api } from "@/src/lib/api";
import type { InventoryRequest } from "@/src/lib/inventory.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

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

function Badge({ value }: { value?: string | null }) {
  const s = String(value || "").toUpperCase();
  const base = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";
  if (s === "PENDING")
    return <span className={cn(base, "border-yellow-400/30 text-yellow-200 bg-yellow-400/10")}>{s}</span>;
  if (s === "APPROVED")
    return <span className={cn(base, "border-blue-400/30 text-blue-200 bg-blue-400/10")}>{s}</span>;
  if (s === "REJECTED")
    return <span className={cn(base, "border-red-400/30 text-red-200 bg-red-400/10")}>{s}</span>;
  if (s === "ISSUED")
    return <span className={cn(base, "border-green-400/30 text-green-200 bg-green-400/10")}>{s}</span>;
  return <span className={cn(base, "border-white/15 text-slate-200 bg-white/5")}>{s || "—"}</span>;
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-base font-semibold text-white">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "secondary",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition border";
  const styles: Record<string, string> = {
    primary: "bg-white text-black border-white hover:bg-neutral-200",
    secondary: "bg-white/5 text-white border-white/10 hover:bg-white/10",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(base, styles[variant], disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
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
      // important: يمنع Invalid id calls
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
      // ✅ backend route: GET /inventory/requests/:id
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
      // ✅ backend: POST /inventory/requests/:id/approve
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
      setToast({ open: true, message: t("inventory.rejectPrompt") || "Enter reject reason", type: "error" });
      return;
    }

    setBusy("reject");
    try {
      // ✅ backend: POST /inventory/requests/:id/reject
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
      // ✅ backend: POST /inventory/requests/:id/unreserve
      const res = await api.post(`/inventory/requests/${id}/unreserve`, { notes: notes || null });
      const n = res?.data?.unreserved_count ?? null;
      setToast({
        open: true,
        message: n != null ? `Unreserved: ${n}` : (t("inventory.unreservedOk") || "Unreserved"),
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
      // ✅ backend routes عندك: POST /inventory/issues (createIssueDraft)
      // مفيش /inventory/requests/:id/issues في routes اللي بعتها
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

  return (
    <div className="p-6 space-y-4 text-white">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-400">{t("inventory.requestsTitle") || "Inventory Requests"}</div>
          <div className="text-xl font-bold">{t("inventory.requestDetailsTitle") || "Request Details"}</div>
          <div className="mt-1 text-xs text-slate-400 font-mono">
            ID: {id ? shortId(id) : "—"} {workOrderId ? ` • work_order_id: ${shortId(workOrderId)}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/inventory/requests"
            className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            ← {t("common.back") || "Back"}
          </Link>

          <button
            onClick={load}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {loading ? (t("common.loading") || "Loading…") : (t("common.refresh") || "Refresh")}
          </button>
        </div>
      </div>

      <Card title={`${t("inventory.requestDetailsTitle") || "Request Details"} #${shortId(id)}`} right={<Badge value={(req as any)?.status} />}>
        {loading ? (
          <div className="text-sm text-slate-300">{t("common.loading") || "Loading…"}</div>
        ) : !req ? (
          <div className="text-sm text-slate-300">{t("common.notFound") || "Not found"}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("inventory.createdAt") || "Created at"}</div>
                <div className="text-sm">{fmtDate((req as any).created_at)}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("inventory.warehouse") || "Warehouse"}</div>
                <div className="text-sm">{(req as any)?.warehouses?.name || "—"}</div>
                <div className="text-xs text-slate-400 font-mono">{shortId((req as any)?.warehouse_id)}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("inventory.workOrderId") || "Work Order"}</div>
                <div className="text-sm font-mono">{workOrderId ? shortId(workOrderId) : "—"}</div>
                {workOrderId ? (
                  <Link className="mt-2 inline-flex text-xs underline text-slate-200" href={`/maintenance/work-orders/${workOrderId}`}>
                    Open Work Order →
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">{t("inventory.notes") || "Notes"}</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("common.optional") || "Optional"}
                  className="w-full min-h-[90px] rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">{t("inventory.rejectPrompt") || "Reject reason"}</div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("inventory.rejectPrompt") || "Why reject?"}
                  className="w-full min-h-[90px] rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold mb-3">{t("common.actions") || "Actions"}</div>

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" disabled={busy !== null || statusUpper !== "PENDING"} onClick={approveAndReserve}>
                  {busy === "approve" ? (t("common.saving") || "Saving…") : (t("inventory.approve") || "Approve")}
                </Button>

                <Button variant="danger" disabled={busy !== null || statusUpper !== "PENDING"} onClick={reject}>
                  {busy === "reject" ? (t("common.saving") || "Saving…") : (t("inventory.reject") || "Reject")}
                </Button>

                <Button variant="secondary" disabled={busy !== null || statusUpper !== "APPROVED"} onClick={unreserve}>
                  {busy === "unreserve" ? (t("common.saving") || "Saving…") : (t("inventory.unreserve") || "Unreserve")}
                </Button>

                <div className="w-full h-px bg-white/10 my-2" />

                <Button variant="secondary" disabled={busy !== null || statusUpper !== "APPROVED"} onClick={createIssueDraftFromRequest}>
                  {busy === "createIssue" ? (t("common.saving") || "Saving…") : (t("inventory.createIssue") || "Create Issue")}
                </Button>

                {createdIssueId ? (
                  <>
                    <Link
                      href={`/inventory/issues/${createdIssueId}`}
                      className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      Open Issue #{shortId(createdIssueId)}
                    </Link>

                    <Button variant="primary" disabled={busy !== null} onClick={() => postIssue(createdIssueId)}>
                      {busy === "postIssue" ? (t("common.saving") || "Saving…") : (t("issues.post") || "Post Issue")}
                    </Button>
                  </>
                ) : null}
              </div>

              <div className="mt-3 text-xs text-slate-300">
                ℹ️ Status: <span className="font-semibold">{statusUpper || "—"}</span>
              </div>
            </div>

            <Card title={t("inventory.lines") || "Lines"}>
              <div className="overflow-auto rounded-2xl border border-white/10">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-white/5 text-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3">{t("inventory.colPart") || "Part"}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colNeededQty") || "Needed Qty"}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colLineNotes") || "Notes"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(lines) && lines.length > 0 ? (
                      lines.map((l: any, idx: number) => (
                        <tr key={l.id || idx} className="border-t border-white/10">
                          <td className="px-4 py-3">
                            <div className="text-slate-100 font-semibold">{l?.parts?.name || "—"}</div>
                            <div className="text-xs text-slate-400 font-mono">{shortId(l?.part_id)}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-200">{l?.needed_qty ?? 0}</td>
                          <td className="px-4 py-3 text-slate-300">{l?.notes || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-white/10">
                        <td colSpan={3} className="px-4 py-6 text-slate-400">
                          {t("common.noData") || "No data"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title={t("inventory.reservations") || "Reservations"}>
              <div className="overflow-auto rounded-2xl border border-white/10">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-white/5 text-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3">{t("inventory.colInternalSerial") || "Internal Serial"}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colManufacturerSerial") || "Manufacturer Serial"}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colPart") || "Part"}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colItemStatus") || "Item Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reservations) && reservations.length > 0 ? (
                      reservations.map((r: any, idx: number) => {
                        const item = r?.part_items;
                        return (
                          <tr key={r.id || r.part_item_id || idx} className="border-t border-white/10">
                            <td className="px-4 py-3 font-mono text-xs text-slate-200">{item?.internal_serial || "—"}</td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-200">{item?.manufacturer_serial || "—"}</td>
                            <td className="px-4 py-3">
                              <div className="text-slate-100">{item?.parts?.name || "—"}</div>
                              <div className="text-xs text-slate-400 font-mono">{shortId(item?.part_id)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge value={item?.status || ""} />
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="border-t border-white/10">
                        <td colSpan={4} className="px-4 py-6 text-slate-400">
                          {t("issues.noReserved") || "No reserved items"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}