// app/(app)/finance/ar/page.tsx
"use client";

import Link from "next/link";
import React from "react";
import { PageHeader } from "@/src/components/ui/PageHeader";
import { Button } from "@/src/components/ui/Button";

export default function ArHomePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="الحسابات المدينة (AR)" subtitle="فواتير العملاء، التحصيلات، وتقرير دفتر الأستاذ." />

      <div className="flex flex-wrap gap-3">
        <Link href="/finance/ar/invoices"><Button>الفواتير</Button></Link>
        <Link href="/finance/ar/payments"><Button variant="secondary">المدفوعات</Button></Link>
        <Link href="/finance/ar/ledger"><Button variant="secondary">دفتر الأستاذ</Button></Link>
        <Link href="/finance/ar/clients"><Button variant="ghost">العملاء</Button></Link>
      </div>
    </div>
  );
}