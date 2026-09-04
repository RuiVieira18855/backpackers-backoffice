import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { SpeciesForm } from "../species-form";

export default async function NewSpeciesPage() {
  await requireRole("admin_grupo");
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-10 md:px-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href="/admin/herbarium">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar ao Herbarium
          </Link>
        </Button>
        <h1 className="font-display text-4xl leading-none text-foreground sm:text-5xl">
          Nova ficha
        </h1>
      </div>
      <SpeciesForm />
    </div>
  );
}
