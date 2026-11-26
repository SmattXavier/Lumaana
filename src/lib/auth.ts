import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOME_FOR_ROLE, type Role } from "@/lib/roles";

/** The signed-in user's profile, read once per request. */
export const getProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, branch_id")
    .eq("id", userId)
    .maybeSingle();
  return profile;
});

/**
 * Server-side guard for layouts and actions (the proxy only routes).
 * Signed out → /login; wrong role → that user's home area.
 */
export async function requireRole(roles: Role[]) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!roles.includes(profile.role)) redirect(HOME_FOR_ROLE[profile.role]);
  return profile;
}
