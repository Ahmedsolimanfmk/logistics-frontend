"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/store/auth";

export default function Home() {
  const router = useRouter();
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    // 🚀 اجبر hydrate
    useAuth.getState().hydrate();

    setTimeout(() => {
      const state = useAuth.getState();

      if (!state.token) {
        router.replace("/login");
        return;
      }

      if (state.user?.platform_role === "SUPER_ADMIN") {
        router.replace("/select-company");
      } else {
        router.replace("/dashboard");
      }
    }, 100); // delay بسيط
  }, []);

  return <div className="p-6">Loading...</div>;
}