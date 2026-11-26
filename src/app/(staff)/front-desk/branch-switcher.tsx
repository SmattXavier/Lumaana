"use client";

import { useTransition } from "react";
import { NativeSelect } from "@/components/app/native-select";
import { setDeskBranch } from "./actions";

export function BranchSwitcher({ branches, current }: { branches: { id: string; name: string }[]; current: string }) {
  const [pending, start] = useTransition();
  return (
    <NativeSelect
      aria-label="Branch"
      className="h-7 w-auto"
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const form = new FormData();
        form.set("branch_id", e.target.value);
        start(() => setDeskBranch(form));
      }}
    >
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </NativeSelect>
  );
}
