"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { DataTable } from "@/src/components/ui/DataTable";
import { Button } from "@/src/components/ui/Button";
import { fuelService, FuelWalletRecharge } from "@/src/services/fuel.service";

export default function FuelRechargesAdminPage() {
  const [recharges, setRecharges] = useState<FuelWalletRecharge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecharges = async () => {
    try {
      setLoading(true);
      const data = await fuelService.listAllRecharges();
      setRecharges(data);
    } catch (e: any) {
      alert("Error loading recharges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecharges();
  }, []);

  const handleApprove = async (id: string) => {
    if (!confirm("هل أنت متأكد من الموافقة على شحن المحفظة؟ سيتم إضافة الرصيد للشركة فوراً.")) return;
    try {
      await fuelService.approveRecharge(id);
      fetchRecharges();
    } catch (e: any) {
      alert(e.response?.data?.message || "Error approving recharge");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("هل أنت متأكد من رفض عملية الشحن؟")) return;
    try {
      await fuelService.rejectRecharge(id);
      fetchRecharges();
    } catch (e: any) {
      alert("Error rejecting recharge");
    }
  };

  const columns = [
    { key: "company.name", label: "الشركة", render: (r: any) => r.company?.name || "-" },
    { key: "amount", label: "المبلغ", render: (r: any) => <strong className="text-emerald-600">{r.amount} ج.م</strong> },
    { key: "payment_method", label: "طريقة الدفع" },
    { key: "reference", label: "رقم المرجع" },
    { 
      key: "status", 
      label: "الحالة",
      render: (r: any) => {
        if (r.status === 'PENDING') return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">قيد المراجعة</span>;
        if (r.status === 'APPROVED') return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-sm">تم الموافقة</span>;
        if (r.status === 'REJECTED') return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">مرفوض</span>;
        return r.status;
      }
    },
    { key: "created_at", label: "التاريخ", render: (r: any) => new Date(r.created_at).toLocaleString('ar-EG') },
    {
      key: "actions",
      label: "إجراءات",
      render: (r: any) => r.status === 'PENDING' ? (
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => handleApprove(r.id)}>موافقة</Button>
          <Button variant="danger" onClick={() => handleReject(r.id)}>رفض</Button>
        </div>
      ) : null
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="طلبات شحن محافظ الوقود"
        subtitle="مراجعة الحوالات البنكية من الشركات والموافقة عليها لشحن محافظهم"
      />

      <Card>
        {loading ? (
          <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
        ) : (
          <DataTable columns={columns} rows={recharges} />
        )}
      </Card>
    </div>
  );
}
