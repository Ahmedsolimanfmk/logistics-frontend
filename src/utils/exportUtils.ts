import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel(filename: string, headers: string[], rows: any[][]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  if (!ws["!views"]) ws["!views"] = [];
  ws["!views"].push({ rightToLeft: true });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(filename: string, headers: string[], rows: any[][]) {
  const doc = new jsPDF({ orientation: "landscape" });
  
  // Note: For perfect Arabic support in PDF, a custom TTF font needs to be added via addFileToVFS
  // Currently using default which might display Arabic characters separated.
  autoTable(doc, {
    head: [headers],
    body: rows,
    styles: {
      halign: "right",
    },
    headStyles: {
      halign: "right",
      fillColor: [24, 24, 27], // Dark gray header
      textColor: 255,
      fontStyle: "bold",
    },
  });

  doc.save(`${filename}.pdf`);
}
