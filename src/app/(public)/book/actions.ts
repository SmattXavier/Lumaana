"use server";

import { redirect } from "next/navigation";
import { fd } from "@/lib/action-result";
import { isIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export type BookState = { error?: string; values?: Record<string, string> };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createOnlineBooking(_prev: BookState, form: FormData): Promise<BookState> {
  const values = Object.fromEntries(["full_name", "email", "phone"].map((k) => [k, fd(form, k)]));
  const checkIn = fd(form, "check_in");
  const checkOut = fd(form, "check_out");
  const adults = Number(fd(form, "adults"));
  if (!values.full_name) return { error: "Please enter your full name.", values };
  if (!EMAIL.test(values.email)) return { error: "Please enter a valid email — your confirmation goes there.", values };
  if (!/^\+?[\d\s()-]{7,20}$/.test(values.phone)) return { error: "Please enter a phone number we can reach you on.", values };
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut) || !Number.isInteger(adults)) return { error: "Your dates have expired. Please search again.", values };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_online_booking", {
    p_branch: fd(form, "branch_id"), p_room_type: fd(form, "room_type_id"),
    p_check_in: checkIn, p_check_out: checkOut, p_adults: adults, p_children: 0,
    p_full_name: values.full_name, p_email: values.email, p_phone: values.phone,
  });
  if (error) return { error: error.message, values };
  redirect(`/book/pay?code=${data[0].confirmation_code}`);
}

// PROTOTYPE: stands in for Paystack checkout + webhook (see confirm_test_payment).
export async function payOnline(form: FormData) {
  const code = fd(form, "code");
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_test_payment", { p_code: code });
  if (error) redirect(`/book/pay?code=${encodeURIComponent(code)}&error=${encodeURIComponent(error.message)}`);

  // Best effort: the booking is confirmed whether or not the email goes out.
  let email = "failed";
  try {
    const { data, error: fnError } = await supabase.functions.invoke<{ sent: boolean; reason?: string }>("send-confirmation", { body: { code } });
    email = fnError ? "failed" : data?.sent ? "sent" : "skipped";
  } catch {
    email = "failed";
  }
  redirect(`/book/confirm?code=${encodeURIComponent(code)}&email=${email}`);
}
