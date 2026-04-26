"use client";

import { useEffect, useState } from "react";
import { TrexInput } from "@/src/components/ui/TrexInput";
import { TrexSelect } from "@/src/components/ui/TrexSelect";

type InitialData = {
  code?: string | null;
  name?: string | null;
  description?: string | null;
  is_active?: boolean;
};

type Props = {
  title: string;
  initialData?: InitialData | null;
  loading?: boolean;
  saving?: boolean;
  requireCode?: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    code?: string | null;
    name: string;
    description?: string | null;
    is_active?: boolean;
  }) => Promise<void>;
};

export default function SimpleMasterDataForm({
  title,
  initialData,
  loading,
  saving,
  requireCode = true,
  onCancel,
  onSubmit,
}: Props) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    is_active: "true",
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) return;

    setForm({
      code: initialData.code || "",
      name: initialData.name || "",
      description: initialData.description || "",
      is_active: initialData.is_active === false ? "false" : "true",
    });
  }, [initialData]);

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (requireCode && !form.code.trim()) {
      setError("الكود مطلوب");
      return;
    }

    if (!form.name.trim()) {
      setError("الاسم مطلوب");
      return;
    }

    setError(null);

    await onSubmit({
      code: form.code.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active === "true",
    });
  }

  if (loading) {
    return <div className="p-6">جاري التحميل...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">{title}</h1>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded border bg-white p-6"
      >
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
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2 text-sm"
          >
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