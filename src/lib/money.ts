// Money is integer kobo everywhere (bigint in Postgres, number over the wire).
// Never use floats for amounts: these helpers only do integer/string maths.

const ZERO = BigInt(0);
const HUNDRED = BigInt(100);
const nairaFormat = new Intl.NumberFormat("en-NG");

/** 4500000 → "₦45,000.00" */
export function formatKobo(kobo: number | bigint, currency = "NGN"): string {
  const value = BigInt(kobo);
  const sign = value < ZERO ? "-" : "";
  const abs = value < ZERO ? -value : value;
  const naira = abs / HUNDRED;
  const rest = (abs % HUNDRED).toString().padStart(2, "0");
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return `${sign}${symbol}${nairaFormat.format(naira)}.${rest}`;
}

/** 4500000 → "45000.00" — for pre-filling a naira input. */
export function koboToNairaInput(kobo: number | bigint): string {
  const value = BigInt(kobo);
  return `${value / HUNDRED}.${(value % HUNDRED).toString().padStart(2, "0")}`;
}

/**
 * Parses a naira amount typed by a user ("45,000", "45000.5", "₦45,000.00")
 * into kobo without going through floating point. Returns null if invalid.
 */
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const kobo = BigInt(match[1]) * HUNDRED + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (kobo > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(kobo);
}
