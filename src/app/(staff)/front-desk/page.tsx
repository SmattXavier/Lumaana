import Link from "next/link";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { formatDate, lagosToday } from "@/lib/dates";
import { getDeskBranch } from "@/lib/desk";
import { ROOM_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { NewBookingDialog } from "./new-booking";
import { RequestsCard } from "./requests-card";
import { ROOM_TONE } from "./status";

export default async function FrontDeskToday() {
  const { branch } = await getDeskBranch();
  const supabase = await createClient();
  const today = lagosToday();

  const [rooms, live, types, businessDate] = await Promise.all([
    supabase.from("rooms").select("id, number, floor, status, room_types(name)").eq("branch_id", branch.id).order("number"),
    supabase
      .from("reservations")
      .select("id, status, check_in, check_out, room_id, confirmation_code, guests(full_name), room_types(name), rooms(number)")
      .eq("branch_id", branch.id)
      .in("status", ["confirmed", "checked_in"])
      .lte("check_in", today)
      .order("check_in"),
    supabase.from("room_types").select("id, name, base_rate_kobo").eq("branch_id", branch.id).order("sort_order"),
    supabase.rpc("branch_business_date", { p_branch: branch.id }),
  ]);
  if (rooms.error) throw new Error(rooms.error.message);
  if (live.error) throw new Error(live.error.message);

  const arrivals = live.data.filter((r) => r.status === "confirmed");
  const inHouse = live.data.filter((r) => r.status === "checked_in");
  const departures = inHouse.filter((r) => r.check_out <= today);
  const guestInRoom = new Map(inHouse.map((r) => [r.room_id, r]));
  const sellable = rooms.data.filter((r) => r.status !== "out_of_order").length;
  const occupancy = sellable ? Math.round((100 * inHouse.length) / sellable) : 0;
  const counts = Object.fromEntries(
    (Object.keys(ROOM_STATUS) as (keyof typeof ROOM_STATUS)[]).map((s) => [s, rooms.data.filter((r) => r.status === s).length])
  );

  return (
    <div className="grid gap-4">
      <RealtimeRefresh
        channel={`desk-${branch.id}`}
        watch={[
          { table: "rooms", filter: `branch_id=eq.${branch.id}` },
          { table: "reservations", filter: `branch_id=eq.${branch.id}` },
          { table: "service_requests", filter: `branch_id=eq.${branch.id}` },
        ]}
      />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">{branch.name}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(today, { year: true })} · business day {businessDate.data ? formatDate(businessDate.data, { year: true }) : "—"}
          </p>
        </div>
        <NewBookingDialog branchId={branch.id} types={types.data ?? []} today={today} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Arrivals waiting" value={arrivals.length} />
        <Stat label="In house" value={inHouse.length} />
        <Stat label="Due out today" value={departures.length} />
        <Stat label="Occupancy" value={`${occupancy}%`} hint={`${inHouse.length} of ${sellable} sellable rooms`} />
      </div>

      <RequestsCard branchId={branch.id} />

      <Card>
        <CardHeader>
          <CardTitle>Room board</CardTitle>
          <CardDescription>Live. Click an occupied room to open its folio.</CardDescription>
          <CardAction className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {(Object.keys(ROOM_STATUS) as (keyof typeof ROOM_STATUS)[]).map((s) => (
              <span key={s} className="flex items-center gap-1">
                <span className={cn("size-3 rounded-sm border", ROOM_TONE[s])} /> {ROOM_STATUS[s]} ({counts[s]})
              </span>
            ))}
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
            {rooms.data.map((room) => {
              const res = guestInRoom.get(room.id);
              const body = (
                <>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-semibold tabular-nums">{room.number}</span>
                    <span className="text-[10px] text-muted-foreground">{room.room_types?.name}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {res ? res.guests?.full_name : ROOM_STATUS[room.status]}
                  </div>
                </>
              );
              const cls = cn("rounded-lg border p-2 text-left", ROOM_TONE[room.status]);
              return res ? (
                <Link key={room.id} href={`/front-desk/reservations/${res.id}`} className={cn(cls, "hover:ring-2 hover:ring-ring/40")}>
                  {body}
                </Link>
              ) : (
                <div key={room.id} className={cls}>
                  {body}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard
          title="Arrivals"
          description="Confirmed and due today (or earlier)."
          empty="No arrivals waiting."
          rows={arrivals}
          action="Check in"
          dateLabel={(r) => `${formatDate(r.check_in)} → ${formatDate(r.check_out)}`}
        />
        <ListCard
          title="In house"
          description="Checked-in guests. Due-out guests first."
          empty="Nobody is checked in."
          rows={[...departures, ...inHouse.filter((r) => r.check_out > today)]}
          action="Folio"
          dateLabel={(r) => (r.check_out <= today ? "Due out today" : `Out ${formatDate(r.check_out)}`)}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

type Row = {
  id: string;
  check_in: string;
  check_out: string;
  confirmation_code: string;
  guests: { full_name: string } | null;
  room_types: { name: string } | null;
  rooms: { number: string } | null;
};

function ListCard({
  title, description, empty, rows, action, dateLabel,
}: {
  title: string; description: string; empty: string; rows: Row[]; action: string; dateLabel: (r: Row) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.guests?.full_name}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.confirmation_code}</div>
                </TableCell>
                <TableCell>{r.rooms?.number ?? r.room_types?.name}</TableCell>
                <TableCell className="text-muted-foreground">{dateLabel(r)}</TableCell>
                <TableCell>
                  <Link href={`/front-desk/reservations/${r.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                    {action}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
