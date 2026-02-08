"use client";

import { useEffect, useState } from "react";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

type UserRow = {
  id: string;
  full_name: string;
  email?: string | null;
  role: string;
  is_active: boolean;
};

export default function UsersPage() {
  const role = useAuth((s) => s.user?.role);
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isAdmin = String(role || "").toUpperCase() === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get("/users");
        setItems(res.data?.items || res.data || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-6 text-sm text-red-600">
        You are not allowed to view this page.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Users</h1>

      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.full_name}</td>
                <td className="px-3 py-2">{u.email || "—"}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2">
                  {u.is_active ? "Yes" : "No"}
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-gray-500"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
