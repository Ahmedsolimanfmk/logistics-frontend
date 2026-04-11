"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Card } from "@/src/components/ui/Card";
import { Toast } from "@/src/components/Toast";

import { api, unwrapItems } from "@/src/lib/api";
import { categoriesService } from "@/src/services/categories.service";

type PartCategory = {
  id: string;
  name: string;
  code?: string | null;
  is_active?: boolean;
};

type PartRow = {
  id: string;
  part_number?: string | null;
  name?: string | null;
  brand?: string | null;
  unit?: string | null;
  min_stock?: number | null;
  is_active?: boolean | null;
  category_id?: string | null;
  category?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  category_legacy?: string | null;
};

function isPartCategory(value: unknown): value is PartCategory {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.name === "string";
}

function findPartFromResponse(body: any, id: string): PartRow | null {
  const direct = body?.data ?? body;
  if (direct && !Array.isArray(direct) && direct?.id === id) {
    return direct as PartRow;
  }

  const items = unwrapItems(body);
  const found = items.find((x: any) => x?.id === id);
  return found || null;
}

export default function EditPartPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");

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
      if (!id) return;

      setBootLoading(true);
      try {
        const [cats, partsRes] = await Promise.all([
          categoriesService.list(),
          api.get("/inventory/parts"),
        ]);

        const safeCats = Array.isArray(cats)
          ? cats.filter(isPartCategory).filter((x) => x.is_active !== false)
          : [];
        setCategories(safeCats);

        const part = findPartFromResponse(partsRes?.data ?? partsRes, id);

        if (!part) {
          setToast({
            open: true,
            message: "Part not found",
            type: "error",
          });
          return;
        }

        setPartNumber(String(part.part_number || ""));
        setName(String(part.name || ""));
        setBrand(String(part.brand || ""));
        setUnit(String(part.unit || ""));
        setMinStock(
          part.min_stock == null || part.min_stock === undefined
            ? ""
            : String(part.min_stock)
        );
        setCategoryId(String(part.category_id || ""));
        setIsActive(Boolean(part.is_active));
      } catch (e: any) {
        setToast({
          open: true,
          message:
            e?.response?.data?.message ||
            e?.message ||
            "Failed to load part",
          type: "error",
        });
      } finally {
        setBootLoading(false);
      }
    })();
  }, [id]);

  async function onSave() {
    if (!id) return;

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
      await api.patch(`/inventory/parts/${id}`, {
        part_number: partNumber.trim(),
        name: name.trim(),
        brand: brand.trim() || null,
        unit: unit.trim() || null,
        min_stock: minStock.trim() === "" ? null : Number(minStock),
        category_id: categoryId || null,
        is_active: isActive,
      });

      setToast({
        open: true,
        message: "Part updated successfully",
        type: "success",
      });
    } catch (e: any) {
      setToast({
        open: true,
        message:
          e?.response?.data?.message || e?.message || "Failed to update part",
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
        title="Edit Part"
        actions={
          <>
            <Button variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
            <Button onClick={onSave} isLoading={loading}>
              Save
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