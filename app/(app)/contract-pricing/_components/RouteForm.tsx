"use client";

import { useEffect, useState } from "react";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

type Props = {
  title: string;
  initialData?: any;
  loading?: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSubmit: (payload: any) => Promise<void>;
};

export default function RouteForm({
  title,
  initialData,
  loading,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    origin_label: "",
    destination_label: "",
    distance_km: "",
    description: "",
    is_active: "true",
  });

  useEffect(() => {
    if (!initialData) return;

    setForm({
      code: initialData.code || "",
      name: initialData.name || "",
      origin_label: initialData.origin_label || "",
      destination_label: initialData.destination_label || "",
      distance_km: initialData.distance_km ? String(initialData.distance_km) : "",
      description: initialData.description || "",
      is_active: initialData.is_active === false ? "false" : "true",
    });
  }, [initialData]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    await onSubmit({
      code: form.code.trim() || null,
      name: form.name.trim() || null,
      origin_label: form.origin_label.trim() || null,
      destination_label: form.destination_label.trim() || null,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      description: form.description.trim() || null,
      is_active: form.is_active === "true",
    });
  }

  if (loading) return <div className="p-6">جاري التحميل...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">{title}</h1>

      <form onSubmit={handleSubmit} className="space-y-6 rounded border bg-white p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TrexInput
            labelText="الكود"
            value={form.code}
            onChange={(e) => updateField("code", e.target.value)}
          />

          <TrexInput
            labelText="الاسم"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
          />

          <TrexInput
            labelText="نقطة البداية"
            value={form.origin_label}
            onChange={(e) => updateField("origin_label", e.target.value)}
          />

          <TrexInput
            labelText="نقطة النهاية"
            value={form.destination_label}
            onChange={(e) => updateField("destination_label", e.target.value)}
          />

          <TrexInput
            labelText="المسافة كم"
            type="number"
            min="0"
            step="0.01"
            value={form.distance_km}
            onChange={(e) => updateField("distance_km", e.target.value)}
          />

          <TrexSelect
            labelText="الحالة"
            value={form.is_active}
            options={[
              { label: "نشط", value: "true" },
              { label: "غير نشط", value: "false" },
            ]}
            onChange={(value) => updateField("is_active", value)}
          />
        </div>

        <label className="grid gap-2 text-sm">
          <span className="text-gray-600">الوصف</span>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="trex-input min-h-28 w-full px-3 py-2 text-sm"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded border px-4 py-2 text-sm">
            إلغاء
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </form>
    </div>
  );
}