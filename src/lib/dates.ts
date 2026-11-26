// Stay dates are plain ISO dates (YYYY-MM-DD). The hotels run on WAT, so
// "today" is computed in Africa/Lagos, matching lagos_today() in SQL.

const TZ = "Africa/Lagos";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function lagosToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000);
}

/** "2026-11-26" → "Thu 26 Nov" (or with year: "26 Nov 2026") */
export function formatDate(iso: string, opts: { year?: boolean; weekday?: boolean } = {}): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(opts.year ? { year: "numeric" } : {}),
    ...(opts.weekday !== false && !opts.year ? { weekday: "short" } : {}),
  }).format(new Date(`${iso}T00:00:00Z`));
}

/** timestamptz → "26 Nov, 14:05" in hotel time */
export function formatDateTime(ts: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(ts));
}
