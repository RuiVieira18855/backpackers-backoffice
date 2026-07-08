"use client";

import { useMemo, useState, useTransition } from "react";
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
import { moveTaskToStatus } from "./actions";

const STATUSES = ["todo", "doing", "blocked", "done"] as const;
type Status = (typeof STATUSES)[number];

type Priority = "low" | "normal" | "high" | "urgent";

export type KanbanTask = {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  pillarName: string | null;
  assigneeName: string | null;
  projectName: string | null;
  eventName: string | null;
  dueDate: string | null;
};

const PRIORITY_BADGE: Record<Priority, string> = {
  urgent: "bg-destructive/15 text-destructive",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  normal: "bg-muted text-muted-foreground",
  low: "bg-muted text-muted-foreground/70",
};

export function KanbanBoard({ tasks }: { tasks: KanbanTask[] }) {
  const t = useTranslations("ops.kanban");
  const tStatuses = useTranslations("ops.taskStatuses");
  const tPriorities = useTranslations("ops.taskPriorities");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState(tasks);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const byStatus = useMemo(() => {
    const map = new Map<Status, KanbanTask[]>();
    for (const s of STATUSES) map.set(s, []);
    for (const task of items) map.get(task.status)?.push(task);
    return map;
  }, [items]);

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = String(active.id);
    const newStatus = String(over.id) as Status;
    const task = items.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const prev = items;
    setItems((cur) =>
      cur.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    );

    startTransition(async () => {
      const result = await moveTaskToStatus(taskId, newStatus);
      if (!result.ok) setItems(prev);
      router.refresh();
    });
  }

  const activeTask = activeId
    ? items.find((t) => t.id === activeId) ?? null
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
        {STATUSES.map((status) => {
          const statusTasks = byStatus.get(status) ?? [];
          return (
            <DroppableColumn key={status} status={status}>
              <ColumnHeader
                label={tStatuses(status)}
                count={t("totalTasks", { count: statusTasks.length })}
              />
              <div className="flex flex-col gap-2 min-h-[100px]">
                {statusTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic px-1">
                    {t("empty")}
                  </p>
                ) : (
                  statusTasks.map((task) => (
                    <DraggableCard
                      key={task.id}
                      task={task}
                      priorityLabel={tPriorities(task.priority)}
                    />
                  ))
                )}
              </div>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <CardSurface
            task={activeTask}
            priorityLabel={tPriorities(activeTask.priority)}
            isDragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
  status,
  children,
}: {
  status: Status;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
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

function DraggableCard({
  task,
  priorityLabel,
}: {
  task: KanbanTask;
  priorityLabel: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("touch-none", isDragging && "opacity-30")}
    >
      <CardSurface task={task} priorityLabel={priorityLabel} />
    </div>
  );
}

function CardSurface({
  task,
  priorityLabel,
  isDragging = false,
}: {
  task: KanbanTask;
  priorityLabel: string;
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
        href={`/ops/tasks/${task.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block"
      >
        <p className="font-medium text-sm text-foreground line-clamp-2">
          {task.title}
        </p>
      </Link>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {task.priority !== "normal" && (
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5",
              PRIORITY_BADGE[task.priority],
            )}
          >
            {priorityLabel}
          </span>
        )}
        {task.dueDate && (
          <span className="text-xs text-muted-foreground">{task.dueDate}</span>
        )}
      </div>
      {(task.assigneeName || task.projectName || task.eventName) && (
        <div className="text-xs text-muted-foreground mt-1 truncate">
          {task.assigneeName ?? "—"}
          {task.projectName ? ` · ${task.projectName}` : ""}
          {task.eventName ? ` · ${task.eventName}` : ""}
        </div>
      )}
      {task.pillarName && (
        <p className="text-[10px] text-muted-foreground mt-1">
          {task.pillarName}
        </p>
      )}
    </div>
  );
}
