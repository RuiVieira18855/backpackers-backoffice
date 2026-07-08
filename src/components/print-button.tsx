"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Trigger the browser's print dialog. Combined with `print:` Tailwind
 * variants on the target page + print CSS in globals.css, produces a clean
 * PDF via the browser's built-in "Save as PDF" option.
 *
 * No PDF library at all — every browser has a print-to-PDF path and it's
 * plenty for the reports use case.
 */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      <Printer className="mr-2 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
