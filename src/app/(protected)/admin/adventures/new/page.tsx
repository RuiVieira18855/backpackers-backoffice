import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/dal";
import { AdventureForm } from "../adventure-form";

export default async function NewAdventurePage() {
  await requireRole("admin_grupo");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/adventures">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar às caminhadas
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          Nova caminhada
        </h1>
      </div>
      <AdventureForm />
    </div>
  );
}
