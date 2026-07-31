import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteEvents } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { AdventureForm } from "../adventure-form";
import { toLisbonLocalInput } from "../datetime";

type Props = { params: Promise<{ id: string }> };

export default async function EditAdventurePage({ params }: Props) {
  await requireRole("admin_grupo");
  const { id } = await params;

  const event = await db.query.siteEvents.findFirst({
    where: eq(siteEvents.id, id),
  });
  if (!event) notFound();

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
          {event.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground font-mono">
          {event.slug}
        </p>
      </div>
      <AdventureForm
        event={{
          id: event.id,
          slug: event.slug,
          title: event.title,
          summary: event.summary,
          description: event.description,
          startsAtLocal: toLisbonLocalInput(event.startsAt),
          endsAtLocal: toLisbonLocalInput(event.endsAt),
          plannedMonth: event.plannedMonth ?? "",
          type: event.type,
          location: event.location,
          region: event.region ?? "",
          lat: event.lat === null ? "" : String(event.lat),
          lng: event.lng === null ? "" : String(event.lng),
          meetingPoint: event.meetingPoint ?? "",
          distance: event.distance ?? "",
          difficulty: event.difficulty === null ? "" : String(event.difficulty),
          price: String(event.price),
          maxParticipants: String(event.maxParticipants),
          coverImage: event.coverImage,
          images: event.images,
          included: event.included,
          requirements: event.requirements,
          featured: event.featured,
          status: event.status,
        }}
      />
    </div>
  );
}
