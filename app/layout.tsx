"use client";

import type { Metadata } from "next";
import { useEffect } from "react";
import "./globals.css";
import { useAuth } from "@/src/store/auth";

export const metadata: Metadata = {
  title: "Logistics System",
  description: "Logistics core system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}