"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/src/store/auth";
import { workOrderDetailsService } from "@/src/services/work-order-details.service";
import type { ReportResponse, WorkOrder } from "@/src/types/work-order-details.types";

import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { KpiCard } from "@/src/components/ui/KpiCard";
import { Toast } from "@/src/components/Toast";

import { InventoryRequestForm } from "@/src/components/maintenance/InventoryRequestForm";
import { InstallationsForm } from "@/src/components/maintenance/InstallationsForm";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}

function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s || "—";
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
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [installations, setInstallations] = useState<any[]>([]);

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

  const totals = report?.report_runtime?.totals;
  const reportStatus = String(report?.report_status || "");
  const mismatchCounts = totals?.mismatch_counts;

  const mismatchTotal =
    Number(mismatchCounts?.issued_not_installed || 0) +
    Number(mismatchCounts?.installed_not_issued || 0);

  const isCompleted =
    String(workOrder?.status || "").toUpperCase() === "COMPLETED";

  const canComplete = canManage && !isCompleted && reportStatus === "OK";

  const issuedLines = useMemo(() => {
    return report?.report_runtime?.issued?.lines || [];
  }, [report]);

  const runtimeInstallations = useMemo(() => {
    return report?.report_runtime?.installed?.installations || [];
  }, [report]);

  const reconciliation = report?.report_runtime?.reconciliation || {
    matched: [],
    issued_not_installed: [],
    installed_not_issued: [],
  };

  const load = useCallback(async () => {
    if (!token || !id) return;

    setLoading(true);
    setError(null);

    try {
      const bundle = await workOrderDetailsService.getBundle(id);
      const inst = await workOrderDetailsService.listInstallations(id);

      setWorkOrder(bundle.workOrder);
      setReport(bundle.report);
      setInstallations(Array.isArray(inst) ? inst : []);

      const db = bundle.report?.post_report_db;
      const result = String(db?.road_test_result || "").toUpperCase();

      setQaResult(result === "PASS" || result === "FAIL" ? result : "");
      setQaRemarks(typeof db?.remarks === "string" ? db.remarks : "");
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
        "لا يمكن إغلاق أمر الشغل الآن. راجع التقرير والتطابق ونتيجة QA.",
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
          <KpiCard label="تكلفة القطع" value={totals?.parts_cost_total ?? 0} />
          <KpiCard label="تكلفة العمالة" value={totals?.labor_cost ?? 0} />
          <KpiCard label="تكلفة الخدمة" value={totals?.service_cost ?? 0} />
          <KpiCard label="الإجمالي" value={totals?.grand_total ?? 0} />
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
                <span className="text-slate-500">حالة التقرير:</span>{" "}
                <span className="font-semibold">{reportStatus || "—"}</span>
              </div>

              <div>
                <span className="text-slate-500">عدم التطابق:</span>{" "}
                <span
                  className={
                    mismatchTotal > 0
                      ? "font-semibold text-amber-700"
                      : "font-semibold text-green-700"
                  }
                >
                  {mismatchTotal}
                </span>
              </div>

              <div>
                <span className="text-slate-500">مصروفات معتمدة:</span>{" "}
                {totals?.maintenance_cash_cost_total ?? 0}
              </div>
            </div>
          </Card>
        </div>

        <Card title="تطابق القطع المصروفة والمركبة">
          <div className="mb-3 text-xs text-slate-500">
            مطابق: {reconciliation.matched?.length || 0} | مصروف غير مركب:{" "}
            {reconciliation.issued_not_installed?.length || 0} | مركب غير مصروف:{" "}
            {reconciliation.installed_not_issued?.length || 0}
          </div>

          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="min-w-[800px] w-full text-sm">
              <thead className="bg-black/[0.03] text-slate-600">
                <tr>
                  <th className="p-3 text-right">القطعة</th>
                  <th className="p-3 text-right">مصروف</th>
                  <th className="p-3 text-right">مركب</th>
                  <th className="p-3 text-right">التكلفة</th>
                  <th className="p-3 text-right">الحالة</th>
                </tr>
              </thead>

              <tbody>
                {[
                  ...(reconciliation.matched || []).map((x: any) => ({
                    ...x,
                    _status: "مطابق",
                  })),
                  ...(reconciliation.issued_not_installed || []).map((x: any) => ({
                    ...x,
                    _status: "مصروف غير مركب",
                  })),
                  ...(reconciliation.installed_not_issued || []).map((x: any) => ({
                    ...x,
                    _status: "مركب غير مصروف",
                  })),
                ].length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-slate-500">
                      لا توجد بيانات تطابق.
                    </td>
                  </tr>
                ) : (
                  [
                    ...(reconciliation.matched || []).map((x: any) => ({
                      ...x,
                      _status: "مطابق",
                    })),
                    ...(reconciliation.issued_not_installed || []).map((x: any) => ({
                      ...x,
                      _status: "مصروف غير مركب",
                    })),
                    ...(reconciliation.installed_not_issued || []).map((x: any) => ({
                      ...x,
                      _status: "مركب غير مصروف",
                    })),
                  ].map((row: any, idx: number) => (
                    <tr
                      key={`${row.part_id}_${idx}`}
                      className="border-t border-black/10"
                    >
                      <td className="p-3">
                        <div className="font-semibold">
                          {row?.part?.name || "—"}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {shortId(row.part_id)}
                        </div>
                      </td>
                      <td className="p-3">{row.issued_qty ?? "—"}</td>
                      <td className="p-3">{row.installed_qty ?? "—"}</td>
                      <td className="p-3">{row.issued_cost ?? "—"}</td>
                      <td className="p-3">{row._status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="القطع المصروفة">
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="min-w-[800px] w-full text-sm">
              <thead className="bg-black/[0.03] text-slate-600">
                <tr>
                  <th className="p-3 text-right">القطعة</th>
                  <th className="p-3 text-right">الكمية</th>
                  <th className="p-3 text-right">تكلفة الوحدة</th>
                  <th className="p-3 text-right">الإجمالي</th>
                  <th className="p-3 text-right">ملاحظات</th>
                </tr>
              </thead>

              <tbody>
                {issuedLines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-slate-500">
                      لا توجد قطع مصروفة.
                    </td>
                  </tr>
                ) : (
                  issuedLines.map((line: any, idx: number) => (
                    <tr
                      key={`${line.issue_id}_${line.part_id}_${idx}`}
                      className="border-t border-black/10"
                    >
                      <td className="p-3">
                        <div className="font-semibold">
                          {line?.part?.name || "—"}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {shortId(line.part_id)}
                        </div>
                      </td>
                      <td className="p-3">{line.qty}</td>
                      <td className="p-3">{line.unit_cost}</td>
                      <td className="p-3">{line.total_cost}</td>
                      <td className="p-3">{line.notes || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="التركيبات">
          <div className="overflow-auto rounded-xl border border-black/10">
            <table className="min-w-[800px] w-full text-sm">
              <thead className="bg-black/[0.03] text-slate-600">
                <tr>
                  <th className="p-3 text-right">تاريخ التركيب</th>
                  <th className="p-3 text-right">القطعة</th>
                  <th className="p-3 text-right">الكمية</th>
                  <th className="p-3 text-right">العداد</th>
                  <th className="p-3 text-right">ملاحظات</th>
                </tr>
              </thead>

              <tbody>
                {(installations.length ? installations : runtimeInstallations)
                  .length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-slate-500">
                      لا توجد تركيبات.
                    </td>
                  </tr>
                ) : (
                  (installations.length ? installations : runtimeInstallations).map(
                    (item: any, idx: number) => (
                      <tr
                        key={`${item.id}_${idx}`}
                        className="border-t border-black/10"
                      >
                        <td className="p-3">{fmtDate(item.installed_at)}</td>
                        <td className="p-3">
                          <div className="font-semibold">
                            {item?.part?.name ||
                              item?.parts?.name ||
                              item?.part_name ||
                              "—"}
                          </div>
                          <div className="font-mono text-xs text-slate-500">
                            {shortId(item.part_id)}
                          </div>
                        </td>
                        <td className="p-3">{item.qty_installed}</td>
                        <td className="p-3">
                          {item.odometer_at_install ?? "—"}
                        </td>
                        <td className="p-3">{item.notes || "—"}</td>
                      </tr>
                    )
                  )
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