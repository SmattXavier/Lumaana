"use client";

import { useState } from "react";
import { runAction } from "@/components/app/action-form";
import { REQUEST_TYPE } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { sendRequest } from "../actions";
import { GoldButton, Panel } from "../ui";
import { useFormStatus } from "react-dom";

function Send() {
  const { pending } = useFormStatus();
  return <GoldButton disabled={pending}>{pending ? "Sending…" : "Send to front desk"}</GoldButton>;
}

export function RequestForm() {
  const [type, setType] = useState<keyof typeof REQUEST_TYPE>("housekeeping");
  return (
    <Panel>
      {/* React resets the form after the action completes */}
      <form action={runAction(sendRequest)} className="grid gap-3">
        <input type="hidden" name="type" value={type} />
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(REQUEST_TYPE) as (keyof typeof REQUEST_TYPE)[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "rounded-xl border px-3 py-3 text-left text-sm",
                type === t ? "border-[#0d1117] bg-[#0d1117] text-[#e9e2d3]" : "border-black/10 bg-white"
              )}
            >
              {REQUEST_TYPE[t]}
            </button>
          ))}
        </div>
        <textarea
          name="note"
          rows={2}
          placeholder="Anything we should know? (optional)"
          className="rounded-xl border border-black/10 bg-white p-3 text-base outline-none focus:border-black/30"
        />
        <Send />
      </form>
    </Panel>
  );
}
