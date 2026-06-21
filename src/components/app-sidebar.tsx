import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  FileText,
  FlaskConical,
  Globe,
  LayoutDashboard,
  ListTodo,
  Mountain,
  Sparkles,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAllPillars } from "@/lib/dal";

type PillarIcon = React.ComponentType<{ className?: string }>;

const PILLAR_ICONS: Record<string, PillarIcon> = {
  adventures: Mountain,
  synergy: Sparkles,
  labs: FlaskConical,
  grupo: Globe,
};

const ACTION_ICONS = {
  contacts: Users,
  events: Calendar,
  projects: ClipboardList,
  tasks: ListTodo,
  docs: FileText,
} as const;

type Props = {
  /** Wrapped variant for the mobile Sheet — applies different layout */
  variant?: "desktop" | "mobile";
};

export async function AppSidebar({ variant = "desktop" }: Props) {
  const t = await getTranslations("sidebar");
  const tNav = await getTranslations("nav");
  const pillars = await getAllPillars();

  // Order: grupo first (umbrella), then operational pillars
  const ordered = [...pillars].sort((a, b) => {
    const order: Record<string, number> = {
      grupo: 0,
      adventures: 1,
      synergy: 2,
      labs: 3,
    };
    return (order[a.slug] ?? 99) - (order[b.slug] ?? 99);
  });

  return (
    <aside
      className={
        variant === "desktop"
          ? "hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col overflow-y-auto"
          : "flex w-full flex-col"
      }
    >
      <nav className="flex flex-col gap-1 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-foreground hover:bg-muted transition-colors"
        >
          <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          {tNav("dashboard")}
        </Link>
      </nav>

      <div className="border-t border-border" />

      <div className="flex flex-col gap-3 p-3">
        <p className="px-3 text-xs uppercase tracking-wider text-muted-foreground">
          {t("pillarsLabel")}
        </p>

        {ordered.map((pilar) => {
          const Icon = PILLAR_ICONS[pilar.slug] ?? Globe;
          return (
            <details
              key={pilar.id}
              open
              className="group"
            >
              <summary className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground rounded-md hover:bg-muted cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <Icon className="h-4 w-4 text-accent-foreground" />
                <span className="flex-1">{pilar.name}</span>
                <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <ul className="mt-1 ml-7 flex flex-col gap-0.5 border-l border-border pl-2">
                <SidebarSubLink
                  href={`/crm?pillar=${pilar.slug}`}
                  icon={ACTION_ICONS.contacts}
                  label={t("contacts")}
                />
                <SidebarSubLink
                  href={`/ops/events?pillar=${pilar.slug}`}
                  icon={ACTION_ICONS.events}
                  label={t("events")}
                />
                <SidebarSubLink
                  href={`/ops/projects?pillar=${pilar.slug}`}
                  icon={ACTION_ICONS.projects}
                  label={t("projects")}
                />
                <SidebarSubLink
                  href={`/ops/tasks?pillar=${pilar.slug}`}
                  icon={ACTION_ICONS.tasks}
                  label={t("tasks")}
                />
                <SidebarSubLink
                  href={`/docs?pillar=${pilar.slug}`}
                  icon={ACTION_ICONS.docs}
                  label={t("documents")}
                />
              </ul>
            </details>
          );
        })}
      </div>
    </aside>
  );
}

function SidebarSubLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: PillarIcon;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 px-2 py-1 text-xs rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Icon className="h-3 w-3" />
        {label}
      </Link>
    </li>
  );
}
