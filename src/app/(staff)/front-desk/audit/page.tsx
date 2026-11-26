import { LockIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatDateTime, lagosToday } from "@/lib/dates";
import { getDeskBranch } from "@/lib/desk";
import { PAYMENT_METHOD } from "@/lib/labels";
import { formatKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { CloseDayButton } from "./close-day";

export type DaySummary = {
  rooms_available: number;
  rooms_occupied: number;
  occupancy_pct: number;
  room_revenue_kobo: number;
  other_revenue_kobo: number;
  payments_kobo: number;
  payments_by_method: Partial<Record<keyof typeof PAYMENT_METHOD, number>>;
  rooms_dirty: number;
  rooms_out_of_order: number;
  arrivals_pending?: number;
  unsettled_checkouts?: number;
};

export default async function NightAuditPage() {
  const { branch } = await getDeskBranch();
  const supabase = await createClient();
  const today = lagosToday();

  const { data: openDate, error } = await supabase.rpc("branch_business_date", { p_branch: branch.id });
  if (error) throw new Error(error.message);
  const [{ data: preview, error: pErr }, { data: history }] = await Promise.all([
    supabase.rpc("business_day_summary", { p_branch: branch.id, p_date: openDate }),
    supabase
      .from("night_audits")
      .select("id, business_date, summary, closed_at")
      .eq("branch_id", branch.id)
      .order("business_date", { ascending: false })
      .limit(14),
  ]);
  if (pErr) throw new Error(pErr.message);
  const s = preview as unknown as DaySummary;
  const notStarted = openDate > today;
  const blocked = (s.unsettled_checkouts ?? 0) > 0;
  const lastClosed = history?.[0];

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Night audit · {branch.name}</CardTitle>
          <CardDescription>
            {notStarted ? (
              <>
                {formatDate(lastClosed!.business_date, { year: true })} is closed and locked. The next business day,{" "}
                {formatDate(openDate, { year: true })}, hasn&apos;t started yet.
              </>
            ) : (
              <>
                Open business day: <span className="font-medium text-foreground">{formatDate(openDate, { year: true })}</span>. Closing it
                writes the summary below and locks the day — no charge or payment can be added to or changed on it afterwards; new
                postings go to the next day.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SummaryGrid s={s} />
          {!notStarted && (
            <div className="grid gap-2 text-sm">
              {blocked && (
                <p className="text-destructive">
                  {s.unsettled_checkouts} checked-out folio(s) still carry a balance. Settle them before closing the day.
                </p>
              )}
              {(s.arrivals_pending ?? 0) > 0 && (
                <p className="text-muted-foreground">
                  {s.arrivals_pending} confirmed arrival(s) haven&apos;t checked in yet. They stay on the arrivals list.
                </p>
              )}
              <div>
                <CloseDayButton
                  branchId={branch.id}
                  date={openDate}
                  label={formatDate(openDate, { year: true })}
                  disabled={blocked}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Closed days</CardTitle>
          <CardDescription>Locked. Figures are as they stood at close.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business day</TableHead>
                <TableHead className="text-right">Occupancy</TableHead>
                <TableHead className="text-right">Room revenue</TableHead>
                <TableHead className="text-right">Other revenue</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="hidden md:table-cell">Closed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(history ?? []).map((a) => {
                const h = a.summary as unknown as DaySummary;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <LockIcon className="mr-1 inline size-3 text-muted-foreground" />
                      {formatDate(a.business_date, { year: true })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {h.occupancy_pct}% ({h.rooms_occupied}/{h.rooms_available})
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatKobo(h.room_revenue_kobo)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKobo(h.other_revenue_kobo)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatKobo(h.payments_kobo)}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatDateTime(a.closed_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(history ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No days closed yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryGrid({ s }: { s: DaySummary }) {
  const methods = Object.entries(s.payments_by_method ?? {}) as [keyof typeof PAYMENT_METHOD, number][];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Figure label="Occupancy" value={`${s.occupancy_pct}%`} hint={`${s.rooms_occupied} of ${s.rooms_available} rooms`} />
      <Figure label="Room revenue" value={formatKobo(s.room_revenue_kobo)} />
      <Figure label="Food, laundry & other" value={formatKobo(s.other_revenue_kobo)} />
      <Figure
        label="Payments taken"
        value={formatKobo(s.payments_kobo)}
        hint={methods.length ? methods.map(([m, v]) => `${PAYMENT_METHOD[m]} ${formatKobo(v)}`).join(" · ") : "None"}
      />
      <Figure label="Rooms to clean" value={s.rooms_dirty} />
      <Figure label="Out of order" value={s.rooms_out_of_order} />
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
