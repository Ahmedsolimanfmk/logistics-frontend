"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/store/auth";
import { useSearchParams, useRouter } from "next/navigation";

function cn(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("ar-EG");
}
function shortId(id: any) {
  const s = String(id ?? "");
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}
function roleUpper(r: any) {
  return String(r || "").trim().toUpperCase(); // ✅ trim
}
function isAdminOrAccountant(role: any) {
  const rr = roleUpper(role);
  return rr === "ADMIN" || rr === "ACCOUNTANT";
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";

async function apiFetch<T>(
  path: string,
  opts: { method?: string; token?: string | null; body?: any; query?: Record<string, any> } = {}
): Promise<T> {
  const { method = "GET", token, body, query } = opts;
  const url = new URL(path.startsWith("http") ? path : `${API_BASE}${path}`);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const txt = await res.text();
  let json: any = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {
    json = { message: txt || "Unknown response" };
  }

  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return json as T;
}

// UI atoms
function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}
function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition border";
  const styles: Record<string, string> = {
    primary: "bg-white text-black border-white hover:bg-neutral-200",
    secondary: "bg-white/5 text-white border-white/10 hover:bg-white/10",
    danger: "bg-red-600 text-white border-red-600 hover:bg-red-700",
    ghost: "bg-transparent text-white border-transparent hover:bg-white/10",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(base, styles[variant], disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
}

function Badge({ value }: { value: string }) {
  const v = String(value || "").toUpperCase();
  const cls =
    v === "OPEN" || v === "IN_PROGRESS"
      ? "bg-yellow-500/15 text-yellow-200 border-yellow-500/30"
      : v === "COMPLETED"
      ? "bg-green-500/15 text-green-200 border-green-500/30"
      : v === "CANCELED"
      ? "bg-red-500/15 text-red-200 border-red-500/30"
      : "bg-white/5 text-white border-white/10";
  return <span className={cn("rounded-full border px-2 py-0.5 text-xs", cls)}>{v}</span>;
}

// ✅ select styling fix (dark dropdown)
const selectCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none text-white";
const optionCls = "bg-neutral-900 text-white";

function statusLabel(v: string) {
  const s = String(v || "").toUpperCase();
  if (!s) return "All";
  return s.replace(/_/g, " ");
}

type WorkOrderRow = {
  id: string;
  status: string;
  type: string;
  vendor_name?: string | null;
  opened_at?: string | null;
  completed_at?: string | null;
  vehicle_id?: string | null;
  vehicles?: {
    id: string;
    plate_no?: string | null;
    fleet_no?: string | null;
    display_name?: string | null;
    status?: string | null;
  } | null;
};

type ListResponse = {
  page: number;
  limit: number;
  total: number;
  items: WorkOrderRow[];
};

export default function WorkOrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);

  // ✅ hydrate (زي الداشبورد)
  useEffect(() => {
    try {
      (useAuth as any).getState?.().hydrate?.();
    } catch {}
  }, []);

  const role = user?.role;
  const canSee = isAdminOrAccountant(role);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WorkOrderRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // ✅ read from URL
  const initialStatus = searchParams.get("status") || "";
  const initialQ = searchParams.get("q") || "";
  const initialQa = searchParams.get("qa") || ""; // needs | failed
  const initialParts = searchParams.get("parts") || ""; // mismatch

  const [status, setStatus] = useState<string>(initialStatus);
  const [q, setQ] = useState<string>(initialQ);
  const [qa, setQa] = useState<string>(initialQa);
  const [parts, setParts] = useState<string>(initialParts);

  // ✅ لو الـ URL اتغير (بسبب كروت الداشبورد) نحدث state
  useEffect(() => {
    setStatus(initialStatus);
    setQ(initialQ);
    setQa(initialQa);
    setParts(initialParts);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStatus, initialQ, initialQa, initialParts]);

  async function load(p = page) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch<ListResponse>("/maintenance/work-orders", {
        token,
        query: {
          page: p,
          limit,
          status, // ممكن تكون "OPEN,IN_PROGRESS"
          q,
          qa,     // ✅ passthrough
          parts,  // ✅ passthrough
        },
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setPage(res.page || p);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status, qa, parts]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // ✅ لو التوكن لسه null (قبل الهيدريت) ما نحكمش على الصلاحيات
  if (token === null) {
    return (
      <div className="p-4 text-white">
        <Card title="Work Orders">
          <div className="text-sm text-white/70">Loading session…</div>
        </Card>
      </div>
    );
  }

  if (!canSee) {
    return (
      <div className="p-4 text-white">
        <Card title="Work Orders">
          <div className="text-sm text-white/70">
            هذه الصفحة متاحة فقط لـ ADMIN / ACCOUNTANT.
            <div className="mt-2 text-xs text-white/50">role = {String(role ?? "—")}</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-white/70">Maintenance</div>
          <div className="text-xl font-semibold">Work Orders</div>
          <div className="text-xs text-white/50">
            Filters from URL: status={statusLabel(status)} • qa={qa || "—"} • parts={parts || "—"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/maintenance/requests">
            <Button variant="secondary">← Back to Requests</Button>
          </Link>

          <Button
            variant="secondary"
            onClick={() => {
              // ✅ clear URL filters
              router.push("/maintenance/work-orders");
            }}
          >
            Clear URL Filters
          </Button>

          <Button variant="secondary" onClick={() => load(page)} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card
        title="Filters"
        right={
          <div className="text-xs text-white/60">
            Total: <span className="text-white font-semibold">{total}</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <div className="text-xs text-white/60 mb-1">Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
              <option value="" className={optionCls}>All</option>
              <option value="OPEN" className={optionCls}>OPEN</option>
              <option value="IN_PROGRESS" className={optionCls}>IN PROGRESS</option>
              <option value="COMPLETED" className={optionCls}>COMPLETED</option>
              <option value="CANCELED" className={optionCls}>CANCELED</option>
              <option value="OPEN,IN_PROGRESS" className={optionCls}>OPEN + IN_PROGRESS</option>
            </select>
            <div className="mt-1 text-[11px] text-white/50">
              Selected: <span className="text-white/80">{statusLabel(status)}</span>
            </div>
          </div>

          <div>
            <div className="text-xs text-white/60 mb-1">QA</div>
            <select value={qa} onChange={(e) => setQa(e.target.value)} className={selectCls}>
              <option value="" className={optionCls}>All</option>
              <option value="needs" className={optionCls}>needs</option>
              <option value="failed" className={optionCls}>failed</option>
            </select>
          </div>

          <div>
            <div className="text-xs text-white/60 mb-1">Parts</div>
            <select value={parts} onChange={(e) => setParts(e.target.value)} className={selectCls}>
              <option value="" className={optionCls}>All</option>
              <option value="mismatch" className={optionCls}>mismatch</option>
            </select>
          </div>

          <div className="md:col-span-4">
            <div className="text-xs text-white/60 mb-1">Search (vendor / notes)</div>
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none text-white placeholder:text-white/40"
              />
              <Button variant="primary" onClick={() => load(1)} disabled={loading}>
                Search
              </Button>
            </div>

            <div className="mt-2 text-[11px] text-white/50">
              Tip: الكروت من الداشبورد بتبعت status/qa/parts في الـ URL — الصفحة دي دلوقتي بتقرأهم صح.
            </div>
          </div>
        </div>
      </Card>

      <Card title="List">
        {loading ? (
          <div className="text-sm text-white/70">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-white/70">No work orders</div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-white/10">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="text-left p-3">Opened</th>
                  <th className="text-left p-3">Vehicle</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Vendor</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((wo) => (
                  <tr key={wo.id} className="border-t border-white/10">
                    <td className="p-3">{fmtDate(wo.opened_at)}</td>
                    <td className="p-3">
                      <div className="font-semibold">
                        {wo.vehicles?.fleet_no ? `${wo.vehicles.fleet_no} - ` : ""}
                        {wo.vehicles?.plate_no || wo.vehicles?.display_name || "—"}
                      </div>
                      <div className="text-xs text-white/50 font-mono">{shortId(wo.vehicle_id)}</div>
                    </td>
                    <td className="p-3">{wo.type || "—"}</td>
                    <td className="p-3">{wo.vendor_name || "—"}</td>
                    <td className="p-3">
                      <Badge value={wo.status} />
                    </td>
                    <td className="p-3">
                      <Link href={`/maintenance/work-orders/${wo.id}`} className="underline text-white">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-white/60">
          <div>
            Page {page} / {pages}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={loading || page <= 1} onClick={() => load(page - 1)}>
              Prev
            </Button>
            <Button variant="secondary" disabled={loading || page >= pages} onClick={() => load(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
