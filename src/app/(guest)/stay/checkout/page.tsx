import { formatDate, formatDateTime } from "@/lib/dates";
import { getBill, getStay } from "@/lib/guest";
import { formatKobo } from "@/lib/money";
import { H1, NoStay, Panel } from "../ui";
import { CheckoutFlow } from "./checkout-flow";

export default async function CheckoutPage() {
  const { stay } = await getStay();
  if (!stay) return <NoStay />;
  const bill = stay.folios ? await getBill(stay.folios.id) : null;

  if (stay.status === "checked_out") {
    return (
      <div className="grid gap-5">
        <H1>Thank you, safe travels</H1>
        <Panel className="grid gap-1 text-sm">
          <div className="text-black/50">Checked out {stay.checked_out_at ? formatDateTime(stay.checked_out_at) : ""}</div>
          <div className="font-medium">
            {stay.branches?.name} · Room {stay.rooms?.number}
          </div>
          <div className="text-black/60">
            {formatDate(stay.check_in)} → {formatDate(stay.check_out)}
          </div>
          {bill && (
            <div className="mt-2 flex justify-between border-t border-black/10 pt-2">
              <span>Total paid</span>
              <span className="font-medium tabular-nums">{formatKobo(bill.paid)}</span>
            </div>
          )}
        </Panel>
        <p className="text-sm text-black/55">Your folio is closed. A receipt is available from the front desk on request.</p>
      </div>
    );
  }

  if (stay.status !== "checked_in" || !bill) {
    return (
      <div className="grid gap-3">
        <H1>Express checkout</H1>
        <p className="text-sm text-black/60">Express checkout opens once you&apos;re checked in.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <H1>Express checkout</H1>
      <p className="text-sm text-black/60">
        Settle your bill and check out from your phone. Leave your key card in the room or at the desk.
      </p>
      <Panel className="grid gap-2 text-sm">
        <Row label="Room charges & extras" value={formatKobo(bill.charged)} />
        <Row label="Already paid" value={`−${formatKobo(bill.paid)}`} />
        <div className="flex justify-between border-t border-black/10 pt-2 text-base font-medium">
          <span>Balance</span>
          <span className="tabular-nums">{formatKobo(Math.max(bill.balance, 0))}</span>
        </div>
      </Panel>
      <CheckoutFlow balanceKobo={bill.balance} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-black/60">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
