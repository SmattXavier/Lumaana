"use client";

import { LockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { closeBusinessDay } from "../actions";
import { FormDialog } from "../form-dialog";

export function CloseDayButton({ branchId, date, label, disabled }: { branchId: string; date: string; label: string; disabled: boolean }) {
  return (
    <FormDialog
      trigger={
        <Button disabled={disabled}>
          <LockIcon /> Close business day {label}
        </Button>
      }
      title={`Close ${label}?`}
      description="This locks the day for good. Charges and payments can no longer be added to it or changed."
      action={closeBusinessDay}
      submitLabel="Close and lock day"
      pendingLabel="Closing…"
    >
      <input type="hidden" name="branch_id" value={branchId} />
      <input type="hidden" name="business_date" value={date} />
    </FormDialog>
  );
}
