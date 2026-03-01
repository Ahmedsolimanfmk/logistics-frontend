"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { useT } from "@/src/i18n/useT";
import { api } from "@/src/lib/api";

// ✅ Design System
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Toast } from "@/src/components/Toast";

type MaintenanceRequest = {
  id: string;
  vehicle_id: string;
  problem_title: string;
  problem_description?: string | null;
  status: string;
  requested_at?: string | null;
  requested_by?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

export default function MaintenanceRequestDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const t = useT();
  const { token, user } = useAuth() as any;

  const [data, setData] = useState<MaintenanceRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type?: "success" | "error";
  }>({ open: false, message: "", type: "error" });

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const isAdmin =
    String(user?.role || "").toUpperCase() === "ADMIN" ||
    String(user?.role || "").toUpperCase() === "ACCOUNTANT";

  async function load() {
    if (!token || !id) return;

    setLoading(true);
    try {
      const res: any = await api.get(`/maintenance/requests/${id}`);
      setData(res?.data || res);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || "Failed to load request",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [token, id]);

  async function handleApprove() {
    if (!data) return;

    try {
      const res: any = await api.post(
        `/maintenance/requests/${data.id}/approve`,
        {
          type: "CORRECTIVE",
        }
      );

      const woId =
        res?.work_order?.id ||
        res?.data?.work_order?.id ||
        res?.work_order_id ||
        res?.id;

      setApproveOpen(false);
      setToast({ open: true, message: "Approved successfully", type: "success" });

      if (woId) {
        router.push(`/maintenance/work-orders/${woId}`);
      } else {
        load();
      }
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || "Approve failed",
        type: "error",
      });
    }
  }

  async function handleReject() {
    if (!data) return;
    if (rejectReason.trim().length < 2) {
      setToast({ open: true, message: "سبب الرفض مطلوب", type: "error" });
      return;
    }

    try {
      await api.post(`/maintenance/requests/${data.id}/reject`, {
        reason: rejectReason.trim(),
      });

      setRejectOpen(false);
      setToast({ open: true, message: "Rejected", type: "success" });
      load();
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || "Reject failed",
        type: "error",
      });
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <Card>
          <div className="text-sm opacity-60">
            {t("common.loading") || "Loading…"}
          </div>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4 p-4">
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        dir="rtl"
        onClose={() => setToast((x) => ({ ...x, open: false }))}
      />

      <PageHeader
        title={t("maintenanceRequests.detailsTitle") || "Maintenance Request"}
        subtitle={`ID: ${data.id}`}
        actions={
          isAdmin && data.status === "SUBMITTED" ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setApproveOpen(true)}>
                {t("maintenanceRequests.actions.approve") || "Approve"}
              </Button>
              <Button variant="danger" onClick={() => setRejectOpen(true)}>
                {t("maintenanceRequests.actions.reject") || "Reject"}
              </Button>
            </div>
          ) : undefined
        }
      />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="opacity-60">Status</div>
            <StatusBadge status={data.status} />
          </div>

          <div>
            <div className="opacity-60">Requested At</div>
            <div>{fmtDate(data.requested_at)}</div>
          </div>

          <div>
            <div className="opacity-60">Vehicle</div>
            <div className="font-mono">{data.vehicle_id}</div>
          </div>

          <div>
            <div className="opacity-60">Requested By</div>
            <div>{data.requested_by || "—"}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="opacity-60 text-sm mb-1">Problem</div>
          <div className="font-medium">{data.problem_title}</div>
          {data.problem_description && (
            <div className="mt-2 text-sm opacity-70">
              {data.problem_description}
            </div>
          )}
        </div>

        {data.status === "REJECTED" && data.rejection_reason && (
          <div className="mt-6 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            سبب الرفض: {data.rejection_reason}
          </div>
        )}
      </Card>

      {/* Approve Dialog */}
      <ConfirmDialog
        open={approveOpen}
        title="Confirm Approval"
        description="سيتم إنشاء Work Order تلقائيًا."
        confirmText="Approve"
        cancelText="Cancel"
        tone="info"
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />

      {/* Reject Dialog */}
      <ConfirmDialog
        open={rejectOpen}
        title="Reject Request"
        description={
          <div className="space-y-3">
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="سبب الرفض..."
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
        }
        confirmText="Reject"
        cancelText="Cancel"
        tone="danger"
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />
    </div>
  );
}