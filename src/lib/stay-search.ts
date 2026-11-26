import { addDays, isIsoDate, lagosToday, nightsBetween } from "@/lib/dates";

export const MAX_NIGHTS = 30;

/** Reads ?in=&out=&adults= with safe defaults (tonight, one night, two adults). */
export function readStaySearch(sp: Record<string, string | string[] | undefined>) {
  const today = lagosToday();
  const rawIn = typeof sp.in === "string" ? sp.in : "";
  const rawOut = typeof sp.out === "string" ? sp.out : "";
  const checkIn = isIsoDate(rawIn) && rawIn >= today ? rawIn : today;
  let checkOut = isIsoDate(rawOut) && rawOut > checkIn ? rawOut : addDays(checkIn, 1);
  if (nightsBetween(checkIn, checkOut) > MAX_NIGHTS) checkOut = addDays(checkIn, MAX_NIGHTS);
  const adultsN = Number(typeof sp.adults === "string" ? sp.adults : "2");
  const adults = Number.isInteger(adultsN) && adultsN >= 1 && adultsN <= 10 ? adultsN : 2;
  return { today, checkIn, checkOut, adults, nights: nightsBetween(checkIn, checkOut) };
}
