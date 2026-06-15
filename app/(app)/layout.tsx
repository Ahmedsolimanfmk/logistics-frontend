"use client";

import { useEffect, useState } from "react";
import AppShell from "@/src/components/AppShell";
import { useAuth } from "@/src/store/auth";
import { usePushNotifications } from "@/src/hooks/usePushNotifications";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  usePushNotifications(mounted && !!user);

  return <AppShell>{children}</AppShell>;
}