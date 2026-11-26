import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/lib/database.types";
import { RESERVATION_STATUS, ROOM_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const RES_TONE: Record<Enums<"reservation_status">, string> = {
  pending_payment: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  confirmed: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  checked_in: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  checked_out: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
  no_show: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
};

export const ROOM_TONE: Record<Enums<"room_status">, string> = {
  vacant_clean: "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
  vacant_dirty: "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
  occupied: "border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40",
  out_of_order: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/40",
};

export function ReservationBadge({ status }: { status: Enums<"reservation_status"> }) {
  return <Badge className={cn("border-transparent", RES_TONE[status])}>{RESERVATION_STATUS[status]}</Badge>;
}

export function RoomBadge({ status }: { status: Enums<"room_status"> }) {
  return <Badge variant="outline" className={ROOM_TONE[status]}>{ROOM_STATUS[status]}</Badge>;
}
