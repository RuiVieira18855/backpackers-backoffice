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
import { moveDealStage } from "@/app/(protected)/crm/deals/[id]/actions";

const STAGES = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
type Stage = (typeof STAGES)[number];

export type KanbanDeal = {
  id: string;
  name: string;
  pillarName: string | null;
  contactName: string | null;
  value: string | null;
  currency: string;
  stage: Stage;
};

const EUR0 = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function fmtMoney(v: string | null, currency: string): string {
  if (!v) return "";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(v));
}

export function DealsKanban({ deals }: { deals: KanbanDeal[] }) {
  const t = useTranslations("deals.pipeline");
  const tStages = useTranslations("deals.stages");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState(deals);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStage = useMemo(() => {
    const map = new Map<Stage, KanbanDeal[]>();
    for (const s of STAGES) map.set(s, []);
    for (const d of items) map.get(d.stage)?.push(d);
    return map;
  }, [items]);

  const totalsByStage = useMemo(() => {
    const map = new Map<Stage, number>();
    for (const s of STAGES) {
      const sum = (byStage.get(s) ?? []).reduce(
        (acc, d) => acc + (d.value ? Number(d.value) : 0),
        0,
      );
      map.set(s, sum);
    }
    return map;
  }, [byStage]);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const dealId = String(active.id);
    const newStage = String(over.id) as Stage;
    const deal = items.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    const prev = items;
    setItems((cur) =>
      cur.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
    );
    startTransition(async () => {
      const res = await moveDealStage(dealId, newStage);
      if (!res.ok) setItems(prev);
      router.refresh();
    });
  }

  const activeDeal = activeId
    ? (items.find((d) => d.id === activeId) ?? null)
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div
        className={cn(
          "grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-4",
          pending && "opacity-70",
        )}
      >
        {STAGES.map((stage) => {
          const stageDeals = byStage.get(stage) ?? [];
          const total = totalsByStage.get(stage) ?? 0;
          return (
            <DroppableColumn key={stage} stage={stage}>
              <div className="flex items-baseline justify-between gap-2 pb-1">
                <h3 className="text-sm font-medium uppercase tracking-wider text-foreground">
                  {tStages(stage)}
                </h3>
                <div className="text-xs text-muted-foreground text-right">
                  <div>{t("totalDeals", { count: stageDeals.length })}</div>
                  {total > 0 && (
                    <div className="font-medium tabular-nums">
                      {EUR0.format(total)}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 min-h-[100px]">
                {stageDeals.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">
                    {t("empty")}
                  </p>
                ) : (
                  stageDeals.map((d) => <DraggableCard key={d.id} deal={d} />)
                )}
              </div>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeDeal ? <CardSurface deal={activeDeal} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

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

function DraggableCard({ deal }: { deal: KanbanDeal }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("touch-none", isDragging && "opacity-30")}
    >
      <CardSurface deal={deal} />
    </div>
  );
}

function CardSurface({
  deal,
  isDragging = false,
}: {
  deal: KanbanDeal;
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
        href={`/crm/deals/${deal.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
        <p className="font-medium text-sm text-foreground truncate">
          {deal.name}
        </p>
        {deal.contactName && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {deal.contactName}
          </p>
        )}
      </Link>
      <div className="flex items-center justify-between gap-2 mt-2">
        <span className="text-xs text-muted-foreground">
          {deal.pillarName ?? ""}
        </span>
        {deal.value && (
          <span className="text-xs font-medium tabular-nums">
            {fmtMoney(deal.value, deal.currency)}
          </span>
        )}
      </div>
    </div>
  );
}
