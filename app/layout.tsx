import type { Metadata } from "next";
//import "./globals.css";
import LanguageInit from "@/src/components/LanguageInit";

export const metadata: Metadata = {
  title: "Logistics System",
  description: "Logistics core system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LanguageInit />
        {children}
      </body>
    </html>
  );
}