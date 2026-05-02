"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";

export default function Home() {
  const router = useRouter();
  const { token, user, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated) return;

    // ❌ مش لوجين
    if (!token) {
      router.replace("/login");
      return;
    }

    // 🔥 سوبر أدمن → اختيار شركة
    if (user?.platform_role === "SUPER_ADMIN") {
      router.replace("/select-company");
      return;
    }

    // ✅ باقي المستخدمين
    router.replace("/dashboard");
  }, [token, user, hasHydrated]);

  return null;
}