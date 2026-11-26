"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/app/submit-button";
import { runAction } from "@/components/app/action-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";

export function FormDialog({
  trigger, title, description, action, submitLabel, pendingLabel, destructive, children,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  action: (fd: FormData) => Promise<ActionResult>;
  submitLabel: string;
  pendingLabel?: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form action={runAction(action, () => setOpen(false))} className="grid gap-4">
          {children}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton variant={destructive ? "destructive" : "default"} pendingLabel={pendingLabel}>
              {submitLabel}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, htmlFor, children, className }: { label: string; htmlFor: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
