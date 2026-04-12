"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/src/components/ui/Button";
import { Card } from "@/src/components/ui/Card";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";

import { receiptsService } from "@/src/services/receipts.service";

export default function PurchaseDetailsClientPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  function showError(msg: string) {
    setToastMsg(msg);
    setToastOpen(true);
  }

  async function load() {
    try {
      setLoading(true);
      const data = await receiptsService.getById(String(id));
      setReceipt(data);
    } catch (e: any) {
      const msg = e?.message || "فشل تحميل البيانات";
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  if (loading) {
    return <div className="p-6">جار التحميل...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">⚠️ {error}</div>;
  }

  if (!receipt) {
    return <div className="p-6">لا يوجد بيانات</div>;
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <PageHeader
        title={`تفاصيل المشتريات`}
        subtitle={`ID: ${receipt.id}`}
        actions={
          <Link href="/finance/purchases">
            <Button variant="secondary">رجوع</Button>
          </Link>
        }
      />

      <Card>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <b>المخزن:</b> {receipt.warehouse?.name || "-"}
          </div>

          <div>
            <b>المورد:</b> {receipt.vendor?.name || "-"}
          </div>

          <div>
            <b>رقم الفاتورة:</b> {receipt.invoice_no || "-"}
          </div>

          <div>
            <b>التاريخ:</b> {receipt.invoice_date || "-"}
          </div>

          <div>
            <b>الإجمالي:</b> {receipt.total_amount || 0}
          </div>

          <div>
            <b>الحالة:</b>{" "}
            <StatusBadge status={receipt.status} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          <h3 className="font-bold">الأصناف</h3>

          {receipt.items?.length ? (
            receipt.items.map((item: any, i: number) => (
              <div
                key={i}
                className="border p-2 rounded-lg flex justify-between text-sm"
              >
                <div>{item.part?.name || "-"}</div>
                <div>Qty: {item.qty}</div>
                <div>Cost: {item.cost}</div>
              </div>
            ))
          ) : (
            <div>لا يوجد أصناف</div>
          )}
        </div>
      </Card>

      <Toast
        open={toastOpen}
        message={toastMsg}
        type="error"
        onClose={() => setToastOpen(false)}
      />
    </div>
  );
}