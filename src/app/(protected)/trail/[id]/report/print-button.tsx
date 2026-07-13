"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton({ label }: { label: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
    >
      <Printer className="mr-2 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
