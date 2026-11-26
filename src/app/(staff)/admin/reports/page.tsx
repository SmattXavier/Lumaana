import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { addDays, formatDate, isIsoDate, lagosToday, nightsBetween } from "@/lib/dates";
import { formatKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

function presets(today: string) {
  return [
    { key: "today", label: "Today", from: today, to: today },
    { key: "yesterday", label: "Yesterday", from: addDays(today, -1), to: addDays(today, -1) },
    { key: "7d", label: "Last 7 days", from: addDays(today, -6), to: today },
    { key: "mtd", label: "Month to date", from: `${today.slice(0, 8)}01`, to: today },
  ];
}

const pct = (num: number, den: number) => (den ? Math.round((1000 * num) / den) / 10 : 0);

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const profile = await requireRole(["hq_admin", "branch_admin"]);
  const sp = await searchParams;
  const today = lagosToday();
  const ranges = presets(today);
  const preset = ranges.find((r) => r.key === sp.range);
  let from = preset?.from ?? (isIsoDate(sp.from) ? sp.from : today);
  let to = preset?.to ?? (isIsoDate(sp.to) ? sp.to : today);
  if (to < from) [from, to] = [to, from];
  if (nightsBetween(from, to) > 366) from = addDays(to, -366);
  const active = preset?.key ?? (isIsoDate(sp.from) ? "custom" : "today");

  const supabase = await createClient();
  const [{ data, error }, { data: inHouse }] = await Promise.all([
    supabase.rpc("branch_report", { p_from: from, p_to: to }),
    supabase.from("reservations").select("branch_id").eq("status", "checked_in"),
  ]);
  if (error) throw new Error(error.message);

  // branch_report runs as the caller, so RLS zeroes other branches' figures;
  // branches themselves are public, so hide the empty rows for branch admins.
  const rows = (data ?? []).filter((r) => profile.role === "hq_admin" || r.branch_id === profile.branch_id);
  const tonight = new Map<string, number>();
  for (const r of inHouse ?? []) tonight.set(r.branch_id, (tonight.get(r.branch_id) ?? 0) + 1);

  const total = rows.reduce(
    (t, r) => ({
      rooms: t.rooms + r.rooms,
      available: t.available + r.room_nights_available,
      sold: t.sold + r.room_nights_sold,
      room: t.room + r.room_revenue_kobo,
      other: t.other + r.other_revenue_kobo,
      paid: t.paid + r.payments_kobo,
      tonight: t.tonight + (tonight.get(r.branch_id) ?? 0),
    }),
    { rooms: 0, available: 0, sold: 0, room: 0, other: 0, paid: 0, tonight: 0 }
  );
  const consolidated = profile.role === "hq_admin";
  const days = nightsBetween(from, to) + 1;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{consolidated ? "Chain performance" : "Branch performance"}</h1>
          <p className="text-sm text-muted-foreground">
            {from === to ? formatDate(from, { year: true }) : `${formatDate(from, { year: true })} – ${formatDate(to, { year: true })}`} · {days} day
            {days === 1 ? "" : "s"} · by business date
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            {ranges.map((r) => (
              <Link
                key={r.key}
                href={`/admin/reports?range=${r.key}`}
                className={cn("rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground", active === r.key && "bg-muted font-medium text-foreground")}
              >
                {r.label}
              </Link>
            ))}
          </div>
          <form className="flex items-center gap-1">
            <Input type="date" name="from" defaultValue={from} className="h-8 w-36" aria-label="From" />
            <Input type="date" name="to" defaultValue={to} className="h-8 w-36" aria-label="To" />
            <Button type="submit" variant="outline" size="sm">
              Apply
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile label="Occupancy" value={`${pct(total.sold, total.available)}%`} hint={`${total.sold} of ${total.available} room-nights`} />
        <Tile label="In house now" value={`${total.tonight}`} hint={`of ${total.rooms} rooms`} />
        <Tile label="Room revenue" value={formatKobo(total.room)} hint={`ADR ${formatKobo(total.sold ? Math.round(total.room / total.sold) : 0)}`} />
        <Tile label="Food, laundry & other" value={formatKobo(total.other)} />
        <Tile label="Total revenue" value={formatKobo(total.room + total.other)} hint={`Collected ${formatKobo(total.paid)}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By branch</CardTitle>
          <CardDescription>
            Occupancy counts booked room-nights (confirmed, in house, departed). Revenue is posted charges; collected is payments received.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead className="w-[22%]">Occupancy</TableHead>
                <TableHead className="text-right">In house</TableHead>
                <TableHead className="text-right">Room revenue</TableHead>
                <TableHead className="hidden text-right md:table-cell">ADR</TableHead>
                <TableHead className="hidden text-right md:table-cell">RevPAR</TableHead>
                <TableHead className="text-right">Other</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.branch_id}>
                  <TableCell className="font-medium">{r.branch_name}</TableCell>
                  <TableCell>
                    <Occupancy value={Number(r.occupancy_pct)} detail={`${r.room_nights_sold}/${r.room_nights_available}`} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {tonight.get(r.branch_id) ?? 0}/{r.rooms}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatKobo(r.room_revenue_kobo)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {formatKobo(r.room_nights_sold ? Math.round(r.room_revenue_kobo / r.room_nights_sold) : 0)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {formatKobo(r.room_nights_available ? Math.round(r.room_revenue_kobo / r.room_nights_available) : 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatKobo(r.other_revenue_kobo)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatKobo(r.room_revenue_kobo + r.other_revenue_kobo)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatKobo(r.payments_kobo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            {consolidated && rows.length > 1 && (
              <TableFooter>
                <TableRow>
                  <TableCell>All branches</TableCell>
                  <TableCell>
                    <Occupancy value={pct(total.sold, total.available)} detail={`${total.sold}/${total.available}`} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {total.tonight}/{total.rooms}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatKobo(total.room)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {formatKobo(total.sold ? Math.round(total.room / total.sold) : 0)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">
                    {formatKobo(total.available ? Math.round(total.room / total.available) : 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatKobo(total.other)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatKobo(total.room + total.other)}</TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">{formatKobo(total.paid)}</TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

/** Single-series meter: one neutral ink on a recessive track, value labelled in text. */
function Occupancy({ value, detail }: { value: number; detail: string }) {
  return (
    <div className="flex items-center gap-2" title={`${value}% · ${detail} room-nights`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground/70" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-12 text-right text-xs tabular-nums">{value}%</span>
    </div>
  );
}
