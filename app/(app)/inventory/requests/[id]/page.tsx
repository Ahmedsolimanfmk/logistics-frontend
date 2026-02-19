"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { api, unwrapItems } from "@/src/lib/api";
import {
  // لو الدوال دي عندك استخدمها
  // getInventoryRequest,
  // approveInventoryRequest,
  // rejectInventoryRequest,
  // unreserveInventoryRequest,
  type InventoryRequest,
} from "@/src/lib/inventory.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
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

// =====================
// Flexible API helpers (بدون افتراض أسماء ثابتة للـ endpoints)
// =====================
async function tryPost(paths: string[], body: any) {
  let lastErr: any = null;
  for (const p of paths) {
    try {
      const res: any = await api.post(p, body);
      return res;
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Request failed");
}

async function tryGet(paths: string[]) {
  let lastErr: any = null;
  for (const p of paths) {
    try {
      const res: any = await api.get(p);
      return res;
    } catch (e: any) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Request failed");
}

function extractRequest(res: any): InventoryRequest | null {
  // أشكال محتملة:
  // { request: {...} } | { data: { request } } | {...request fields...}
  const r =
    res?.request ||
    res?.data?.request ||
    res?.data?.data?.request ||
    res?.data ||
    res;
  if (r && typeof r === "object" && r.id) return r as InventoryRequest;
  return null;
}

function extractIssueId(res: any): string | null {
  // أشكال محتملة:
  // { issue: { id } } | { data: { issue } } | { issue_id } | { id }
  return (
    res?.issue?.id ||
    res?.data?.issue?.id ||
    res?.issue_id ||
    res?.data?.issue_id ||
    res?.id ||
    res?.data?.id ||
    null
  );
}

type ReservationRow = {
  id?: string;
  part_item_id?: string;
  internal_serial?: string;
  manufacturer_serial?: string;
  status?: string;
  part_id?: string;
  part?: any;
};

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

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      // endpoints محتملة
      const res = await tryGet([
        `/inventory/requests/${id}`,
        `/inventory/requests/${id}/details`,
        `/inventory/request/${id}`,
      ]);

      const r = extractRequest(res);
      setReq(r);
    } catch (e: any) {
      setReq(null);
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const statusUpper = String(req?.status || "").toUpperCase();
  const lines = useMemo(() => (req as any)?.lines || [], [req]);
  const reservations: ReservationRow[] = useMemo(
    () => (req as any)?.reservations || (req as any)?.reserved_items || [],
    [req]
  );

  const workOrderId = (req as any)?.work_order_id || fromWo || "";

  // =====================
  // Actions
  // =====================
  async function approveAndReserve() {
    if (!id) return;
    setBusy("approve");
    try {
      await tryPost(
        [
          `/inventory/requests/${id}/approve`, // الأشيع
          `/inventory/requests/${id}/approve-reserve`,
          `/inventory/requests/${id}/reserve`,
        ],
        { notes: notes || null }
      );

      setToast({ open: true, message: t("inventory.approvedOk"), type: "success" });
      await load();
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!id) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setToast({ open: true, message: t("inventory.rejectPrompt"), type: "error" });
      return;
    }
    setBusy("reject");
    try {
      await tryPost(
        [
          `/inventory/requests/${id}/reject`,
          `/inventory/requests/${id}/deny`,
        ],
        { reason }
      );

      setToast({ open: true, message: t("inventory.rejectedOk"), type: "success" });
      setRejectReason("");
      await load();
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function unreserve() {
    if (!id) return;
    setBusy("unreserve");
    try {
      const res = await tryPost(
        [
          `/inventory/requests/${id}/unreserve`,
          `/inventory/requests/${id}/cancel-reserve`,
        ],
        { notes: notes || null }
      );

      // لو رجّع عدد
      const n =
        res?.unreserved_count ||
        res?.data?.unreserved_count ||
        res?.count ||
        res?.data?.count ||
        null;

      const msg = n ? t("inventory.unreservedOk", { n }) : t("common.save");
      setToast({ open: true, message: msg, type: "success" });
      await load();
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function createIssueDraftFromRequest() {
    if (!id) return;

    setBusy("createIssue");
    try {
      // endpoints محتملة لإنشاء Issue Draft من Request
      const res = await tryPost(
        [
          `/inventory/requests/${id}/issues`, // ✅ الأفضل
          `/inventory/requests/${id}/issue`,
          `/inventory/issues`, // fallback: body فيها request_id
        ],
        // fallback body:
        { request_id: id, notes: notes || null }
      );

      const issueId = extractIssueId(res);
      setCreatedIssueId(issueId);

      setToast({ open: true, message: t("issues.createdOk"), type: "success" });

      // افتح تفاصيل الإذن لو عرفنا id
      if (issueId) {
        router.push(`/inventory/issues/${issueId}`);
      }
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function postIssue(issueId: string) {
    setBusy("postIssue");
    try {
      await tryPost(
        [
          `/inventory/issues/${issueId}/post`,
          `/inventory/issues/${issueId}/posted`,
        ],
        { notes: notes || null }
      );
      setToast({ open: true, message: t("issues.postedOk"), type: "success" });
      await load();
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setBusy(null);
    }
  }

  // =====================
  // Render
  // =====================
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
          <div className="text-sm text-slate-400">{t("inventory.requestsTitle")}</div>
          <div className="text-xl font-bold">{t("inventory.requestDetailsTitle")}</div>
          <div className="mt-1 text-xs text-slate-400 font-mono">
            ID: {id ? shortId(id) : "—"} {workOrderId ? ` • work_order_id: ${shortId(workOrderId)}` : ""}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/inventory/requests"
            className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            ← {t("common.back")}
          </Link>
          <button
            onClick={load}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>
        </div>
      </div>

      <Card
        title={`${t("inventory.requestDetailsTitle")} #${shortId(id)}`}
        right={<Badge value={req?.status as any} />}
      >
        {loading ? (
          <div className="text-sm text-slate-300">{t("common.loading")}</div>
        ) : !req ? (
          <div className="text-sm text-slate-300">{t("common.notFound")}</div>
        ) : (
          <div className="space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("inventory.createdAt")}</div>
                <div className="text-sm">{fmtDate((req as any).created_at)}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("inventory.warehouse")}</div>
                <div className="text-sm">{(req as any)?.warehouses?.name || "—"}</div>
                <div className="text-xs text-slate-400 font-mono">{shortId((req as any)?.warehouse_id)}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400">{t("inventory.workOrderId")}</div>
                <div className="text-sm font-mono">{workOrderId ? shortId(workOrderId) : "—"}</div>
                {workOrderId ? (
                  <Link
                    className="mt-2 inline-flex text-xs underline text-slate-200"
                    href={`/maintenance/work-orders/${workOrderId}`}
                  >
                    Open Work Order →
                  </Link>
                ) : null}
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400 mb-1">{t("inventory.notes")}</div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("common.optional")}
                  className="w-full min-h-[90px] rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                />
                <div className="mt-1 text-[11px] text-slate-400">
                  {t("issues.notesPh")}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-1">{t("inventory.rejectPrompt")}</div>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t("inventory.rejectPrompt")}
                  className="w-full min-h-[90px] rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                />
                <div className="mt-1 text-[11px] text-slate-400">{t("inventory.rejectPrompt")}</div>
              </div>
            </div>

            {/* Actions Hub */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold mb-3">{t("common.actions")}</div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={busy !== null || statusUpper !== "PENDING"}
                  onClick={approveAndReserve}
                >
                  {busy === "approve" ? t("common.saving") : t("inventory.approve")}
                </Button>

                <Button
                  variant="danger"
                  disabled={busy !== null || statusUpper !== "PENDING"}
                  onClick={reject}
                >
                  {busy === "reject" ? t("common.saving") : t("inventory.reject")}
                </Button>

                <Button
                  variant="secondary"
                  disabled={busy !== null || (statusUpper !== "APPROVED" && statusUpper !== "ISSUED")}
                  onClick={unreserve}
                >
                  {busy === "unreserve" ? t("common.saving") : t("inventory.unreserve")}
                </Button>

                <div className="w-full h-px bg-white/10 my-2" />

                <Button
                  variant="secondary"
                  disabled={busy !== null || statusUpper !== "APPROVED"}
                  onClick={createIssueDraftFromRequest}
                >
                  {busy === "createIssue" ? t("common.saving") : t("inventory.createIssue")}
                </Button>

                <Link
                  href={`/inventory/issues?request_id=${encodeURIComponent(id || "")}`}
                  className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                >
                  {t("issues.title")} →
                </Link>

                {createdIssueId ? (
                  <>
                    <Link
                      href={`/inventory/issues/${createdIssueId}`}
                      className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                    >
                      Open Issue #{shortId(createdIssueId)}
                    </Link>

                    <Button
                      variant="primary"
                      disabled={busy !== null}
                      onClick={() => postIssue(createdIssueId)}
                    >
                      {busy === "postIssue" ? t("common.saving") : t("issues.post")}
                    </Button>
                  </>
                ) : null}
              </div>

              {statusUpper !== "PENDING" ? (
                <div className="mt-3 text-xs text-slate-300">
                  ℹ️ الحالة الحالية: <span className="font-semibold">{statusUpper}</span>
                </div>
              ) : null}
            </div>

            {/* Lines */}
            <Card title={t("inventory.lines")}>
              <div className="overflow-auto rounded-2xl border border-white/10">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-white/5 text-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3">{t("inventory.colPart")}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colNeededQty")}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colLineNotes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(lines) && lines.length > 0 ? (
                      lines.map((l: any, idx: number) => (
                        <tr key={l.id || idx} className="border-t border-white/10">
                          <td className="px-4 py-3">
                            <div className="text-slate-100 font-semibold">{l?.part?.name || "—"}</div>
                            <div className="text-xs text-slate-400 font-mono">{shortId(l?.part_id)}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-200">{l?.needed_qty ?? l?.qty ?? 0}</td>
                          <td className="px-4 py-3 text-slate-300">{l?.notes || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-white/10">
                        <td colSpan={3} className="px-4 py-6 text-slate-400">
                          {t("common.noData")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Reservations */}
            <Card title={t("inventory.reservations")}>
              <div className="overflow-auto rounded-2xl border border-white/10">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-white/5 text-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3">{t("inventory.colInternalSerial")}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colManufacturerSerial")}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colPart")}</th>
                      <th className="text-left px-4 py-3">{t("inventory.colItemStatus")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(reservations) && reservations.length > 0 ? (
                      reservations.map((x: any, idx: number) => (
                        <tr key={x.id || x.part_item_id || idx} className="border-t border-white/10">
                          <td className="px-4 py-3 font-mono text-xs text-slate-200">{x?.internal_serial || "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-200">{x?.manufacturer_serial || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="text-slate-100">{x?.part?.name || x?.parts?.name || "—"}</div>
                            <div className="text-xs text-slate-400 font-mono">{shortId(x?.part_id)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge value={x?.status || ""} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-white/10">
                        <td colSpan={4} className="px-4 py-6 text-slate-400">
                          {t("issues.noReserved")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Quick links */}
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/inventory/issues/new?request_id=${encodeURIComponent(id || "")}&warehouse_id=${encodeURIComponent(
                  (req as any)?.warehouse_id || ""
                )}&work_order_id=${encodeURIComponent(workOrderId || "")}`}
                className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                {t("issues.new")} →
              </Link>

              <Link
                href={`/inventory/part-items?warehouse_id=${encodeURIComponent((req as any)?.warehouse_id || "")}`}
                className="inline-flex px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
              >
                {t("partItems.title")} →
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
