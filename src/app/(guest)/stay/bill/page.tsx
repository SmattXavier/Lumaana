import Link from "next/link";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { formatDate, formatDateTime } from "@/lib/dates";
import { getBill, getStay } from "@/lib/guest";
import { ITEM_KIND, PAYMENT_METHOD } from "@/lib/labels";
import { formatKobo } from "@/lib/money";
import { H1, NoStay, Panel } from "../ui";

export default async function BillPage() {
  const { stay } = await getStay();
  if (!stay) return <NoStay />;
  if (!stay.folios) {
    return (
      <div className="grid gap-3">
        <H1>Your bill</H1>
        <p className="text-sm text-black/60">Your bill opens once your booking is paid and confirmed.</p>
      </div>
    );
  }
  const folioId = stay.folios.id;
  const bill = await getBill(folioId);
  const live = stay.folios.status === "open";

  return (
    <div className="grid gap-5">
      {live && (
        <RealtimeRefresh
          channel={`bill-${folioId}`}
          watch={[
            { table: "folio_items", filter: `folio_id=eq.${folioId}` },
            { table: "payments", filter: `folio_id=eq.${folioId}` },
          ]}
        />
      )}
      <div className="flex items-end justify-between">
        <H1>Your bill</H1>
        {live ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-700">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
            </span>
            Live
          </span>
        ) : (
          <span className="text-xs text-black/50">Closed</span>
        )}
      </div>

      <Panel className="bg-[#0d1117] text-[#e9e2d3]">
        <div className="text-xs tracking-[0.2em] text-[#d8b36a] uppercase">{bill.balance > 0 ? "Balance due" : "Settled"}</div>
        <div className="font-[family-name:var(--font-luxe-serif)] text-4xl tabular-nums">{formatKobo(Math.max(bill.balance, 0))}</div>
        <div className="mt-1 text-xs text-[#e9e2d3]/60">
          Charges {formatKobo(bill.charged)} · Paid {formatKobo(bill.paid)}
        </div>
      </Panel>

      <section className="grid gap-1">
        <h2 className="mb-1 text-xs tracking-[0.2em] text-black/40 uppercase">Charges</h2>
        {bill.items.map((i) => (
          <div key={i.id} className="flex items-start justify-between gap-3 border-b border-black/5 py-2.5 text-sm last:border-0">
            <div>
              <div>{i.description}</div>
              <div className="text-xs text-black/45">
                {ITEM_KIND[i.kind]} · {formatDate(i.business_date)}
                {Number(i.qty) > 1 ? ` · ×${Number(i.qty)}` : ""}
              </div>
            </div>
            <div className="tabular-nums">{formatKobo(i.amount_kobo)}</div>
          </div>
        ))}
      </section>

      {bill.payments.length > 0 && (
        <section className="grid gap-1">
          <h2 className="mb-1 text-xs tracking-[0.2em] text-black/40 uppercase">Payments</h2>
          {bill.payments.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-3 border-b border-black/5 py-2.5 text-sm last:border-0">
              <div>
                <div>{PAYMENT_METHOD[p.method]}</div>
                <div className="text-xs text-black/45">{formatDateTime(p.paid_at)}</div>
              </div>
              <div className="text-emerald-700 tabular-nums">−{formatKobo(p.amount_kobo)}</div>
            </div>
          ))}
        </section>
      )}

      {live && stay.status === "checked_in" && (
        <Link href="/stay/checkout" className="flex h-12 items-center justify-center rounded-xl bg-[#0d1117] text-sm font-medium text-[#e9e2d3]">
          {bill.balance > 0 ? "Pay and check out" : "Express checkout"}
        </Link>
      )}
    </div>
  );
}
