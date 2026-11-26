import { createClient } from "@/lib/supabase/server";

/** Public booking lookup by confirmation code (see booking_summary in SQL). */
export async function getBookingByCode(code: unknown) {
  if (typeof code !== "string" || !/^[0-9a-f]{8}$/i.test(code)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("booking_summary", { p_code: code });
  return data?.[0] ?? null;
}
