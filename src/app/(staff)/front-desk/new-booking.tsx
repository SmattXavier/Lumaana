"use client";

import { PlusIcon } from "lucide-react";
import { NativeSelect } from "@/components/app/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addDays } from "@/lib/dates";
import { formatKobo } from "@/lib/money";
import { createDeskBooking } from "./actions";
import { Field, FormDialog } from "./form-dialog";

export function NewBookingDialog({
  branchId, types, today,
}: {
  branchId: string; types: { id: string; name: string; base_rate_kobo: number }[]; today: string;
}) {
  return (
    <FormDialog
      trigger={
        <Button size="sm">
          <PlusIcon /> New booking
        </Button>
      }
      title="New desk booking"
      description="Walk-in or phone booking. Confirmed straight away; take payment on the folio."
      action={createDeskBooking}
      submitLabel="Create booking"
      pendingLabel="Creating…"
    >
      <input type="hidden" name="branch_id" value={branchId} />
      <Field label="Guest name" htmlFor="nb-name">
        <Input id="nb-name" name="full_name" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" htmlFor="nb-email">
          <Input id="nb-email" name="email" type="email" placeholder="Optional" />
        </Field>
        <Field label="Phone" htmlFor="nb-phone">
          <Input id="nb-phone" name="phone" placeholder="Optional" />
        </Field>
      </div>
      <Field label="Room type" htmlFor="nb-type">
        <NativeSelect id="nb-type" name="room_type_id" required>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {formatKobo(t.base_rate_kobo)}/night
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Check-in" htmlFor="nb-in">
          <Input id="nb-in" name="check_in" type="date" defaultValue={today} min={today} required />
        </Field>
        <Field label="Check-out" htmlFor="nb-out">
          <Input id="nb-out" name="check_out" type="date" defaultValue={addDays(today, 1)} min={addDays(today, 1)} required />
        </Field>
        <Field label="Adults" htmlFor="nb-adults">
          <Input id="nb-adults" name="adults" type="number" min={1} max={10} defaultValue={1} required />
        </Field>
      </div>
      <Field label="Source" htmlFor="nb-source">
        <NativeSelect id="nb-source" name="source" defaultValue="walk_in">
          <option value="walk_in">Walk-in</option>
          <option value="phone">Phone</option>
        </NativeSelect>
      </Field>
    </FormDialog>
  );
}
