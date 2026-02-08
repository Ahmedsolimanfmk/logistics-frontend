
1"use client";

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

  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
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
      // ✅ normalize like backend
      const emailNorm = email.trim().toLowerCase();

      const res = await api.post("/auth/login", {
        email: emailNorm,
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
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-3 border rounded-lg p-4 bg-white"
      >
        <h1 className="text-xl font-semibold">Login</h1>

        <input
          className="w-full border rounded p-2"
          placeholder="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <input
            className="w-full border rounded p-2 pr-10"
            placeholder="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-black"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full border rounded p-2 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

