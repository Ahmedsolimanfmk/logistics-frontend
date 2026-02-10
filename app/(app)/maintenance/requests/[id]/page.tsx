"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";
import { api } from "@/src/lib/api";
import { useT } from "@/src/i18n/useT";

// =====================
// Helpers
// =====================
function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}
function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}
function isAdminOrAccountant(role: any) {
  const rr = roleUpper(role);
  return rr === "ADMIN" || rr === "ACCOUNTANT";
}

// =====================
// UI atoms
// =====================
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition border";
  const styles: Record<string, string> = {
    primary: "bg-white text-black border-white hover:bg-neutral-200",
    secondary: "bg-white/5 text-white border-white/10 hover:bg-white/10",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
    ghost: "bg-transparent text-white border-transparent hover:bg-white/10",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${styles[variant]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {children}
    </button>
  );
}

function Badge({ value }: { value: string }) {
  const v = String(value || "").toUpperCase();
  const cls =
    v === "SUBMITTED"
      ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
      : v === "APPROVED"
      ? "bg-green-500/15 text-green-200 border-green-500/30"
      : v === "REJECTED"
      ? "bg-red-500/15 text-red-200 border-red-500/30"
      : "bg-white/5 text-white border-white/10";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {v}
    </span>
  );
}

// =====================
// Page
// =====================
export default function MaintenanceRequestDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);

  const role = user?.role;
  const canReview = isAdminOrAccountant(role);

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // hydrate
  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get(`/maintenance/requests/${id}`);
      setRow(res?.data || res);
    } catch (e: any) {
      setError(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  if (token === null) {
    return (
      <div className="p-4 text-white">
        {t("common.loadingSession")}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 text-white">
        {t("common.loading")}
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="p-4 text-white">
        {t("common.notFound")}
      </div>
    );
  }

  const status = String(row.status || "").toUpperCase();

  return (
    <div className="space-y-4 p-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white/60">
            {t("mr.details")}
          </div>
          <div className="text-xl font-semibold">
            {row.problem_title}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => router.back()}>
            ← {t("common.back")}
          </Button>
        </div>
      </div>

      {/* Main Info */}
      <Card
        title={t("mr.requestInfo")}
        right={<Badge value={status} />}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-white/60">{t("mr.vehicle")}</div>
            <div className="font-semibold">
              {row.vehicle?.fleet_no
                ? `${row.vehicle.fleet_no} - `
                : ""}
              {row.vehicle?.plate_no || "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-white/60">
              {t("mr.requestedAt")}
            </div>
            <div>{fmtDate(row.requested_at || row.created_at)}</div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/60">
              {t("mr.description")}
            </div>
            <div className="mt-1 whitespace-pre-line text-white/90">
              {row.problem_description || "—"}
            </div>
          </div>

          {status === "REJECTED" && row.rejection_reason ? (
            <div className="md:col-span-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              <strong>{t("mr.rejectionReason")}:</strong>{" "}
              {row.rejection_reason}
            </div>
          ) : null}
        </div>
      </Card>

      {/* Attachments */}
      <Card title={t("mr.attachments")}>
        {row.attachments && row.attachments.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {row.attachments.map((a: any) => (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm hover:bg-white/10"
              >
                {a.type?.startsWith("image") ? "🖼️" : "📎"} {a.name || "file"}
              </a>
            ))}
          </div>
        ) : (
          <div className="text-sm text-white/60">
            {t("mr.noAttachments")}
          </div>
        )}
      </Card>

      {/* Actions */}
      {canReview && status === "SUBMITTED" ? (
        <Card title={t("mr.actions")}>
          <div className="flex gap-2">
            <Button
              variant="primary"
              onClick={async () => {
                await api.post(`/maintenance/requests/${id}/approve`);
                router.push("/maintenance/work-orders");
              }}
            >
              {t("mr.approve")}
            </Button>

            <Button
              variant="danger"
              onClick={async () => {
                const reason = prompt(t("mr.enterRejectReason"));
                if (!reason) return;
                await api.post(`/maintenance/requests/${id}/reject`, {
                  reason,
                });
                load();
              }}
            >
              {t("mr.reject")}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
