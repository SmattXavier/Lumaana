"use server";

import { revalidatePath } from "next/cache";
import { fd, type ActionResult } from "@/lib/action-result";
import { getBill, getStay } from "@/lib/guest";
import { formatKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

const TYPES = ["housekeeping", "laundry", "room_service", "repair"] as const;

export async function sendRequest(form: FormData): Promise<ActionResult> {
  const { stay } = await getStay();
  if (!stay || stay.status !== "checked_in") return { error: "Requests open once you're checked in." };
  const type = fd(form, "type") as (typeof TYPES)[number];
  if (!TYPES.includes(type)) return { error: "Choose what you need." };

  const supabase = await createClient();
  // RLS: a guest can only insert for their own in-house reservation.
  const { error } = await supabase.from("service_requests").insert({
    branch_id: stay.branch_id, reservation_id: stay.id, type, note: fd(form, "note") || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/stay/requests");
  return { ok: "Sent to the front desk." };
}

// PROTOTYPE: stands in for a Paystack charge of the outstanding balance.
export async function payBalance(): Promise<ActionResult> {
  const { stay } = await getStay();
  if (!stay?.folios || stay.status !== "checked_in") return { error: "There's no open bill to pay." };
  const { balance } = await getBill(stay.folios.id);
  if (balance <= 0) return { error: "Nothing to pay — your bill is settled." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_payment", {
    p_reservation: stay.id, p_method: "paystack", p_amount_kobo: balance,
    p_reference: `TEST-${stay.confirmation_code}-${Date.now()}`,
  });
  if (error) return { error: error.message };
  revalidatePath("/stay", "layout");
  return { ok: `Paid ${formatKobo(balance)}.` };
}

export async function expressCheckout(): Promise<ActionResult> {
  const { stay } = await getStay();
  if (!stay || stay.status !== "checked_in") return { error: "You're not checked in." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_out", { p_reservation: stay.id });
  if (error) return { error: error.message };
  revalidatePath("/stay", "layout");
  return { ok: "You're checked out. Safe travels!" };
}
