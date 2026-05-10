"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

export default function LoginPage() {
  const router = useRouter();

  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const hasHydrated = useAuth((s) => s.hasHydrated);
  const setAuth = useAuth((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔥 redirect logic
 useEffect(() => {
  if (!hasHydrated) return;

  // ❌ مهم جدًا
  if (!token || !user) return;

  if (user?.platform_role === "SUPER_ADMIN") {
    router.replace("/select-company");
  } else {
    router.replace("/dashboard");
  }
}, [token, user, hasHydrated]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setErr(null);
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      const { token: t, user } = res.data;

      setAuth(t, user);

      if (user.platform_role === "SUPER_ADMIN") {
        router.replace("/select-company");
      } else {
        router.replace("/dashboard");
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Login failed";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!hasHydrated) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-80 space-y-3">
        <h1 className="text-xl font-bold">Login</h1>

        <input
          className="w-full border p-2"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-2"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err && <div className="text-red-500">{err}</div>}

        <button className="w-full border p-2">
          {loading ? "Loading..." : "Login"}
        </button>
      </form>
    </div>
  );
}