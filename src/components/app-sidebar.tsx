import Link from "next/link";
import {
  Calendar,
  CalendarPlus,
  CheckSquare,
  ClipboardList,
  FileText,
  FolderPlus,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Plus,
  Shield,
  Target,
  Upload,
  Users,
  UserPlus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireProfile } from "@/lib/dal";

type IconComp = React.ComponentType<{ className?: string }>;

type Props = {
  /** Wrapped variant for the mobile Sheet — applies different layout */
  variant?: "desktop" | "mobile";
};

export async function AppSidebar({ variant = "desktop" }: Props) {
  const t = await getTranslations("sidebar");
  const profile = await requireProfile();
  const isAdmin = profile.role === "admin_grupo" || profile.role === "super_user";

  return (
    <aside
      className={
        variant === "desktop"
          ? "hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col overflow-y-auto"
          : "flex w-full flex-col"
      }
    >
      {/* Primary nav */}
      <SidebarGroup>
        <SidebarLink href="/dashboard" icon={LayoutDashboard}>
          {t("dashboard")}
        </SidebarLink>
        <SidebarLink href="/ops/calendar" icon={Calendar}>
          {t("calendar")}
        </SidebarLink>
      </SidebarGroup>

      <SidebarDivider />

      {/* Quick actions */}
      <SidebarGroup label={t("quickActions")}>
        <SidebarLink href="/crm/contacts/new" icon={UserPlus} accent>
          {t("addContact")}
        </SidebarLink>
        <SidebarLink href="/crm/contacts/new?type=lead" icon={Target} accent>
          {t("addLead")}
        </SidebarLink>
        <SidebarLink href="/ops/events/new" icon={CalendarPlus} accent>
          {t("scheduleEvent")}
        </SidebarLink>
        <SidebarLink href="/ops/events/new?type=meeting" icon={Users} accent>
          {t("scheduleMeeting")}
        </SidebarLink>
        <SidebarLink href="/ops/tasks/new" icon={Plus} accent>
          {t("newTask")}
        </SidebarLink>
        <SidebarLink href="/ops/projects/new" icon={FolderPlus} accent>
          {t("newProject")}
        </SidebarLink>
        <SidebarLink href="/docs/new" icon={Upload} accent>
          {t("uploadDocument")}
        </SidebarLink>
      </SidebarGroup>

      <SidebarDivider />

      {/* CRM */}
      <SidebarGroup label={t("crmLabel")}>
        <SidebarLink href="/crm" icon={Users}>
          {t("contacts")}
        </SidebarLink>
        <SidebarLink href="/crm/pipeline" icon={LayoutGrid}>
          {t("pipeline")}
        </SidebarLink>
      </SidebarGroup>

      {/* Operations */}
      <SidebarGroup label={t("operationsLabel")}>
        <SidebarLink href="/ops/events" icon={Calendar}>
          {t("events")}
        </SidebarLink>
        <SidebarLink href="/ops/projects" icon={ClipboardList}>
          {t("projects")}
        </SidebarLink>
        <SidebarLink href="/ops/tasks" icon={ListTodo}>
          {t("tasks")}
        </SidebarLink>
        <SidebarLink href="/ops/tasks?mine=1" icon={CheckSquare}>
          {t("myTasks")}
        </SidebarLink>
      </SidebarGroup>

      {/* Documents */}
      <SidebarGroup label={t("documentsLabel")}>
        <SidebarLink href="/docs" icon={FileText}>
          {t("documents")}
        </SidebarLink>
      </SidebarGroup>

      {isAdmin && (
        <>
          <SidebarDivider />
          <SidebarGroup label={t("adminLabel")}>
            <SidebarLink href="/admin/users" icon={Shield}>
              {t("users")}
            </SidebarLink>
          </SidebarGroup>
        </>
      )}

      <div className="h-4" />
    </aside>
  );
}

// ---------- Sub-components ----------

function SidebarGroup({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2">
      {label && (
        <p className="px-2 pb-1 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function SidebarDivider() {
  return <div className="border-t border-border mx-3" />;
}

function SidebarLink({
  href,
  icon: Icon,
  children,
  accent = false,
}: {
  href: string;
  icon: IconComp;
  children: React.ReactNode;
  /** Highlight as quick-action (uses accent color for icon) */
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
    >
      <Icon
        className={
          accent
            ? "h-3.5 w-3.5 text-accent-foreground"
            : "h-3.5 w-3.5 text-muted-foreground"
        }
      />
      <span className="flex-1 truncate">{children}</span>
    </Link>
  );
}
