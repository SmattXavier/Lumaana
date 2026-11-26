import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckIcon } from "lucide-react";
import { getBookingByCode } from "@/lib/booking";
import { formatDate } from "@/lib/dates";
import { formatKobo } from "@/lib/money";
import { Eyebrow } from "../../luxe";

export const metadata = { title: "Booking confirmed — Lumaana" };

export default async function ConfirmPage({ searchParams }: PageProps<"/book/confirm">) {
  const sp = await searchParams;
  const b = await getBookingByCode(sp.code);
  if (!b) notFound();
  if (b.status === "pending_payment") redirect(`/book/pay?code=${b.confirmation_code}`);
  const email = typeof sp.email === "string" ? sp.email : null;

  return (
    <div className="mx-auto grid max-w-2xl gap-8 px-4 py-12 sm:px-6">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-[#d8b36a]/60 text-[#d8b36a]">
          <CheckIcon className="size-6" />
        </div>
        <h1 className="mt-5 font-[family-name:var(--font-luxe-serif)] text-4xl sm:text-5xl">You&apos;re booked, {b.guest_name.split(" ")[0]}.</h1>
        <p className="mt-3 text-[#e9e2d3]/65">
          {email === "sent" && <>A confirmation has been sent to <span className="text-[#e9e2d3]">{b.guest_email}</span>.</>}
          {email && email !== "sent" && <>Keep this page — the confirmation email couldn&apos;t be sent from the prototype yet.</>}
          {!email && <>Confirmation for {b.guest_email}.</>}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <Eyebrow>Confirmation</Eyebrow>
            <div className="mt-1 font-mono text-2xl tracking-widest">{b.confirmation_code}</div>
          </div>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">Paid</span>
        </div>
        <dl className="grid gap-3 p-5 text-sm sm:grid-cols-2">
          <Item label="Hotel" value={b.branch_name} sub={b.branch_address ?? undefined} />
          <Item label="Room" value={b.room_type} sub={`${b.adults} guest${b.adults === 1 ? "" : "s"}`} />
          <Item label="Check-in" value={formatDate(b.check_in, { weekday: true })} sub="From 2:00 pm" />
          <Item label="Check-out" value={formatDate(b.check_out, { weekday: true })} sub="By 12:00 noon" />
          <Item label="Paid" value={formatKobo(b.total_kobo)} sub={`${b.nights} night${b.nights === 1 ? "" : "s"} × ${formatKobo(b.nightly_rate_kobo)}`} />
          <Item label="Front desk" value={b.branch_phone ?? "—"} />
        </dl>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#d8b36a]/30 p-5 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="font-medium">Your stay, on your phone</div>
          <div className="text-[#e9e2d3]/60">Sign in with {b.guest_email} to see your live bill, send requests and check out express.</div>
        </div>
        <Link
          href="/login?next=/stay"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#d8b36a] px-5 text-sm font-medium text-[#0d1117] hover:bg-[#e3c283]"
        >
          Open guest app
        </Link>
      </div>

      <Link href="/" className="text-center text-sm text-[#e9e2d3]/50 hover:text-[#e9e2d3]">
        Back to Lumaana
      </Link>
    </div>
  );
}

function Item({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-[0.18em] text-[#e9e2d3]/45 uppercase">{label}</dt>
      <dd className="mt-0.5">{value}</dd>
      {sub && <dd className="text-xs text-[#e9e2d3]/50">{sub}</dd>}
    </div>
  );
}
