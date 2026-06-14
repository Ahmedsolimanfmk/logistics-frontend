"use client";

import React from "react";
import { Download, FileText } from "lucide-react";
import { ExportService, Column } from "@/src/services/export.service";
import { useT } from "@/src/i18n/useT";

interface ExportButtonsProps {
  data: any[];
  columns: Column[];
  fileName: string;
  title: string;
}

export function ExportButtons({ data, columns, fileName, title }: ExportButtonsProps) {
  const t = useT();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => ExportService.toExcel(data, fileName)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        title="تصدير إلى إكسل"
      >
        <Download className="h-4 w-4 text-emerald-600" />
        Excel
      </button>

      <button
        onClick={() => ExportService.toPdfTable(columns, data, title, fileName)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        title="تصدير إلى PDF"
      >
        <FileText className="h-4 w-4 text-rose-600" />
        PDF
      </button>
    </div>
  );
}
