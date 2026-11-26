import Link from "next/link";
import { NativeSelect } from "@/components/app/native-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Enums } from "@/lib/database.types";
import { formatDate, lagosToday } from "@/lib/dates";
import { getDeskBranch } from "@/lib/desk";
import { RESERVATION_STATUS } from "@/lib/labels";
import { formatKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { ReservationBadge } from "../status";

const VIEWS = {
  upcoming: "Upcoming & in house",
  all: "All",
  ...RESERVATION_STATUS,
} as const;

export default async function ReservationsPage({ searchParams }: PageProps<"/front-desk/reservations">) {
  const sp = await searchParams;
  const view = (typeof sp.view === "string" && sp.view in VIEWS ? sp.view : "upcoming") as keyof typeof VIEWS;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const { branch } = await getDeskBranch();
  const supabase = await createClient();

  let query = supabase
    .from("reservations")
    .select("id, status, source, check_in, check_out, total_kobo, confirmation_code, guests!inner(full_name, email, phone), room_types(name), rooms(number)")
    .eq("branch_id", branch.id)
    .order("check_in", { ascending: view === "upcoming" })
    .limit(200);
  if (view === "upcoming") query = query.in("status", ["confirmed", "checked_in", "pending_payment"]).gte("check_out", lagosToday());
  else if (view !== "all") query = query.eq("status", view as Enums<"reservation_status">);
  if (q) {
    const like = `%${q.replace(/[%_,()]/g, " ")}%`;
    query = /^[0-9a-f]{8}$/i.test(q)
      ? query.eq("confirmation_code", q.toUpperCase())
      : query.ilike("guests.full_name", like);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservations</CardTitle>
        <CardDescription>{branch.name}. Search by guest name or 8-character confirmation code.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <form className="flex flex-wrap gap-2">
          <Input name="q" defaultValue={q} placeholder="Guest name or code" className="max-w-xs" />
          <NativeSelect name="view" defaultValue={view} className="w-auto">
            {Object.entries(VIEWS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Stay</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Room total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/front-desk/reservations/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                    {r.guests.full_name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.guests.email ?? r.guests.phone}</div>
                </TableCell>
                <TableCell className="font-mono text-xs">{r.confirmation_code}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(r.check_in)} → {formatDate(r.check_out)}
                </TableCell>
                <TableCell>
                  {r.rooms?.number ? `${r.rooms.number} · ` : ""}
                  <span className="text-muted-foreground">{r.room_types?.name}</span>
                </TableCell>
                <TableCell>
                  <ReservationBadge status={r.status} />
                  <span className="ml-1 text-xs text-muted-foreground">{r.source.replace("_", "-")}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatKobo(r.total_kobo)}</TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No reservations match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
