"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { fd, type ActionResult } from "@/lib/action-result";
import { DESK_BRANCH_COOKIE } from "@/lib/desk";
import type { Enums } from "@/lib/database.types";
import { isIsoDate } from "@/lib/dates";
import { formatKobo, parseNairaToKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Every state change here goes through a SQL function; the DB error messages
// are written for staff and are shown verbatim.

const DESK: Parameters<typeof requireRole>[0] = ["hq_admin", "branch_admin", "front_desk"];
const KINDS = ["food", "laundry", "minibar", "other"] as const;
const METHODS = ["cash", "pos", "transfer", "paystack"] as const;

function refresh(reservationId?: string) {
  revalidatePath("/front-desk", "layout");
  if (reservationId) revalidatePath(`/front-desk/reservations/${reservationId}`);
}

export async function setDeskBranch(form: FormData) {
  const profile = await requireRole(DESK);
  if (profile.role === "hq_admin") {
    (await cookies()).set(DESK_BRANCH_COOKIE, fd(form, "branch_id"), { path: "/front-desk", sameSite: "lax", httpOnly: true });
  }
  refresh();
}

export async function createDeskBooking(form: FormData): Promise<ActionResult> {
  await requireRole(DESK);
  const checkIn = fd(form, "check_in");
  const checkOut = fd(form, "check_out");
  const adults = Number(fd(form, "adults") || "1");
  const name = fd(form, "full_name");
  const source = fd(form, "source") === "phone" ? "phone" : "walk_in";
  if (!name) return { error: "Enter the guest's name." };
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut)) return { error: "Pick check-in and check-out dates." };
  if (!Number.isInteger(adults) || adults < 1 || adults > 10) return { error: "Adults must be 1–10." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_desk_booking", {
    p_branch: fd(form, "branch_id"), p_room_type: fd(form, "room_type_id"),
    p_check_in: checkIn, p_check_out: checkOut, p_adults: adults,
    p_full_name: name, p_email: fd(form, "email"), p_phone: fd(form, "phone"), p_source: source,
  });
  if (error) return { error: error.message };
  refresh();
  redirect(`/front-desk/reservations/${data}`);
}

export async function checkIn(form: FormData): Promise<ActionResult> {
  await requireRole(DESK);
  const reservationId = fd(form, "reservation_id");
  const idType = fd(form, "id_type");
  const idNumber = fd(form, "id_number");
  if (!fd(form, "room_id")) return { error: "Choose a room." };
  if (!idType || !idNumber) return { error: "Enter the ID type and number." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in", {
    p_reservation: reservationId, p_room: fd(form, "room_id"),
    p_id_type: idType, p_id_number: idNumber,
    // nullable in SQL; the generated type doesn't say so
    p_id_photo_path: (fd(form, "id_photo_path") || null) as unknown as string,
  });
  if (error) {
    if (error.code === "23P01") return { error: "That room is already booked for these dates. Pick another room." };
    return { error: error.message };
  }
  refresh(reservationId);
  return { ok: "Checked in." };
}

export async function postCharge(form: FormData): Promise<ActionResult> {
  await requireRole(DESK);
  const reservationId = fd(form, "reservation_id");
  const kind = fd(form, "kind") as (typeof KINDS)[number];
  const description = fd(form, "description");
  const qty = Number(fd(form, "qty") || "1");
  const unit = parseNairaToKobo(fd(form, "unit"));
  if (!KINDS.includes(kind)) return { error: "Pick what the charge is for." };
  if (!description) return { error: "Describe the charge." };
  if (!Number.isInteger(qty) || qty < 1 || qty > 100) return { error: "Quantity must be a whole number from 1 to 100." };
  if (unit === null || unit <= 0) return { error: "Enter the unit price in naira, e.g. 8500." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("post_charge", {
    p_reservation: reservationId, p_kind: kind, p_description: description, p_qty: qty, p_unit_kobo: unit,
  });
  if (error) return { error: error.message };
  refresh(reservationId);
  return { ok: `Charged ${formatKobo(unit * qty)} to the room.` };
}

export async function recordPayment(form: FormData): Promise<ActionResult> {
  await requireRole(DESK);
  const reservationId = fd(form, "reservation_id");
  const method = fd(form, "method") as Enums<"payment_method">;
  const amount = parseNairaToKobo(fd(form, "amount"));
  if (!METHODS.includes(method)) return { error: "Pick a payment method." };
  if (amount === null || amount <= 0) return { error: "Enter the amount in naira." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_payment", {
    p_reservation: reservationId, p_method: method, p_amount_kobo: amount, p_reference: fd(form, "reference"),
  });
  if (error) {
    if (error.code === "23505") return { error: "A payment with that reference already exists." };
    return { error: error.message };
  }
  refresh(reservationId);
  return { ok: `Recorded ${formatKobo(amount)}.` };
}

export async function checkOut(form: FormData): Promise<ActionResult> {
  await requireRole(DESK);
  const reservationId = fd(form, "reservation_id");
  const supabase = await createClient();
  const { error } = await supabase.rpc("check_out", { p_reservation: reservationId });
  if (error) return { error: error.message };
  refresh(reservationId);
  return { ok: "Checked out. Room marked for housekeeping." };
}

export async function closeBusinessDay(form: FormData): Promise<ActionResult> {
  await requireRole(DESK);
  const supabase = await createClient();
  const { error } = await supabase.rpc("close_business_day", {
    p_branch: fd(form, "branch_id"), p_date: fd(form, "business_date"),
  });
  if (error) return { error: error.message };
  refresh();
  revalidatePath("/admin/reports");
  return { ok: "Business day closed and locked." };
}

// Guest service requests are a work queue, not reservation/room/folio state,
// so staff update the row directly (RLS: their branch only).
export async function updateRequest(form: FormData) {
  await requireRole(DESK);
  const status = fd(form, "status");
  if (status !== "in_progress" && status !== "done") return;
  const supabase = await createClient();
  await supabase.from("service_requests").update({ status }).eq("id", fd(form, "id"));
  refresh();
}
