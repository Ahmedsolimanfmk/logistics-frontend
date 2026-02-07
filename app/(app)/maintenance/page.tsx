"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MaintenanceIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/maintenance/requests");
  }, [router]);

  return null;
}
