"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { contractPricingService } from "@/src/services/contract-pricing.service";

function formatMoney(value: any, currency?: string) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "—";
  return `${num.toLocaleString("ar-EG")} ${currency || "EGP"}`;
}

export default function ContractPricingRuleDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [rule, setRule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRule() {
    try {
      setLoading(true);
      setError(null);

      const res = await contractPricingService.getRuleById(id as string);
      setRule(res);
    } catch (err: any) {
      setError(err?.message || "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadRule();
  }, [id]);

  if (loading) return <div className="p-6">جاري التحميل...</div>;

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!rule) return <div className="p-6">لا توجد بيانات</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">تفاصيل قاعدة التسعير</h1>

        <div className="flex gap-2">
          <button
            onClick={() => router.push("/contract-pricing")}
            className="border px-3 py-2 rounded"
          >
            رجوع
          </button>

          <button
            onClick={() => router.push(`/contract-pricing/${rule.id}/edit`)}
            className="border px-3 py-2 rounded"
          >
            تعديل
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 bg-white p-4 border rounded">
        <Item label="العميل" value={rule.clients?.name} />
        <Item label="العقد" value={rule.client_contracts?.contract_no} />
        <Item
          label="المسار"
          value={
            rule.routes?.name ||
            [rule.routes?.origin_label, rule.routes?.destination_label]
              .filter(Boolean)
              .join(" → ")
          }
        />
        <Item label="فئة المركبة" value={rule.vehicle_classes?.name} />
        <Item label="نوع الحمولة" value={rule.cargo_types?.name} />
        <Item label="نوع الرحلة" value={rule.trip_type} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 bg-white p-4 border rounded">
        <Item label="السعر الأساسي" value={formatMoney(rule.base_price, rule.currency)} />
        <Item label="سعر الطن" value={formatMoney(rule.price_per_ton, rule.currency)} />
        <Item label="سعر الكيلومتر" value={formatMoney(rule.price_per_km, rule.currency)} />
        <Item label="الأولوية" value={rule.priority} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 bg-white p-4 border rounded">
        <Item label="أقل وزن" value={rule.min_weight} />
        <Item label="أقصى وزن" value={rule.max_weight} />
        <Item label="من تاريخ" value={rule.effective_from} />
        <Item label="إلى تاريخ" value={rule.effective_to} />
      </div>

      {rule.notes ? (
        <div className="bg-white p-4 border rounded">
          <h3 className="font-medium mb-2">ملاحظات</h3>
          <p>{rule.notes}</p>
        </div>
      ) : null}

      <div className="bg-white p-4 border rounded">
        <Item
          label="الحالة"
          value={
            <span className={rule.is_active ? "text-green-600" : "text-red-600"}>
              {rule.is_active ? "نشط" : "غير نشط"}
            </span>
          }
        />
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: any }) {
  return (
    <div className="text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium">{value || "—"}</div>
    </div>
  );
}