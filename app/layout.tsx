// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import AuthHydrator from "./AuthHydrator";

export const metadata: Metadata = {
  title: "Logistics System",
  description: "Logistics core system",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthHydrator /> {/* 🔥 هنا الحل */}
        {children}
      </body>
    </html>
  );
}