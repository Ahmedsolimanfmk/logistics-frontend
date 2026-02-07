// app/login/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/store/auth";

export default function LoginPage() {
  const router = useRouter();

  const token = useAuth((s) => s.token);
  const setAuth = useAuth((s) => s.setAuth);
  const hydrate = useAuth((s) => s.hydrate);

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // ✅ restore session if exists
    try {
      hydrate();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token) router.replace("/dashboard");
  }, [token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setErr(null);
    setLoading(true);

    try {
      // ✅ api returns data directly (interceptor)
      const res = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      const { token, user } = (res || {}) as any;

      if (!token || !user) {
        console.log("LOGIN RESPONSE:", res);
        setErr("Login failed: invalid response");
        return;
      }

      setAuth(String(token), user);
      router.replace("/dashboard");
    } catch (e: any) {
      // ✅ interceptor throws Error(msg) so response may be missing
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-3 border rounded-lg p-4">
        <h1 className="text-xl font-semibold">Login</h1>

        <input
          className="w-full border rounded p-2"
          placeholder="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border rounded p-2"
          placeholder="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <button type="submit" disabled={loading} className="w-full border rounded p-2 disabled:opacity-60">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
