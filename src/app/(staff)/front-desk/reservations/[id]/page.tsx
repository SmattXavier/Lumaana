import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatDate, formatDateTime, nightsBetween } from "@/lib/dates";
import { ITEM_KIND, PAYMENT_METHOD } from "@/lib/labels";
import { formatKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ReservationBadge } from "../../status";
import { CheckInCard } from "./check-in";
import { FolioActions } from "./folio-actions";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReservationPage({ params }: PageProps<"/front-desk/reservations/[id]">) {
  const { id } = await params;
  await requireRole(["hq_admin", "branch_admin", "front_desk"]);
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();

  // RLS returns nothing for another branch's reservation → 404.
  const { data: res } = await supabase
    .from("reservations")
    .select(`id, branch_id, room_type_id, status, source, check_in, check_out, adults, children,
      nightly_rate_kobo, total_kobo, confirmation_code, id_photo_path, checked_in_at, checked_out_at, created_at,
      guests(full_name, email, phone, id_type, id_number), room_types(name), rooms(number, floor), branches(name),
      folios(id, status, closed_at, folio_items(id, kind, description, qty, unit_kobo, amount_kobo, business_date, posted_at),
             payments(id, method, amount_kobo, status, reference, business_date, paid_at))`)
    .eq("id", id)
    .maybeSingle();
  if (!res) notFound();

  const folio = res.folios;
  const items = [...(folio?.folio_items ?? [])].sort((a, b) => a.posted_at.localeCompare(b.posted_at));
  const payments = [...(folio?.payments ?? [])].sort((a, b) => a.paid_at.localeCompare(b.paid_at));
  const charged = items.reduce((s, i) => s + i.amount_kobo, 0);
  const paid = payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount_kobo, 0);
  const balance = charged - paid;

  let rooms: { id: string; number: string; status: "vacant_clean" | "vacant_dirty" | "occupied" | "out_of_order"; taken: boolean }[] = [];
  if (res.status === "confirmed") {
    const [{ data: typeRooms }, { data: clashes }] = await Promise.all([
      supabase.from("rooms").select("id, number, status").eq("room_type_id", res.room_type_id).order("number"),
      supabase
        .from("reservations")
        .select("room_id")
        .eq("branch_id", res.branch_id)
        .in("status", ["confirmed", "checked_in"])
        .not("room_id", "is", null)
        .neq("id", res.id)
        .lt("check_in", res.check_out)
        .gt("check_out", res.check_in),
    ]);
    const taken = new Set((clashes ?? []).map((c) => c.room_id));
    rooms = (typeRooms ?? []).map((r) => ({ ...r, taken: taken.has(r.id) }));
  }

  let idPhotoUrl: string | null = null;
  if (res.id_photo_path) {
    const { data } = await supabase.storage.from("guest-ids").createSignedUrl(res.id_photo_path, 600);
    idPhotoUrl = data?.signedUrl ?? null;
  }

  const g = res.guests;
  return (
    <div className="grid gap-4">
      {folio && res.status === "checked_in" && (
        <RealtimeRefresh
          channel={`folio-${folio.id}`}
          watch={[
            { table: "folio_items", filter: `folio_id=eq.${folio.id}` },
            { table: "payments", filter: `folio_id=eq.${folio.id}` },
          ]}
        />
      )}
      <Link href="/front-desk/reservations" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeftIcon className="size-4" /> Reservations
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            {g?.full_name} <ReservationBadge status={res.status} />
          </CardTitle>
          <CardDescription>
            <span className="font-mono">{res.confirmation_code}</span> · {res.branches?.name} · booked {res.source.replace("_", "-")}{" "}
            {formatDateTime(res.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <Item label="Stay">
              {formatDate(res.check_in)} → {formatDate(res.check_out)} ({nightsBetween(res.check_in, res.check_out)} nights)
            </Item>
            <Item label="Room">
              {res.rooms ? `${res.rooms.number} · ` : "Not assigned · "}
              {res.room_types?.name}
            </Item>
            <Item label="Guests">
              {res.adults} adult{res.adults === 1 ? "" : "s"}
              {res.children ? `, ${res.children} child${res.children === 1 ? "" : "ren"}` : ""}
            </Item>
            <Item label="Rate">{formatKobo(res.nightly_rate_kobo)} / night</Item>
            <Item label="Contact">
              {g?.email ?? "—"}
              <br />
              {g?.phone}
            </Item>
            <Item label="ID">{g?.id_type ? `${g.id_type} · ${g.id_number}` : "Not recorded"}</Item>
            <Item label="Checked in">{res.checked_in_at ? formatDateTime(res.checked_in_at) : "—"}</Item>
            <Item label="Checked out">{res.checked_out_at ? formatDateTime(res.checked_out_at) : "—"}</Item>
          </dl>
          {idPhotoUrl && (
            <a href={idPhotoUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={idPhotoUrl} alt="Guest ID" className="h-28 rounded-md border object-cover" />
            </a>
          )}
        </CardContent>
      </Card>

      {res.status === "pending_payment" && (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Online booking awaiting payment. It confirms automatically when the guest pays; holds lapse after 30 minutes.
          </CardContent>
        </Card>
      )}

      {res.status === "confirmed" && (
        <CheckInCard
          reservationId={res.id}
          branchId={res.branch_id}
          rooms={rooms}
          defaults={{ id_type: g?.id_type ?? null, id_number: g?.id_number ?? null }}
        />
      )}

      {folio && (
        <Card>
          <CardHeader>
            <CardTitle>Folio</CardTitle>
            <CardDescription>
              {folio.status === "closed" ? `Closed ${folio.closed_at ? formatDateTime(folio.closed_at) : ""}` : "Open"} · balance{" "}
              <span className={cn("font-medium", balance > 0 ? "text-destructive" : "text-foreground")}>{formatKobo(balance)}</span>
            </CardDescription>
            <CardAction>
              <FolioActions
                reservationId={res.id}
                balanceKobo={balance}
                canCharge={folio.status === "open" && res.status === "checked_in"}
                canCheckOut={res.status === "checked_in"}
              />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business date</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(i.business_date)}</TableCell>
                    <TableCell>{i.description}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{ITEM_KIND[i.kind]}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(i.qty)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKobo(i.amount_kobo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4}>Total charges</TableCell>
                  <TableCell className="text-right tabular-nums">{formatKobo(charged)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paid</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="hidden sm:table-cell">Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(p.paid_at)}</TableCell>
                    <TableCell>
                      {PAYMENT_METHOD[p.method]}
                      {p.status !== "succeeded" && <span className="ml-1 text-xs text-muted-foreground">({p.status})</span>}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{p.reference}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKobo(p.amount_kobo)}</TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No payments yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Balance due</TableCell>
                  <TableCell className={cn("text-right tabular-nums", balance > 0 && "text-destructive")}>{formatKobo(balance)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
