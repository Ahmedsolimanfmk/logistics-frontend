"use client";

import { useEffect, useState } from "react";

import { Button } from "@/src/components/ui/Button";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { DataTable } from "@/src/components/ui/DataTable";
import { Toast } from "@/src/components/Toast";

import { categoriesService } from "@/src/services/categories.service";

export default function CategoriesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [toast, setToast] = useState({
    open: false,
    message: "",
    type: "success" as "success" | "error",
  });

  async function load() {
    setLoading(true);
    try {
      const data = await categoriesService.list();
      setRows(data);
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || "Failed to load categories",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) {
      setToast({ open: true, message: "Name required", type: "error" });
      return;
    }

    try {
      await categoriesService.create({
        name: name.trim(),
        code: code.trim() || undefined,
      });

      setName("");
      setCode("");

      await load();

      setToast({ open: true, message: "Created", type: "success" });
    } catch (e: any) {
      setToast({
        open: true,
        message: e?.message || "Create failed",
        type: "error",
      });
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "parts_count", label: "Parts" },
    {
      key: "actions",
      label: "",
      render: (row: any) => (
        <Button
          variant="danger"
          onClick={async () => {
            try {
              await categoriesService.delete(row.id);
              await load();
            } catch (e: any) {
              setToast({
                open: true,
                message: e?.message || "Delete failed",
                type: "error",
              });
            }
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <Toast {...toast} onClose={() => setToast((p) => ({ ...p, open: false }))} />

      <PageHeader title="Part Categories" />

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="border px-3 py-2 rounded"
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code"
          className="border px-3 py-2 rounded"
        />
        <Button onClick={create}>Add</Button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} />
    </div>
  );
}