"use client";

import { useState, type RefObject } from "react";
import html2canvas from "html2canvas-pro";

const EXPORT_SCALE = 2;
const EXPORT_BG_COLOR = "#ffffff";

interface ExportButtonProps {
  bracketRef: RefObject<HTMLDivElement | null>;
  bracketName: string;
}

export default function ExportButton({ bracketRef, bracketName }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!bracketRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(bracketRef.current, {
        scale: EXPORT_SCALE,
        backgroundColor: EXPORT_BG_COLOR,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `${bracketName.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50 transition"
    >
      {exporting ? "Exporting..." : "📷 Export PNG"}
    </button>
  );
}
