import { cache } from "react";
import { cookies } from "next/headers";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const DESK_BRANCH_COOKIE = "desk_branch";

/**
 * The branch the front desk is working on. Branch staff: their own branch.
 * HQ (no branch of its own): the branch picked in the header, else the first.
 */
export const getDeskBranch = cache(async () => {
  const profile = await requireRole(["hq_admin", "branch_admin", "front_desk"]);
  const supabase = await createClient();

  if (profile.role !== "hq_admin") {
    const { data: branch } = await supabase
      .from("branches").select("id, name, city").eq("id", profile.branch_id!).single();
    return { profile, branch: branch!, branches: null };
  }

  const { data: branches } = await supabase.from("branches").select("id, name, city").order("name");
  const picked = (await cookies()).get(DESK_BRANCH_COOKIE)?.value;
  const list = branches ?? [];
  const branch = list.find((b) => b.id === picked) ?? list[0];
  if (!branch) throw new Error("No branches exist yet.");
  return { profile, branch, branches: list };
});
