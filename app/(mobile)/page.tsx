"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";

export default function MobileIndex() {
  const router = useRouter();
  const { user, hasHydrated } = useAuth();

  useEffect(() => {
    if (!hasHydrated) return;
    
    if (!user) {
      router.replace("/login?redirect=/mobile");
      return;
    }

    const role = user.role;
    if (role === "DRIVER") {
      router.replace("/mobile/driver");
    } else if (role === "FIELD_SUPERVISOR" || role === "SUPERVISOR") {
      router.replace("/mobile/supervisor");
    } else if (role === "STATION_WORKER") {
      router.replace("/mobile/station");
    } else {
      // Admins or unknown roles in mobile app go to their respective dashboards
      router.replace("/dashboard");
    }
  }, [user, hasHydrated, router]);

  return <div className="h-screen w-screen flex items-center justify-center">جاري توجيهك...</div>;
}
