"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { vehiclesService } from "@/src/services/vehicles.service";
import type { Vehicle } from "@/src/types/vehicles.types";

import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { StatusBadge } from "@/src/components/ui/StatusBadge";
import { Toast } from "@/src/components/Toast";

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ar-EG");
}

export default function VehicleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  function showToast(type: "success" | "error", msg: string) {
    setToast({ open: true, message: msg, type });
  }

  async function load() {
    try {
      setLoading(true);
      const res = await vehiclesService.getSummary(id);
      setVehicle(res.vehicle);
    } catch (e: any) {
      showToast("error", e?.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <Card>جار التحميل...</Card>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-6">
        <Card>لا يوجد بيانات</Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <Toast
        {...toast}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title="تفاصيل المركبة"
        subtitle={vehicle.display_name || vehicle.fleet_no}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.back()}>
              رجوع
            </Button>

            <Button
              variant="primary"
              onClick={() => router.push(`/vehicles`)}
            >
              القائمة
            </Button>
          </div>
        }
      />

      <Card title="بيانات أساسية">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-gray-500">Fleet No</div>
            <div>{vehicle.fleet_no}</div>
          </div>

          <div>
            <div className="text-gray-500">Plate</div>
            <div>{vehicle.plate_no}</div>
          </div>

          <div>
            <div className="text-gray-500">Status</div>
            <StatusBadge status={vehicle.status || "AVAILABLE"} />
          </div>

          <div>
            <div className="text-gray-500">Active</div>
            <StatusBadge status={vehicle.is_active ? "ACTIVE" : "INACTIVE"} />
          </div>

          <div>
            <div className="text-gray-500">Model</div>
            <div>{vehicle.model || "—"}</div>
          </div>

          <div>
            <div className="text-gray-500">Year</div>
            <div>{vehicle.year || "—"}</div>
          </div>
        </div>
      </Card>

      <Card title="الرخصة">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-gray-500">رقم الرخصة</div>
            <div>{vehicle.license_no || "—"}</div>
          </div>

          <div>
            <div className="text-gray-500">تاريخ الإصدار</div>
            <div>{fmtDate(vehicle.license_issue_date)}</div>
          </div>

          <div>
            <div className="text-gray-500">تاريخ الانتهاء</div>
            <div>{fmtDate(vehicle.license_expiry_date)}</div>
          </div>
        </div>
      </Card>

      <Card title="بيانات إضافية">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-gray-500">Odometer</div>
            <div>{vehicle.current_odometer || "—"}</div>
          </div>

          <div>
            <div className="text-gray-500">GPS</div>
            <div>{vehicle.gps_device_id || "—"}</div>
          </div>

          <div>
            <div className="text-gray-500">Created</div>
            <div>{fmtDate(vehicle.created_at)}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}