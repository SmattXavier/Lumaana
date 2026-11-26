"use client";

import { useFormStatus } from "react-dom";
import { GoldButton } from "../../luxe";

export function PayButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <GoldButton type="submit" disabled={pending} className="w-full">
      {pending ? "Processing payment…" : label}
    </GoldButton>
  );
}
