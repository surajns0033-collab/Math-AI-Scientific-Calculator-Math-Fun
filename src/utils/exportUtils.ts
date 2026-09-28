import { CalculationHistoryItem } from "../types";

export function exportHistoryToCSV(items: CalculationHistoryItem[]): void {
  if (items.length === 0) return;

  const headers = ["ID", "Timestamp", "Date", "Symbol / Variable", "Expression", "Result", "Tags", "Notes", "Angle Mode"];

  const rows = items.map((item) => {
    const dateStr = new Date(item.timestamp).toLocaleString();
    return [
      item.id,
      item.timestamp,
      `"${dateStr}"`,
      `"${(item.symbolName || "").replace(/"/g, '""')}"`,
      `"${item.expression.replace(/"/g, '""')}"`,
      `"${item.result.replace(/"/g, '""')}"`,
      `"${(item.tags || []).join(", ").replace(/"/g, '""')}"`,
      `"${(item.notes || "").replace(/"/g, '""')}"`,
      item.angleMode,
    ];
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `OmniMath_History_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportHistoryToJSON(items: CalculationHistoryItem[]): void {
  const jsonContent = JSON.stringify(items, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `OmniMath_Calculations_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportHistoryToPrintablePDF(items: CalculationHistoryItem[]): void {
  if (items.length === 0) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to generate the printable PDF document.");
    return;
  }

  const rowsHtml = items
    .map(
      (item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-family: monospace;">
      <td style="padding: 10px; color: #64748b;">#${idx + 1}</td>
      <td style="padding: 10px; font-weight: bold; color: #0284c7;">${item.symbolName || "-"}</td>
      <td style="padding: 10px; font-size: 14px;">${item.expression}</td>
      <td style="padding: 10px; font-weight: bold; color: #10b981; font-size: 15px;">${item.result}</td>
      <td style="padding: 10px;">
        ${(item.tags || [])
          .map(
            (t) =>
              `<span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-right: 4px;">${t}</span>`
          )
          .join("")}
      </td>
      <td style="padding: 10px; color: #64748b; font-size: 12px;">${item.notes || ""}</td>
      <td style="padding: 10px; color: #94a3b8; font-size: 11px;">${new Date(item.timestamp).toLocaleDateString()}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>OmniMath Calculation Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #0f172a; margin: 0; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
          h1 { margin: 0 0 6px 0; font-size: 24px; color: #0f172a; }
          p { margin: 0; color: #64748b; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; text-align: left; }
          th { background: #f8fafc; padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h1>OmniMath - Calculation & Scientific Study Report</h1>
              <p>Generated on ${new Date().toLocaleString()} | Total Calculations: ${items.length}</p>
            </div>
            <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">
              Print / Save as PDF
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Symbol / Name</th>
              <th>Expression</th>
              <th>Result</th>
              <th>Category Tags</th>
              <th>Notes</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
