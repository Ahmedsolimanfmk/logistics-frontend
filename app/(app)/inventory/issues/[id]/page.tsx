"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useT } from "@/src/i18n/useT";
import { Toast } from "@/src/components/Toast";
import { getIssue, postIssue, type InventoryIssue } from "@/src/lib/issues.api";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

export default function IssueDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();

  const [loading, setLoading] = useState(false);
  const [row, setRow] = useState<InventoryIssue | null>(null);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" as "success" | "error" });

  const load = async () => {
    setLoading(true);
    try {
      const r = await getIssue(String(id));
      setRow(r);
    } catch (e: any) {
      setToast({ open: true, message: e?.message || t("common.failed"), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = String(row?.status || "").toUpperCase();
  const canPost = status === "DRAFT";

  const badge = (st?: string) => {
    const s = String(st || "").toUpperCase();
    const base = "inline-flex items-center px-2 py-0.5 rounded-lg text-xs border";
    if (s === "DRAFT") return <span className={cn(base, "border-yellow-400/30 text-yellow-200 bg-yellow-400/10")}>{s}</span>;
    if (s === "POSTED") return <span className={cn(base, "border-green-400/30 text-green-200 bg-green-400/10")}>{s}</span>;
    if (s === "CANCELLED") return <span className={cn(base, "border-red-400/30 text-red-200 bg-red-400/10")}>{s}</span>;
    return <span className={cn(base, "border-white/15 text-slate-200 bg-white/5")}>{s || "—"}</span>;
  };

  const lines = useMemo(() => row?.inventory_issue_lines || [], [row]);

  const onPost = async () => {
    if (!row) return;
    setLoading(true);
    try {
      const res = await postIssue(row.id);
      setRow(res.issue);
      setToast({ open: true, message: t("issues.postedOk"), type: "success" });
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.response?.data?.message || e?.message || t("common.failed"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!row) {
    return (
      <div className="p-6">
        <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((p) => ({ ...p, open: false }))} />
        <div className="text-slate-300">{loading ? t("common.loading") : t("common.noData")}</div>
        <button
          onClick={() => router.back()}
          className="mt-4 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
        >
          {t("common.prev")}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl font-bold">{t("issues.detailsTitle")}</div>
          <div className="text-sm text-slate-400 font-mono">{row.id}</div>

          <div className="mt-2 flex items-center gap-2">
            {badge(row.status)}
            <span className="text-xs text-slate-400">{t("issues.createdAt")}: {fmtDate(row.created_at)}</span>
            {row.posted_at && <span className="text-xs text-slate-400">{t("issues.postedAt")}: {fmtDate(row.posted_at)}</span>}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {t("common.prev")}
          </button>

          <button
            onClick={load}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
          >
            {loading ? t("common.loading") : t("common.refresh")}
          </button>

          <button
            onClick={onPost}
            disabled={!canPost || loading}
            className={cn(
              "px-3 py-2 rounded-xl border text-sm",
              !canPost ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed" : "border-white/10 bg-white/10 hover:bg-white/15"
            )}
          >
            {t("issues.post")}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-slate-400">{t("issues.warehouseId")}</div>
            <div className="text-slate-100">{row.warehouses?.name || "—"}</div>
            <div className="text-xs text-slate-400 font-mono">{row.warehouse_id}</div>
          </div>

          <div>
            <div className="text-slate-400">{t("issues.workOrderId")}</div>
            <div className="text-slate-100 font-mono text-xs">{row.work_order_id || "—"}</div>
          </div>

          <div>
            <div className="text-slate-400">{t("issues.requestId")}</div>
            <div className="text-slate-100 font-mono text-xs">{row.request_id || "—"}</div>
          </div>
        </div>

        <div className="mt-3">
          <div className="text-slate-400 text-xs">{t("issues.notes")}</div>
          <div className="text-slate-100 text-sm whitespace-pre-wrap">{row.notes || "—"}</div>
        </div>
      </div>

      {/* Lines */}
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <div className="bg-white/5 px-4 py-3 font-semibold">
          {t("issues.lines")} <span className="text-slate-400 font-normal">({lines.length})</span>
        </div>
        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-white/5 text-slate-200">
              <tr>
                <th className="text-left px-4 py-3">{t("issues.colPart")}</th>
                <th className="text-left px-4 py-3">{t("issues.colPartItemId")}</th>
                <th className="text-left px-4 py-3">{t("issues.colQty")}</th>
                <th className="text-left px-4 py-3">{t("issues.colUnitCost")}</th>
                <th className="text-left px-4 py-3">{t("issues.colTotalCost")}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln) => (
                <tr key={ln.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <div className="text-slate-100">{ln.parts?.name || "—"}</div>
                    <div className="text-xs text-slate-400 font-mono">{ln.part_id}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-200">{ln.part_item_id}</td>
                  <td className="px-4 py-3 text-slate-200">{ln.qty}</td>
                  <td className="px-4 py-3 text-slate-200">{ln.unit_cost ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-200">{ln.total_cost ?? "—"}</td>
                </tr>
              ))}

              {lines.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={5}>
                    {t("common.noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
