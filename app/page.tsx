"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";

export default function Home() {
  const router = useRouter();
  const { token, user, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated) return;

    if (!token) {
      router.replace("/login");
      return;
    }

    // SUPER_ADMIN بدون شركة
    if (user?.platform_role === "SUPER_ADMIN") {
      router.replace("/dashboard");
      return;
    }

    // باقي الحالات
    router.replace("/dashboard");
  }, [token, user, hasHydrated]);

  return <div className="p-6">Loading...</div>;
}