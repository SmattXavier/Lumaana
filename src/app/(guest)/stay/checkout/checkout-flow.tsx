"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CreditCardIcon, LogOutIcon } from "lucide-react";
import { formatKobo } from "@/lib/money";
import { expressCheckout, payBalance } from "../actions";
import { GoldButton } from "../ui";

export function CheckoutFlow({ balanceKobo }: { balanceKobo: number }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else toast.success(r.ok);
    });

  if (balanceKobo > 0) {
    return (
      <div className="grid gap-2">
        <div className="rounded-xl border border-dashed border-black/15 bg-white p-3 text-xs text-black/55">
          <div className="mb-1 font-medium text-black/70">Card on file (test mode)</div>
          Visa •••• 4081 · no real money moves in the prototype
        </div>
        <GoldButton disabled={pending} onClick={() => run(payBalance)}>
          <CreditCardIcon className="size-4" />
          {pending ? "Processing…" : `Pay ${formatKobo(balanceKobo)}`}
        </GoldButton>
      </div>
    );
  }

  return (
    <GoldButton disabled={pending} onClick={() => run(expressCheckout)}>
      <LogOutIcon className="size-4" />
      {pending ? "Checking out…" : "Check out now"}
    </GoldButton>
  );
}
