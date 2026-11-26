"use client";

import { useActionState } from "react";
import { GoldButton, LuxeLabel, luxeInput } from "../luxe";
import { createOnlineBooking, type BookState } from "./actions";

export function BookForm({
  hidden, prefill, totalLabel,
}: {
  hidden: Record<string, string>;
  prefill: { full_name?: string; email?: string; phone?: string };
  totalLabel: string;
}) {
  const [state, action, pending] = useActionState<BookState, FormData>(createOnlineBooking, {});
  const v = { ...prefill, ...state.values };
  return (
    <form action={action} className="mt-8 grid max-w-lg gap-5">
      {Object.entries(hidden).map(([k, val]) => (
        <input key={k} type="hidden" name={k} value={val} />
      ))}
      <div className="grid gap-1.5">
        <LuxeLabel htmlFor="b-name">Full name</LuxeLabel>
        <input id="b-name" name="full_name" className={luxeInput} defaultValue={v.full_name} autoComplete="name" required />
      </div>
      <div className="grid gap-1.5">
        <LuxeLabel htmlFor="b-email">Email</LuxeLabel>
        <input id="b-email" name="email" type="email" className={luxeInput} defaultValue={v.email} autoComplete="email" required />
      </div>
      <div className="grid gap-1.5">
        <LuxeLabel htmlFor="b-phone">Phone</LuxeLabel>
        <input id="b-phone" name="phone" type="tel" className={luxeInput} defaultValue={v.phone} autoComplete="tel" placeholder="+234 …" required />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}
      <GoldButton type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Holding your room…" : `Continue to payment · ${totalLabel}`}
      </GoldButton>
    </form>
  );
}
