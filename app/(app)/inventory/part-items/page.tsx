"use client";

import { useEffect, useState } from "react";
import { partItemsService } from "@/src/services/part-items.service";
import type { PartItem } from "@/src/types/part-items.types";

export default function PartItemsPage() {
  const [items, setItems] = useState<PartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await partItemsService.list();
        setItems(data);
      } catch (e: any) {
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load part items"
        );
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Part Items</h1>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p>No items found</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="border p-2 rounded">
              <div className="font-medium">
                {item.name || item.part?.name || "Unnamed Part"}
              </div>
              <div className="text-sm text-gray-500">
                Serial: {item.internal_serial || "-"}
              </div>
              <div className="text-xs text-gray-400">
                Status: {item.status || "-"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}