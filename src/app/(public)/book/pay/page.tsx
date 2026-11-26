import { notFound, redirect } from "next/navigation";
import { LockIcon } from "lucide-react";
import { getBookingByCode } from "@/lib/booking";
import { formatDate } from "@/lib/dates";
import { formatKobo } from "@/lib/money";
import { Eyebrow, luxeInput } from "../../luxe";
import { payOnline } from "../actions";
import { PayButton } from "./pay-button";

export const metadata = { title: "Payment — Lumaana" };

export default async function PayPage({ searchParams }: PageProps<"/book/pay">) {
  const sp = await searchParams;
  const b = await getBookingByCode(sp.code);
  if (!b) notFound();
  if (b.status === "confirmed" || b.status === "checked_in" || b.status === "checked_out") redirect(`/book/confirm?code=${b.confirmation_code}`);
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div className="mx-auto grid max-w-lg gap-6 px-4 py-10 sm:px-6">
      <div>
        <Eyebrow>Secure payment</Eyebrow>
        <h1 className="mt-3 font-[family-name:var(--font-luxe-serif)] text-4xl">Pay {formatKobo(b.total_kobo)}</h1>
        <p className="mt-2 text-sm text-[#e9e2d3]/60">
          {b.branch_name} · {b.room_type} · {formatDate(b.check_in)} → {formatDate(b.check_out)} ({b.nights} night{b.nights === 1 ? "" : "s"})
        </p>
      </div>

      <div className="rounded-lg border border-[#d8b36a]/40 bg-[#d8b36a]/10 px-3 py-2 text-xs text-[#e9e2d3]/80">
        <span className="font-medium text-[#d8b36a]">Test mode.</span> This prototype simulates a Paystack card payment. No card is charged.
      </div>

      <form action={payOnline} className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <input type="hidden" name="code" value={b.confirmation_code} />
        <div className="grid gap-1.5">
          <span className="text-[11px] tracking-[0.18em] text-[#e9e2d3]/55 uppercase">Email</span>
          <div className="text-sm">{b.guest_email}</div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="card" className="text-[11px] tracking-[0.18em] text-[#e9e2d3]/55 uppercase">Card number</label>
          <input id="card" className={luxeInput} defaultValue="4084 0840 8408 4081" inputMode="numeric" readOnly />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <label htmlFor="exp" className="text-[11px] tracking-[0.18em] text-[#e9e2d3]/55 uppercase">Expiry</label>
            <input id="exp" className={luxeInput} defaultValue="12 / 30" readOnly />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="cvv" className="text-[11px] tracking-[0.18em] text-[#e9e2d3]/55 uppercase">CVV</label>
            <input id="cvv" className={luxeInput} defaultValue="408" readOnly />
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <PayButton label={`Pay ${formatKobo(b.total_kobo)}`} />
        <p className="flex items-center justify-center gap-1.5 text-xs text-[#e9e2d3]/45">
          <LockIcon className="size-3" /> Booking reference <span className="font-mono">{b.confirmation_code}</span>
        </p>
      </form>
    </div>
  );
}
