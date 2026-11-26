"use client";

import { useState } from "react";
import { BanknoteIcon, LogOutIcon, ReceiptIcon } from "lucide-react";
import { NativeSelect } from "@/components/app/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatKobo, koboToNairaInput } from "@/lib/money";
import { checkOut, postCharge, recordPayment } from "../../actions";
import { Field, FormDialog } from "../../form-dialog";

// Common restaurant and laundry lines, so the demo charge is two taps.
const PRESETS = [
  { kind: "food", description: "Breakfast — continental", unit: "8500" },
  { kind: "food", description: "Jollof rice & grilled chicken", unit: "12000" },
  { kind: "food", description: "Pepper soup (goat meat)", unit: "9000" },
  { kind: "food", description: "Bottled water (75cl)", unit: "1000" },
  { kind: "laundry", description: "Laundry — shirt", unit: "2000" },
  { kind: "laundry", description: "Laundry — suit (dry clean)", unit: "7500" },
  { kind: "minibar", description: "Minibar — soft drink", unit: "1500" },
];

function ChargeFields({ reservationId }: { reservationId: string }) {
  const [kind, setKind] = useState("food");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  return (
    <>
      <input type="hidden" name="reservation_id" value={reservationId} />
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.description}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => {
              setKind(p.kind);
              setDescription(p.description);
              setUnit(p.unit);
            }}
          >
            {p.description.replace(/^Laundry — |^Minibar — /, "")}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-[140px_1fr] gap-3">
        <Field label="Type" htmlFor="pc-kind">
          <NativeSelect id="pc-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="food">Food & drink</option>
            <option value="laundry">Laundry</option>
            <option value="minibar">Minibar</option>
            <option value="other">Other</option>
          </NativeSelect>
        </Field>
        <Field label="Description" htmlFor="pc-desc">
          <Input id="pc-desc" name="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity" htmlFor="pc-qty">
          <Input id="pc-qty" name="qty" type="number" min={1} max={100} defaultValue={1} required />
        </Field>
        <Field label="Unit price (₦)" htmlFor="pc-unit">
          <Input id="pc-unit" name="unit" inputMode="decimal" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="8500" required />
        </Field>
      </div>
    </>
  );
}

export function FolioActions({
  reservationId, balanceKobo, canCharge, canCheckOut,
}: {
  reservationId: string; balanceKobo: number; canCharge: boolean; canCheckOut: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {canCharge && (
        <FormDialog
          trigger={
            <Button size="sm">
              <ReceiptIcon /> Post charge
            </Button>
          }
          title="Charge to room"
          description="Posts to today's business day and shows on the guest's live bill immediately."
          action={postCharge}
          submitLabel="Post charge"
          pendingLabel="Posting…"
        >
          <ChargeFields reservationId={reservationId} />
        </FormDialog>
      )}
      {canCharge && (
        <FormDialog
          trigger={
            <Button size="sm" variant="outline">
              <BanknoteIcon /> Take payment
            </Button>
          }
          title="Take payment"
          description={balanceKobo > 0 ? `Outstanding: ${formatKobo(balanceKobo)}` : "The folio is settled."}
          action={recordPayment}
          submitLabel="Record payment"
          pendingLabel="Recording…"
        >
          <input type="hidden" name="reservation_id" value={reservationId} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Method" htmlFor="rp-method">
              <NativeSelect id="rp-method" name="method" defaultValue="pos">
                <option value="pos">POS</option>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
              </NativeSelect>
            </Field>
            <Field label="Amount (₦)" htmlFor="rp-amount">
              <Input
                id="rp-amount"
                name="amount"
                inputMode="decimal"
                defaultValue={balanceKobo > 0 ? koboToNairaInput(balanceKobo) : ""}
                required
              />
            </Field>
          </div>
          <Field label="Reference" htmlFor="rp-ref">
            <Input id="rp-ref" name="reference" placeholder="POS slip or transfer ref (optional)" />
          </Field>
        </FormDialog>
      )}
      {canCheckOut && (
        <FormDialog
          trigger={
            <Button size="sm" variant="secondary">
              <LogOutIcon /> Check out
            </Button>
          }
          title="Check out guest?"
          description={
            balanceKobo > 0
              ? `There is ${formatKobo(balanceKobo)} outstanding — take payment first.`
              : "The folio closes and the room goes to housekeeping."
          }
          action={checkOut}
          submitLabel="Check out"
          pendingLabel="Checking out…"
        >
          <input type="hidden" name="reservation_id" value={reservationId} />
        </FormDialog>
      )}
    </div>
  );
}
