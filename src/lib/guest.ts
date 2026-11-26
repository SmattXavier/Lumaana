import { cache } from "react";
import { requireRole } from "@/lib/auth";
import { lagosToday } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed-in guest's current stay: in house first, else the next confirmed
 * arrival, else the most recent past stay. RLS limits the query to their own
 * reservations, so no guest filter is needed here.
 */
export const getStay = cache(async () => {
  const profile = await requireRole(["guest"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservations")
    .select(`id, branch_id, status, check_in, check_out, adults, children, confirmation_code, total_kobo,
      checked_in_at, checked_out_at, room_types(name, description), rooms(number, floor),
      branches(name, city, address, phone), guests(full_name), folios(id, status)`)
    .in("status", ["checked_in", "confirmed", "checked_out"])
    .order("check_in", { ascending: false });
  if (error) throw new Error(error.message);

  const today = lagosToday();
  // a confirmed stay whose dates have passed is a no-show, not "upcoming"
  const all = (data ?? []).filter((r) => r.status !== "confirmed" || r.check_out > today);
  const current =
    all.find((r) => r.status === "checked_in") ??
    [...all].filter((r) => r.status === "confirmed").sort((a, b) => a.check_in.localeCompare(b.check_in))[0] ??
    all.find((r) => r.status === "checked_out") ??
    null;
  return { profile, stay: current, others: all.filter((r) => r !== current) };
});

export type Stay = NonNullable<Awaited<ReturnType<typeof getStay>>["stay"]>;

/** Folio lines and balance for a stay (guest RLS: own folio only). */
export async function getBill(folioId: string) {
  const supabase = await createClient();
  const [items, payments] = await Promise.all([
    supabase.from("folio_items").select("id, kind, description, qty, amount_kobo, business_date, posted_at").eq("folio_id", folioId).order("posted_at"),
    supabase.from("payments").select("id, method, amount_kobo, status, paid_at").eq("folio_id", folioId).order("paid_at"),
  ]);
  if (items.error) throw new Error(items.error.message);
  if (payments.error) throw new Error(payments.error.message);
  const charged = items.data.reduce((s, i) => s + i.amount_kobo, 0);
  const paid = payments.data.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount_kobo, 0);
  return { items: items.data, payments: payments.data, charged, paid, balance: charged - paid };
}
