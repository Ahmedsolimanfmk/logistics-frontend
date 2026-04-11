"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Toast } from "@/src/components/Toast";

import { api } from "@/src/lib/api";
import { categoriesService } from "@/src/services/categories.service";

type PartCategory = {
  id: string;
  name: string;
  code?: string | null;
  is_active?: boolean;
};

function isPartCategory(value: unknown): value is PartCategory {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.name === "string";
}

export default function NewPartPage() {
  const router = useRouter();

  const [partNumber, setPartNumber] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState("");
  const [minStock, setMinStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  useEffect(() => {
    (async () => {
      setBootLoading(true);
      try {
        const rows = await categoriesService.list();
        const safeRows = Array.isArray(rows)
          ? rows.filter(isPartCategory).filter((x) => x.is_active !== false)
          : [];

        setCategories(safeRows);
      } catch (e: any) {
        setToast({
          open: true,
          message:
            e?.response?.data?.message ||
            e?.message ||
            "Failed to load categories",
          type: "error",
        });
      } finally {
        setBootLoading(false);
      }
    })();
  }, []);

  async function onCreate() {
    if (!partNumber.trim()) {
      setToast({ open: true, message: "part_number is required", type: "error" });
      return;
    }

    if (!name.trim()) {
      setToast({ open: true, message: "name is required", type: "error" });
      return;
    }

    if (minStock.trim() && (Number.isNaN(Number(minStock)) || Number(minStock) < 0)) {
      setToast({
        open: true,
        message: "min_stock must be a non-negative number",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/inventory/parts", {
        part_number: partNumber.trim(),
        name: name.trim(),
        brand: brand.trim() || null,
        unit: unit.trim() || null,
        min_stock: minStock.trim() === "" ? null : Number(minStock),
        category_id: categoryId || null,
        is_active: isActive,
      });

      const created = res?.data ?? res;

      setToast({
        open: true,
        message: "Part created successfully",
        type: "success",
      });

      router.push(`/inventory/parts/${created.id}`);
    } catch (e: any) {
      setToast({
        open: true,
        message:
          e?.response?.data?.message || e?.message || "Failed to create part",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Toast
        {...toast}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
      />

      <PageHeader
        title="New Part"
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
            <Button onClick={onCreate} isLoading={loading}>
              Create
            </Button>
          </>
        }
      />

      <Card title="Part Info">
        {bootLoading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-slate-500">Part Number</div>
              <input
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2"
                placeholder="P-1001"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-500">Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2"
                placeholder="Oil Filter"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-500">Brand</div>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2"
                placeholder="Mann"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-500">Unit</div>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2"
                placeholder="pcs"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-500">Min Stock</div>
              <input
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2"
                placeholder="0"
                inputMode="numeric"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-slate-500">Category</div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-black/10 px-3 py-2"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                    {cat.code ? ` — ${cat.code}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}