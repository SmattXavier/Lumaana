"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Watch = { table: string; filter?: string };

/**
 * Re-renders the current Server Component page when any watched table changes.
 * RLS applies to realtime, so a subscriber only hears about rows it can read.
 */
export function RealtimeRefresh({ channel, watch }: { channel: string; watch: Watch[] }) {
  const router = useRouter();
  const key = JSON.stringify(watch);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 150); // coalesce bursts (e.g. check-in touches 3 tables)
    };
    let ch = supabase.channel(channel);
    for (const w of JSON.parse(key) as Watch[]) {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table: w.table, ...(w.filter ? { filter: w.filter } : {}) }, refresh);
    }
    ch.subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [channel, key, router]);

  return null;
}
