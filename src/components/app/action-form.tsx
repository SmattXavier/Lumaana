"use client";

import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

type Action = (fd: FormData) => Promise<ActionResult>;

/** Runs a server action and reports the result in a toast (DB messages verbatim). */
export function runAction(action: Action, onSuccess?: () => void) {
  return async (fd: FormData) => {
    const result = await action(fd);
    if (result.error) toast.error(result.error);
    else {
      toast.success(result.ok ?? "Saved.");
      onSuccess?.();
    }
  };
}

export function ActionForm({
  action,
  onSuccess,
  className,
  children,
}: {
  action: Action;
  onSuccess?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form action={runAction(action, onSuccess)} className={className}>
      {children}
    </form>
  );
}
