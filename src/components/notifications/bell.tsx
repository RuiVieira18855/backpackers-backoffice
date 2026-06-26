import Link from "next/link";
import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireProfile } from "@/lib/dal";
import { getUnreadCount } from "@/lib/notifications";
import { NotificationsRealtime } from "./realtime";

/**
 * Server component — renders an unread-count badge linking to /notifications.
 * Pairs with NotificationsRealtime which subscribes to Supabase Realtime
 * inserts and calls router.refresh() so the badge updates without polling.
 */
export async function NotificationsBell() {
  const profile = await requireProfile();
  const t = await getTranslations("notifications");
  const unread = await getUnreadCount(profile.id);

  return (
    <>
      <Link
        href="/notifications"
        aria-label={t("ariaLabel", { count: unread })}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium flex items-center justify-center leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
      <NotificationsRealtime userId={profile.id} />
    </>
  );
}
