"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  userId: string;
};

/**
 * Subscribes to Supabase Realtime inserts on notifications for this user
 * and triggers a router refresh so server-rendered bell + lists update.
 *
 * Renders nothing visually.
 */
export function NotificationsRealtime({ userId }: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
