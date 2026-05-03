"use client";

import { useEffect } from "react";
import { useAuth } from "@/src/store/auth";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const state = useAuth.getState();
    if (!state.hasHydrated) {
      state.hydrate();
    }
  }, []);

  const hasHydrated = useAuth((s) => s.hasHydrated);

  if (!hasHydrated) {
    return <div className="p-6">Loading app...</div>;
  }

  return (
    <div className="min-h-screen p-6">
      {children}
    </div>
  );
}