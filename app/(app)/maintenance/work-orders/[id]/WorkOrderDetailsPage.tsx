"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/src/store/auth";
import { workOrderDetailsService } from "@/src/services/work-order-details.service";
import maintenanceIssuedPartsService, {
  type IssuedPartRow,
} from "@/src/services/maintenance-issued-parts.service";

import type {
  ReportResponse,
  WorkOrder,
} from "@/src/types/work-order-details.types";

import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Toast } from "@/src/components/Toast";

import { InventoryRequestForm } from "@/src/components/maintenance/InventoryRequestForm";
import InstallationsForm from "@/src/components/maintenance/InstallationsForm";

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-EG");
}

function fmtQty(v: any) {
  const n = Number(v || 0);
  return Number.isInteger(n) ? String(n) : n.toFixed(3);
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (!s) return "—";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function roleUpper(r: any) {
  return String(r || "").toUpperCase();
}

function canManageMaintenance(user: any) {
  const roles = [
    roleUpper(user?.role),
    roleUpper(user?.effective_role),
    roleUpper(user?.platform_role),
  ];

  return roles.some((r) =>
    ["ADMIN", "ACCOUNTANT", "SUPER_ADMIN", "MAINTENANCE_MANAGER"].includes(r)
  );
}

function extractWorkOrder(bundle: any) {
  return (
    bundle?.workOrder ||
    bundle?.work_order ||
    bundle?.order ||
    bundle?.maintenance_work_order ||
    bundle?.data?.workOrder ||
    bundle?.data?.work_order ||
    null
  );
}

function extractReport(bundle: any) {
  return bundle?.report || bundle?.data?.report || bundle || null;
}

function extractQaDb(report: any) {
  return (
    report?.post_report_db ||
    report?.post_report ||
    report?.post_maintenance_report ||
    report?.post_maintenance_reports?.[0] ||
    report?.data?.post_report_db ||
    null
  );
}

export default function WorkOrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

  const token = useAuth((s: any) => s.token);
  const user = useAuth((s: any) => s.user);

  const canManage = canManageMaintenance(user);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [report, setReport] = useState<ReportResponse | any | null>(null);
  const [installations, setInstallations] = useState<any[]>([]);
  const [issuedParts, setIssuedParts] = useState<IssuedPartRow[]>([]);

  const [qaResult, setQaResult] = useState<"PASS" | "FAIL" | "">("");
  const [qaRemarks, setQaRemarks] = useState("");

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    type: "success" | "error";
  }>({
    open: false,
    message: "",
    type: "success",
  });

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ open: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 2500);
  }

  const isCompleted =
    String(workOrder?.status || "").toUpperCase() === "COMPLETED";

  const totalsFromIssuedParts = useMemo(() => {
    const issued = issuedParts.reduce(
      (s, x) => s + Number(x.issued_qty || 0),
      0
    );
    const installed = issuedParts.reduce(
      (s, x) => s + Number(x.installed_qty || 0),
      0
    );
    const remaining = issuedParts.reduce(
      (s, x) => s + Number(x.remaining_qty || 0),
      0
    );

    return { issued, installed, remaining };
  }, [issuedParts]);

  const issuedLinesFromIssuedParts = useMemo(() => {
    return issuedParts.map((x) => ({
      issue_id: (x as any).issue_ids?.[0],
      part_id: x.part_id,
      part: x.part,
      qty: x.issued_qty,
      unit_cost: 0,
      total_cost: 0,
      notes: null,
    }));
  }, [issuedParts]);

  const installationsFromIssuedParts = useMemo(() => {
    return issuedParts.flatMap((x: any) => {
      if (!Array.isArray(x.installations)) return [];

      return x.installations.map((ins: any) => ({
        ...ins,
        part: x.part,
        parts: x.part,
      }));
    });
  }, [issuedParts]);

  const canCloseByIssuedParts =
    issuedParts.length > 0 &&
    issuedParts.every((x) => Number(x.remaining_qty || 0) <= 0);

  const currentQaDb = extractQaDb(report);

  const currentQaResult = String(
    currentQaDb?.road_test_result || qaResult || ""
  ).toUpperCase();

  const hasQaReport =
    currentQaResult === "PASS" || currentQaResult === "FAIL";

  const qaPass = currentQaResult === "PASS";

  const canComplete =
    canManage && !isCompleted && canCloseByIssuedParts && hasQaReport && qaPass;

  const load = useCallback(async () => {
    if (!token || !id) return;

    setLoading(true);
    setError(null);

    try {
      const [bundle, inst, issued] = await Promise.all([
        workOrderDetailsService.getBundle(id),
        workOrderDetailsService.listInstallations(id).catch(() => []),
        maintenanceIssuedPartsService.list({ work_order_id: id }).catch(() => ({
          items: [],
        })),
      ]);

      const nextWorkOrder = extractWorkOrder(bundle);
      const nextReport = extractReport(bundle);
      const nextQaDb = extractQaDb(nextReport);

      setWorkOrder(nextWorkOrder);
      setReport(nextReport);
      setInstallations(Array.isArray(inst) ? inst : []);
      setIssuedParts(Array.isArray(issued.items) ? issued.items : []);

      const result = String(nextQaDb?.road_test_result || "").toUpperCase();

      setQaResult(result === "PASS" || result === "FAIL" ? result : "");
      setQaRemarks(typeof nextQaDb?.remarks === "string" ? nextQaDb.remarks : "");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "فشل في تحميل أمر الشغل";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}

    load();
  }, [load]);

  async function handleSaveQa() {
    if (!id) return;

    if (!canManage) {
      showToast("غير مسموح لهذا المستخدم", "error");
      return;
    }

    if (!qaResult) {
      showToast("اختر نتيجة الاختبار", "error");
      return;
    }

    setActionLoading(true);

    try {
      await workOrderDetailsService.saveQa(id, {
        road_test_result: qaResult,
        remarks: qaRemarks || null,
        checklist_json: null,
      });

      showToast("تم حفظ تقرير ما بعد الصيانة", "success");
      await load();
    } catch (e: any) {
      showToast(e?.response?.data?.message || e?.message || "فشل الحفظ", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (!id) return;

    if (!canComplete) {
      showToast(
        "لا يمكن إغلاق أمر الشغل الآن. تأكد من تركيب كل القطع المصروفة ونجاح تقرير QA.",
        "error"
      );
      return;
    }

    setActionLoading(true);

    try {
      await workOrderDetailsService.complete(id, { notes: null });
      showToast("تم إغلاق أمر الشغل", "success");
      await load();
    } catch (e: any) {
      showToast(
        e?.response?.data?.message || e?.message || "فشل إغلاق أمر الشغل",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateInventoryRequest(workOrderId: string, payload: any) {
    const result = await workOrderDetailsService.createInventoryRequest(
      workOrderId,
      payload
    );

    showToast("تم إنشاء طلب الصرف", "success");
    await load();
    return result;
  }

  async function handleAddInventoryRequestLines(requestId: string, lines: any[]) {
    const result = await workOrderDetailsService.addInventoryRequestLines(
      requestId,
      lines
    );

    showToast("تم حفظ قطع طلب الصرف", "success");
    await load();
    return result;
  }

  async function handleAddInstallations(workOrderId: string, items: any[]) {
    const result = await workOrderDetailsService.addInstallations(workOrderId, {
      items,
    });

    showToast("تم حفظ التركيبات", "success");
    await load();
    return result;
  }

  if (!token) {
    return (
      <div className="p-4" dir="rtl">
        <Card>
          <div className="text-sm text-slate-500">جاري تحميل الجلسة...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" dir="rtl">
      <div className="space-y-4 p-4">
        <PageHeader
          title="تفاصيل أمر الشغل"
          subtitle={`الصيانة / أوامر الشغل / ${shortId(id)}`}
          actions={
            <div className="flex gap-2">
              <Link href="/maintenance/work-orders">
                <Button variant="secondary">رجوع</Button>
              </Link>

              <Button
                variant="secondary"
                onClick={load}
                disabled={loading}
                isLoading={loading}
              >
                تحديث
              </Button>

              <Button
                variant="primary"
                onClick={handleComplete}
                disabled={!canComplete || actionLoading}
                isLoading={actionLoading}
              >
                إغلاق أمر الشغل
              </Button>
            </div>
          }
        />

        {error ? (
          <Card>
            <div className="text-sm text-red-600">{error}</div>
          </Card>
        ) : null}

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">
                أمر شغل #{shortId(workOrder?.id || id)}
              </div>
              <div className="mt-1 text-xs font-mono text-slate-500">
                {workOrder?.id || id}
              </div>
            </div>

            {workOrder?.status ? <StatusBadge status={workOrder.status} /> : null}
          </div>

          {loading ? (
            <div className="mt-3 text-sm text-slate-500">جاري التحميل...</div>
          ) : null}
        </Card>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <KpiCard label="المصروف" value={fmtQty(totalsFromIssuedParts.issued)} />
          <KpiCard
            label="المركب"
            value={fmtQty(totalsFromIssuedParts.installed)}
          />
          <KpiCard
            label="المتبقي للتركيب"
            value={fmtQty(totalsFromIssuedParts.remaining)}
          />
          <KpiCard
            label="حالة الإغلاق"
            value={canComplete ? "جاهز" : isCompleted ? "مغلق" : "غير جاهز"}
          />
        </div>

        {canManage && !isCompleted ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <InventoryRequestForm
              workOrderId={id}
              onCreateRequest={handleCreateInventoryRequest}
              onAddLines={handleAddInventoryRequestLines}
            />

            <InstallationsForm
              workOrderId={id}
              issuedLines={issuedLinesFromIssuedParts}
              installedLines={
                installationsFromIssuedParts.length
                  ? installationsFromIssuedParts
                  : installations
              }
              onAddInstallations={handleAddInstallations}
            />
          </div>
        ) : null}

        {!canManage ? (
          <Card>
            <div className="text-sm text-amber-700">
              هذا المستخدم لا يملك صلاحية إدارة أوامر الشغل.
            </div>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card title="بيانات أمر الشغل">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">النوع:</span>{" "}
                {workOrder?.type || "—"}
              </div>

              <div>
                <span className="text-slate-500">المورد:</span>{" "}
                {(workOrder as any)?.vendor?.name ||
                  workOrder?.vendors?.name ||
                  workOrder?.vendor_name ||
                  "—"}
              </div>

              <div>
                <span className="text-slate-500">تاريخ الفتح:</span>{" "}
                {fmtDate(workOrder?.opened_at)}
              </div>

              <div>
                <span className="text-slate-500">تاريخ البدء:</span>{" "}
                {fmtDate(workOrder?.started_at)}
              </div>

              <div>
                <span className="text-slate-500">تاريخ الإغلاق:</span>{" "}
                {fmtDate(workOrder?.completed_at)}
              </div>

              <div>
                <span className="text-slate-500">العداد:</span>{" "}
                {workOrder?.odometer ?? "—"}
              </div>

              <div>
                <span className="text-slate-500">ملاحظات:</span>{" "}
                {workOrder?.notes || "—"}
              </div>
            </div>
          </Card>

          <Card title="المركبة والتقرير">
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500">المركبة:</span>{" "}
                {(workOrder as any)?.vehicle?.fleet_no ||
                workOrder?.vehicles?.fleet_no
                  ? `${(workOrder as any)?.vehicle?.fleet_no || workOrder?.vehicles?.fleet_no} - `
                  : ""}
                {(workOrder as any)?.vehicle?.plate_no ||
                  workOrder?.vehicles?.plate_no ||
                  (workOrder as any)?.vehicle?.display_name ||
                  workOrder?.vehicles?.display_name ||
                  "—"}
              </div>

              <div>
                <span className="text-slate-500">تقرير QA:</span>{" "}
                <span className={qaPass ? "font-semibold text-green-700" : ""}>
                  {currentQaResult || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500">المتبقي للتركيب:</span>{" "}
                <span
                  className={
                    totalsFromIssuedParts.remaining > 0
                      ? "font-semibold text-amber-700"
                      : "font-semibold text-green-700"
                  }
                >
                  {fmtQty(totalsFromIssuedParts.remaining)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <Card title="القطع المصروفة والمركبة">
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="min-w-[1000px] w-full text-sm">
              <thead className="bg-black/[0.03] text-slate-600">
                <tr>
                  <th className="p-3 text-right">القطعة</th>
                  <th className="p-3 text-right">المخزن</th>
                  <th className="p-3 text-right">مصروف</th>
                  <th className="p-3 text-right">مركب</th>
                  <th className="p-3 text-right">متبقي</th>
                  <th className="p-3 text-right">تاريخ الصرف</th>
                  <th className="p-3 text-right">آخر تركيب</th>
                  <th className="p-3 text-right">الحالة</th>
                </tr>
              </thead>

              <tbody>
                {issuedParts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-3 text-slate-500">
                      لا توجد قطع مصروفة لهذا أمر الشغل بعد.
                    </td>
                  </tr>
                ) : (
                  issuedParts.map((row) => (
                    <tr
                      key={`${row.work_order_id}_${row.part_id}`}
                      className="border-t border-black/10"
                    >
                      <td className="p-3">
                        <div className="font-semibold">
                          {row.part?.name || "—"}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {row.part?.part_number || row.part_id}
                        </div>
                      </td>

                      <td className="p-3">
                        <div>{row.warehouse?.name || "—"}</div>
                        <div className="text-xs text-slate-500">
                          {row.warehouse?.location || ""}
                        </div>
                      </td>

                      <td className="p-3 font-semibold">
                        {fmtQty(row.issued_qty)}
                      </td>

                      <td className="p-3 font-semibold text-green-700">
                        {fmtQty(row.installed_qty)}
                      </td>

                      <td className="p-3 font-semibold text-amber-700">
                        {fmtQty(row.remaining_qty)}
                      </td>

                      <td className="p-3">{fmtDate(row.issued_at)}</td>

                      <td className="p-3">
                        {fmtDate(row.last_installed_at)}
                      </td>

                      <td className="p-3">
                        {row.status === "INSTALLED"
                          ? "مركبة بالكامل"
                          : row.status === "PARTIAL"
                          ? "مركبة جزئيًا"
                          : "غير مركبة"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="تقرير ما بعد الصيانة">
          {!canManage ? (
            <div className="text-sm text-slate-500">
              حفظ التقرير متاح فقط للمدير أو المحاسب أو مدير الصيانة.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-slate-500">
                  نتيجة الاختبار
                </div>
                <select
                  value={qaResult}
                  onChange={(e) => setQaResult(e.target.value as any)}
                  className="trex-input w-full px-3 py-2 text-sm"
                >
                  <option value="">اختر</option>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                </select>
              </div>

              <div>
                <div className="mb-1 text-xs text-slate-500">ملاحظات</div>
                <textarea
                  value={qaRemarks}
                  onChange={(e) => setQaRemarks(e.target.value)}
                  className="trex-input min-h-[90px] w-full px-3 py-2 text-sm"
                  placeholder="اكتب ملاحظات ما بعد الصيانة..."
                />
              </div>

              <Button
                variant="primary"
                onClick={handleSaveQa}
                disabled={actionLoading}
                isLoading={actionLoading}
              >
                حفظ التقرير
              </Button>
            </div>
          )}
        </Card>

        <Toast
          open={toast.open}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        />
      </div>
    </div>
  );
}