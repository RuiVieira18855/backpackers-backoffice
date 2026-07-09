"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { moveContactToStage } from "./actions";

const STAGES = [
  "new",
  "qualified",
  "active",
  "on_hold",
  "closed_won",
  "closed_lost",
] as const;
type Stage = (typeof STAGES)[number];

export type KanbanContact = {
  id: string;
  fullName: string;
  company: string | null;
  type: "lead" | "customer" | "partner" | "vendor";
  pillarName: string | null;
  stage: Stage;
};

export function KanbanBoard({ contacts }: { contacts: KanbanContact[] }) {
  const t = useTranslations("crm.pipeline");
  const tStages = useTranslations("crm.stages");
  const tTypes = useTranslations("crm.types");
  const tKanban = useTranslations("crm.pipeline");
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState(contacts);
  void tKanban;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const byStage = useMemo(() => {
    const map = new Map<Stage, KanbanContact[]>();
    for (const s of STAGES) map.set(s, []);
    for (const c of items) {
      map.get(c.stage)?.push(c);
    }
    return map;
  }, [items]);

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const contactId = String(active.id);
    const newStage = String(over.id) as Stage;
    const contact = items.find((c) => c.id === contactId);
    if (!contact || contact.stage === newStage) return;

    // Optimistic update
    const prev = items;
    setItems((cur) =>
      cur.map((c) => (c.id === contactId ? { ...c, stage: newStage } : c)),
    );

    startTransition(async () => {
      const result = await moveContactToStage(contactId, newStage);
      if (!result.ok) {
        setItems(prev);
        toast.error(result.error ?? "Error");
      }
      router.refresh();
    });
  }

  const activeContact = activeId
    ? items.find((c) => c.id === activeId) ?? null
    : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className={cn(
          "grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-4",
          pending && "opacity-70",
        )}
      >
        {STAGES.map((stage) => {
          const stageContacts = byStage.get(stage) ?? [];
          return (
            <DroppableColumn key={stage} stage={stage}>
              <ColumnHeader
                label={tStages(stage)}
                count={t("totalContacts", { count: stageContacts.length })}
              />
              <div className="flex flex-col gap-2 min-h-[100px]">
                {stageContacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">
                    {t("empty")}
                  </p>
                ) : (
                  stageContacts.map((c) => (
                    <DraggableCard
                      key={c.id}
                      contact={c}
                      typeLabel={tTypes(c.type)}
                    />
                  ))
                )}
              </div>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeContact ? (
          <CardSurface contact={activeContact} typeLabel={tTypes(activeContact.type)} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ---------- Column ----------

function DroppableColumn({
  stage,
  children,
}: {
  stage: Stage;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 rounded-md border p-3 bg-card transition-colors",
        isOver ? "border-accent bg-accent/10" : "border-border",
      )}
    >
      {children}
    </div>
  );
}

function ColumnHeader({ label, count }: { label: string; count: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 pb-1">
      <h3 className="text-sm font-medium uppercase tracking-wider text-foreground">
        {label}
      </h3>
      <span className="text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

// ---------- Card ----------

function DraggableCard({
  contact,
  typeLabel,
}: {
  contact: KanbanContact;
  typeLabel: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: contact.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none",
        isDragging && "opacity-30",
      )}
    >
      <CardSurface contact={contact} typeLabel={typeLabel} />
    </div>
  );
}

function CardSurface({
  contact,
  typeLabel,
  isDragging = false,
}: {
  contact: KanbanContact;
  typeLabel: string;
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background p-3 cursor-grab active:cursor-grabbing hover:border-accent transition-colors",
        isDragging && "shadow-lg ring-2 ring-accent",
      )}
    >
      <Link
        href={`/crm/contacts/${contact.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
        <p className="font-medium text-sm text-foreground truncate">
          {contact.fullName}
        </p>
        {contact.company && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {contact.company}
          </p>
        )}
      </Link>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-muted-foreground">{typeLabel}</span>
        {contact.pillarName && (
          <span className="text-xs text-muted-foreground">
            · {contact.pillarName}
          </span>
        )}
      </div>
    </div>
  );
}
