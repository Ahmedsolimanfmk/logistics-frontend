import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

// Apply Amiris font for Arabic support if needed
// This would typically involve adding a base64 font in a real scenario
// For this service we assume standard text or English layout for demonstration

export interface Column {
  header: string;
  dataKey: string;
}

export class ExportService {
  /**
   * Export JSON data to Excel
   */
  static toExcel(data: any[], fileName: string) {
    if (!data || data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    
    // Generate buffer and trigger download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }

  /**
   * Export JSON data to PDF (Table format)
   */
  static toPdfTable(columns: Column[], data: any[], title: string, fileName: string) {
    if (!data || data.length === 0) return;

    // Use default document size A4
    const doc = new jsPDF("p", "pt", "a4");

    // Add Title
    doc.setFontSize(18);
    doc.text(title, 40, 40);
    
    // Add Date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60);

    // Map data to match columns
    const rows = data.map(row => {
      return columns.map(col => {
        let val = row[col.dataKey];
        if (val === null || val === undefined) return "—";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      });
    });

    // Extract headers
    const head = [columns.map(c => c.header)];

    // Add table
    (doc as any).autoTable({
      head: head,
      body: rows,
      startY: 80,
      styles: { fontSize: 9, font: "helvetica" },
      headStyles: { fillColor: [51, 65, 85] }, // Slate 700
      alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate 50
    });

    // Save
    doc.save(`${fileName}.pdf`);
  }
}
