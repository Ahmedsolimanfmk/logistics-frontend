import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import LanguageInit from "@/src/components/LanguageInit";
import LanguageSwitcher from "@/src/components/LanguageSwitcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Logistics System",
  description: "Logistics core system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* ✅ لازم قبل أي كود يقرأ window.__ENV */}
        <Script src="/env.js" strategy="beforeInteractive" />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LanguageInit />

        <div style={{ display: "flex", justifyContent: "flex-end", padding: 12 }}>
          <LanguageSwitcher />
        </div>

        {children}
      </body>
    </html>
  );
}
